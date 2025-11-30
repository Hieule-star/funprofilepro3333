import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: any;
  isSent: boolean;
}

export default function MessageBubble({ message, isSent }: MessageBubbleProps) {
  const handleDownload = () => {
    if (message.media_url) {
      window.open(message.media_url, '_blank');
    }
  };

  return (
    <div className={cn("flex gap-2", isSent ? "flex-row-reverse" : "flex-row")}>
      {!isSent && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {message.sender?.username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("max-w-[70%] flex flex-col", isSent ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl overflow-hidden",
            isSent
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground"
          )}
        >
          {message.media_url && message.media_type === "image" && (
            <img 
              src={message.media_url} 
              alt="Shared image" 
              className="max-w-full max-h-80 object-cover cursor-pointer"
              onClick={handleDownload}
            />
          )}
          
          {message.media_url && message.media_type === "video" && (
            <video 
              src={message.media_url} 
              controls 
              className="max-w-full max-h-80"
            />
          )}

          {message.media_url && message.media_type === "document" && (
            <div className="px-4 py-3 flex items-center gap-3 min-w-[200px]">
              <FileText className="h-8 w-8 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Tài liệu</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 mt-1"
                  onClick={handleDownload}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Tải xuống
                </Button>
              </div>
            </div>
          )}

          {message.content && (
            <div className="px-4 py-2">
              <p className="text-sm break-words">{message.content}</p>
            </div>
          )}
        </div>
        
        <p
          className={cn(
            "text-xs mt-1",
            isSent ? "text-muted-foreground" : "text-muted-foreground"
          )}
        >
          {format(new Date(message.created_at), "HH:mm", { locale: vi })}
        </p>
      </div>
    </div>
  );
}
