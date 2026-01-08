import { useNavigate } from 'react-router-dom';
import { Users, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LiveSession } from '@/contexts/LiveContext';

interface LiveCardProps {
  session: LiveSession;
}

export function LiveCard({ session }: LiveCardProps) {
  const navigate = useNavigate();

  const handleJoin = () => {
    navigate(`/live/${session.channelName}`);
  };

  return (
    <Card className="group relative min-w-[200px] overflow-hidden transition-all hover:shadow-lg">
      <CardContent className="p-4">
        {/* Live Badge */}
        <Badge
          variant="destructive"
          className="absolute right-2 top-2 gap-1 animate-pulse"
        >
          <Radio className="h-3 w-3" />
          LIVE
        </Badge>

        {/* Host Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-red-500">
            <AvatarImage src={session.hostAvatarUrl} />
            <AvatarFallback>
              {session.hostUsername.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{session.hostUsername}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{session.viewerCount} watching</span>
            </div>
          </div>
        </div>

        {/* Join Button */}
        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={handleJoin}
        >
          Watch Live
        </Button>
      </CardContent>
    </Card>
  );
}
