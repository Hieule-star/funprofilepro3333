import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ChatInputProps {
  onSendMessage: (content: string, mediaUrl?: string, mediaType?: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

export default function ChatInput({ onSendMessage, onTyping }: ChatInputProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Trigger typing indicator
    if (onTyping && value.length > 0) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 1 second of no input
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    } else if (onTyping && value.length === 0) {
      onTyping(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 4000MB)
    if (file.size > 4000 * 1024 * 1024) {
      toast({
        title: "File quá lớn",
        description: "Vui lòng chọn file nhỏ hơn 4000MB (4GB)",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string } | null> => {
    try {
      setUploading(true);

      // Get presigned URL from edge function
      const { data, error } = await supabase.functions.invoke("generate-presigned-url", {
        body: {
          fileName: file.name,
          fileType: file.type,
          folder: "chat"
        }
      });

      if (error) throw error;
      
      if (!data.presignedUrl) {
        throw new Error("No presigned URL received from server");
      }

      console.log("Uploading to R2:", data.presignedUrl);

      // Upload to R2
      const uploadResponse = await fetch(data.presignedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type
        }
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      const mediaType = file.type.startsWith("image/") ? "image" : 
                       file.type.startsWith("video/") ? "video" : "document";

      return { url: data.publicUrl, type: mediaType };
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Lỗi tải file",
        description: "Không thể tải file lên. Vui lòng thử lại.",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    // Upload file if selected
    if (selectedFile) {
      const result = await uploadFile(selectedFile);
      if (result) {
        mediaUrl = result.url;
        mediaType = result.type;
      } else {
        return; // Upload failed, don't send message
      }
    }

    onSendMessage(message.trim(), mediaUrl, mediaType);
    setMessage("");
    setSelectedFile(null);
    
    // Stop typing indicator
    if (onTyping) {
      onTyping(false);
    }
    
    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-card p-4"
    >
      {selectedFile && (
        <div className="mb-2 p-3 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedFile.type.startsWith("image/") ? (
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSelectedFile(null)}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button 
          type="button" 
          variant="ghost" 
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <Input
          value={message}
          onChange={handleChange}
          placeholder="Nhập tin nhắn..."
          className="flex-1"
          disabled={uploading}
        />

        <Button type="button" variant="ghost" size="icon" disabled={uploading}>
          <Smile className="h-5 w-5" />
        </Button>

        <Button 
          type="submit" 
          size="icon" 
          disabled={uploading || (!message.trim() && !selectedFile)}
        >
          {uploading ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
}
