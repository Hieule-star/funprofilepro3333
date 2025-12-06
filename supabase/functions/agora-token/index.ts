import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "https://esm.sh/agora-access-token@2.0.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { channelName, uid, role: roleParam } = body;
    
    console.log('[agora-token] Request received:', { channelName, uid, role: roleParam });

    // Validate input
    if (!channelName || typeof channelName !== 'string' || channelName.trim() === '') {
      console.error('[agora-token] Invalid channelName:', channelName);
      return new Response(JSON.stringify({ error: 'Missing or invalid channelName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    
    if (!appId) {
      console.error('[agora-token] Missing AGORA_APP_ID');
      return new Response(JSON.stringify({ error: 'AGORA_APP_ID is missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!appCertificate) {
      console.error('[agora-token] Missing AGORA_APP_CERTIFICATE');
      return new Response(JSON.stringify({ error: 'AGORA_APP_CERTIFICATE is missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[agora-token] Credentials found - AppId:', appId.substring(0, 8) + '...');

    // Set role (publisher or subscriber)
    const role = roleParam === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    
    // Token expires in 1 hour
    const expiresIn = 3600;
    const currentTs = Math.floor(Date.now() / 1000);
    const expireTs = currentTs + expiresIn;
    
    console.log('[agora-token] Generating token with expiry:', expireTs);

    // Build token using official agora-access-token library
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName.trim(),
      uid || 0,
      role,
      expireTs
    );

    console.log('[agora-token] Token generated successfully');
    console.log('[agora-token] Token prefix:', token.substring(0, 20) + '...');
    
    return new Response(JSON.stringify({ 
      token, 
      appId,
      expireAt: expireTs 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[agora-token] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
