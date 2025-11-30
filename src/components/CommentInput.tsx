import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CommentInputProps {
  postId: string;
  replyTo?: {
    commentId: string;
    username: string;
  } | null;
  onCancelReply?: () => void;
}

interface User {
  id: string;
  username: string | null;
}

export default function CommentInput({ postId, replyTo, onCancelReply }: CommentInputProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Fetch all users for mention autocomplete
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .not('username', 'is', null)
        .order('username');
      
      if (data) {
        setUsers(data);
      }
    };
    
    fetchUsers();
  }, []);

  // Handle textarea change and detect @ mentions
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newCursorPosition = e.target.selectionStart;
    
    setContent(newContent);
    setCursorPosition(newCursorPosition);

    // Check if @ was typed
    const textBeforeCursor = newContent.slice(0, newCursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      // Check if there's a space after @ (should close mention dropdown)
      if (textAfterAt.includes(' ')) {
        setShowMentions(false);
        return;
      }
      
      setMentionSearch(textAfterAt.toLowerCase());
      setShowMentions(true);
      
      // Filter users based on search
      const filtered = users.filter(user => 
        user.username?.toLowerCase().includes(textAfterAt.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setShowMentions(false);
    }
  };

  // Handle mention selection
  const handleSelectMention = (username: string) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = content.slice(0, lastAtIndex);
      const afterCursor = content.slice(cursorPosition);
      const newContent = `${beforeAt}@${username} ${afterCursor}`;
      
      setContent(newContent);
      setShowMentions(false);
      
      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        const newPosition = lastAtIndex + username.length + 2;
        textareaRef.current?.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Lỗi",
        description: "Bạn cần đăng nhập để bình luận",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        parent_id: replyTo?.commentId || null,
      });

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể gửi bình luận",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Handle mention notifications
    const mentionPattern = /@(\w+)/g;
    const mentions = [...content.matchAll(mentionPattern)].map(m => m[1]);

    if (mentions.length > 0) {
      // Lookup user IDs for mentioned usernames
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', mentions);
      
      // Get current user's username
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      // Create notifications for mentioned users (exclude self)
      if (mentionedUsers && mentionedUsers.length > 0) {
        const notifications = mentionedUsers
          .filter(u => u.id !== user.id)
          .map(mentionedUser => ({
            user_id: mentionedUser.id,
            type: 'mention',
            title: 'Bạn được nhắc đến',
            message: `${currentProfile?.username || 'Ai đó'} đã nhắc đến bạn trong một bình luận`,
            read: false,
            link: '/feed'
          }));
        
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }
    }

    // Notify post owner about new comment
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (post && post.user_id !== user.id) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      await supabase.from('notifications').insert({
        user_id: post.user_id,
        type: 'comment',
        title: 'Có bình luận mới',
        message: `${currentProfile?.username || 'Ai đó'} đã bình luận vào bài viết của bạn`,
        read: false,
        link: '/feed'
      });
    }

    setContent("");
    setIsSubmitting(false);
    onCancelReply?.();
  };

  return (
    <div className="space-y-2">
      {replyTo && (
        <div className="flex items-center justify-between bg-muted px-3 py-2 rounded-md text-sm">
          <span className="text-muted-foreground">
            Đang trả lời <span className="font-semibold text-foreground">{replyTo.username}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            className="h-6 px-2"
          >
            Hủy
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative flex gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder={replyTo ? `Trả lời ${replyTo.username}...` : "Viết bình luận... (gõ @ để mention người dùng)"}
            className="min-h-[60px] resize-none"
            disabled={isSubmitting}
          />
          
          {showMentions && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-full z-50">
              <Command className="rounded-lg border shadow-md bg-popover">
                <CommandList>
                  <CommandEmpty>Không tìm thấy người dùng</CommandEmpty>
                  <CommandGroup>
                    {filteredUsers.slice(0, 5).map((user) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleSelectMention(user.username || '')}
                        className="cursor-pointer"
                      >
                        <span className="font-medium">@{user.username}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
        </div>
        
        <Button 
          type="submit" 
          size="icon"
          disabled={!content.trim() || isSubmitting}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
