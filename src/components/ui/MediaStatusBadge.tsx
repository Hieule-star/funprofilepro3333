import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PinStatus = 'pending' | 'pinning' | 'pinned' | 'failed' | 'unpinned';

interface MediaStatusBadgeProps {
  pinStatus: PinStatus;
  ipfsCid?: string | null;
  ipfsGatewayUrl?: string | null;
  pinAttempts?: number;
  lastPinError?: string | null;
  onRetry?: () => Promise<void>;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<PinStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
  animate?: boolean;
}> = {
  pending: {
    icon: Clock,
    label: 'Chờ xử lý',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  pinning: {
    icon: Loader2,
    label: 'Đang pin',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    animate: true,
  },
  pinned: {
    icon: CheckCircle,
    label: 'Đã lưu IPFS',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  failed: {
    icon: XCircle,
    label: 'Thất bại',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  unpinned: {
    icon: CloudOff,
    label: 'Đã gỡ',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
};

export function MediaStatusBadge({
  pinStatus,
  ipfsCid,
  ipfsGatewayUrl,
  pinAttempts = 0,
  lastPinError,
  onRetry,
  className,
  showLabel = true,
  size = 'sm',
}: MediaStatusBadgeProps) {
  const [retrying, setRetrying] = useState(false);
  const config = statusConfig[pinStatus];
  const Icon = config.icon;

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const tooltipContent = (
    <div className="space-y-1 max-w-xs">
      <div className="font-medium">{config.label}</div>
      {ipfsCid && (
        <div className="text-xs break-all">
          <span className="text-muted-foreground">CID: </span>
          {ipfsCid}
        </div>
      )}
      {pinAttempts > 0 && pinStatus === 'failed' && (
        <div className="text-xs text-muted-foreground">
          Đã thử {pinAttempts} lần
        </div>
      )}
      {lastPinError && (
        <div className="text-xs text-red-500 break-words">
          Lỗi: {lastPinError}
        </div>
      )}
      {ipfsGatewayUrl && (
        <a
          href={ipfsGatewayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline block"
        >
          Xem trên IPFS →
        </a>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('inline-flex items-center gap-1', className)}>
            <Badge
              variant="secondary"
              className={cn(
                'gap-1 px-1.5 py-0.5 font-normal cursor-default',
                config.bgColor,
                config.color,
                textSize
              )}
            >
              <Icon className={cn(iconSize, config.animate && 'animate-spin')} />
              {showLabel && <span>{config.label}</span>}
            </Badge>

            {pinStatus === 'failed' && onRetry && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleRetry}
                disabled={retrying}
              >
                <RefreshCw className={cn('h-3 w-3', retrying && 'animate-spin')} />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact IPFS indicator for use in media overlays
 */
export function MediaStatusIndicator({
  pinStatus,
  className,
}: {
  pinStatus: PinStatus;
  className?: string;
}) {
  const config = statusConfig[pinStatus];
  const Icon = pinStatus === 'pinned' ? Cloud : config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full p-1',
        config.bgColor,
        className
      )}
    >
      <Icon
        className={cn(
          'h-3 w-3',
          config.color,
          config.animate && 'animate-spin'
        )}
      />
    </div>
  );
}
