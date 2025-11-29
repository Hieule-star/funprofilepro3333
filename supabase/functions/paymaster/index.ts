import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PIMLICO_API_KEY = Deno.env.get('PIMLICO_API_KEY');
    
    if (!PIMLICO_API_KEY) {
      console.error('PIMLICO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Paymaster not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userOperation, chainId } = await req.json();

    // Pimlico Paymaster endpoint for BNB Smart Chain
    const paymasterUrl = chainId === 56 
      ? `https://api.pimlico.io/v2/56/rpc?apikey=${PIMLICO_API_KEY}`
      : `https://api.pimlico.io/v2/bsc-testnet/rpc?apikey=${PIMLICO_API_KEY}`;

    console.log('Sponsoring UserOperation:', userOperation);

    // Call Pimlico paymaster to sponsor the transaction
    const response = await fetch(paymasterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_sponsorUserOperation',
        params: [
          userOperation,
          {
            entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint v0.6
          },
        ],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Pimlico error:', data.error);
      return new Response(
        JSON.stringify({ error: data.error.message || 'Paymaster error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Paymaster response:', data.result);

    return new Response(
      JSON.stringify(data.result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Paymaster error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
