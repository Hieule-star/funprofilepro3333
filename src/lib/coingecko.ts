// CoinGecko API utilities
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export interface TokenLogoInfo {
  logo_url: string | null;
  coingecko_id?: string;
}

// Map chain IDs to CoinGecko platform IDs
const CHAIN_TO_PLATFORM: Record<number, string> = {
  56: 'binance-smart-chain',
  1: 'ethereum',
};

/**
 * Fetch token logo from CoinGecko by contract address
 * Returns null if not found or rate limited
 */
export async function fetchTokenLogo(
  contractAddress: string,
  chainId: number
): Promise<TokenLogoInfo> {
  try {
    const platform = CHAIN_TO_PLATFORM[chainId];
    if (!platform) {
      console.warn(`Unsupported chain ID for CoinGecko: ${chainId}`);
      return { logo_url: null };
    }

    const url = `${COINGECKO_API_BASE}/coins/${platform}/contract/${contractAddress.toLowerCase()}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('CoinGecko rate limit exceeded');
      } else if (response.status === 404) {
        console.info('Token not found on CoinGecko');
      } else {
        console.error(`CoinGecko API error: ${response.status}`);
      }
      return { logo_url: null };
    }

    const data = await response.json();
    
    return {
      logo_url: data.image?.large || data.image?.small || data.image?.thumb || null,
      coingecko_id: data.id,
    };
  } catch (error) {
    console.error('Error fetching token logo from CoinGecko:', error);
    return { logo_url: null };
  }
}

/**
 * Get fallback emoji logo based on token symbol
 */
export function getFallbackLogo(symbol: string): string {
  const symbolUpper = symbol.toUpperCase();
  
  // Common stablecoins
  if (symbolUpper.includes('USDT') || symbolUpper.includes('USDC') || symbolUpper.includes('DAI')) {
    return '💵';
  }
  if (symbolUpper.includes('BUSD')) {
    return '💰';
  }
  
  // BTC related
  if (symbolUpper.includes('BTC') || symbolUpper.includes('WBTC')) {
    return '₿';
  }
  
  // ETH related
  if (symbolUpper.includes('ETH') || symbolUpper.includes('WETH')) {
    return '⟠';
  }
  
  // BNB related
  if (symbolUpper.includes('BNB')) {
    return '🟡';
  }
  
  // Default coin emoji
  return '🪙';
}
