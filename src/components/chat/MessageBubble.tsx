import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FileText, Download, FileArchive, FileSpreadsheet, FileCode, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transformToMediaCdn } from "@/lib/media-url";

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

  const getFileName = (url: string) => {
    const parts = url.split('/');
    const fullName = parts[parts.length - 1];
    // Remove timestamp prefix if exists (e.g., 1764550314838-gxlo7d.mp4 -> mp4)
    const cleanName = fullName.replace(/^\d+-\w+\./, '');
    return cleanName || fullName;
  };

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FileArchive;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    if (['js', 'ts', 'py', 'java', 'cpp', 'exe', 'dll'].includes(ext)) return FileCode;
    if (['doc', 'docx', 'txt', 'pdf'].includes(ext)) return FileText;
    return File;
  };

  const fileName = message.media_url ? getFileName(message.media_url) : 'File';
  const fileExtension = message.media_url ? message.media_url.split('.').pop()?.toUpperCase() || '' : '';
  const FileIcon = message.media_url ? getFileIcon(message.media_url) : File;

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
              : "bg-muted text-foreground"
          )}
        >
          {message.media_url && message.media_type === "image" && (
            <img 
              src={transformToMediaCdn(message.media_url)} 
              alt="Shared image" 
              className="max-w-full max-h-80 object-cover cursor-pointer"
              onClick={handleDownload}
            />
          )}
          
          {message.media_url && message.media_type === "video" && (
            <video 
              src={transformToMediaCdn(message.media_url)} 
              controls 
              className="max-w-full max-h-80"
            />
          )}

          {message.media_url && message.media_type === "document" && (
            <div className="px-4 py-3 flex items-center gap-3 min-w-[200px]">
              <FileIcon className="h-8 w-8 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs opacity-70 mt-0.5">{fileExtension}</p>
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
