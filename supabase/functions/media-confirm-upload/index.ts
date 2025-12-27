import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmUploadRequest {
  mediaAssetId: string;
  triggerIpfsPin?: boolean;
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

    const { mediaAssetId, triggerIpfsPin = true } = await req.json() as ConfirmUploadRequest;

    if (!mediaAssetId) {
      return new Response(JSON.stringify({ error: "Missing mediaAssetId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get media asset and verify ownership
    const { data: asset, error: fetchError } = await supabase
      .from("media_assets")
      .select("*")
      .eq("id", mediaAssetId)
      .eq("owner_id", user.id)
      .single();

    if (fetchError || !asset) {
      return new Response(JSON.stringify({ error: "Media asset not found or not owned by user" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if already confirmed (r2_url is set)
    if (asset.r2_url) {
      console.log(`Media asset ${mediaAssetId} already confirmed with r2_url: ${asset.r2_url}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Already confirmed",
        publicUrl: asset.r2_url 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build URLs:
    // - r2_url: direct R2 public URL (r2.dev) - used by Cloudflare Stream for ingestion
    // - publicUrl (returned to client): CDN URL for fast delivery to users
    const r2PublicUrl = (Deno.env.get("R2_PUBLIC_URL") || "").replace(/\/$/, "");
    const mediaCdnUrl = (Deno.env.get("MEDIA_CDN_URL") || r2PublicUrl).replace(/\/$/, "");
    
    // The R2 direct URL (stored in DB for Stream ingest)
    const r2DirectUrl = `${r2PublicUrl}/${asset.r2_key}`;
    // The CDN URL (returned to client for playback)
    const cdnUrl = `${mediaCdnUrl}/${asset.r2_key}`;
    
    // Verify file exists on R2 by making HEAD request
    console.log(`Verifying file exists on R2: ${r2DirectUrl}`);
    const headResponse = await fetch(r2DirectUrl, { method: "HEAD" });
    
    if (!headResponse.ok) {
      console.error(`File not found on R2: ${r2DirectUrl} - Status: ${headResponse.status}`);
      return new Response(JSON.stringify({ 
        error: "File not found on R2. Upload may have failed.",
        status: headResponse.status
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update media asset with R2 direct URL (NOT CDN URL)
    // This is critical for Cloudflare Stream to be able to download the video
    const { error: updateError } = await supabase
      .from("media_assets")
      .update({ 
        r2_url: r2DirectUrl,  // Store direct R2 URL for Stream ingest
        updated_at: new Date().toISOString()
      })
      .eq("id", mediaAssetId);

    if (updateError) {
      console.error("Failed to update media_assets:", updateError);
      return new Response(JSON.stringify({ error: "Failed to confirm upload" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Confirmed upload for media asset ${mediaAssetId}, r2_url: ${r2DirectUrl}, cdn: ${cdnUrl}`);

    // Trigger IPFS pinning if requested
    if (triggerIpfsPin) {
      console.log(`Triggering IPFS pin for ${mediaAssetId}`);
      
      // Call media-pin-to-ipfs function (fire-and-forget for background processing)
      const pinUrl = `${supabaseUrl}/functions/v1/media-pin-to-ipfs`;
      fetch(pinUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ mediaAssetId }),
      }).catch((err) => {
        console.warn("IPFS pin trigger failed (will be retried by scheduler):", err);
      });
    }

    // Trigger Cloudflare Stream ingest for videos
    if (asset.type === "video") {
      console.log(`Triggering Stream ingest for video: ${mediaAssetId}`);
      
      const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
      const streamUrl = `${supabaseUrl}/functions/v1/media-stream-ingest`;
      
      fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": internalSecret || "",
        },
        body: JSON.stringify({ mediaAssetId }),
      }).catch((err) => {
        console.warn("Stream ingest trigger failed:", err);
      });
    }

    return new Response(JSON.stringify({
      success: true,
      publicUrl: cdnUrl,  // Return CDN URL for client playback
      r2Url: r2DirectUrl, // Also return R2 URL for debugging
      message: "Upload confirmed successfully",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error in media-confirm-upload:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
