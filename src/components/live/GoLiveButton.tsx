import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveContext, type LiveSession } from '@/contexts/LiveContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function GoLiveButton() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { startLive, isLoading, error } = useLiveStream();
  const { addLive, myLive } = useLiveContext();
  const [open, setOpen] = useState(false);

  const handleGoLive = async () => {
    if (!user || !profile) {
      toast.error('Please login to start a live stream');
      return;
    }

    if (myLive) {
      toast.error('You already have an active live stream');
      navigate(`/live/${myLive.channelName}`);
      return;
    }

    const channelName = await startLive();
    
    if (channelName) {
      // Add to active lives
      const session: LiveSession = {
        channelName,
        hostId: user.id,
        hostUsername: profile.username || 'User',
        hostAvatarUrl: profile.avatar_url || undefined,
        startedAt: new Date().toISOString(),
        viewerCount: 0,
      };
      addLive(session);
      
      setOpen(false);
      toast.success('You are now live!');
      navigate(`/live/${channelName}`);
    } else if (error) {
      toast.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-red-500 hover:bg-red-600"
        >
          <Video className="h-4 w-4" />
          Go Live
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Live Stream</DialogTitle>
          <DialogDescription>
            You're about to start a live video stream. Make sure your camera and
            microphone are ready.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Your camera and microphone will be accessed</li>
            <li>• Friends can join and watch your stream</li>
            <li>• You can end the stream anytime</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGoLive}
            disabled={isLoading}
            className="gap-2 bg-red-500 hover:bg-red-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                Go Live
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
