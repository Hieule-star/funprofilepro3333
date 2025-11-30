import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAMLY_CONTRACT_ADDRESS = "0x0910320181889fefde0bb1ca63962b0a8882e413";
const BNB_RPC_URL = "https://bsc-dataseed1.binance.org";
const EXCHANGE_RATE = 100000; // 100,000 DB CAMLY = 1 token CAMLY
const MIN_CLAIM_AMOUNT = 100000; // Minimum 100k DB CAMLY

// ERC20 ABI for transfer function
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)"
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Vui lòng đăng nhập để thực hiện claim' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token from Authorization header (format: "Bearer <token>")
    const token = authHeader.replace('Bearer ', '').trim();
    console.log('Token extracted, length:', token.length);

    // Get authenticated user using the JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    console.log('User authenticated:', !!user);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Phiên đăng nhập không hợp lệ' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amountDb, walletAddress } = await req.json();

    console.log('Claim request:', { userId: user.id, amountDb, walletAddress });

    // Validate input
    if (!amountDb || amountDb < MIN_CLAIM_AMOUNT) {
      return new Response(
        JSON.stringify({ error: `Số lượng tối thiểu là ${MIN_CLAIM_AMOUNT.toLocaleString()} CAMLY` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return new Response(
        JSON.stringify({ error: 'Địa chỉ ví không hợp lệ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's CAMLY balance
    const { data: rewardsData, error: rewardsError } = await supabaseClient
      .from('user_rewards')
      .select('camly_balance')
      .eq('user_id', user.id)
      .single();

    if (rewardsError || !rewardsData) {
      console.error('Rewards fetch error:', rewardsError);
      return new Response(
        JSON.stringify({ error: 'Không thể kiểm tra số dư' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rewardsData.camly_balance < amountDb) {
      return new Response(
        JSON.stringify({ error: 'Số dư không đủ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate token amount (CAMLY has 3 decimals)
    const tokenAmount = (amountDb / EXCHANGE_RATE).toString();
    const tokenAmountWei = ethers.parseUnits(tokenAmount, 3); // 3 decimals

    // Create claim request
    const { data: claimData, error: claimError } = await supabaseClient
      .from('claim_requests')
      .insert({
        user_id: user.id,
        wallet_address: walletAddress,
        amount_db: amountDb,
        amount_token: parseFloat(tokenAmount),
        status: 'processing'
      })
      .select()
      .single();

    if (claimError) {
      console.error('Claim insert error:', claimError);
      return new Response(
        JSON.stringify({ error: 'Không thể tạo yêu cầu claim' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Claim request created:', claimData.id);

    try {
      // Initialize provider and wallet
      const provider = new ethers.JsonRpcProvider(BNB_RPC_URL);
      const treasuryPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY');
      
      if (!treasuryPrivateKey) {
        throw new Error('Treasury private key not configured');
      }

      const wallet = new ethers.Wallet(treasuryPrivateKey, provider);
      const contract = new ethers.Contract(CAMLY_CONTRACT_ADDRESS, ERC20_ABI, wallet);

      console.log('Sending tokens from treasury:', wallet.address);
      console.log('To:', walletAddress);
      console.log('Amount:', tokenAmountWei.toString());

      // Send tokens
      const tx = await contract.transfer(walletAddress, tokenAmountWei);
      console.log('Transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      // Update claim request with success
      await supabaseClient
        .from('claim_requests')
        .update({
          status: 'completed',
          tx_hash: receipt.hash,
          completed_at: new Date().toISOString()
        })
        .eq('id', claimData.id);

      // Deduct CAMLY from user balance
      await supabaseClient
        .from('user_rewards')
        .update({
          camly_balance: rewardsData.camly_balance - amountDb
        })
        .eq('user_id', user.id);

      console.log('Claim completed successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          txHash: receipt.hash,
          tokenAmount: parseFloat(tokenAmount)
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (txError: any) {
      console.error('Transaction error:', txError);

      // Update claim request with failure
      await supabaseClient
        .from('claim_requests')
        .update({
          status: 'failed'
        })
        .eq('id', claimData.id);

      return new Response(
        JSON.stringify({ error: 'Gửi token thất bại: ' + txError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in claim-camly function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});