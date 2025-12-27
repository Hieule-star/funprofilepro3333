import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmUploadRequest {
  mediaAssetId: string;
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

    const { mediaAssetId } = await req.json() as ConfirmUploadRequest;

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
      console.log(`[Simple Media] Asset ${mediaAssetId} already confirmed: ${asset.r2_url}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Already confirmed",
        publicUrl: asset.r2_url 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build CDN URL for client playback
    const mediaCdnUrl = (Deno.env.get("MEDIA_CDN_URL") || Deno.env.get("R2_PUBLIC_URL") || "").replace(/\/$/, "");
    const cdnUrl = `${mediaCdnUrl}/${asset.r2_key}`;

    // Verify file exists on CDN by making HEAD request
    console.log(`[Simple Media] Verifying file exists: ${cdnUrl}`);
    const headResponse = await fetch(cdnUrl, { method: "HEAD" });
    
    if (!headResponse.ok) {
      console.error(`[Simple Media] File not found: ${cdnUrl} - Status: ${headResponse.status}`);
      return new Response(JSON.stringify({ 
        error: "File not found. Upload may have failed.",
        status: headResponse.status
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update media asset with CDN URL (simple - no Stream/IPFS)
    const { error: updateError } = await supabase
      .from("media_assets")
      .update({ 
        r2_url: cdnUrl,
        pin_status: "pinned", // Mark as "pinned" for compatibility (means ready)
        updated_at: new Date().toISOString()
      })
      .eq("id", mediaAssetId);

    if (updateError) {
      console.error("[Simple Media] Failed to update media_assets:", updateError);
      return new Response(JSON.stringify({ error: "Failed to confirm upload" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[Simple Media] Confirmed upload: ${mediaAssetId} → ${cdnUrl}`);

    return new Response(JSON.stringify({
      success: true,
      publicUrl: cdnUrl,
      message: "Upload confirmed successfully",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("[Simple Media] Error in media-confirm-upload:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
