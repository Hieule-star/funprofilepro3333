import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Cloud, CheckCircle2, XCircle, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StreamConfig {
  accountId: string;
  apiTokenMasked: string;
  updatedAt: string;
}

interface RecentVideo {
  id: string;
  original_filename: string;
  stream_status: string | null;
  stream_id: string | null;
  last_pin_error: string | null;
  created_at: string;
}

export default function CloudflareStreamConfig() {
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<StreamConfig | null>(null);
  const [hasEnvConfig, setHasEnvConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchRecentVideos();
  }, []);

  async function fetchConfig() {
    try {
      const { data, error } = await supabase.functions.invoke("admin-cloudflare-stream-config", {
        body: { action: "get" },
      });

      if (error) throw error;

      if (data.config) {
        setCurrentConfig(data.config);
        setAccountId(data.config.accountId);
      }
      setHasEnvConfig(data.hasEnvConfig || false);
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecentVideos() {
    const { data, error } = await supabase
      .from("media_assets")
      .select("id, original_filename, stream_status, stream_id, last_pin_error, created_at")
      .eq("type", "video")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentVideos(data);
    }
  }

  async function handleVerify() {
    if (!accountId || !apiToken) {
      toast.error("Vui lòng nhập Account ID và API Token");
      return;
    }

    setVerifying(true);
    setVerified(null);

    try {
      const { data, error } = await supabase.functions.invoke("admin-cloudflare-stream-config", {
        body: { action: "verify", accountId, apiToken },
      });

      if (error) throw error;

      if (data.success) {
        setVerified(true);
        toast.success("Token hợp lệ và có quyền Stream!");
      } else {
        setVerified(false);
        toast.error(data.error || "Token không hợp lệ");
      }
    } catch (error) {
      setVerified(false);
      toast.error("Lỗi xác thực token");
      console.error(error);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave() {
    if (!accountId || !apiToken) {
      toast.error("Vui lòng nhập Account ID và API Token");
      return;
    }

    if (!verified) {
      toast.error("Vui lòng xác thực token trước khi lưu");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-cloudflare-stream-config", {
        body: { action: "save", accountId, apiToken },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Đã lưu cấu hình Cloudflare Stream");
        setApiToken("");
        fetchConfig();
      } else {
        toast.error(data.error || "Lưu thất bại");
      }
    } catch (error) {
      toast.error("Lỗi lưu cấu hình");
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function handleRetryStream(mediaAssetId: string) {
    setRetryingId(mediaAssetId);
    try {
      const { data, error } = await supabase.functions.invoke("media-stream-retry", {
        body: { mediaAssetId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Đã gửi video đến Cloudflare Stream");
        fetchRecentVideos();
      } else {
        toast.error(data.error || "Retry thất bại");
      }
    } catch (error) {
      toast.error("Lỗi retry stream");
      console.error(error);
    } finally {
      setRetryingId(null);
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-500">Ready</Badge>;
      case "processing":
        return <Badge className="bg-yellow-500">Processing</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-orange-500/10 rounded-lg">
          <Cloud className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cloudflare Stream</h2>
          <p className="text-sm text-muted-foreground">Cấu hình video streaming</p>
        </div>
      </div>

      {/* Current Config Status */}
      <div className="mb-6 p-4 rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">Trạng thái hiện tại</h3>
        {currentConfig ? (
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Account ID:</span> {currentConfig.accountId}</p>
            <p><span className="text-muted-foreground">API Token:</span> {currentConfig.apiTokenMasked}</p>
            <p><span className="text-muted-foreground">Cập nhật:</span> {new Date(currentConfig.updatedAt).toLocaleString("vi-VN")}</p>
          </div>
        ) : hasEnvConfig ? (
          <p className="text-sm text-muted-foreground">Đang sử dụng config từ environment variables</p>
        ) : (
          <p className="text-sm text-destructive">Chưa cấu hình Cloudflare Stream</p>
        )}
      </div>

      {/* Config Form */}
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="cf-account-id">Cloudflare Account ID</Label>
          <Input
            id="cf-account-id"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setVerified(null);
            }}
            placeholder="Nhập Account ID"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="cf-api-token">Stream API Token</Label>
          <div className="relative mt-2">
            <Input
              id="cf-api-token"
              type={showToken ? "text" : "password"}
              value={apiToken}
              onChange={(e) => {
                setApiToken(e.target.value);
                setVerified(null);
              }}
              placeholder="Nhập API Token có quyền Stream"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Token cần có quyền: Stream:Edit
          </p>
        </div>

        {/* Verify Status */}
        {verified !== null && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${verified ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
            {verified ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">
              {verified ? "Token hợp lệ" : "Token không hợp lệ hoặc thiếu quyền"}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleVerify} disabled={verifying || !accountId || !apiToken}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Xác thực
          </Button>
          <Button onClick={handleSave} disabled={saving || !verified}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Lưu cấu hình
          </Button>
        </div>
      </div>

      {/* Recent Videos Status */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Video gần đây</h3>
          <Button variant="ghost" size="sm" onClick={fetchRecentVideos}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {recentVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có video nào</p>
        ) : (
          <div className="space-y-3">
            {recentVideos.map((video) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{video.original_filename || video.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(video.created_at).toLocaleString("vi-VN")}
                  </p>
                  {video.last_pin_error && video.stream_status === "error" && (
                    <p className="text-xs text-destructive mt-1 truncate" title={video.last_pin_error}>
                      {video.last_pin_error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getStatusBadge(video.stream_status)}
                  {video.stream_id ? (
                    <Badge variant="outline" className="text-xs">{video.stream_id.slice(0, 8)}...</Badge>
                  ) : null}
                  {(video.stream_status === "error" || !video.stream_id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRetryStream(video.id)}
                      disabled={retryingId === video.id}
                    >
                      {retryingId === video.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
