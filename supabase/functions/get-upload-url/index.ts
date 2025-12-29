import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AWS Signature V4 helpers
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return toHex(new Uint8Array(hashBuffer));
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

// Generate random ID
function generateRandomId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 12);
}

// Sanitize filename
function sanitizeFilename(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace special chars
    .replace(/-+/g, '-') // Remove consecutive dashes
    .toLowerCase();
}

interface RequestBody {
  filename: string;
  mediaType: 'image' | 'video';
  contentType: string;
  fileSize: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const cdnUrl = Deno.env.get('CLOUDFLARE_CDN_URL');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !cdnUrl) {
      console.error('[get-upload-url] Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[get-upload-url] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-upload-url] User authenticated:', user.id);

    // Parse request body
    const body: RequestBody = await req.json();
    const { filename, mediaType, contentType, fileSize } = body;

    // Validate required fields
    if (!filename || !mediaType || !contentType || !fileSize) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: filename, mediaType, contentType, fileSize' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate media type
    if (!['image', 'video'].includes(mediaType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mediaType. Must be "image" or "video"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 4GB = 4000MB = 4,000,000,000 bytes)
    const MAX_FILE_SIZE = 4000 * 1024 * 1024; // 4000 MB
    if (fileSize > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File size exceeds maximum limit of 4GB. Your file: ${(fileSize / (1024 * 1024)).toFixed(2)}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = generateRandomId();
    const sanitizedFilename = sanitizeFilename(filename);
    const folder = mediaType === 'image' ? 'images' : 'videos';
    const objectKey = `${folder}/${timestamp}-${randomId}-${sanitizedFilename}`;

    console.log('[get-upload-url] Generating presigned URL for:', objectKey);

    // Generate presigned URL using AWS Signature V4
    const r2Endpoint = `${accountId}.r2.cloudflarestorage.com`;
    const host = `${bucketName}.${r2Endpoint}`;
    const region = 'auto';
    const service = 's3';
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    
    // Presigned URL expiration (1 hour)
    const expiresIn = 3600;

    // Build canonical query string
    const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;
    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host', // Only sign host header
    });
    
    // Sort query parameters
    const sortedParams = new URLSearchParams([...queryParams.entries()].sort());
    const canonicalQueryString = sortedParams.toString();

    // Build canonical request (ONLY sign 'host' header)
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    
    // Use UNSIGNED-PAYLOAD for presigned URLs
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const encodedObjectKey = objectKey.split('/').map(encodeURIComponent).join('/');
    const canonicalRequest = [
      'PUT',
      `/${encodedObjectKey}`,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    // Create string to sign
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      `${dateStamp}/${region}/${service}/aws4_request`,
      canonicalRequestHash
    ].join('\n');

    // Calculate signature
    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signatureBytes = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBytes);

    // Build final presigned URL
    const uploadUrl = `https://${host}/${encodedObjectKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
    
    // CDN URL
    const cdnUrlFinal = `${cdnUrl.replace(/\/$/, '')}/${objectKey}`;

    console.log('[get-upload-url] Presigned URL generated successfully for:', objectKey);

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl,
        cdnUrl: cdnUrlFinal,
        filename: sanitizedFilename,
        objectKey,
        expiresIn
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get-upload-url] Error:', errMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
