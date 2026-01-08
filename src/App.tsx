import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { PrivyProvider } from '@privy-io/react-auth';
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { wagmiConfig } from "@/lib/wagmi-config";
import { privyConfig, isPrivyConfigured } from "@/lib/privy-config";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RewardNotificationProvider } from "@/components/RewardNotificationProvider";
import { MessageNotificationProvider } from "@/components/MessageNotificationProvider";
import { IncomingCallProvider } from "@/components/IncomingCallProvider";
import { FriendRequestNotificationProvider } from "@/components/FriendRequestNotificationProvider";
import { FloatingHeartsProvider } from "@/components/ui/floating-hearts";
import { useWalletReconnect } from "@/hooks/useWalletReconnect";

// Component to trigger wallet reconnect on app mount
function WalletReconnectWrapper() {
  useWalletReconnect();
  return null;
}
import Navbar from "./components/Navbar";
import Feed from "./pages/Feed";
import Friends from "./pages/Friends";
import Chat from "./pages/Chat";
import Game from "./pages/Game";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Wallet from "./pages/Wallet";
import Leaderboard from "./pages/Leaderboard";
import ClaimHistory from "./pages/ClaimHistory";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Call from "./pages/Call";
import Live from "./pages/Live";
import NotFound from "./pages/NotFound";
import { LiveProvider } from "@/contexts/LiveContext";

const queryClient = new QueryClient();

const App = () => {
  const privyEnabled = isPrivyConfigured();

  return (
    <QueryClientProvider client={queryClient}>
      {privyEnabled ? (
        <PrivyProvider
          appId={privyConfig.appId}
          config={privyConfig.config}
        >
          <WagmiProvider config={wagmiConfig}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <FloatingHeartsProvider>
                <BrowserRouter>
                  <AuthProvider>
                    <IncomingCallProvider>
                      <RewardNotificationProvider>
                        <MessageNotificationProvider>
                          <FriendRequestNotificationProvider>
                          <WalletProvider>
                            <WalletReconnectWrapper />
                            <Navbar />
                      <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <Friends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game"
              element={
                <ProtectedRoute>
                  <Game />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/:userId"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/claim-history"
              element={
                <ProtectedRoute>
                  <ClaimHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/call"
              element={
                <ProtectedRoute>
                  <Call />
                </ProtectedRoute>
              }
            />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                        </Routes>
                          </WalletProvider>
                          </FriendRequestNotificationProvider>
                        </MessageNotificationProvider>
                      </RewardNotificationProvider>
                    </IncomingCallProvider>
                  </AuthProvider>
                </BrowserRouter>
              </FloatingHeartsProvider>
            </TooltipProvider>
          </WagmiProvider>
        </PrivyProvider>
      ) : (
        <WagmiProvider config={wagmiConfig}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FloatingHeartsProvider>
              <BrowserRouter>
                <AuthProvider>
                  <IncomingCallProvider>
                    <RewardNotificationProvider>
                      <MessageNotificationProvider>
                        <FriendRequestNotificationProvider>
                        <WalletProvider>
                          <WalletReconnectWrapper />
                        <Navbar />
                    <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Feed />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/friends"
                      element={
                        <ProtectedRoute>
                          <Friends />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute>
                          <Chat />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/game"
                      element={
                        <ProtectedRoute>
                          <Game />
                        </ProtectedRoute>
                      }
                    />
                     <Route
                       path="/profile"
                       element={
                         <ProtectedRoute>
                           <Profile />
                         </ProtectedRoute>
                       }
                     />
                     <Route
                       path="/user/:userId"
                       element={
                         <ProtectedRoute>
                           <UserProfile />
                         </ProtectedRoute>
                       }
                     />
                     <Route
                       path="/wallet"
                       element={
                         <ProtectedRoute>
                           <Wallet />
                         </ProtectedRoute>
                       }
                     />
                     <Route
                       path="/leaderboard"
                       element={
                         <ProtectedRoute>
                           <Leaderboard />
                         </ProtectedRoute>
                       }
                     />
                     <Route
                       path="/claim-history"
                       element={
                         <ProtectedRoute>
                           <ClaimHistory />
                         </ProtectedRoute>
                       }
                     />
                     <Route
                        path="/admin"
                        element={
                          <ProtectedRoute>
                            <Admin />
                          </ProtectedRoute>
                        }
                      />
                     <Route
                        path="/call"
                        element={
                          <ProtectedRoute>
                            <Call />
                          </ProtectedRoute>
                        }
                      />
                     <Route
                        path="/live/:channel"
                        element={
                          <ProtectedRoute>
                            <LiveProvider>
                              <Live />
                            </LiveProvider>
                          </ProtectedRoute>
                        }
                      />
                       <Route path="*" element={<NotFound />} />
                      </Routes>
                        </WalletProvider>
                        </FriendRequestNotificationProvider>
                      </MessageNotificationProvider>
                    </RewardNotificationProvider>
                  </IncomingCallProvider>
                </AuthProvider>
              </BrowserRouter>
            </FloatingHeartsProvider>
          </TooltipProvider>
        </WagmiProvider>
      )}
    </QueryClientProvider>
  );
};

export default App;
