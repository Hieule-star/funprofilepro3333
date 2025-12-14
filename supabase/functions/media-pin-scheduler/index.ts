import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PIN_ATTEMPTS = 5;
const BATCH_SIZE = 10;

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

  const cid = response.headers.get("x-amz-meta-cid");
  if (!cid) {
    throw new Error("No CID returned from Filebase");
  }

  const gatewayBaseUrl = Deno.env.get("IPFS_GATEWAY_BASE_URL") || "https://ipfs.filebase.io/ipfs";
  return { cid, gatewayUrl: `${gatewayBaseUrl}/${cid}` };
}

interface MediaAsset {
  id: string;
  r2_url: string;
  r2_key: string;
  mime: string;
  pin_status: string;
  pin_attempts: number;
  updated_at: string;
}

async function processAsset(
  supabase: SupabaseClient,
  asset: MediaAsset,
  filebaseAccessKey: string,
  filebaseSecretKey: string,
  filebaseBucket: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update status to pinning
    await supabase
      .from("media_assets")
      .update({ pin_status: "pinning" } as never)
      .eq("id", asset.id);

    // Download from R2
    console.log(`Downloading from R2: ${asset.r2_url}`);
    const r2Response = await fetch(asset.r2_url);
    if (!r2Response.ok) {
      throw new Error(`Failed to download from R2: ${r2Response.status}`);
    }
    const fileData = new Uint8Array(await r2Response.arrayBuffer());

    // Pin to Filebase
    console.log(`Pinning to Filebase: ${asset.r2_key}`);
    const { cid, gatewayUrl } = await pinToFilebase(
      fileData,
      asset.r2_key,
      asset.mime,
      filebaseAccessKey,
      filebaseSecretKey,
      filebaseBucket
    );

    const sha256Hash = await sha256Hex(fileData);

    // Update success
    await supabase
      .from("media_assets")
      .update({
        ipfs_cid: cid,
        ipfs_gateway_url: gatewayUrl,
        pin_provider: "filebase",
        pin_status: "pinned",
        sha256: sha256Hash,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", asset.id);

    console.log(`Successfully pinned ${asset.id} with CID: ${cid}`);
    return { success: true };

  } catch (error: unknown) {
    console.error(`Failed to pin ${asset.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update failure with incremented attempts
    await supabase
      .from("media_assets")
      .update({
        pin_status: "failed",
        pin_attempts: asset.pin_attempts + 1,
        last_pin_error: errorMessage,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", asset.id);

    return { success: false, error: errorMessage };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const filebaseAccessKey = Deno.env.get("FILEBASE_ACCESS_KEY")!;
    const filebaseSecretKey = Deno.env.get("FILEBASE_SECRET_KEY")!;
    const filebaseBucket = Deno.env.get("FILEBASE_BUCKET")!;

    // Query pending assets that haven't exceeded max attempts
    // Also include failed assets for retry (with exponential backoff logic in filtering)
    const { data: pendingAssets, error: queryError } = await supabase
      .from("media_assets")
      .select("*")
      .in("pin_status", ["pending", "failed"])
      .lt("pin_attempts", MAX_PIN_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (queryError) {
      console.error("Failed to query pending assets:", queryError);
      return new Response(JSON.stringify({ error: "Failed to query assets" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!pendingAssets || pendingAssets.length === 0) {
      console.log("No pending assets to process");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No pending assets",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Processing ${pendingAssets.length} pending assets`);

    // Filter failed assets based on exponential backoff
    const now = Date.now();
    const assetsToProcess = (pendingAssets as MediaAsset[]).filter(asset => {
      if (asset.pin_status === "pending") return true;
      
      // Exponential backoff: 1min, 2min, 4min, 8min, 16min
      const backoffMs = Math.pow(2, asset.pin_attempts) * 60 * 1000;
      const lastAttemptTime = new Date(asset.updated_at).getTime();
      return (now - lastAttemptTime) >= backoffMs;
    });

    if (assetsToProcess.length === 0) {
      console.log("All failed assets are still in backoff period");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "All assets in backoff period",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Process assets sequentially to avoid overwhelming external services
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const asset of assetsToProcess) {
      const result = await processAsset(
        supabase,
        asset,
        filebaseAccessKey,
        filebaseSecretKey,
        filebaseBucket
      );
      
      results.processed++;
      if (result.success) {
        results.succeeded++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`${asset.id}: ${result.error}`);
        }
      }

      // Small delay between assets to be nice to external APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Scheduler complete: ${results.succeeded} succeeded, ${results.failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error in media-pin-scheduler:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
