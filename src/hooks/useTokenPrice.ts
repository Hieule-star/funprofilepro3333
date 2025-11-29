import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface TokenPrice {
  usd: number;
  usd_24h_change: number;
}

interface CoinGeckoResponse {
  [key: string]: TokenPrice;
}

// Map token symbols to CoinGecko IDs
const TOKEN_ID_MAP: Record<string, string> = {
  'BNB': 'binancecoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BUSD': 'binance-usd',
  'DAI': 'dai',
  'CAKE': 'pancakeswap-token',
  'WBNB': 'wbnb',
  'WETH': 'weth',
  'CAMLY': 'camly-coin',
};

// Map chain ID and contract address to CoinGecko platform ID
const PLATFORM_MAP: Record<number, string> = {
  56: 'binance-smart-chain',
  1: 'ethereum',
};

async function fetchTokenPrices(tokenIds: string[]): Promise<CoinGeckoResponse> {
  const ids = tokenIds.join(',');
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch token prices');
  }
  
  return response.json();
}

async function fetchTokenPriceByContract(
  chainId: number,
  contractAddress: string
): Promise<number | null> {
  const platform = PLATFORM_MAP[chainId];
  if (!platform) return null;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${contractAddress}&vs_currencies=usd`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const price = data[contractAddress.toLowerCase()]?.usd;
    return price || null;
  } catch {
    return null;
  }
}

export function useTokenPrice(symbol: string) {
  const tokenId = TOKEN_ID_MAP[symbol.toUpperCase()];
  
  return useQuery({
    queryKey: ['tokenPrice', symbol],
    queryFn: async () => {
      if (!tokenId) return null;
      const data = await fetchTokenPrices([tokenId]);
      return data[tokenId]?.usd || null;
    },
    enabled: !!tokenId,
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

export function useTokenPriceByContract(chainId?: number, contractAddress?: string) {
  return useQuery({
    queryKey: ['tokenPrice', chainId, contractAddress],
    queryFn: async () => {
      if (!chainId || !contractAddress) return null;
      return fetchTokenPriceByContract(chainId, contractAddress);
    },
    enabled: !!chainId && !!contractAddress,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useMultipleTokenPrices(symbols: string[]) {
  const tokenIds = symbols
    .map(s => TOKEN_ID_MAP[s.toUpperCase()])
    .filter(Boolean);
  
  return useQuery({
    queryKey: ['tokenPrices', ...tokenIds],
    queryFn: async () => {
      if (tokenIds.length === 0) return {};
      const data = await fetchTokenPrices(tokenIds);
      
      // Map back to symbols
      const priceMap: Record<string, number> = {};
      symbols.forEach(symbol => {
        const tokenId = TOKEN_ID_MAP[symbol.toUpperCase()];
        if (tokenId && data[tokenId]) {
          priceMap[symbol] = data[tokenId].usd;
        }
      });
      
      return priceMap;
    },
    enabled: tokenIds.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
