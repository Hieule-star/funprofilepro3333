import { bsc } from 'viem/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';

// Privy App ID will be stored as environment variable
export const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || '';

// Check if Privy is configured
export const isPrivyConfigured = () => {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;
  console.log('[Privy Debug] Raw App ID:', appId);
  console.log('[Privy Debug] Type:', typeof appId);
  console.log('[Privy Debug] Length:', appId?.length);
  
  // Privy App ID usually starts with "cl" and has ~25-30 characters
  const isValid = appId && 
                  typeof appId === 'string' && 
                  appId.length > 10 && 
                  appId !== 'undefined' &&
                  appId !== 'null';
  
  console.log('[Privy Debug] Is Valid:', isValid);
  return isValid;
};

export const privyConfig = {
  appId: privyAppId,
  config: {
    appearance: {
      theme: 'dark' as const,
      accentColor: '#8B5CF6' as `#${string}`,
      logo: '/logo.jpg',
    },
    loginMethods: ['email', 'google', 'farcaster', 'telegram'],
    // Embedded wallet config for ERC-4337
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const,
      requireUserPasswordOnCreate: false,
    },
    // External wallet options
    externalWallets: {
      coinbaseWallet: {
        connectionOptions: 'all' as const,
      },
    },
    supportedChains: [bsc],
    defaultChain: bsc,
  } as PrivyClientConfig,
};
