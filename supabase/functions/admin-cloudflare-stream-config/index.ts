import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfigRequest {
  action: "get" | "verify" | "save";
  accountId?: string;
  apiToken?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    
    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("[CF Config] Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("[CF Config] Not admin:", user.id);
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, accountId, apiToken } = await req.json() as ConfigRequest;
    console.log(`[CF Config] Action: ${action}, User: ${user.id}`);

    // GET: Return current config (masked)
    if (action === "get") {
      const { data: configData } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "cloudflare_stream_config")
        .single();

      if (configData?.value) {
        const config = configData.value as { accountId: string; apiTokenMasked: string; updatedAt: string };
        return new Response(JSON.stringify({
          success: true,
          config: {
            accountId: config.accountId,
            apiTokenMasked: config.apiTokenMasked,
            updatedAt: config.updatedAt,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if env vars are set
      const envAccountId = Deno.env.get("CF_ACCOUNT_ID");
      const envToken = Deno.env.get("CF_STREAM_API_TOKEN");
      
      return new Response(JSON.stringify({
        success: true,
        config: null,
        hasEnvConfig: !!(envAccountId && envToken),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // VERIFY: Test the token with Cloudflare
    if (action === "verify") {
      if (!accountId || !apiToken) {
        return new Response(JSON.stringify({ error: "Missing accountId or apiToken" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[CF Config] Verifying token for account: ${accountId}`);

      // Verify token by calling Cloudflare API
      const verifyResponse = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      });

      const verifyData = await verifyResponse.json();
      console.log("[CF Config] Token verify response:", JSON.stringify(verifyData));

      if (!verifyData.success) {
        return new Response(JSON.stringify({
          success: false,
          error: "Token verification failed",
          details: verifyData.errors,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if token has Stream permissions by trying to list videos
      const streamResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?limit=1`,
        {
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const streamData = await streamResponse.json();
      console.log("[CF Config] Stream access check:", JSON.stringify(streamData));

      if (!streamData.success) {
        return new Response(JSON.stringify({
          success: false,
          error: "Token does not have Stream access for this account",
          details: streamData.errors,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Token verified with Stream access",
        tokenStatus: verifyData.result?.status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SAVE: Save config to admin_settings
    if (action === "save") {
      if (!accountId || !apiToken) {
        return new Response(JSON.stringify({ error: "Missing accountId or apiToken" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mask token for display (show first 4 and last 4 chars)
      const maskedToken = apiToken.length > 8
        ? `${apiToken.slice(0, 4)}...${apiToken.slice(-4)}`
        : "****";

      const configValue = {
        accountId,
        apiToken,
        apiTokenMasked: maskedToken,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      };

      // Upsert config
      const { error: upsertError } = await supabase
        .from("admin_settings")
        .upsert({
          key: "cloudflare_stream_config",
          value: configValue,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      if (upsertError) {
        console.error("[CF Config] Save error:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save config" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[CF Config] Config saved by ${user.id}`);

      return new Response(JSON.stringify({
        success: true,
        message: "Config saved successfully",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[CF Config] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
