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
import Navbar from "./components/Navbar";
import Feed from "./pages/Feed";
import Friends from "./pages/Friends";
import Chat from "./pages/Chat";
import Game from "./pages/Game";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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
              <BrowserRouter>
                <AuthProvider>
                  <WalletProvider>
                    <Navbar />
                    <Routes>
            <Route path="/auth" element={<Auth />} />
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
              path="/wallet"
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              }
            />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </WalletProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </WagmiProvider>
      </PrivyProvider>
      ) : (
        <WagmiProvider config={wagmiConfig}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <WalletProvider>
                  <Navbar />
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
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
                      path="/wallet"
                      element={
                        <ProtectedRoute>
                          <Wallet />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </WalletProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </WagmiProvider>
      )}
    </QueryClientProvider>
  );
};

export default App;
