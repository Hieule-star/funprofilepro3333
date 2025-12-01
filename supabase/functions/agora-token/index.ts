import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agora Token Builder using Deno Web Crypto API
class AgoraTokenBuilder {
  private static readonly VERSION = "007";
  private static readonly PRIVILEGES = {
    kJoinChannel: 1,
    kPublishAudioStream: 2,
    kPublishVideoStream: 3,
    kPublishDataStream: 4,
  };

  static async buildTokenWithUid(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    role: number,
    privilegeExpiredTs: number
  ): Promise<string> {
    const salt = Math.floor(Math.random() * 100000000);
    const ts = Math.floor(Date.now() / 1000);

    // Build message
    const messages: Record<number, number> = {
      [this.PRIVILEGES.kJoinChannel]: privilegeExpiredTs,
    };

    // Add publisher privileges if role is publisher
    if (role === 1) {
      messages[this.PRIVILEGES.kPublishAudioStream] = privilegeExpiredTs;
      messages[this.PRIVILEGES.kPublishVideoStream] = privilegeExpiredTs;
      messages[this.PRIVILEGES.kPublishDataStream] = privilegeExpiredTs;
    }

    // Pack message content
    const messageContent = this.packContent(channelName, uid, salt, ts, messages);
    
    // Sign with HMAC-SHA256
    const signature = await this.hmacSign(appCertificate, messageContent);
    
    // Build final token
    const tokenContent = new Uint8Array(signature.length + messageContent.length);
    tokenContent.set(signature, 0);
    tokenContent.set(messageContent, signature.length);
    
    // Encode to base64
    const base64Token = this.toBase64(tokenContent);
    
    return `${this.VERSION}${appId}${base64Token}`;
  }

  private static packContent(
    channelName: string,
    uid: number,
    salt: number,
    ts: number,
    messages: Record<number, number>
  ): Uint8Array {
    const encoder = new TextEncoder();
    const channelBytes = encoder.encode(channelName);
    
    // Calculate total size
    const messageCount = Object.keys(messages).length;
    const size = 4 + 4 + 2 + channelBytes.length + 4 + (messageCount * 6);
    
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;

    // Salt (4 bytes)
    view.setUint32(offset, salt, false);
    offset += 4;

    // Timestamp (4 bytes)
    view.setUint32(offset, ts, false);
    offset += 4;

    // Channel name length (2 bytes)
    view.setUint16(offset, channelBytes.length, false);
    offset += 2;

    // Channel name
    new Uint8Array(buffer).set(channelBytes, offset);
    offset += channelBytes.length;

    // UID (4 bytes)
    view.setUint32(offset, uid, false);
    offset += 4;

    // Messages
    for (const [privilege, expire] of Object.entries(messages)) {
      view.setUint16(offset, parseInt(privilege), false);
      offset += 2;
      view.setUint32(offset, expire, false);
      offset += 4;
    }

    return new Uint8Array(buffer);
  }

  private static async hmacSign(key: string, data: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Create a new buffer to ensure proper ArrayBuffer type
    const buffer = new Uint8Array(data).buffer as ArrayBuffer;
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, buffer);
    return new Uint8Array(signature);
  }

  private static toBase64(data: Uint8Array): string {
    const binary = String.fromCharCode(...data);
    const base64 = btoa(binary);
    // Make URL-safe
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
      1, // PUBLISHER role
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
