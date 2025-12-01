import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agora RTC Token Builder (AccessToken2 implementation)
class AgoraAccessToken {
  static VERSION = "007";
  
  static Role = {
    PUBLISHER: 1,
    SUBSCRIBER: 2,
  };

  static async buildTokenWithUid(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    role: number,
    privilegeExpireTs: number
  ): Promise<string> {
    // Create message content
    const salt = Math.floor(Math.random() * 100000000);
    const ts = Math.floor(Date.now() / 1000);
    
    // Pack messages
    const messages: Record<number, number> = {
      1: privilegeExpireTs,  // kJoinChannel
    };
    
    if (role === this.Role.PUBLISHER) {
      messages[2] = privilegeExpireTs;  // kPublishAudioStream
      messages[3] = privilegeExpireTs;  // kPublishVideoStream
      messages[4] = privilegeExpireTs;  // kPublishDataStream
    }
    
    // Build the message
    const messageBuffer = this.packMessages(messages, salt, ts);
    
    // Sign with HMAC-SHA256
    const signature = await this.hmacSign(appCertificate, messageBuffer);
    
    // Pack the final token: version + appId + signature + messageBuffer
    const content = new Uint8Array(
      2 + 32 + signature.length + messageBuffer.length
    );
    
    let offset = 0;
    
    // Version (2 bytes)
    content[offset++] = this.VERSION.charCodeAt(0);
    content[offset++] = this.VERSION.charCodeAt(1);
    content[offset++] = this.VERSION.charCodeAt(2);
    
    // App ID (32 bytes hex string)
    const appIdBytes = new TextEncoder().encode(appId);
    content.set(appIdBytes.slice(0, 32), offset);
    offset += 32;
    
    // Signature
    content.set(signature, offset);
    offset += signature.length;
    
    // Message buffer
    content.set(messageBuffer, offset);
    
    // Base64 encode
    return this.base64Encode(content);
  }

  static packMessages(messages: Record<number, number>, salt: number, ts: number): Uint8Array {
    // Simple packing: salt(4) + ts(4) + messages
    const buffer = new ArrayBuffer(8 + Object.keys(messages).length * 8);
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setUint32(offset, salt, false);
    offset += 4;
    view.setUint32(offset, ts, false);
    offset += 4;
    
    // Pack messages
    for (const [key, value] of Object.entries(messages)) {
      view.setUint32(offset, parseInt(key), false);
      offset += 4;
      view.setUint32(offset, value, false);
      offset += 4;
    }
    
    return new Uint8Array(buffer);
  }

  static async hmacSign(key: string, data: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Create a new Uint8Array with proper ArrayBuffer type
    const dataBuffer = new Uint8Array(data).buffer;
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
    return new Uint8Array(signature);
  }

  static base64Encode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    // URL-safe base64
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
      throw new Error('Missing Agora credentials in environment');
    }

    console.log(`[agora-token] Generating token for channel: ${channelName}, uid: ${uid || 0}`);
    
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    const token = await AgoraAccessToken.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid || 0,
      AgoraAccessToken.Role.PUBLISHER,
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
