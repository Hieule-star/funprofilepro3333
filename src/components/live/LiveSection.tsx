import { Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { GoLiveButton } from './GoLiveButton';
import { LiveCard } from './LiveCard';
import { useLiveContext } from '@/contexts/LiveContext';
import { useAuth } from '@/contexts/AuthContext';

export function LiveSection() {
  const { user } = useAuth();
  const { activeLives } = useLiveContext();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-5 w-5 text-red-500" />
          Live Now
        </CardTitle>
        {user && <GoLiveButton />}
      </CardHeader>
      <CardContent>
        {activeLives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Radio className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No one is live right now
            </p>
            {user && (
              <p className="text-xs text-muted-foreground mt-1">
                Be the first to go live!
              </p>
            )}
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {activeLives.map((session) => (
                <LiveCard key={session.channelName} session={session} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
