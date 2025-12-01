import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Copy, LogOut, Loader2 } from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";

interface MultiplayerGomokuProps {
  roomId: string;
  onClose: () => void;
}

type Cell = "X" | "O" | null;
type Board = Cell[][];

const BOARD_SIZE = 10;
const WIN_LENGTH = 5;

interface Player {
  id: string;
  username: string;
  avatar_url: string | null;
  symbol: "X" | "O";
  isReady: boolean;
}

export default function MultiplayerGomoku({ roomId, onClose }: MultiplayerGomokuProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  
  const [board, setBoard] = useState<Board>(() =>
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [mySymbol, setMySymbol] = useState<"X" | "O" | null>(null);
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [channelRef, setChannelRef] = useState<RealtimeChannel | null>(null);

  const isMyTurn = currentTurn === user?.id;
  const opponent = players.find(p => p.id !== user?.id);
  const me = players.find(p => p.id === user?.id);

  // Initialize and load room data
  useEffect(() => {
    const loadRoom = async () => {
      const { data: room } = await supabase
        .from("game_rooms")
        .select(`
          *,
          players:game_room_players(
            user_id,
            player_symbol,
            is_ready,
            profile:profiles(username, avatar_url)
          )
        `)
        .eq("id", roomId)
        .single();

      if (room) {
        setGameStatus(room.status as any);
        setCurrentTurn(room.current_turn);
        setInviteCode(room.invite_code);
        
        const gameState = room.game_state as { board?: Board } | null;
        if (gameState?.board) {
          setBoard(gameState.board);
        }
        if (room.winner_id) {
          setWinner(room.winner_id);
        }

        const playerList: Player[] = room.players.map((p: any) => ({
          id: p.user_id,
          username: p.profile?.username || "Unknown",
          avatar_url: p.profile?.avatar_url,
          symbol: p.player_symbol as "X" | "O",
          isReady: p.is_ready,
        }));
        
        setPlayers(playerList);
        
        const myPlayer = playerList.find(p => p.id === user?.id);
        if (myPlayer) {
          setMySymbol(myPlayer.symbol);
        }
      }
    };

    loadRoom();
  }, [roomId, user?.id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase.channel(`gomoku:${roomId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "move" }, (message) => {
        const { row, col, symbol, nextTurn, newBoard } = message.payload;
        setBoard(newBoard);
        setCurrentTurn(nextTurn);
        playCorrect();
        
        // Check winner after opponent's move
        const winnerSymbol = checkWinner(newBoard, row, col);
        if (winnerSymbol) {
          const winnerPlayer = players.find(p => p.symbol === winnerSymbol);
          if (winnerPlayer) {
            handleGameEnd(winnerPlayer.id);
          }
        }
      })
      .on("broadcast", { event: "game_start" }, (message) => {
        setGameStatus("playing");
        setCurrentTurn(message.payload.firstTurn);
        toast.success("Trận đấu bắt đầu!");
      })
      .on("broadcast", { event: "game_end" }, (message) => {
        setWinner(message.payload.winnerId);
        setGameStatus("finished");
        if (message.payload.winnerId === user.id) {
          playCelebration();
          confetti({ particleCount: 150, spread: 80 });
        }
      })
      .on("broadcast", { event: "player_left" }, () => {
        toast.info("Đối thủ đã rời phòng");
        onClose();
      })
      .subscribe();

    setChannelRef(channel);

    // Also subscribe to database changes
    const dbChannel = supabase
      .channel(`gomoku-db:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_room_players",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          // Reload players
          const { data } = await supabase
            .from("game_room_players")
            .select("user_id, player_symbol, is_ready, profile:profiles(username, avatar_url)")
            .eq("room_id", roomId);
          
          if (data) {
            const playerList: Player[] = data.map((p: any) => ({
              id: p.user_id,
              username: p.profile?.username || "Unknown",
              avatar_url: p.profile?.avatar_url,
              symbol: p.player_symbol as "X" | "O",
              isReady: p.is_ready,
            }));
            setPlayers(playerList);

            // Start game if both players ready
            if (playerList.length === 2 && playerList.every(p => p.isReady) && gameStatus === "waiting") {
              const xPlayer = playerList.find(p => p.symbol === "X");
              if (xPlayer) {
                await supabase
                  .from("game_rooms")
                  .update({ status: "playing", current_turn: xPlayer.id })
                  .eq("id", roomId);
                
                channel.send({
                  type: "broadcast",
                  event: "game_start",
                  payload: { firstTurn: xPlayer.id }
                });
                
                setGameStatus("playing");
                setCurrentTurn(xPlayer.id);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      dbChannel.unsubscribe();
    };
  }, [roomId, user, players, gameStatus, playCorrect, playCelebration, onClose]);

  const checkWinner = (board: Board, row: number, col: number): Cell => {
    const cell = board[row][col];
    if (!cell) return null;

    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1],
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      
      for (let i = 1; i < WIN_LENGTH; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === cell) {
          count++;
        } else break;
      }
      
      for (let i = 1; i < WIN_LENGTH; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === cell) {
          count++;
        } else break;
      }

      if (count >= WIN_LENGTH) return cell;
    }

    return null;
  };

  const handleGameEnd = async (winnerId: string) => {
    setWinner(winnerId);
    setGameStatus("finished");

    await supabase
      .from("game_rooms")
      .update({ status: "finished", winner_id: winnerId })
      .eq("id", roomId);

    channelRef?.send({
      type: "broadcast",
      event: "game_end",
      payload: { winnerId }
    });

    // Save score
    if (winnerId === user?.id) {
      await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "gomoku-multiplayer",
        score: 10,
      });
      playCelebration();
      confetti({ particleCount: 150, spread: 80 });
    }
  };

  const handleCellClick = async (row: number, col: number) => {
    if (!isMyTurn || board[row][col] || winner || gameStatus !== "playing" || !mySymbol) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = mySymbol;
    setBoard(newBoard);
    playCorrect();

    const nextTurn = opponent?.id || currentTurn;
    setCurrentTurn(nextTurn);

    // Update database
    await supabase
      .from("game_rooms")
      .update({
        game_state: { board: newBoard },
        current_turn: nextTurn,
      })
      .eq("id", roomId);

    // Broadcast move
    channelRef?.send({
      type: "broadcast",
      event: "move",
      payload: { row, col, symbol: mySymbol, nextTurn, newBoard }
    });

    // Check winner
    const winnerSymbol = checkWinner(newBoard, row, col);
    if (winnerSymbol) {
      handleGameEnd(user!.id);
    }
  };

  const handleLeave = async () => {
    channelRef?.send({
      type: "broadcast",
      event: "player_left",
      payload: {}
    });

    await supabase
      .from("game_room_players")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user?.id);

    onClose();
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast.success("Đã copy mã mời!");
    }
  };

  const winnerPlayer = winner ? players.find(p => p.id === winner) : null;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Players info */}
      <div className="flex justify-between w-full max-w-md">
        {/* Player X */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${currentTurn === players.find(p => p.symbol === "X")?.id ? "bg-primary/20 ring-2 ring-primary" : ""}`}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={players.find(p => p.symbol === "X")?.avatar_url || ""} />
            <AvatarFallback className="bg-blue-500 text-white">X</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {players.find(p => p.symbol === "X")?.username || "Đang chờ..."}
            </p>
            <Badge variant="secondary" className="text-xs">X</Badge>
          </div>
        </div>

        <div className="text-2xl font-bold self-center">VS</div>

        {/* Player O */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${currentTurn === players.find(p => p.symbol === "O")?.id ? "bg-primary/20 ring-2 ring-primary" : ""}`}>
          <div className="text-right">
            <p className="font-medium text-sm">
              {players.find(p => p.symbol === "O")?.username || "Đang chờ..."}
            </p>
            <Badge variant="secondary" className="text-xs">O</Badge>
          </div>
          <Avatar className="w-10 h-10">
            <AvatarImage src={players.find(p => p.symbol === "O")?.avatar_url || ""} />
            <AvatarFallback className="bg-red-500 text-white">O</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Waiting state */}
      {gameStatus === "waiting" && (
        <div className="text-center p-4 bg-muted rounded-lg">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
          <p className="font-medium">Đang chờ đối thủ...</p>
          {inviteCode && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Mã mời:</span>
              <Badge variant="outline" className="font-mono text-lg">{inviteCode}</Badge>
              <Button variant="ghost" size="sm" onClick={copyInviteCode}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Winner announcement */}
      {winner && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-2"
        >
          <p className="text-xl font-bold text-primary">
            {winner === user?.id ? "🎉 Bạn thắng!" : `${winnerPlayer?.username} thắng!`}
          </p>
        </motion.div>
      )}

      {/* Game board */}
      <div 
        className="grid gap-0 border-2 border-primary rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}
      >
        {board.map((row, ri) =>
          row.map((cell, ci) => (
            <button
              key={`${ri}-${ci}`}
              onClick={() => handleCellClick(ri, ci)}
              className={`
                w-7 h-7 sm:w-8 sm:h-8 
                border border-amber-300 dark:border-amber-700
                flex items-center justify-center
                text-lg sm:text-xl font-bold
                transition-colors
                ${cell === "X" ? "text-blue-600" : cell === "O" ? "text-red-600" : ""}
                ${isMyTurn && !cell && gameStatus === "playing" ? "hover:bg-amber-100 dark:hover:bg-amber-800/50 cursor-pointer" : "cursor-default"}
              `}
              disabled={!isMyTurn || gameStatus !== "playing" || !!winner}
            >
              {cell}
            </button>
          ))
        )}
      </div>

      {/* Turn indicator */}
      {gameStatus === "playing" && !winner && (
        <p className="text-sm text-muted-foreground">
          {isMyTurn ? "👉 Lượt của bạn" : `⏳ Đợi ${opponent?.username || "đối thủ"}...`}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleLeave} variant="outline">
          <LogOut className="w-4 h-4 mr-2" />
          Rời phòng
        </Button>
      </div>
    </div>
  );
}
