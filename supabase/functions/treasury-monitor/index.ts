import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { ethers } from 'https://esm.sh/ethers@6.9.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TREASURY_ADDRESS = '0x0910320181889fefde0bb1ca63962b0a8882e413';
const CAMLY_CONTRACT = '0x0910320181889fefde0bb1ca63962b0a8882e413';
const BNB_RPC_URL = 'https://bsc-dataseed.binance.org/';

const CAMLY_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log('Starting treasury monitoring...');

    // 1. Get treasury wallet balance from BNB Chain
    const provider = new ethers.JsonRpcProvider(BNB_RPC_URL);
    const bnbBalanceWei = await provider.getBalance(TREASURY_ADDRESS);
    const bnbBalance = parseFloat(ethers.formatEther(bnbBalanceWei));

    // Get CAMLY token balance
    const camlyContract = new ethers.Contract(CAMLY_CONTRACT, CAMLY_ABI, provider);
    const camlyBalanceRaw = await camlyContract.balanceOf(TREASURY_ADDRESS);
    const decimals = await camlyContract.decimals();
    const camlyBalance = parseFloat(ethers.formatUnits(camlyBalanceRaw, decimals));

    console.log(`Treasury Balance - BNB: ${bnbBalance}, CAMLY: ${camlyBalance}`);

    // 2. Get thresholds from admin_settings
    const { data: thresholdData } = await supabaseClient
      .from('admin_settings')
      .select('value')
      .eq('key', 'treasury_low_balance_threshold')
      .single();

    const { data: largeTransactionData } = await supabaseClient
      .from('admin_settings')
      .select('value')
      .eq('key', 'large_transaction_threshold')
      .single();

    const thresholds = thresholdData?.value as { bnb: number; camly: number };
    const largeThreshold = (largeTransactionData?.value as { camly: number })?.camly || 500000;

    const alerts: any[] = [];

    // 3. Check thresholds and create alerts
    if (bnbBalance < thresholds.bnb) {
      const alert = {
        alert_type: 'low_balance',
        severity: 'critical',
        message: `BNB balance is critically low: ${bnbBalance.toFixed(4)} BNB`,
        metadata: { balance: bnbBalance, threshold: thresholds.bnb, token: 'BNB' },
      };
      
      await supabaseClient.from('treasury_alerts').insert(alert);
      alerts.push(alert);
      console.log('Created alert: Low BNB balance');
    }

    if (camlyBalance < thresholds.camly) {
      const alert = {
        alert_type: 'low_balance',
        severity: 'critical',
        message: `CAMLY balance is critically low: ${camlyBalance.toLocaleString()} CAMLY`,
        metadata: { balance: camlyBalance, threshold: thresholds.camly, token: 'CAMLY' },
      };
      
      await supabaseClient.from('treasury_alerts').insert(alert);
      alerts.push(alert);
      console.log('Created alert: Low CAMLY balance');
    }

    // 4. Check large transactions in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentClaims } = await supabaseClient
      .from('claim_requests')
      .select('*')
      .gte('created_at', oneHourAgo)
      .eq('status', 'completed');

    if (recentClaims) {
      for (const claim of recentClaims) {
        if (claim.amount_token > largeThreshold) {
          const alert = {
            alert_type: 'large_transaction',
            severity: 'warning',
            message: `Large claim detected: ${claim.amount_token.toLocaleString()} CAMLY`,
            metadata: {
              claim_id: claim.id,
              amount: claim.amount_token,
              wallet: claim.wallet_address,
              tx_hash: claim.tx_hash,
            },
          };
          
          await supabaseClient.from('treasury_alerts').insert(alert);
          alerts.push(alert);
          console.log(`Created alert: Large transaction ${claim.amount_token}`);
        }
      }
    }

    // 5. Save snapshot
    await supabaseClient.from('treasury_snapshots').insert({
      balance_bnb: bnbBalance,
      balance_camly: camlyBalance,
    });

    console.log('Snapshot saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        balance: {
          bnb: bnbBalance,
          camly: camlyBalance,
        },
        alerts: alerts.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in treasury-monitor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
