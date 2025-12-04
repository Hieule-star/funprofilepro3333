import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Mail, Chrome, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';
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
  
  // Wagmi for EOA wallets
  const { connectors, connect, isPending } = useConnect();
  const { isConnected: wagmiConnected } = useAccount();
  const { disconnect: walletDisconnect } = useWallet();

  // Privy for Smart Wallet (ERC-4337)
  let login: (() => void) | undefined;
  let authenticated = false;
  let user: any = null;
  
  if (privyEnabled) {
    const privyAuth = usePrivy();
    login = privyAuth.login;
    authenticated = privyAuth.authenticated;
    user = privyAuth.user;
  }

  // Close modal when Smart Wallet created via Privy
  useEffect(() => {
    if (privyEnabled && authenticated && user) {
      toast({
        title: "Ví thông minh đã được tạo!",
        description: `Chào mừng ${user.email?.address || user.google?.email || 'bạn'}`,
      });
      onOpenChange(false);
    }
  }, [authenticated, user, privyEnabled]);

  // Close modal when EOA wallet connected via Wagmi
  useEffect(() => {
    if (wagmiConnected && open) {
      const timer = setTimeout(() => {
        toast({
          title: "Kết nối ví thành công!",
          description: "Ví EOA của bạn đã được kết nối",
        });
        onOpenChange(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [wagmiConnected, open]);

  // === SMART WALLET FUNCTIONS (ERC-4337) ===
  // Chỉ tạo Smart Wallet khi user chủ động chọn ở đây
  const handleCreateSmartWalletWithGoogle = () => {
    if (!privyEnabled || !login) {
      toast({
        title: "Privy chưa được cấu hình",
        description: "Vui lòng thêm VITE_PRIVY_APP_ID vào secrets",
        variant: "destructive",
      });
      return;
    }
    login();
  };

  const handleCreateSmartWalletWithEmail = () => {
    if (!privyEnabled || !login) {
      toast({
        title: "Privy chưa được cấu hình",
        description: "Vui lòng thêm VITE_PRIVY_APP_ID vào secrets",
        variant: "destructive",
      });
      return;
    }
    login();
  };

  // === EOA WALLET FUNCTIONS (MetaMask, Trust, Bitget) ===
  // Chỉ kết nối ví thông thường, KHÔNG tạo Smart Wallet
  const handleMetaMaskEOA = () => {
    const metamaskConnector = connectors.find(c => c.id === 'injected' || c.name.toLowerCase().includes('metamask'));
    if (metamaskConnector) {
      connect({ connector: metamaskConnector });
    } else {
      toast({
        title: "MetaMask không tìm thấy",
        description: "Vui lòng cài đặt MetaMask extension",
        variant: "destructive",
      });
    }
  };

  const handleWalletConnectEOA = () => {
    const wcConnector = connectors.find(c => c.id === 'walletConnect' || c.name.toLowerCase().includes('walletconnect'));
    if (wcConnector) {
      connect({ connector: wcConnector });
    } else {
      toast({
        title: "WalletConnect không khả dụng",
        description: "Vui lòng thử lại sau",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Kết nối ví
          </DialogTitle>
        </DialogHeader>

        {!privyEnabled && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              <strong>Privy chưa được cấu hình.</strong> Tính năng Ví thông minh ERC-4337 sẽ không khả dụng. Bạn vẫn có thể kết nối ví EOA thông thường.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left Column - Smart Wallet & EOA Wallets */}
          <div className="space-y-6">
            {/* === SMART WALLET SECTION === */}
            {privyEnabled && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Ví thông minh ERC-4337
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-primary/30 hover:border-primary hover:bg-primary/5"
                    onClick={handleCreateSmartWalletWithGoogle}
                  >
                    <Chrome className="h-5 w-5" />
                    Tiếp tục với Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-primary/30 hover:border-primary hover:bg-primary/5"
                    onClick={handleCreateSmartWalletWithEmail}
                  >
                    <Mail className="h-5 w-5" />
                    Tiếp tục với Email
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  📝 Ví thông minh ERC-4337 sẽ <strong>chỉ được tạo</strong> khi bạn chọn tiếp tục với Google/Email tại đây.
                </p>
              </div>
            )}

            {/* === EOA WALLET SECTION === */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Ví Web3 thông thường (EOA)
                </h3>
              </div>
              
              <div className="space-y-2">
                {wagmiConnected && (
                  <Button
                    variant="destructive"
                    className="w-full mb-2"
                    onClick={() => {
                      walletDisconnect();
                      onOpenChange(false);
                    }}
                  >
                    Ngắt kết nối ví
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={handleMetaMaskEOA}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="h-5 w-5" />
                  )}
                  MetaMask
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={handleWalletConnectEOA}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Wallet className="h-5 w-5" />
                  )}
                  Trust Wallet
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={handleWalletConnectEOA}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Wallet className="h-5 w-5" />
                  )}
                  Bitget Wallet
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                📝 Các ví này là ví Web3 thông thường (EOA). Kết nối ví sẽ <strong>không tạo</strong> ví thông minh.
              </p>
            </div>
          </div>

          {/* Right Column - Info Panel */}
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="text-center space-y-2">
                <Wallet className="h-12 w-12 mx-auto text-primary" />
                <h3 className="font-semibold text-lg">
                  {privyEnabled ? "Chọn loại ví phù hợp" : "Kết nối ví của bạn"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {privyEnabled 
                    ? "Ví thông minh phù hợp cho người mới, ví EOA phù hợp cho người đã có ví"
                    : "Kết nối ví MetaMask, Trust Wallet hoặc ví khác để quản lý tài sản crypto"
                  }
                </p>
              </div>

              {privyEnabled && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2 text-primary">✨ Ví thông minh ERC-4337</h4>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
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
                        <span>Bảo mật cấp độ tài khoản Google</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">🔗 Ví EOA thông thường</h4>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>Dùng ví đã có sẵn</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>Kiểm soát hoàn toàn private key</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>Tương thích mọi DApp</span>
                      </div>
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
