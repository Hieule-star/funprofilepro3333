import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CloudflareStreamVideoResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: {
    uid: string;
    status: {
      state: string;
      pctComplete?: string;
      errorReasonCode?: string;
      errorReasonText?: string;
    };
    readyToStream: boolean;
    playback: {
      hls: string;
      dash: string;
    };
  } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cfAccountId = Deno.env.get("CF_ACCOUNT_ID");
    const cfApiToken = Deno.env.get("CF_STREAM_API_TOKEN");

    if (!cfAccountId || !cfApiToken) {
      return new Response(JSON.stringify({ error: "Missing Stream credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all media assets with stream_status = 'processing'
    const { data: processingAssets, error: fetchError } = await supabase
      .from("media_assets")
      .select("id, stream_id, stream_playback_url")
      .eq("stream_status", "processing")
      .not("stream_id", "is", null)
      .limit(50);

    if (fetchError) {
      console.error("[Stream Status] Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!processingAssets || processingAssets.length === 0) {
      console.log("[Stream Status] No processing videos found");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No processing videos",
        checked: 0,
        updated: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Stream Status] Checking ${processingAssets.length} videos`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const asset of processingAssets) {
      if (!asset.stream_id) continue;

      try {
        // Check Stream status via API
        const statusUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${asset.stream_id}`;
        const response = await fetch(statusUrl, {
          headers: {
            "Authorization": `Bearer ${cfApiToken}`,
          },
        });

        const data: CloudflareStreamVideoResponse = await response.json();

        if (!data.success || !data.result) {
          console.warn(`[Stream Status] Failed to get status for ${asset.stream_id}`);
          continue;
        }

        const { readyToStream, status, playback } = data.result;

        if (readyToStream) {
          // Video is ready - update status
          const updateData: Record<string, unknown> = {
            stream_status: "ready",
            updated_at: new Date().toISOString(),
          };

          // Update playback URL if available
          if (playback?.hls && !asset.stream_playback_url?.includes("hls")) {
            updateData.stream_playback_url = playback.hls;
          }

          await supabase
            .from("media_assets")
            .update(updateData)
            .eq("id", asset.id);

          console.log(`[Stream Status] Video ready: ${asset.id}`);
          updatedCount++;
        } else if (status?.state === "error") {
          // Video processing failed
          await supabase
            .from("media_assets")
            .update({
              stream_status: "error",
              updated_at: new Date().toISOString(),
            })
            .eq("id", asset.id);

          console.error(`[Stream Status] Video error: ${asset.id} - ${status.errorReasonText}`);
          errorCount++;
        } else {
          console.log(`[Stream Status] Still processing: ${asset.id} - ${status?.pctComplete || "0"}%`);
        }
      } catch (err) {
        console.error(`[Stream Status] Error checking ${asset.stream_id}:`, err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checked: processingAssets.length,
      updated: updatedCount,
      errors: errorCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[Stream Status] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
