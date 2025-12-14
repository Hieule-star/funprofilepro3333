import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  folder?: string;
  postId?: string;
}

// Crypto helpers for AWS Signature V4
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return toHex(new Uint8Array(hashBuffer));
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return new Uint8Array(signature);
}

async function getSignatureKey(
  key: string, dateStamp: string, region: string, service: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode("AWS4" + key), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, "aws4_request");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { fileName, fileType, fileSize, folder = "posts", postId } = await req.json() as CreateUploadRequest;

    if (!fileName || !fileType || !fileSize) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Determine media type
    const mediaType = fileType.startsWith("video/") ? "video" : "image";

    // R2 config
    const r2Endpoint = Deno.env.get("R2_ENDPOINT")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME")!;
    const r2PublicUrl = Deno.env.get("R2_PUBLIC_URL")!;

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = fileName.split(".").pop() || "";
    const uniqueFileName = `${folder}/${timestamp}-${randomStr}.${ext}`;

    // Create media_assets record first
    const { data: mediaAsset, error: insertError } = await supabase
      .from("media_assets")
      .insert({
        owner_id: user.id,
        post_id: postId || null,
        type: mediaType,
        mime: fileType,
        size: fileSize,
        original_filename: fileName,
        r2_bucket: r2BucketName,
        r2_key: uniqueFileName,
        r2_url: `${r2PublicUrl}/${uniqueFileName}`,
        pin_status: "pending",
        pin_attempts: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create media_assets record:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create media record" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Generate presigned URL for R2
    const region = "auto";
    const service = "s3";
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = dateStamp + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";
    const expiresIn = 3600;

    const host = new URL(r2Endpoint).host;
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const credential = `${r2AccessKeyId}/${credentialScope}`;

    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": expiresIn.toString(),
      "X-Amz-SignedHeaders": "content-type;host",
    });

    const canonicalRequest = [
      "PUT",
      `/${r2BucketName}/${uniqueFileName}`,
      queryParams.toString(),
      `content-type:${fileType}`,
      `host:${host}`,
      "",
      "content-type;host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = await getSignatureKey(r2SecretAccessKey, dateStamp, region, service);
    const signature = toHex(await hmacSha256(signingKey, stringToSign));

    queryParams.append("X-Amz-Signature", signature);
    const presignedUrl = `${r2Endpoint}/${r2BucketName}/${uniqueFileName}?${queryParams.toString()}`;

    console.log(`Created media asset ${mediaAsset.id} for user ${user.id}, file: ${fileName}`);

    return new Response(JSON.stringify({
      uploadUrl: presignedUrl,
      mediaAssetId: mediaAsset.id,
      publicUrl: mediaAsset.r2_url,
      r2Key: uniqueFileName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error in media-create-upload-url:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
