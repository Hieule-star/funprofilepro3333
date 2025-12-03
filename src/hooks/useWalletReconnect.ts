import { useEffect } from 'react';
import { useReconnect } from 'wagmi';

export function useWalletReconnect() {
  const { reconnect, connectors } = useReconnect();

  useEffect(() => {
    // Auto-reconnect wallet on app mount
    reconnect({ connectors });
  }, []);
}
