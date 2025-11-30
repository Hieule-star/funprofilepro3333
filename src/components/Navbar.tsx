import { Link, useLocation } from "react-router-dom";
import { Home, Users, UserCircle, Wallet, Search, Sun, Moon, LogOut, User as UserIcon, MessageCircle, Gamepad2, Trophy, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import FriendRequestDropdown from "@/components/friends/FriendRequestDropdown";
import NotificationBadge from "@/components/NotificationBadge";
import logo from "@/assets/logo.jpg";
export default function Navbar() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);
  const {
    user,
    profile,
    signOut
  } = useAuth();
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };
  const handleSignOut = async () => {
    await signOut();
  };
  const navItems = [{
    icon: Home,
    label: "Feed",
    path: "/"
  }, {
    icon: Users,
    label: "Friends",
    path: "/friends"
  }, {
    icon: MessageCircle,
    label: "Chat",
    path: "/chat"
  }, {
    icon: Gamepad2,
    label: "Game",
    path: "/game"
  }, {
    icon: Trophy,
    label: "Leaderboard",
    path: "/leaderboard"
  }, {
    icon: UserCircle,
    label: "Profile",
    path: "/profile"
  }, {
    icon: Wallet,
    label: "Wallet",
    path: "/wallet"
  }];
  return <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Fun Profile Web3" className="h-10 w-10 rounded-full object-cover shadow-glow" />
            <span className="hidden text-xl font-heading font-bold text-primary sm:block">
              Fun Profile
            </span>
          </Link>

          {/* Search */}
          <div className="relative hidden max-w-md flex-1 px-8 md:block">
            <Search className="absolute left-11 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Tìm kiếm..." className="w-full pl-9" />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return <Link key={item.path} to={item.path}>
                  <Button variant={isActive ? "default" : "ghost"} size="sm" className="gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>;
          })}

            <FriendRequestDropdown />
            <NotificationBadge />

            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-2 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.username || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/wallet" className="cursor-pointer">
                      <Wallet className="mr-2 h-4 w-4" />
                      <span>Ví</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/claim-history" className="cursor-pointer">
                      <History className="mr-2 h-4 w-4" />
                      <span>Lịch sử Claim</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> : <Button asChild className="ml-2 gap-2 bg-primary hover:bg-primary-light">
                <Link to="/auth">
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Link>
              </Button>}
          </div>
        </div>
      </div>
    </nav>;
}