import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Copy, LogOut, Loader2, RotateCcw } from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";

interface MultiplayerTicTacToeProps {
  roomId: string;
  onClose: () => void;
}

type Cell = "X" | "O" | null;

interface Player {
  id: string;
  username: string;
  avatar_url: string | null;
  symbol: "X" | "O";
  isReady: boolean;
  score: number;
}

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export default function MultiplayerTicTacToe({ roomId, onClose }: MultiplayerTicTacToeProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [mySymbol, setMySymbol] = useState<"X" | "O" | null>(null);
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [channelRef, setChannelRef] = useState<RealtimeChannel | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);

  const isMyTurn = currentTurn === user?.id;
  const opponent = players.find(p => p.id !== user?.id);

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
            score,
            profile:profiles(username, avatar_url)
          )
        `)
        .eq("id", roomId)
        .single();

      if (room) {
        setGameStatus(room.status as any);
        setCurrentTurn(room.current_turn);
        setInviteCode(room.invite_code);
        
        const gameState = room.game_state as { board?: Cell[]; round?: number } | null;
        if (gameState?.board) {
          setBoard(gameState.board);
        }
        if (gameState?.round) {
          setRoundNumber(gameState.round);
        }

        const playerList: Player[] = room.players.map((p: any) => ({
          id: p.user_id,
          username: p.profile?.username || "Unknown",
          avatar_url: p.profile?.avatar_url,
          symbol: p.player_symbol as "X" | "O",
          isReady: p.is_ready,
          score: p.score || 0,
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

  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase.channel(`tictactoe:${roomId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "move" }, (message) => {
        const { index, symbol, nextTurn, newBoard } = message.payload;
        setBoard(newBoard);
        setCurrentTurn(nextTurn);
        playCorrect();
      })
      .on("broadcast", { event: "game_start" }, (message) => {
        setGameStatus("playing");
        setCurrentTurn(message.payload.firstTurn);
        toast.success("Trận đấu bắt đầu!");
      })
      .on("broadcast", { event: "round_end" }, (message) => {
        const { winnerId, isDraw: draw, scores } = message.payload;
        setWinner(winnerId);
        setIsDraw(draw);
        
        // Update scores
        setPlayers(prev => prev.map(p => ({
          ...p,
          score: scores[p.id] || p.score
        })));

        if (winnerId === user.id) {
          playCelebration();
          confetti({ particleCount: 100, spread: 60 });
        }
      })
      .on("broadcast", { event: "new_round" }, (message) => {
        setBoard(Array(9).fill(null));
        setWinner(null);
        setIsDraw(false);
        setCurrentTurn(message.payload.firstTurn);
        setRoundNumber(message.payload.round);
      })
      .on("broadcast", { event: "player_left" }, () => {
        toast.info("Đối thủ đã rời phòng");
        onClose();
      })
      .subscribe();

    setChannelRef(channel);

    const dbChannel = supabase
      .channel(`tictactoe-db:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_room_players",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          const { data } = await supabase
            .from("game_room_players")
            .select("user_id, player_symbol, is_ready, score, profile:profiles(username, avatar_url)")
            .eq("room_id", roomId);
          
          if (data) {
            const playerList: Player[] = data.map((p: any) => ({
              id: p.user_id,
              username: p.profile?.username || "Unknown",
              avatar_url: p.profile?.avatar_url,
              symbol: p.player_symbol as "X" | "O",
              isReady: p.is_ready,
              score: p.score || 0,
            }));
            setPlayers(playerList);

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
  }, [roomId, user, gameStatus, playCorrect, playCelebration, onClose]);

  const checkWinner = (board: Cell[]): "X" | "O" | "draw" | null => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every(cell => cell !== null)) {
      return "draw";
    }
    return null;
  };

  const handleCellClick = async (index: number) => {
    if (!isMyTurn || board[index] || winner || isDraw || gameStatus !== "playing" || !mySymbol) return;

    const newBoard = [...board];
    newBoard[index] = mySymbol;
    setBoard(newBoard);
    playCorrect();

    const nextTurn = opponent?.id || currentTurn;
    setCurrentTurn(nextTurn);

    await supabase
      .from("game_rooms")
      .update({
        game_state: { board: newBoard, round: roundNumber },
        current_turn: nextTurn,
      })
      .eq("id", roomId);

    channelRef?.send({
      type: "broadcast",
      event: "move",
      payload: { index, symbol: mySymbol, nextTurn, newBoard }
    });

    const result = checkWinner(newBoard);
    if (result) {
      const winnerId = result === "draw" ? null : players.find(p => p.symbol === result)?.id || null;
      const newScores: Record<string, number> = {};
      
      players.forEach(p => {
        newScores[p.id] = p.score + (p.id === winnerId ? 1 : 0);
      });

      // Update scores in database
      for (const p of players) {
        await supabase
          .from("game_room_players")
          .update({ score: newScores[p.id] })
          .eq("room_id", roomId)
          .eq("user_id", p.id);
      }

      setWinner(winnerId);
      setIsDraw(result === "draw");
      setPlayers(prev => prev.map(p => ({ ...p, score: newScores[p.id] })));

      channelRef?.send({
        type: "broadcast",
        event: "round_end",
        payload: { winnerId, isDraw: result === "draw", scores: newScores }
      });

      if (winnerId === user?.id) {
        playCelebration();
        confetti({ particleCount: 100, spread: 60 });
        
        await supabase.from("game_scores").insert({
          user_id: user.id,
          game_type: "tictactoe-multiplayer",
          score: 5,
        });
      }
    }
  };

  const handleNewRound = async () => {
    const newRound = roundNumber + 1;
    const xPlayer = players.find(p => p.symbol === "X");
    
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsDraw(false);
    setRoundNumber(newRound);
    setCurrentTurn(xPlayer?.id || null);

    await supabase
      .from("game_rooms")
      .update({
        game_state: { board: Array(9).fill(null), round: newRound },
        current_turn: xPlayer?.id,
      })
      .eq("id", roomId);

    channelRef?.send({
      type: "broadcast",
      event: "new_round",
      payload: { firstTurn: xPlayer?.id, round: newRound }
    });
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
      {/* Round & Scores */}
      <div className="text-center">
        <Badge variant="outline" className="mb-2">Ván {roundNumber}</Badge>
      </div>

      {/* Players info */}
      <div className="flex justify-between w-full max-w-sm">
        {players.map((player) => (
          <div 
            key={player.id}
            className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
              currentTurn === player.id ? "bg-primary/20 ring-2 ring-primary" : ""
            }`}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={player.avatar_url || ""} />
              <AvatarFallback className={player.symbol === "X" ? "bg-blue-500 text-white" : "bg-red-500 text-white"}>
                {player.symbol}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{player.username}</p>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">{player.symbol}</Badge>
                <span className="text-sm font-bold">{player.score} điểm</span>
              </div>
            </div>
          </div>
        ))}
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

      {/* Result announcement */}
      {(winner || isDraw) && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-2"
        >
          <p className="text-xl font-bold text-primary">
            {isDraw ? "🤝 Hòa!" : winner === user?.id ? "🎉 Bạn thắng!" : `${winnerPlayer?.username} thắng!`}
          </p>
        </motion.div>
      )}

      {/* Game board */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded-lg">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleCellClick(index)}
            className={`
              w-20 h-20 sm:w-24 sm:h-24
              bg-background rounded-lg
              flex items-center justify-center
              text-4xl sm:text-5xl font-bold
              transition-all
              ${cell === "X" ? "text-blue-600" : cell === "O" ? "text-red-600" : ""}
              ${isMyTurn && !cell && gameStatus === "playing" && !winner && !isDraw 
                ? "hover:bg-accent cursor-pointer" 
                : "cursor-default"}
            `}
            disabled={!isMyTurn || gameStatus !== "playing" || !!winner || isDraw}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Turn indicator */}
      {gameStatus === "playing" && !winner && !isDraw && (
        <p className="text-sm text-muted-foreground">
          {isMyTurn ? "👉 Lượt của bạn" : `⏳ Đợi ${opponent?.username || "đối thủ"}...`}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {(winner || isDraw) && (
          <Button onClick={handleNewRound}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Ván mới
          </Button>
        )}
        <Button onClick={handleLeave} variant="outline">
          <LogOut className="w-4 h-4 mr-2" />
          Rời phòng
        </Button>
      </div>
    </div>
  );
}
