import { createConfig, http } from 'wagmi';
import { bsc, mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - Get from https://cloud.walletconnect.com
const projectId = '6a0a484a4acd4e698a59cbab06761630';

export const wagmiConfig = createConfig({
  chains: [bsc, mainnet],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ projectId, showQrModal: true }),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [mainnet.id]: http('https://eth.llamarpc.com'),
  },
});

export const supportedChains = {
  [bsc.id]: {
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    rpc: 'https://bsc-dataseed.binance.org',
  },
  [mainnet.id]: {
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    rpc: 'https://eth.llamarpc.com',
  },
};
