import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Import Agora token builder from CDN
import { RtcTokenBuilder, RtcRole } from "https://esm.sh/agora-access-token@2.0.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelName, uid } = await req.json();
    
    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    
    if (!appId || !appCertificate) {
      throw new Error('Missing Agora credentials');
    }

    console.log(`[agora-token] Generating token for channel: ${channelName}, uid: ${uid || 0}`);
    
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    // Use official Agora token builder
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid || 0,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    console.log(`[agora-token] Token generated successfully for channel: ${channelName}`);
    
    return new Response(JSON.stringify({ token, appId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[agora-token] Error generating token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
