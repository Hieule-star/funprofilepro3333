import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BSCSCAN_API_KEY = Deno.env.get('BSCSCAN_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BSCScanToken {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  balance: string;
}

interface CoinGeckoTokenInfo {
  id: string;
  platforms: {
    [key: string]: string;
  };
  image?: {
    small?: string;
    thumb?: string;
    large?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, chainId } = await req.json();

    console.log(`[detect-token-holdings] Detecting tokens for address: ${address}, chainId: ${chainId}`);

    if (chainId !== 56) {
      return new Response(
        JSON.stringify({ error: 'Only BNB Chain (chainId: 56) is supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Get token list from BSCScan (API V2)
    const bscScanUrl = `https://api.bscscan.com/v2/api?chainid=56&module=account&action=tokenlist&address=${address}&apikey=${BSCSCAN_API_KEY}`;
    console.log('[detect-token-holdings] Calling BSCScan API V2...');
    
    const bscResponse = await fetch(bscScanUrl);
    const bscData = await bscResponse.json();

    if (bscData.status !== '1' || !bscData.result) {
      console.error('[detect-token-holdings] BSCScan API error:', bscData);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tokens from BSCScan', details: bscData.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens: BSCScanToken[] = bscData.result;
    console.log(`[detect-token-holdings] Found ${tokens.length} tokens from BSCScan`);

    // Step 2: Filter tokens with balance > 0
    const tokensWithBalance = tokens.filter(token => {
      const balance = BigInt(token.balance || '0');
      return balance > 0n;
    });

    console.log(`[detect-token-holdings] ${tokensWithBalance.length} tokens have balance > 0`);

    // Step 3: Get CoinGecko coin list for verification
    console.log('[detect-token-holdings] Fetching CoinGecko coin list...');
    const coinGeckoListUrl = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
    const coinGeckoListResponse = await fetch(coinGeckoListUrl);
    const coinGeckoList: CoinGeckoTokenInfo[] = await coinGeckoListResponse.json();

    // Create a map of BSC contract addresses to CoinGecko IDs
    const bscContractToCoinGeckoId = new Map<string, string>();
    coinGeckoList.forEach(coin => {
      if (coin.platforms && coin.platforms['binance-smart-chain']) {
        const contractAddr = coin.platforms['binance-smart-chain'].toLowerCase();
        bscContractToCoinGeckoId.set(contractAddr, coin.id);
      }
    });

    console.log(`[detect-token-holdings] CoinGecko has ${bscContractToCoinGeckoId.size} BSC tokens`);

    // Step 4: Process tokens and fetch logos
    const verifiedTokens = [];

    for (const token of tokensWithBalance) {
      const contractAddr = token.contractAddress.toLowerCase();
      const coinGeckoId = bscContractToCoinGeckoId.get(contractAddr);

      if (!coinGeckoId) {
        console.log(`[detect-token-holdings] Token ${token.tokenSymbol} (${contractAddr}) not found on CoinGecko, skipping`);
        continue;
      }

      console.log(`[detect-token-holdings] Token ${token.tokenSymbol} verified on CoinGecko with ID: ${coinGeckoId}`);

      // Fetch token details including logo
      let logoUrl = null;
      try {
        const tokenDetailUrl = `https://api.coingecko.com/api/v3/coins/${coinGeckoId}`;
        const tokenDetailResponse = await fetch(tokenDetailUrl);
        const tokenDetail = await tokenDetailResponse.json();
        logoUrl = tokenDetail.image?.small || tokenDetail.image?.thumb || null;
        console.log(`[detect-token-holdings] Logo for ${token.tokenSymbol}: ${logoUrl}`);
      } catch (error) {
        console.error(`[detect-token-holdings] Failed to fetch logo for ${token.tokenSymbol}:`, error);
      }

      const decimals = parseInt(token.tokenDecimal);
      const balance = Number(token.balance) / Math.pow(10, decimals);

      verifiedTokens.push({
        contract_address: token.contractAddress,
        name: token.tokenName,
        symbol: token.tokenSymbol,
        decimals: decimals,
        balance: balance.toFixed(4),
        logo_url: logoUrl,
        verified: true,
        coingecko_id: coinGeckoId,
      });
    }

    console.log(`[detect-token-holdings] Successfully verified ${verifiedTokens.length} tokens`);

    return new Response(
      JSON.stringify({ tokens: verifiedTokens }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[detect-token-holdings] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
