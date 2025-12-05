import { Facebook, Instagram, Twitter, Globe, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SocialLinksProps {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  website?: string;
  className?: string;
  size?: "sm" | "default";
}

export function SocialLinks({
  facebook,
  instagram,
  tiktok,
  twitter,
  website,
  className,
  size = "default",
}: SocialLinksProps) {
  const links = [
    { icon: Facebook, url: facebook, label: "Facebook", color: "hover:text-blue-600" },
    { icon: Instagram, url: instagram, label: "Instagram", color: "hover:text-pink-600" },
    { icon: Music2, url: tiktok, label: "TikTok", color: "hover:text-foreground" },
    { icon: Twitter, url: twitter, label: "Twitter", color: "hover:text-sky-500" },
    { icon: Globe, url: website, label: "Website", color: "hover:text-primary" },
  ].filter((link) => link.url);

  if (links.length === 0) return null;

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Button
            key={link.label}
            variant="ghost"
            size="icon"
            className={cn(buttonSize, "text-muted-foreground", link.color)}
            asChild
          >
            <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.label}>
              <Icon className={iconSize} />
            </a>
          </Button>
        );
      })}
    </div>
  );
}
