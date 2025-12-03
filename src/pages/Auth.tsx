import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import ConnectWalletModal from "@/components/wallet/ConnectWalletModal";
import { supabase } from "@/integrations/supabase/client";

const signUpSchema = z.object({
  email: z.string().email("Email không hợp lệ").max(255),
  username: z.string().min(3, "Username phải có ít nhất 3 ký tự").max(50),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").max(100),
});

const signInSchema = z.object({
  email: z.string().email("Email không hợp lệ").max(255),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export default function Auth() {
  const { user, signUp, signIn, signInWithGoogle, signInWithFacebook } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showConfirmationSuccess, setShowConfirmationSuccess] = useState(false);

  // Sign Up Form
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  // Sign In Form
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Handle email confirmation from URL hash
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAccessToken = hashParams.has('access_token');

    if (!hasAccessToken) return;

    console.log('Detected access_token in URL, processing email confirmation...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, !!session);
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          setShowConfirmationSuccess(true);
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      }
    );

    // Check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setShowConfirmationSuccess(true);
        setTimeout(() => navigate('/'), 2000);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Redirect if already logged in (and not showing confirmation)
  useEffect(() => {
    if (user && !showConfirmationSuccess) {
      navigate("/");
    }
  }, [user, navigate, showConfirmationSuccess]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signUpSchema.parse({
        email: signUpEmail,
        username: signUpUsername,
        password: signUpPassword,
      });

      setLoading(true);
      const { error } = await signUp(validated.email, validated.password, validated.username);

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Email đã tồn tại",
            description: "Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Lỗi đăng ký",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Đăng ký thành công!",
          description: "Vui lòng kiểm tra email để xác nhận tài khoản.",
        });
        setSignUpEmail("");
        setSignUpUsername("");
        setSignUpPassword("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Lỗi validation",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signInSchema.parse({
        email: signInEmail,
        password: signInPassword,
      });

      setLoading(true);
      const { error } = await signIn(validated.email, validated.password);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Thông tin đăng nhập không đúng",
            description: "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Lỗi đăng nhập",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Lỗi validation",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();

    if (error) {
      if (error.message.includes("provider is not enabled")) {
        toast({
          title: "Google Sign-In chưa được kích hoạt",
          description: "Vui lòng liên hệ quản trị viên để kích hoạt đăng nhập bằng Google.",
          variant: "destructive",
        });
      } else if (error.message.includes("OAuth state parameter missing")) {
        toast({
          title: "Lỗi cấu hình OAuth",
          description: "Vui lòng kiểm tra cấu hình redirect URL trong Supabase.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Lỗi đăng nhập Google",
          description: error.message,
          variant: "destructive",
        });
      }
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithFacebook();

    if (error) {
      if (error.message.includes("provider is not enabled")) {
        toast({
          title: "Facebook Login chưa được kích hoạt",
          description: "Vui lòng liên hệ quản trị viên để kích hoạt đăng nhập bằng Facebook.",
          variant: "destructive",
        });
      } else if (error.message.includes("OAuth state parameter missing")) {
        toast({
          title: "Lỗi cấu hình OAuth",
          description: "Vui lòng kiểm tra cấu hình redirect URL trong Supabase.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Lỗi đăng nhập Facebook",
          description: error.message,
          variant: "destructive",
        });
      }
      setLoading(false);
    }
  };

  // Show confirmation success screen
  if (showConfirmationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md p-8 space-y-6 border-2 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-green-600">
            🎉 Email đã được xác nhận thành công!
          </h2>
          <p className="text-muted-foreground">
            Đang chuyển bạn vào Fun Profile...
          </p>
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md p-8 space-y-6 border-2">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Fun Profile
          </h1>
          <p className="text-muted-foreground">
            Kết nối và chia sẻ với bạn bè
          </p>
        </div>

        <Tabs defaultValue="signin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
            <TabsTrigger value="signup">Đăng ký</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Mật khẩu</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="username"
                  value={signUpUsername}
                  onChange={(e) => setSignUpUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Mật khẩu</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng ký...
                  </>
                ) : (
                  "Đăng ký"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Hoặc tiếp tục với
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang chuyển hướng...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Đăng nhập với Google
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleFacebookSignIn}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang chuyển hướng...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Đăng nhập với Facebook
            </>
          )}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Web3
            </span>
          </div>
        </div>

        <Button
          variant="default"
          onClick={() => setShowConnectWallet(true)}
          className="w-full gap-2 gradient-primary text-white"
        >
          <Wallet className="h-5 w-5" />
          Kết nối ví Web3
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Kết nối ví để tự động tạo ERC-4337 smart wallet với gas miễn phí
        </p>
      </Card>

      <ConnectWalletModal 
        open={showConnectWallet} 
        onOpenChange={setShowConnectWallet}
      />
    </div>
  );
}
