/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  folder?: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return toHex(new Uint8Array(hashBuffer));
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return new Uint8Array(sig);
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const kDate = await hmacSha256(enc.encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generate presigned URL request received");

    const { fileName, fileType, folder = "uploads" } = (await req.json()) as PresignedUrlRequest;

    if (!fileName || !fileType) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Missing fileName or fileType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const endpoint = Deno.env.get("R2_ENDPOINT") || "";
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") || "";
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
    const bucketName = Deno.env.get("R2_BUCKET_NAME") || "";
    const publicBaseUrl = Deno.env.get("R2_PUBLIC_URL") || "";

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
      console.error("Missing R2 configuration");
      return new Response(
        JSON.stringify({ error: "Server storage is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate unique filename
    const fileExtension = fileName.split(".").pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const uniqueFileName = `${folder}/${timestamp}-${randomStr}.${fileExtension}`;

    console.log(`Generating presigned URL for: ${uniqueFileName}`);

    // Prepare SigV4 values
    const now = new Date();
    const expiresIn = 3600; // 1 hour
    const dateStamp = `${now.getUTCFullYear()}${(now.getUTCMonth() + 1).toString().padStart(2, "0")}${now
      .getUTCDate()
      .toString()
      .padStart(2, "0")}`;
    const amzDate = `${dateStamp}T${now.getUTCHours().toString().padStart(2, "0")}${now
      .getUTCMinutes()
      .toString()
      .padStart(2, "0")}${now.getUTCSeconds().toString().padStart(2, "0")}Z`;

    const region = "auto";
    const service = "s3";

    const endpointUrl = new URL(endpoint);
    endpointUrl.pathname = `/${bucketName}/${uniqueFileName}`;

    const host = endpointUrl.host;
    const canonicalUri = endpointUrl.pathname;

    // Query parameters for presigned URL
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const credential = `${accessKeyId}/${credentialScope}`;

    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": expiresIn.toString(),
      "X-Amz-SignedHeaders": "host",
    });

    // Canonical request
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";
    const canonicalRequest = [
      "PUT",
      canonicalUri,
      queryParams.toString(),
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    // String to sign
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256Hex(canonicalRequest),
    ].join("\n");

    // Calculate signature
    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signatureBytes = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBytes);

    // Add signature to query params
    queryParams.append("X-Amz-Signature", signature);

    // Generate final presigned URL
    const presignedUrl = `${endpointUrl.toString()}?${queryParams.toString()}`;
    const publicUrl = `${publicBaseUrl}/${uniqueFileName}`;

    console.log("Presigned URL generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        presignedUrl,
        publicUrl,
        fileName: uniqueFileName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate presigned URL",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
