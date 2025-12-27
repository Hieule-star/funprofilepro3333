import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StreamStatus } from './useMediaUpload';

interface StreamStatusResult {
  streamStatus: StreamStatus;
  streamPlaybackUrl: string | null;
  streamError: string | null;
  isPolling: boolean;
}

/**
 * Hook to poll for stream status updates for a specific media asset.
 * Polls every 10 seconds for up to 5 minutes while the status is "processing".
 */
export function useStreamStatusPolling(
  mediaAssetId: string | null | undefined,
  initialStatus: StreamStatus
): StreamStatusResult {
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(initialStatus);
  const [streamPlaybackUrl, setStreamPlaybackUrl] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  const pollCount = useRef(0);
  const maxPolls = 30; // 30 polls * 10 seconds = 5 minutes max
  const pollInterval = 10000; // 10 seconds

  // Fetch latest status from database
  const fetchStatus = useCallback(async () => {
    if (!mediaAssetId) return;

    const { data, error } = await supabase
      .from('media_assets')
      .select('stream_status, stream_playback_url, last_pin_error')
      .eq('id', mediaAssetId)
      .single();

    if (error) {
      console.error('[StreamPolling] Error fetching status:', error);
      return;
    }

    if (data) {
      const status = data.stream_status as StreamStatus;
      setStreamStatus(status);
      setStreamPlaybackUrl(data.stream_playback_url);
      
      if (status === 'error') {
        setStreamError(data.last_pin_error);
      }

      // Stop polling if status is terminal
      if (status === 'ready' || status === 'error') {
        setIsPolling(false);
        pollCount.current = 0;
      }
    }
  }, [mediaAssetId]);

  // Also trigger the media-stream-status function to update from Cloudflare
  const triggerStatusCheck = useCallback(async () => {
    try {
      await supabase.functions.invoke('media-stream-status');
    } catch (err) {
      console.warn('[StreamPolling] Status check trigger failed:', err);
    }
  }, []);

  // Start/stop polling based on status
  useEffect(() => {
    // Only poll if status is processing and we have a mediaAssetId
    if (!mediaAssetId || initialStatus !== 'processing') {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    pollCount.current = 0;

    const poll = async () => {
      pollCount.current++;
      
      // First trigger the status check function
      await triggerStatusCheck();
      
      // Then fetch the latest status from DB
      await fetchStatus();
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(() => {
      if (pollCount.current >= maxPolls) {
        setIsPolling(false);
        clearInterval(intervalId);
        return;
      }
      poll();
    }, pollInterval);

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [mediaAssetId, initialStatus, fetchStatus, triggerStatusCheck]);

  // Update from initial status prop changes
  useEffect(() => {
    if (initialStatus && initialStatus !== 'processing') {
      setStreamStatus(initialStatus);
    }
  }, [initialStatus]);

  return {
    streamStatus,
    streamPlaybackUrl,
    streamError,
    isPolling,
  };
}
