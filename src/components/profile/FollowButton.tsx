import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  isFollowing: boolean;
  loading?: boolean;
  onClick: () => void;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function FollowButton({
  isFollowing,
  loading,
  onClick,
  className,
  size = "default",
}: FollowButtonProps) {
  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size={size}
      onClick={onClick}
      disabled={loading}
      className={cn(
        "gap-2 transition-all",
        isFollowing && "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-4 w-4" />
          Đang theo dõi
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Theo dõi
        </>
      )}
    </Button>
  );
}
