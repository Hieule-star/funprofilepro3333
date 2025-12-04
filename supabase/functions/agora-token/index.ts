import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agora Token Builder - RTC Token 007 format with Little Endian
class AgoraTokenBuilder {
  private static readonly VERSION = "007";
  
  // Service types
  private static readonly SERVICE_TYPE_RTC = 1;
  
  // RTC privileges
  private static readonly PRIVILEGE_JOIN_CHANNEL = 1;
  private static readonly PRIVILEGE_PUBLISH_AUDIO = 2;
  private static readonly PRIVILEGE_PUBLISH_VIDEO = 3;
  private static readonly PRIVILEGE_PUBLISH_DATA = 4;

  static async buildTokenWithUid(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    role: number,
    privilegeExpiredTs: number
  ): Promise<string> {
    console.log('[AgoraToken] Building token with params:', {
      appId: appId.substring(0, 8) + '...',
      channelName,
      uid,
      role,
      privilegeExpiredTs
    });

    const salt = Math.floor(Math.random() * 0xFFFFFFFF);
    const ts = Math.floor(Date.now() / 1000);

    console.log('[AgoraToken] Generated salt:', salt, 'timestamp:', ts);

    // Build privileges map for RTC service
    const privileges: Map<number, number> = new Map();
    privileges.set(this.PRIVILEGE_JOIN_CHANNEL, privilegeExpiredTs);
    
    // Add publisher privileges if role is publisher (role === 1)
    if (role === 1) {
      privileges.set(this.PRIVILEGE_PUBLISH_AUDIO, privilegeExpiredTs);
      privileges.set(this.PRIVILEGE_PUBLISH_VIDEO, privilegeExpiredTs);
      privileges.set(this.PRIVILEGE_PUBLISH_DATA, privilegeExpiredTs);
    }

    console.log('[AgoraToken] Privileges count:', privileges.size);

    // Pack the message
    const message = this.packMessage(salt, ts, channelName, uid, privileges);
    console.log('[AgoraToken] Message packed, length:', message.length);

    // Generate signature
    const signature = await this.generateSignature(appCertificate, message);
    console.log('[AgoraToken] Signature generated, length:', signature.length);

    // Combine signature + message
    const content = new Uint8Array(signature.length + message.length);
    content.set(signature, 0);
    content.set(message, signature.length);

    // Base64 encode and make URL-safe
    const base64Content = this.base64UrlEncode(content);
    
    // Final token format: VERSION + APPID + BASE64_CONTENT
    const token = `${this.VERSION}${appId}${base64Content}`;
    
    console.log('[AgoraToken] Token generated successfully, length:', token.length);
    return token;
  }

  private static packMessage(
    salt: number,
    ts: number,
    channelName: string,
    uid: number,
    privileges: Map<number, number>
  ): Uint8Array {
    const encoder = new TextEncoder();
    const channelNameBytes = encoder.encode(channelName);
    const uidStr = String(uid);
    const uidBytes = encoder.encode(uidStr);

    // Calculate buffer size
    // Salt (4) + Ts (4) + Privileges size (2) + Privileges (6 each) + 
    // Service type (2) + Service permissions size (2) + Service permissions (6 each) +
    // Channel name length (2) + Channel name + UID length (2) + UID
    const privilegesCount = privileges.size;
    const bufferSize = 4 + 4 + 2 + (privilegesCount * 6) + 2 + channelNameBytes.length + 2 + uidBytes.length;
    
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);
    let offset = 0;

    // Salt (uint32 LE)
    view.setUint32(offset, salt, true); // true = Little Endian
    offset += 4;
    console.log('[AgoraToken] Packed salt at offset 0');

    // Timestamp (uint32 LE)
    view.setUint32(offset, ts, true);
    offset += 4;
    console.log('[AgoraToken] Packed timestamp at offset 4');

    // Privileges map size (uint16 LE)
    view.setUint16(offset, privilegesCount, true);
    offset += 2;
    console.log('[AgoraToken] Packed privileges count:', privilegesCount);

    // Pack each privilege (uint16 key + uint32 value, both LE)
    for (const [key, value] of privileges) {
      view.setUint16(offset, key, true);
      offset += 2;
      view.setUint32(offset, value, true);
      offset += 4;
      console.log('[AgoraToken] Packed privilege:', key, '=', value);
    }

    // Channel name length (uint16 LE)
    view.setUint16(offset, channelNameBytes.length, true);
    offset += 2;

    // Channel name bytes
    uint8View.set(channelNameBytes, offset);
    offset += channelNameBytes.length;
    console.log('[AgoraToken] Packed channel name:', channelName);

    // UID string length (uint16 LE)
    view.setUint16(offset, uidBytes.length, true);
    offset += 2;

    // UID string bytes
    uint8View.set(uidBytes, offset);
    offset += uidBytes.length;
    console.log('[AgoraToken] Packed UID:', uidStr);

    return new Uint8Array(buffer, 0, offset);
  }

  private static async generateSignature(key: string, data: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Create a proper ArrayBuffer copy to satisfy TypeScript
    const dataBuffer = new Uint8Array(data).buffer as ArrayBuffer;
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
    return new Uint8Array(signature);
  }

  private static base64UrlEncode(data: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64 = btoa(binary);
    // Make URL-safe: replace + with -, / with _, remove padding =
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { channelName, uid } = body;
    
    console.log('[agora-token] Request received:', { channelName, uid });

    // Validate input
    if (!channelName || typeof channelName !== 'string' || channelName.trim() === '') {
      console.error('[agora-token] Invalid channelName:', channelName);
      throw new Error('Invalid or missing channelName');
    }
    
    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    
    if (!appId) {
      console.error('[agora-token] Missing AGORA_APP_ID');
      throw new Error('Missing AGORA_APP_ID');
    }
    
    if (!appCertificate) {
      console.error('[agora-token] Missing AGORA_APP_CERTIFICATE');
      throw new Error('Missing AGORA_APP_CERTIFICATE');
    }

    console.log('[agora-token] Credentials found - AppId:', appId.substring(0, 8) + '...');
    
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    console.log('[agora-token] Generating token with expiry:', privilegeExpiredTs);
    
    const token = await AgoraTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName.trim(),
      uid || 0,
      1, // PUBLISHER role
      privilegeExpiredTs
    );

    console.log('[agora-token] Token generated successfully');
    console.log('[agora-token] Token prefix:', token.substring(0, 20) + '...');
    
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
