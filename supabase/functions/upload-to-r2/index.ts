/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  file: {
    name: string;
    type: string;
    base64: string; // Base64 encoded file data
  };
  folder?: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const enc = new TextEncoder();
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
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
    console.log("Upload request received");

    const { file, folder = "uploads" } = (await req.json()) as UploadRequest;

    if (!file || !file.base64 || !file.name || !file.type) {
      console.error("Missing required file data");
      return new Response(
        JSON.stringify({ error: "Missing required file data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const endpoint = Deno.env.get("R2_ENDPOINT") || "";
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") || "";
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
    const bucketName = Deno.env.get("R2_BUCKET_NAME") || "";
    const publicBaseUrl = Deno.env.get("R2_PUBLIC_URL") || "";

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
      console.error("Missing R2 configuration in environment variables");
      return new Response(
        JSON.stringify({ error: "Server storage is not configured correctly" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `${folder}/${timestamp}-${randomStr}.${fileExtension}`;

    console.log(`Uploading file: ${fileName}`);

    // Convert base64 to bytes
    const base64Data = file.base64.split(",")[1] || file.base64;
    const binaryString = atob(base64Data);
    const bodyBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bodyBytes[i] = binaryString.charCodeAt(i);
    }

    // Prepare SigV4 values
    const now = new Date();
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
    endpointUrl.pathname = `/${bucketName}/${fileName}`;

    const host = endpointUrl.host;
    const canonicalUri = endpointUrl.pathname;
    const payloadHash = await sha256Hex(bodyBytes);

    const canonicalHeadersMap: Record<string, string> = {
      "content-type": file.type,
      host,
      "x-amz-acl": "public-read",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };

    const sortedHeaderKeys = Object.keys(canonicalHeadersMap).sort();
    const canonicalHeaders = sortedHeaderKeys
      .map((key) => `${key}:${canonicalHeadersMap[key]}\n`)
      .join("");
    const signedHeaders = sortedHeaderKeys.join(";");

    const canonicalRequest = [
      "PUT",
      canonicalUri,
      "", // query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signatureBytes = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBytes);

    const authorizationHeader =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const uploadResponse = await fetch(endpointUrl.toString(), {
      method: "PUT",
      headers: {
        host,
        "Content-Type": file.type,
        "x-amz-acl": "public-read",
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorizationHeader,
      },
      body: bodyBytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("R2 upload failed:", uploadResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Upload failed",
          details: `R2 error ${uploadResponse.status}: ${errorText}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("File uploaded successfully to R2");

    const fileUrl = `${publicBaseUrl}/${fileName}`;

    return new Response(
      JSON.stringify({ success: true, url: fileUrl, fileName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
