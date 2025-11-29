import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Mail, Chrome, AlertCircle, Loader2 } from "lucide-react";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isPrivyConfigured } from "@/lib/privy-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConnect, useAccount } from "wagmi";
import { useWallet } from "@/contexts/WalletContext";

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps) {
  const privyEnabled = isPrivyConfigured();
  const { toast } = useToast();
  
  // Wagmi fallback
  const { connectors, connect, isPending } = useConnect();
  const { isConnected: wagmiConnected } = useAccount();
  const { disconnect: walletDisconnect } = useWallet();

  // Only use Privy hooks if it's configured
  let login, authenticated, user, wallets;
  if (privyEnabled) {
    const privyAuth = usePrivy();
    const privyWallets = useWallets();
    login = privyAuth.login;
    authenticated = privyAuth.authenticated;
    user = privyAuth.user;
    wallets = privyWallets.wallets;
  }

  useEffect(() => {
    if (privyEnabled && authenticated && user) {
      toast({
        title: "Kết nối thành công!",
        description: `Chào mừng ${user.email?.address || user.google?.email || 'bạn'}`,
      });
      onOpenChange(false);
    }
  }, [authenticated, user, privyEnabled]);

  useEffect(() => {
    if (wagmiConnected && !privyEnabled) {
      toast({
        title: "Kết nối ví thành công!",
        description: "Ví của bạn đã được kết nối",
      });
      onOpenChange(false);
    }
  }, [wagmiConnected, privyEnabled]);

  const handleSocialLogin = (method: 'google' | 'email' | 'farcaster' | 'telegram') => {
    if (!privyEnabled) {
      toast({
        title: "Privy chưa được cấu hình",
        description: "Vui lòng thêm VITE_PRIVY_APP_ID vào secrets",
        variant: "destructive",
      });
      return;
    }
    if (login) login();
  };

  const handleExternalWallet = () => {
    if (!privyEnabled) {
      toast({
        title: "Privy chưa được cấu hình",
        description: "Vui lòng thêm VITE_PRIVY_APP_ID vào secrets",
        variant: "destructive",
      });
      return;
    }
    if (login) login();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Kết nối ví
          </DialogTitle>
        </DialogHeader>

        {!privyEnabled && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm space-y-1">
              <div><strong>Privy chưa được cấu hình.</strong> Chức năng đăng nhập Social và tạo ví ERC-4337 sẽ không khả dụng. Bạn vẫn có thể kết nối ví ngoài.</div>
              <div className="text-xs opacity-75 font-mono">
                Debug: App ID = {import.meta.env.VITE_PRIVY_APP_ID 
                  ? `${import.meta.env.VITE_PRIVY_APP_ID.substring(0, 4)}***${import.meta.env.VITE_PRIVY_APP_ID.substring(import.meta.env.VITE_PRIVY_APP_ID.length - 4)}`
                  : '(not found)'}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left Column - Social Login & Top Wallets */}
          <div className="space-y-4">
            {privyEnabled && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Đăng nhập Social
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => handleSocialLogin('google')}
                  >
                    <Chrome className="h-5 w-5" />
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => handleSocialLogin('email')}
                  >
                    <Mail className="h-5 w-5" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => handleSocialLogin('telegram')}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.155.232.171.326.016.094.037.308.02.475z"/>
                    </svg>
                    Telegram
                  </Button>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {privyEnabled ? "Ví phổ biến" : "Kết nối ví"}
              </h3>
              <div className="space-y-2">
                {privyEnabled ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={handleExternalWallet}
                    >
                      <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="h-5 w-5" />
                      MetaMask
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={handleExternalWallet}
                    >
                      <Wallet className="h-5 w-5" />
                      Trust Wallet
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={handleExternalWallet}
                    >
                      <Wallet className="h-5 w-5" />
                      Bitget Wallet
                    </Button>
                  </>
                ) : (
                  <>
                    {wagmiConnected && (
                      <Button
                        variant="destructive"
                        className="w-full mb-4"
                        onClick={() => {
                          walletDisconnect();
                          onOpenChange(false);
                        }}
                      >
                        Ngắt kết nối ví
                      </Button>
                    )}
                    {connectors.map((connector) => (
                      <Button
                        key={connector.id}
                        variant="outline"
                        className="w-full justify-start gap-3"
                        onClick={() => connect({ connector })}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wallet className="h-4 w-4" />
                        )}
                        {connector.name}
                      </Button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="text-center space-y-2">
                <Wallet className="h-12 w-12 mx-auto text-primary" />
                <h3 className="font-semibold text-lg">
                  {privyEnabled ? "Ví thông minh ERC-4337" : "Kết nối ví của bạn"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {privyEnabled 
                    ? "Đăng nhập bằng Google/Email để tự động tạo ví thông minh miễn phí gas"
                    : "Kết nối ví MetaMask, Trust Wallet hoặc ví khác để quản lý tài sản crypto của bạn"
                  }
                </p>
              </div>

              {privyEnabled && (
                <>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => handleSocialLogin('google')}
                  >
                    <Chrome className="h-5 w-5 mr-2" />
                    Tiếp tục với Google
                  </Button>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Miễn phí gas khi giao dịch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Không cần ghi nhớ seed phrase</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Bảo mật cấp độ tài khoản</span>
                    </div>
                  </div>
                </>
              )}

              {!privyEnabled && (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>Hỗ trợ MetaMask, Trust Wallet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>Kết nối an toàn qua WalletConnect</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>Quản lý tài sản đa chuỗi</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Bằng cách kết nối, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật
        </div>
      </DialogContent>
    </Dialog>
  );
}
