import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface GameRoom {
  id: string;
  game_type: string;
  status: "waiting" | "playing" | "finished";
  created_by: string;
  winner_id: string | null;
  current_turn: string | null;
  game_state: any;
  is_private: boolean;
  invite_code: string | null;
  created_at: string;
  players?: GameRoomPlayer[];
  creator?: { username: string; avatar_url: string | null };
}

export interface GameRoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  player_symbol: string | null;
  score: number;
  is_ready: boolean;
  profile?: { username: string; avatar_url: string | null };
}

interface UseMultiplayerGameReturn {
  rooms: GameRoom[];
  currentRoom: GameRoom | null;
  players: GameRoomPlayer[];
  isLoading: boolean;
  mySymbol: string | null;
  isMyTurn: boolean;
  createRoom: (gameType: string, isPrivate: boolean) => Promise<string | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  joinByCode: (code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  setReady: () => Promise<void>;
  makeMove: (moveData: any) => void;
  findRandomMatch: (gameType: string) => Promise<boolean>;
  refreshRooms: () => Promise<void>;
}

export function useMultiplayerGame(
  gameType?: string,
  onGameUpdate?: (gameState: any, currentTurn: string | null) => void,
  onGameEnd?: (winnerId: string | null) => void
): UseMultiplayerGameReturn {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GameRoomPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mySymbol, setMySymbol] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const isMyTurn = currentRoom?.current_turn === user?.id;

  // Fetch available rooms
  const refreshRooms = useCallback(async () => {
    if (!gameType) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("game_rooms")
        .select(`
          *,
          creator:profiles!game_rooms_created_by_fkey(username, avatar_url),
          players:game_room_players(
            *,
            profile:profiles(username, avatar_url)
          )
        `)
        .eq("game_type", gameType)
        .eq("status", "waiting")
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRooms((data as any[]) || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameType]);

  // Create a new room
  const createRoom = useCallback(async (type: string, isPrivate: boolean): Promise<string | null> => {
    if (!user) {
      toast.error("Vui lòng đăng nhập");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("game_rooms")
        .insert({
          game_type: type,
          created_by: user.id,
          is_private: isPrivate,
          game_state: {},
          current_turn: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Join as first player
      const symbol = type === "memory" ? "player1" : "X";
      await supabase
        .from("game_room_players")
        .insert({
          room_id: data.id,
          user_id: user.id,
          player_symbol: symbol,
          is_ready: true,
        });

      setMySymbol(symbol);
      toast.success(isPrivate ? `Mã mời: ${data.invite_code}` : "Đã tạo phòng!");
      return data.id;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Không thể tạo phòng");
      return null;
    }
  }, [user]);

  // Join a room
  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!user) {
      toast.error("Vui lòng đăng nhập");
      return false;
    }

    try {
      // Get room info
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select("*, players:game_room_players(*)")
        .eq("id", roomId)
        .single();

      if (roomError) throw roomError;

      // Check if already joined
      const existingPlayer = room.players?.find((p: any) => p.user_id === user.id);
      if (existingPlayer) {
        setMySymbol(existingPlayer.player_symbol);
        return true;
      }

      // Check if room is full
      if (room.players && room.players.length >= 2) {
        toast.error("Phòng đã đầy");
        return false;
      }

      // Join as second player
      const symbol = room.game_type === "memory" ? "player2" : "O";
      const { error: joinError } = await supabase
        .from("game_room_players")
        .insert({
          room_id: roomId,
          user_id: user.id,
          player_symbol: symbol,
          is_ready: true,
        });

      if (joinError) throw joinError;

      setMySymbol(symbol);
      toast.success("Đã vào phòng!");
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Không thể vào phòng");
      return false;
    }
  }, [user]);

  // Join by invite code
  const joinByCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      const { data: room, error } = await supabase
        .from("game_rooms")
        .select("id")
        .eq("invite_code", code.toUpperCase())
        .eq("status", "waiting")
        .single();

