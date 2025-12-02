import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("error");
        setErrorMessage(errorDescription || "Có lỗi xảy ra khi xác nhận email");
        return;
      }

      // Check session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setStatus("success");
      } else {
        // Wait a moment for session to be established
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setStatus("success");
          } else {
            setStatus("error");
            setErrorMessage("Không thể xác minh phiên đăng nhập. Vui lòng thử đăng nhập lại.");
          }
        }, 1500);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            {status === "loading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">Đang xử lý...</h2>
                <p className="text-muted-foreground">Vui lòng đợi trong giây lát</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="h-8 w-8 text-yellow-400" />
                  </motion.div>
                </div>
                
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-primary bg-clip-text text-transparent">
                    Xác nhận email thành công! 🎉
                  </h1>
                  <p className="text-muted-foreground">
                    Chào mừng bạn đến với <span className="font-semibold text-primary">Fun Profile</span>!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tài khoản của bạn đã được kích hoạt. Hãy bắt đầu khám phá ngay!
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button 
                    onClick={() => navigate("/")}
                    className="w-full bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground font-semibold"
                    size="lg"
                  >
                    Vào ứng dụng
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <XCircle className="h-20 w-20 text-destructive mx-auto" />
                </motion.div>
                
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-destructive">
                    Xác nhận thất bại
                  </h1>
                  <p className="text-muted-foreground">
                    {errorMessage}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/auth")}
                    className="w-full"
                  >
                    Quay lại đăng nhập
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Nếu gặp vấn đề, hãy thử đăng ký lại với email khác
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
