import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnpinRequest {
  mediaAssetId: string;
}

// AWS Signature V4 helpers for Filebase DELETE
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

async function deleteFromFilebase(
  fileName: string,
  accessKey: string,
  secretKey: string,
  bucket: string
): Promise<void> {
  const host = "s3.filebase.com";
  const region = "us-east-1";
  const service = "s3";
  
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = dateStamp + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";

  const emptyPayloadHash = await sha256Hex("");
  
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${emptyPayloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n") + "\n";

  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "DELETE",
    `/${bucket}/${fileName}`,
    "",
    canonicalHeaders,
    signedHeaders,
    emptyPayloadHash,
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
    method: "DELETE",
    headers: {
      "Host": host,
      "x-amz-content-sha256": emptyPayloadHash,
      "x-amz-date": amzDate,
      "Authorization": authHeader,
    },
  });

  // 204 No Content is success for DELETE
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Filebase delete failed: ${response.status} - ${errorText}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - require authenticated user
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

    const { mediaAssetId } = await req.json() as UnpinRequest;

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

    // Check ownership or admin role
    const isOwner = asset.owner_id === user.id;
    
    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    
    const isAdmin = !!roleData;

    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Skip if not pinned
    if (asset.pin_status !== "pinned" || !asset.r2_key) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Asset not pinned or no key available" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      // Delete from Filebase
      const filebaseAccessKey = Deno.env.get("FILEBASE_ACCESS_KEY")!;
      const filebaseSecretKey = Deno.env.get("FILEBASE_SECRET_KEY")!;
      const filebaseBucket = Deno.env.get("FILEBASE_BUCKET")!;

      console.log(`Unpinning from Filebase: ${asset.r2_key}`);
      await deleteFromFilebase(
        asset.r2_key,
        filebaseAccessKey,
        filebaseSecretKey,
        filebaseBucket
      );

      // Update media asset status
      await supabase
        .from("media_assets")
        .update({
          pin_status: "unpinned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", mediaAssetId);

      console.log(`Successfully unpinned ${mediaAssetId}`);

      return new Response(JSON.stringify({
        success: true,
        message: "Asset unpinned successfully",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (unpinError: unknown) {
      console.error(`Unpinning failed for ${mediaAssetId}:`, unpinError);
      const errorMessage = unpinError instanceof Error ? unpinError.message : "Unknown error";
      
      return new Response(JSON.stringify({ 
        error: "Unpinning failed", 
        details: errorMessage 
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error: unknown) {
    console.error("Error in media-unpin-ipfs:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
