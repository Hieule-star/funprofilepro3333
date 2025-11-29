import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DetectedToken {
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  logo_url: string | null;
  verified: boolean;
  coingecko_id?: string;
}

interface UseAutoDetectResult {
  detectTokens: (address: string, chainId: number) => Promise<DetectedToken[]>;
  isDetecting: boolean;
  error: string | null;
}

export function useAutoDetect(): UseAutoDetectResult {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectTokens = async (
    address: string,
    chainId: number
  ): Promise<DetectedToken[]> => {
    setIsDetecting(true);
    setError(null);

    try {
      console.log('[useAutoDetect] Calling detect-token-holdings function...');
      
      const { data, error: functionError } = await supabase.functions.invoke(
        'detect-token-holdings',
        {
          body: { address, chainId },
        }
      );

      if (functionError) {
        console.error('[useAutoDetect] Function error:', functionError);
        throw new Error(functionError.message || 'Failed to detect tokens');
      }

      if (data.error) {
        console.error('[useAutoDetect] API error:', data.error);
        throw new Error(data.error);
      }

      console.log('[useAutoDetect] Successfully detected tokens:', data.tokens);
      return data.tokens || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[useAutoDetect] Error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsDetecting(false);
    }
  };

  return { detectTokens, isDetecting, error };
}
