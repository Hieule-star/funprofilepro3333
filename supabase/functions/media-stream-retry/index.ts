import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetryRequest {
  mediaAssetId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cfAccountId = Deno.env.get("CF_ACCOUNT_ID");
    const cfStreamToken = Deno.env.get("CF_STREAM_API_TOKEN");

    if (!cfAccountId || !cfStreamToken) {
      console.error("[Stream Retry] Missing Cloudflare credentials");
      return new Response(
        JSON.stringify({ error: "Cloudflare Stream not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mediaAssetId } = await req.json() as RetryRequest;

    if (!mediaAssetId) {
      return new Response(
        JSON.stringify({ error: "mediaAssetId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Stream Retry] Retrying for mediaAssetId: ${mediaAssetId}`);

    // Get the media asset
    const { data: asset, error: fetchError } = await supabase
      .from("media_assets")
      .select("*")
      .eq("id", mediaAssetId)
      .single();

    if (fetchError || !asset) {
      console.error("[Stream Retry] Asset not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Media asset not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (asset.type !== "video") {
      return new Response(
        JSON.stringify({ error: "Asset is not a video" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!asset.r2_url) {
      return new Response(
        JSON.stringify({ error: "Video has no R2 URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Stream Retry] Video URL: ${asset.r2_url}`);

    // Update status to processing
    await supabase
      .from("media_assets")
      .update({ stream_status: "processing" })
      .eq("id", mediaAssetId);

    // Call Cloudflare Stream API to copy the video
    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/copy`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cfStreamToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: asset.r2_url,
          meta: {
            name: asset.original_filename || `video-${mediaAssetId}`,
            mediaAssetId: mediaAssetId,
          },
        }),
      }
    );

    const streamData = await streamResponse.json();
    console.log(`[Stream Retry] Stream API response:`, JSON.stringify(streamData));

    if (!streamData.success) {
      const errorMsg = streamData.errors?.[0]?.message || "Unknown Stream API error";
      console.error(`[Stream Retry] Stream API error: ${errorMsg}`);

      await supabase
        .from("media_assets")
        .update({ 
          stream_status: "error",
          last_pin_error: `Stream: ${errorMsg}`
        })
        .eq("id", mediaAssetId);

      return new Response(
        JSON.stringify({ error: errorMsg, details: streamData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const streamResult = streamData.result;
    const streamId = streamResult.uid;
    const playbackUrl = streamResult.playback?.hls || null;

    console.log(`[Stream Retry] Success! Stream ID: ${streamId}`);

    // Update the media asset with stream info
    await supabase
      .from("media_assets")
      .update({
        stream_id: streamId,
        stream_playback_url: playbackUrl,
        stream_status: "processing", // Will be updated to ready by status checker
      })
      .eq("id", mediaAssetId);

    return new Response(
      JSON.stringify({
        success: true,
        streamId,
        playbackUrl,
        message: "Video submitted to Cloudflare Stream for processing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Stream Retry] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
