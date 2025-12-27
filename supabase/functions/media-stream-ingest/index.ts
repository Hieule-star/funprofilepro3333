import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface StreamCopyRequest {
  mediaAssetId: string;
}

interface CloudflareStreamResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: {
    uid: string;
    preview: string;
    thumbnail: string;
    playback: {
      hls: string;
      dash: string;
    };
    status: {
      state: string;
      pctComplete?: string;
      errorReasonCode?: string;
      errorReasonText?: string;
    };
    readyToStream: boolean;
    meta: Record<string, string>;
  } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal secret (for internal function calls)
    const internalSecret = req.headers.get("X-Internal-Secret");
    const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    
    // Also allow service role calls (for manual triggers/debugging)
    const authHeader = req.headers.get("Authorization");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = authHeader?.includes(supabaseServiceKey);
    
    if (!internalSecret && !isServiceRole) {
      console.error("Unauthorized: Missing internal secret or service role");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (internalSecret && internalSecret !== expectedSecret) {
      console.error("Unauthorized: Invalid internal secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mediaAssetId } = await req.json() as StreamCopyRequest;

    if (!mediaAssetId) {
      return new Response(JSON.stringify({ error: "Missing mediaAssetId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Stream Ingest] Starting for mediaAssetId: ${mediaAssetId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get media asset from database
    const { data: asset, error: fetchError } = await supabase
      .from("media_assets")
      .select("*")
      .eq("id", mediaAssetId)
      .single();

    if (fetchError || !asset) {
      console.error(`[Stream Ingest] Asset not found: ${mediaAssetId}`, fetchError);
      return new Response(JSON.stringify({ error: "Media asset not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify it's a video
    if (asset.type !== "video") {
      console.log(`[Stream Ingest] Skipping non-video asset: ${asset.type}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Skipped: not a video" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already processed
    if (asset.stream_id) {
      console.log(`[Stream Ingest] Already has stream_id: ${asset.stream_id}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Already ingested",
        streamId: asset.stream_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the video URL from R2
    const videoUrl = asset.r2_url;
    if (!videoUrl) {
      console.error(`[Stream Ingest] No R2 URL for asset: ${mediaAssetId}`);
      return new Response(JSON.stringify({ error: "No R2 URL available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to processing
    await supabase
      .from("media_assets")
      .update({ stream_status: "processing" })
      .eq("id", mediaAssetId);

    // Get Cloudflare Stream credentials - priority: admin_settings > env vars
    let cfAccountId = Deno.env.get("CF_ACCOUNT_ID");
    let cfApiToken = Deno.env.get("CF_STREAM_API_TOKEN");

    // Try to get from admin_settings first
    const { data: configData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "cloudflare_stream_config")
      .single();

    if (configData?.value) {
      const config = configData.value as { accountId: string; apiToken: string };
      if (config.accountId && config.apiToken) {
        cfAccountId = config.accountId;
        cfApiToken = config.apiToken;
        console.log("[Stream Ingest] Using config from admin_settings");
      }
    }

    if (!cfAccountId || !cfApiToken) {
      console.error("[Stream Ingest] Missing Cloudflare Stream credentials");
      await supabase
        .from("media_assets")
        .update({ 
          stream_status: "error",
          last_pin_error: "Missing Cloudflare Stream credentials"
        })
        .eq("id", mediaAssetId);
      return new Response(JSON.stringify({ error: "Missing Stream credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Stream Ingest] Copying video to Stream: ${videoUrl}`);

    // Call Cloudflare Stream API to copy video from URL
    const streamApiUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/copy`;
    
    const streamResponse = await fetch(streamApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: videoUrl,
        meta: {
          name: asset.original_filename || `video-${mediaAssetId}`,
          mediaAssetId: mediaAssetId,
          ownerId: asset.owner_id,
        },
        requireSignedURLs: false,
      }),
    });

    const streamData: CloudflareStreamResponse = await streamResponse.json();
    console.log(`[Stream Ingest] Stream API response:`, JSON.stringify(streamData));

    if (!streamData.success || !streamData.result) {
      const errorMsg = streamData.errors?.[0]?.message || "Unknown Stream API error";
      console.error(`[Stream Ingest] Stream API error: ${errorMsg}`);
      
      await supabase
        .from("media_assets")
        .update({ stream_status: "error" })
        .eq("id", mediaAssetId);

      return new Response(JSON.stringify({ 
        error: errorMsg,
        details: streamData.errors,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { uid, playback, preview, thumbnail, readyToStream } = streamData.result;

    // Prefer HLS URL, fallback to preview/embed URL
    // Format: https://customer-{code}.cloudflarestream.com/{uid}/iframe for embed
    // Or playback.hls for HLS.js
    const streamPlaybackUrl = playback?.hls || preview || `https://customer-${cfAccountId}.cloudflarestream.com/${uid}/iframe`;

    console.log(`[Stream Ingest] Stream created: uid=${uid}, hls=${playback?.hls}`);

    // Update media asset with stream info
    const { error: updateError } = await supabase
      .from("media_assets")
      .update({
        stream_id: uid,
        stream_playback_url: streamPlaybackUrl,
        stream_status: readyToStream ? "ready" : "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mediaAssetId);

    if (updateError) {
      console.error(`[Stream Ingest] Failed to update asset:`, updateError);
    }

    console.log(`[Stream Ingest] Successfully ingested video, stream_id: ${uid}`);

    return new Response(JSON.stringify({
      success: true,
      streamId: uid,
      playbackUrl: streamPlaybackUrl,
      thumbnailUrl: thumbnail,
      readyToStream,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[Stream Ingest] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