      if (error || !room) {
        toast.error("Mã không hợp lệ hoặc phòng đã đóng");
        return false;
      }

      return await joinRoom(room.id);
    } catch (error) {
      toast.error("Không tìm thấy phòng");
      return false;
    }
  }, [joinRoom]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!currentRoom || !user) return;

    try {
      await supabase
        .from("game_room_players")
        .delete()
        .eq("room_id", currentRoom.id)
        .eq("user_id", user.id);

      // If creator leaves and room is waiting, delete room
      if (currentRoom.created_by === user.id && currentRoom.status === "waiting") {
        await supabase
          .from("game_rooms")
          .delete()
          .eq("id", currentRoom.id);
      }

      setCurrentRoom(null);
      setPlayers([]);
      setMySymbol(null);
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  }, [currentRoom, user]);

  // Set ready status
  const setReady = useCallback(async () => {
    if (!currentRoom || !user) return;

    try {
      await supabase
        .from("game_room_players")
        .update({ is_ready: true })
        .eq("room_id", currentRoom.id)
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error setting ready:", error);
    }
  }, [currentRoom, user]);

  // Make a move
  const makeMove = useCallback((moveData: any) => {
    if (!currentRoom || !channelRef.current) return;

    channelRef.current.send({
      type: "broadcast",
      event: "game_move",
      payload: {
        userId: user?.id,
        moveData,
      },
    });
  }, [currentRoom, user]);

  // Find random match
  const findRandomMatch = useCallback(async (type: string): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      // Find available room
      const { data: availableRooms } = await supabase
        .from("game_rooms")
        .select("id")
        .eq("game_type", type)
        .eq("status", "waiting")
        .eq("is_private", false)
        .neq("created_by", user.id)
        .limit(1);

      if (availableRooms && availableRooms.length > 0) {
        return await joinRoom(availableRooms[0].id);
      }

      // No room found, create one
      const roomId = await createRoom(type, false);
      return roomId !== null;
    } finally {
      setIsLoading(false);
    }
  }, [user, joinRoom, createRoom]);

  // Subscribe to room updates
  useEffect(() => {
    if (!currentRoom?.id || !user) return;

    const channel = supabase.channel(`game:room-${currentRoom.id}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "game_move" }, (message) => {
        const { userId, moveData } = message.payload;
        if (userId !== user.id) {
          onGameUpdate?.(moveData.gameState, moveData.nextTurn);
        }
      })
      .on("broadcast", { event: "game_end" }, (message) => {
        onGameEnd?.(message.payload.winnerId);
      })
      .on("broadcast", { event: "player_joined" }, () => {
        // Refresh players
        fetchRoomData(currentRoom.id);
      })
      .subscribe();

    channelRef.current = channel;

    // Also subscribe to database changes for room status
    const roomChannel = supabase
      .channel(`room-db-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${currentRoom.id}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setCurrentRoom(payload.new as GameRoom);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_room_players",
          filter: `room_id=eq.${currentRoom.id}`,
        },
        () => {
          fetchRoomData(currentRoom.id);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      roomChannel.unsubscribe();
      channelRef.current = null;
    };
  }, [currentRoom?.id, user, onGameUpdate, onGameEnd]);

  // Fetch room data
  const fetchRoomData = async (roomId: string) => {
    const { data: room } = await supabase
      .from("game_rooms")
      .select(`
        *,
        players:game_room_players(
          *,
          profile:profiles(username, avatar_url)
        )
      `)
      .eq("id", roomId)
      .single();

    if (room) {
      setCurrentRoom(room as any);
      setPlayers((room as any).players || []);
    }
  };

  // Load rooms on mount
  useEffect(() => {
    if (gameType) {
      refreshRooms();
    }
  }, [gameType, refreshRooms]);

  return {
    rooms,
    currentRoom,
    players,
    isLoading,
    mySymbol,
    isMyTurn,
    createRoom,
    joinRoom,
    joinByCode,
    leaveRoom,
    setReady,
    makeMove,
    findRandomMatch,
    refreshRooms,
  };
}
