import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WatchlistItem {
  id: string;
  user_id: string;
  token_symbol: string;
  token_name: string;
  added_at: string;
}

export function useWatchlist(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: watchlist, isLoading } = useQuery({
    queryKey: ['watchlist', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('token_watchlist')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data as WatchlistItem[];
    },
    enabled: !!userId,
  });

  const addToWatchlist = useMutation({
    mutationFn: async ({
      tokenSymbol,
      tokenName,
    }: {
      tokenSymbol: string;
      tokenName: string;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('token_watchlist')
        .insert({
          user_id: userId,
          token_symbol: tokenSymbol,
          token_name: tokenName,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      toast({
        title: 'Đã thêm vào watchlist',
        description: 'Token đã được thêm vào danh sách theo dõi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể thêm token vào watchlist',
        variant: 'destructive',
      });
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('token_watchlist')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      toast({
        title: 'Đã xóa',
        description: 'Token đã được xóa khỏi watchlist',
      });
    },
  });

  return {
    watchlist: watchlist || [],
    isLoading,
    addToWatchlist: addToWatchlist.mutate,
    removeFromWatchlist: removeFromWatchlist.mutate,
  };
}
