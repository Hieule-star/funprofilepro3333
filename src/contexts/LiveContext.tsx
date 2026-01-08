/**
 * Live Context
 * 
 * Manages active live sessions using Supabase Realtime Broadcast
 * for syncing between clients without a dedicated database table.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LiveSession {
  channelName: string;
  hostId: string;
  hostUsername: string;
  hostAvatarUrl?: string;
  startedAt: string;
  viewerCount: number;
}

interface LiveContextType {
  activeLives: LiveSession[];
  myLive: LiveSession | null;
  addLive: (session: LiveSession) => void;
  removeLive: (channelName: string) => void;
  updateViewerCount: (channelName: string, count: number) => void;
}

const LiveContext = createContext<LiveContextType | null>(null);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [activeLives, setActiveLives] = useState<LiveSession[]>([]);

  // Get my live session
  const myLive = activeLives.find(live => live.hostId === user?.id) || null;

  // Add a new live session
  const addLive = useCallback((session: LiveSession) => {
    setActiveLives(prev => {
      // Prevent duplicates
      if (prev.find(l => l.channelName === session.channelName)) {
        return prev;
      }
      return [...prev, session];
    });

    // Broadcast to other clients
    const channel = supabase.channel('live-sessions');
    channel.send({
      type: 'broadcast',
      event: 'live-started',
      payload: session,
    });
  }, []);

  // Remove a live session
  const removeLive = useCallback((channelName: string) => {
    setActiveLives(prev => prev.filter(l => l.channelName !== channelName));

    // Broadcast to other clients
    const channel = supabase.channel('live-sessions');
    channel.send({
      type: 'broadcast',
      event: 'live-ended',
      payload: { channelName },
    });
  }, []);

  // Update viewer count
  const updateViewerCount = useCallback((channelName: string, count: number) => {
    setActiveLives(prev =>
      prev.map(l =>
        l.channelName === channelName ? { ...l, viewerCount: count } : l
      )
    );
  }, []);

  // Subscribe to live session broadcasts
  useEffect(() => {
    const channel = supabase
      .channel('live-sessions')
      .on('broadcast', { event: 'live-started' }, ({ payload }) => {
        const session = payload as LiveSession;
        setActiveLives(prev => {
          if (prev.find(l => l.channelName === session.channelName)) {
            return prev;
          }
          return [...prev, session];
        });
      })
      .on('broadcast', { event: 'live-ended' }, ({ payload }) => {
        const { channelName } = payload as { channelName: string };
        setActiveLives(prev => prev.filter(l => l.channelName !== channelName));
      })
      .on('broadcast', { event: 'viewer-update' }, ({ payload }) => {
        const { channelName, count } = payload as { channelName: string; count: number };
        setActiveLives(prev =>
          prev.map(l =>
            l.channelName === channelName ? { ...l, viewerCount: count } : l
          )
        );
      })
      .subscribe();

    // Request current live sessions when joining
    channel.send({
      type: 'broadcast',
      event: 'request-lives',
      payload: {},
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Respond to live session requests (share our live if active)
  useEffect(() => {
    if (!myLive) return;

    const channel = supabase.channel('live-sessions');
    
    const handleRequest = () => {
      channel.send({
        type: 'broadcast',
        event: 'live-started',
        payload: myLive,
      });
    };

    channel.on('broadcast', { event: 'request-lives' }, handleRequest);

    return () => {
      channel.unsubscribe();
    };
  }, [myLive]);

  return (
    <LiveContext.Provider
      value={{
        activeLives,
        myLive,
        addLive,
        removeLive,
        updateViewerCount,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
}

export function useLiveContext() {
  const context = useContext(LiveContext);
  if (!context) {
    throw new Error('useLiveContext must be used within a LiveProvider');
  }
  return context;
}
