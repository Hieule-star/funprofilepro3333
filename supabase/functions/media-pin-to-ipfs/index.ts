import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PinRequest {
  mediaAssetId: string;
}

// AWS Signature V4 helpers for Filebase
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  return toHex(await sha256(bytes));
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

async function pinToFilebase(
  fileData: Uint8Array,
  fileName: string,
  contentType: string,
  accessKey: string,
  secretKey: string,
  bucket: string
): Promise<{ cid: string; gatewayUrl: string }> {
  const host = "s3.filebase.com";
  const region = "us-east-1";
  const service = "s3";
  
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = dateStamp + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";

  const payloadHash = await sha256Hex(fileData);
  
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n") + "\n";

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    `/${bucket}/${fileName}`,
    "",
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

  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}/${bucket}/${fileName}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Host": host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Authorization": authHeader,
    },
    body: fileData.buffer as ArrayBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Filebase upload failed: ${response.status} - ${errorText}`);
  }

  // Get CID from response header
  const cid = response.headers.get("x-amz-meta-cid");
  if (!cid) {
    throw new Error("No CID returned from Filebase");
  }

  const gatewayBaseUrl = Deno.env.get("IPFS_GATEWAY_BASE_URL") || "https://ipfs.filebase.io/ipfs";
  const gatewayUrl = `${gatewayBaseUrl}/${cid}`;

  return { cid, gatewayUrl };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mediaAssetId } = await req.json() as PinRequest;

    if (!mediaAssetId) {
      return new Response(JSON.stringify({ error: "Missing mediaAssetId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get media asset
    const { data: asset, error: fetchError } = await supabase
      .from("media_assets")
      .select("*")
      .eq("id", mediaAssetId)
      .single();

    if (fetchError || !asset) {
      return new Response(JSON.stringify({ error: "Media asset not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Skip if already pinned
    if (asset.pin_status === "pinned") {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Already pinned",
        cid: asset.ipfs_cid 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if r2_url is set (upload must be confirmed first)
    if (!asset.r2_url) {
      console.log(`Media asset ${mediaAssetId} has no r2_url yet - upload not confirmed`);
      return new Response(JSON.stringify({ 
        error: "Upload not confirmed yet",
        message: "R2 upload must be confirmed before IPFS pinning" 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update status to pinning
    await supabase
      .from("media_assets")
      .update({ pin_status: "pinning" })
      .eq("id", mediaAssetId);

    try {
      // Download file from R2
      console.log(`Downloading file from R2: ${asset.r2_url}`);
      const r2Response = await fetch(asset.r2_url);
      if (!r2Response.ok) {
        throw new Error(`Failed to download from R2: ${r2Response.status}`);
      }
      const fileData = new Uint8Array(await r2Response.arrayBuffer());

      // Pin to Filebase
      const filebaseAccessKey = Deno.env.get("FILEBASE_ACCESS_KEY")!;
      const filebaseSecretKey = Deno.env.get("FILEBASE_SECRET_KEY")!;
      const filebaseBucket = Deno.env.get("FILEBASE_BUCKET")!;

      console.log(`Pinning to Filebase: ${asset.r2_key}`);
      const { cid, gatewayUrl } = await pinToFilebase(
        fileData,
        asset.r2_key,
        asset.mime,
        filebaseAccessKey,
        filebaseSecretKey,
        filebaseBucket
      );

      // Compute SHA256 of file
      const sha256Hash = await sha256Hex(fileData);

      // Update media asset with IPFS info
      await supabase
        .from("media_assets")
        .update({
          ipfs_cid: cid,
          ipfs_gateway_url: gatewayUrl,
          pin_provider: "filebase",
          pin_status: "pinned",
          sha256: sha256Hash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mediaAssetId);

      console.log(`Successfully pinned ${mediaAssetId} to IPFS with CID: ${cid}`);

      return new Response(JSON.stringify({
        success: true,
        cid,
        gatewayUrl,
        sha256: sha256Hash,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (pinError: unknown) {
      console.error(`Pinning failed for ${mediaAssetId}:`, pinError);
      const errorMessage = pinError instanceof Error ? pinError.message : "Unknown error";

      // Update with failure
      await supabase
        .from("media_assets")
        .update({
          pin_status: "failed",
          pin_attempts: asset.pin_attempts + 1,
          last_pin_error: errorMessage,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", mediaAssetId);

      return new Response(JSON.stringify({ 
        error: "Pinning failed", 
        details: errorMessage 
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error: unknown) {
    console.error("Error in media-pin-to-ipfs:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
