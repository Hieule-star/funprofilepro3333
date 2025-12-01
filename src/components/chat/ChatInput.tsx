import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Smile, Paperclip, Mic, FileText } from "lucide-react";
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
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    
    // Create preview URL for images and videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
    
    setShowPreview(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleConfirmSend = async () => {
    if (!selectedFile) return;
    
    setShowPreview(false);
    
    const result = await uploadFile(selectedFile);
    if (result) {
      onSendMessage(message.trim(), result.url, result.type);
      setMessage("");
      
      // Stop typing indicator
      if (onTyping) {
        onTyping(false);
      }
      
      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
    
    // Cleanup
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
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
    if (!message.trim()) return;

    onSendMessage(message.trim());
    setMessage("");
    
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
    <>
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xem trước file</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-muted rounded-lg p-4">
            {selectedFile && (
              <>
                {selectedFile.type.startsWith("image/") && previewUrl && (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-[50vh] object-contain rounded"
                  />
                )}
                
                {selectedFile.type.startsWith("video/") && previewUrl && (
                  <video 
                    src={previewUrl} 
                    controls 
                    className="max-w-full max-h-[50vh] rounded"
                  />
                )}
                
                {!selectedFile.type.startsWith("image/") && !selectedFile.type.startsWith("video/") && (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <FileText className="h-20 w-20 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-lg">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedFile.type || "Không xác định"}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelPreview}
              disabled={uploading}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSend}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Gửi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-card p-4"
      >
        <div className="flex items-center gap-3">
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
            className="shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Input
            value={message}
            onChange={handleChange}
            placeholder="Nhập tin nhắn..."
            className="flex-1 rounded-full"
            disabled={uploading}
          />

          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            disabled={uploading}
            className="shrink-0"
          >
            <Smile className="h-5 w-5" />
          </Button>

          <Button 
            type="submit" 
            size="icon"
            disabled={uploading}
            className="shrink-0 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </>
  );
}
