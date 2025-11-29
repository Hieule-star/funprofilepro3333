import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WatchlistItem {
  id: string;
  user_id: string;
  token_symbol: string;
  token_name: string | null;
  price_alert_upper: number | null;
  price_alert_lower: number | null;
  created_at: string;
  updated_at: string;
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WatchlistItem[];
    },
    enabled: !!userId,
  });

  const addToWatchlist = useMutation({
    mutationFn: async ({
      tokenSymbol,
      tokenName,
      priceAlertUpper,
      priceAlertLower,
    }: {
      tokenSymbol: string;
      tokenName?: string;
      priceAlertUpper?: number;
      priceAlertLower?: number;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('token_watchlist')
        .insert({
          user_id: userId,
          token_symbol: tokenSymbol,
          token_name: tokenName,
          price_alert_upper: priceAlertUpper,
          price_alert_lower: priceAlertLower,
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

  const updatePriceAlerts = useMutation({
    mutationFn: async ({
      itemId,
      priceAlertUpper,
      priceAlertLower,
    }: {
      itemId: string;
      priceAlertUpper?: number | null;
      priceAlertLower?: number | null;
    }) => {
      const { error } = await supabase
        .from('token_watchlist')
        .update({
          price_alert_upper: priceAlertUpper,
          price_alert_lower: priceAlertLower,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      toast({
        title: 'Đã cập nhật',
        description: 'Cảnh báo giá đã được cập nhật',
      });
    },
  });

  return {
    watchlist: watchlist || [],
    isLoading,
    addToWatchlist: addToWatchlist.mutate,
    removeFromWatchlist: removeFromWatchlist.mutate,
    updatePriceAlerts: updatePriceAlerts.mutate,
  };
}
