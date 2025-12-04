import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";
import ConnectWalletModal from "@/components/wallet/ConnectWalletModal";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isPrivyConfigured } from "@/lib/privy-config";
import { useConnect } from "wagmi";

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
  const { user, signUp, signIn, signInWithGoogle, signInWithFacebook, resendEmailVerification } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showConfirmationSuccess, setShowConfirmationSuccess] = useState(false);
  const [showEmailNotVerified, setShowEmailNotVerified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  // Wagmi for Web3 wallet connections
  const { connectors, connect, isPending: wagmiPending } = useConnect();
  const privyEnabled = isPrivyConfigured();

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
        if (error.message.includes("Email not confirmed")) {
          setShowEmailNotVerified(true);
          setUnverifiedEmail(validated.email);
        } else if (error.message.includes("Invalid login credentials")) {
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

  const handleTelegramSignIn = () => {
    // Telegram requires Privy, open wallet modal with Telegram option
    setShowConnectWallet(true);
    toast({
      title: "Đăng nhập Telegram",
      description: "Vui lòng sử dụng Telegram trong popup kết nối ví.",
    });
  };

  const handleResendEmail = async () => {
    if (!unverifiedEmail) return;
    
    setLoading(true);
    const { error } = await resendEmailVerification(unverifiedEmail);
    
    if (error) {
      toast({
        title: "Lỗi gửi email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email đã được gửi",
        description: "Vui lòng kiểm tra hộp thư của bạn.",
      });
    }
    setLoading(false);
  };

  // Web3 wallet connection handlers
  const handleConnectMetaMask = () => {
    const metamaskConnector = connectors.find(c => c.id === 'injected' || c.name.toLowerCase().includes('metamask'));
    if (metamaskConnector) {
      connect({ connector: metamaskConnector });
    } else {
      toast({
        title: "MetaMask không khả dụng",
        description: "Vui lòng cài đặt extension MetaMask",
        variant: "destructive",
      });
    }
  };

  const handleConnectTrustWallet = () => {
    const wcConnector = connectors.find(c => c.id === 'walletConnect');
    if (wcConnector) {
      connect({ connector: wcConnector });
    } else {
      setShowConnectWallet(true);
    }
  };

  const handleConnectBitgetWallet = () => {
    const wcConnector = connectors.find(c => c.id === 'walletConnect');
    if (wcConnector) {
      connect({ connector: wcConnector });
    } else {
      setShowConnectWallet(true);
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

        {/* Email Not Verified Banner */}
        {showEmailNotVerified && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              <strong>Email của bạn chưa được xác nhận.</strong>
              <br />
              Vui lòng kiểm tra hộp thư và nhấp vào link xác nhận.
              <Button 
                variant="link" 
                size="sm"
                className="p-0 h-auto ml-2 text-primary"
                onClick={handleResendEmail}
                disabled={loading}
              >
                Gửi lại email
              </Button>
            </AlertDescription>
          </Alert>
        )}

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

        {/* Social Login Section */}
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

        <div className="space-y-2">
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

          <Button
            variant="outline"
            onClick={handleTelegramSignIn}
            disabled={loading}
            className="w-full"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="#0088CC">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Đăng nhập với Telegram
          </Button>
        </div>

        {/* Web3 Wallets Section */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Đăng nhập bằng Ví Web3
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={handleConnectMetaMask}
            disabled={loading || wagmiPending}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            {wagmiPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                alt="MetaMask" 
                className="h-6 w-6" 
              />
            )}
            <span className="text-xs">MetaMask</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleConnectTrustWallet}
            disabled={loading || wagmiPending}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            {wagmiPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-6 w-6" viewBox="0 0 40 40" fill="none">
                <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="#0500FF"/>
                <path d="M20 8L10 14V20C10 26.6274 14.4772 32.3497 20 34C25.5228 32.3497 30 26.6274 30 20V14L20 8Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )}
            <span className="text-xs">Trust</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleConnectBitgetWallet}
            disabled={loading || wagmiPending}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            {wagmiPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-6 w-6" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="8" fill="#00C8B3"/>
                <path d="M12 14L20 10L28 14V20C28 26 24 30 20 32C16 30 12 26 12 20V14Z" fill="white"/>
              </svg>
            )}
            <span className="text-xs">Bitget</span>
          </Button>
        </div>

        {/* Full Web3 Modal Button */}
        <Button
          variant="default"
          onClick={() => setShowConnectWallet(true)}
          className="w-full gap-2 gradient-primary text-white"
        >
          <Wallet className="h-5 w-5" />
          Xem tất cả ví Web3
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Kết nối ví để tự động tạo ERC-4337 smart wallet với gas miễn phí
        </p>

        {/* TODO: Future expansion placeholders */}
        {/* Apple login: signInWithApple() */}
        {/* Twitter/X login: signInWithTwitter() */}
        {/* Multi-network EVM: BSC, Polygon, Base, Ethereum */}
      </Card>

      <ConnectWalletModal 
        open={showConnectWallet} 
        onOpenChange={setShowConnectWallet}
      />
    </div>
  );
}
