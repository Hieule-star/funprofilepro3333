import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agora Token Builder Implementation using native Deno crypto
class AgoraTokenBuilder {
  static VERSION = "007";

  static async buildTokenWithUid(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    privilegeExpiredTs: number
  ): Promise<string> {
    // Create the message structure
    const salt = Math.floor(Math.random() * 100000);
    const ts = Math.floor(Date.now() / 1000);
    
    const message = {
      salt,
      ts,
      messages: {
        "1": privilegeExpiredTs, // Join channel
        "2": privilegeExpiredTs, // Publish audio
        "3": privilegeExpiredTs, // Publish video  
        "4": privilegeExpiredTs, // Publish data
      },
    };

    const content = {
      appId,
      channelName,
      uid: uid.toString(),
      message,
    };

    const messageStr = JSON.stringify(content);
    
    // Sign the message with HMAC-SHA256
    const signature = await this.hmacSha256(appCertificate, messageStr);
    
    // Combine message and signature
    const combined = messageStr + signature;
    
    // Base64 encode
    const encoded = btoa(combined);
    
    return `${this.VERSION}${encoded}`;
  }

  static async hmacSha256(key: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    
    // Convert to hex string
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

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
    
    const token = await AgoraTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid || 0,
      privilegeExpiredTs
    );

    console.log(`[agora-token] Token generated successfully`);
    
    return new Response(JSON.stringify({ token, appId }), {
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
