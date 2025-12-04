import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAccount, useBalance, useDisconnect, useSwitchChain } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { usePrivy } from '@privy-io/react-auth';
import { isPrivyConfigured } from '@/lib/privy-config';

export interface CustomToken {
  id: string;
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_url: string | null;
  chain_id: number;
}

interface WalletContextType {
  isConnected: boolean;
  address?: string;
  balance?: string;
  chainId?: number;
  customTokens: CustomToken[];
  switchNetwork: (chainId: number) => void;
  disconnect: () => void;
  saveWalletAddress: () => Promise<void>;
  addCustomToken: (token: Omit<CustomToken, 'id' | 'chain_id'>) => Promise<void>;
  refreshTokens: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [isSaved, setIsSaved] = useState(false);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  
  // Track previous user state to detect logout
  const prevUserRef = useRef(user);
  
  // Get Privy logout function if enabled
  const privyEnabled = isPrivyConfigured();
  const { logout: privyLogout } = usePrivy();

  // Auto-disconnect wallet when user logs out
  useEffect(() => {
    // Detect when user changes from logged-in to logged-out
    if (prevUserRef.current && !user) {
      console.log('[WalletContext] User logged out - disconnecting wallet');
      
      // Disconnect wagmi (EOA wallets: MetaMask, Trust, Bitget)
      wagmiDisconnect();
      
      // Logout from Privy (Smart Wallet) if enabled
      if (privyEnabled && privyLogout) {
        privyLogout().catch(err => {
          console.error('[WalletContext] Privy logout error:', err);
        });
      }
      
      // Reset local state
      setIsSaved(false);
      setCustomTokens([]);
    }
    
    // Update ref for next comparison
    prevUserRef.current = user;
  }, [user, privyEnabled, privyLogout, wagmiDisconnect]);

  // Save wallet address to Supabase when connected
  const saveWalletAddress = async () => {
    if (!address || !user || !chainId) return;

    try {
      const { error } = await supabase.from('wallets').upsert(
        {
          user_id: user.id,
          chain_id: chainId,
          address: address.toLowerCase(),
          is_primary: true,
        },
        {
          onConflict: 'user_id,chain_id,address',
        }
      );

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: 'Wallet connected',
        description: `Successfully connected`,
      });
    } catch (error) {
      console.error('Error saving wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to save wallet address',
        variant: 'destructive',
      });
    }
  };

  // Auto-save wallet when connected and load tokens
  useEffect(() => {
    console.log('[WalletContext] useEffect triggered:', {
      isConnected,
      hasAddress: !!address,
      hasUser: !!user,
      isSaved,
      chainId,
    });

    if (isConnected && address && !isSaved && user) {
      console.log('[WalletContext] Auto-saving wallet address');
      saveWalletAddress();
    }
    if (isConnected && address && user) {
      console.log('[WalletContext] Refreshing tokens');
      refreshTokens();
    }
  }, [isConnected, address, chainId, user]);

  const disconnect = () => {
    wagmiDisconnect();
    setIsSaved(false);
    setCustomTokens([]);
  };

  const switchNetwork = (targetChainId: number) => {
    switchChain({ chainId: targetChainId });
  };

  const refreshTokens = async () => {
    console.log('[WalletContext] refreshTokens called:', {
      address,
      chainId,
      userId: user?.id,
      hasUser: !!user,
    });

    if (!address || !chainId || !user) {
      console.log('[WalletContext] refreshTokens early return - missing data:', {
        hasAddress: !!address,
        hasChainId: !!chainId,
        hasUser: !!user,
      });
      return;
    }

    try {
      console.log('[WalletContext] Fetching custom tokens from database');
      const { data, error } = await supabase
        .from('custom_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('chain_id', chainId);

      if (error) throw error;
      if (data) {
        console.log('[WalletContext] Custom tokens loaded:', data.length);
        setCustomTokens(data);
      }
    } catch (error) {
      console.error('[WalletContext] Error fetching custom tokens:', error);
    }
  };

  const addCustomToken = async (token: Omit<CustomToken, 'id' | 'chain_id'>) => {
    console.log('[WalletContext] addCustomToken called:', {
      address,
      chainId,
      userId: user?.id,
      token,
    });

    if (!address || !chainId || !user) {
      console.error('[WalletContext] Missing required data:', {
        hasAddress: !!address,
        hasChainId: !!chainId,
        hasUser: !!user,
      });
      throw new Error('Please wait for wallet connection and login to complete');
    }

    try {
      // Normalize contract address
      const normalizedAddress = token.contract_address.toLowerCase();
      console.log('[WalletContext] Normalized address:', normalizedAddress);

      // Check if token already exists
      console.log('[WalletContext] Checking for existing token...');
      const { data: existingToken, error: checkError } = await supabase
        .from('custom_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('contract_address', normalizedAddress)
        .eq('chain_id', chainId)
        .maybeSingle();

      console.log('[WalletContext] Existing token check:', {
        existingToken,
        checkError,
      });

      if (existingToken) {
        console.warn('[WalletContext] Token already exists!');
        throw new Error('TOKEN_ALREADY_EXISTS');
      }

      console.log('[WalletContext] Inserting new token...');
      const { error } = await supabase
        .from('custom_tokens')
        .insert({
          user_id: user.id,
          chain_id: chainId,
          contract_address: normalizedAddress,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logo_url: token.logo_url,
        });

      if (error) {
        console.error('[WalletContext] Insert error:', error);
        throw error;
      }

      console.log('[WalletContext] Token added successfully!');
      await refreshTokens();
    } catch (error) {
      console.error('[WalletContext] Error in addCustomToken:', error);
      throw error;
    }
  };

  const balance = balanceData
    ? `${(Number(balanceData.value) / Math.pow(10, balanceData.decimals)).toFixed(4)} ${balanceData.symbol}`
    : undefined;

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        balance,
        chainId,
        customTokens,
        switchNetwork,
        disconnect,
        saveWalletAddress,
        addCustomToken,
        refreshTokens,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
