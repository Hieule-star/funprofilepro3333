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

interface MultiplayerMemoryProps {
  roomId: string;
  onClose: () => void;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface Player {
  id: string;
  username: string;
  avatar_url: string | null;
  symbol: string;
  score: number;
}

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"];

export default function MultiplayerMemory({ roomId, onClose }: MultiplayerMemoryProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  
  const [cards, setCards] = useState<Card[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [channelRef, setChannelRef] = useState<RealtimeChannel | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isMyTurn = currentTurn === user?.id;
  const opponent = players.find(p => p.id !== user?.id);
  const me = players.find(p => p.id === user?.id);
  const isGameOver = cards.length > 0 && cards.every(c => c.isMatched);

  const initializeCards = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);
    return shuffled;
  };

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
        
        const gameState = room.game_state as { cards?: Card[] } | null;
        if (gameState?.cards) {
          setCards(gameState.cards);
        }

        const playerList: Player[] = room.players.map((p: any) => ({
          id: p.user_id,
          username: p.profile?.username || "Unknown",
          avatar_url: p.profile?.avatar_url,
          symbol: p.player_symbol,
          score: p.score || 0,
        }));
        
        setPlayers(playerList);
      }
    };

    loadRoom();
  }, [roomId, user?.id]);

  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase.channel(`memory:${roomId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "flip" }, (message) => {
        const { cardId, newCards, flipped } = message.payload;
        setCards(newCards);
        setFlippedCards(flipped);
      })
      .on("broadcast", { event: "match_result" }, (message) => {
        const { matched, newCards, nextTurn, scores } = message.payload;
        setCards(newCards);
        setFlippedCards([]);
        setCurrentTurn(nextTurn);
        setIsProcessing(false);
        
        setPlayers(prev => prev.map(p => ({
          ...p,
          score: scores[p.id] ?? p.score
        })));

        if (matched) {
          playCorrect();
        }
      })
      .on("broadcast", { event: "game_start" }, (message) => {
        setGameStatus("playing");
        setCurrentTurn(message.payload.firstTurn);
        setCards(message.payload.cards);
        toast.success("Trận đấu bắt đầu!");
      })
      .on("broadcast", { event: "game_end" }, (message) => {
        setGameStatus("finished");
        const { winnerId, scores } = message.payload;
        setPlayers(prev => prev.map(p => ({
          ...p,
          score: scores[p.id] ?? p.score
        })));
        
        if (winnerId === user.id) {
          playCelebration();
          confetti({ particleCount: 150, spread: 80 });
        }
      })
      .on("broadcast", { event: "new_game" }, (message) => {
        setCards(message.payload.cards);
        setFlippedCards([]);
        setCurrentTurn(message.payload.firstTurn);
        setGameStatus("playing");
        setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
      })
      .on("broadcast", { event: "player_left" }, () => {
        toast.info("Đối thủ đã rời phòng");
        onClose();
      })
      .subscribe();

    setChannelRef(channel);

    const dbChannel = supabase
      .channel(`memory-db:${roomId}`)
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
              symbol: p.player_symbol,
              score: p.score || 0,
            }));
            setPlayers(playerList);

            if (playerList.length === 2 && playerList.every(p => p.symbol) && gameStatus === "waiting") {
              const firstPlayer = playerList.find(p => p.symbol === "player1");
              const newCards = initializeCards();
              
              if (firstPlayer) {
                await supabase
                  .from("game_rooms")
                  .update({ 
                    status: "playing", 
                    current_turn: firstPlayer.id,
                    game_state: { cards: newCards }
                  })
                  .eq("id", roomId);
                
                channel.send({
                  type: "broadcast",
                  event: "game_start",
                  payload: { firstTurn: firstPlayer.id, cards: newCards }
                });
                
                setGameStatus("playing");
                setCurrentTurn(firstPlayer.id);
                setCards(newCards);
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

  const handleCardClick = async (cardId: number) => {
    if (!isMyTurn || isProcessing || flippedCards.length >= 2) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newCards = cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    const newFlipped = [...flippedCards, cardId];
    
    setCards(newCards);
    setFlippedCards(newFlipped);

    channelRef?.send({
      type: "broadcast",
      event: "flip",
      payload: { cardId, newCards, flipped: newFlipped }
    });

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      
      setTimeout(async () => {
        const [first, second] = newFlipped;
        const firstCard = newCards.find(c => c.id === first);
        const secondCard = newCards.find(c => c.id === second);
        const matched = firstCard?.emoji === secondCard?.emoji;

        let updatedCards: Card[];
        if (matched) {
          updatedCards = newCards.map(c =>
            c.id === first || c.id === second
              ? { ...c, isMatched: true }
              : c
          );
          playCorrect();
        } else {
          updatedCards = newCards.map(c =>
            c.id === first || c.id === second
              ? { ...c, isFlipped: false }
              : c
          );
        }

        const newScores: Record<string, number> = {};
        players.forEach(p => {
          newScores[p.id] = p.score + (matched && p.id === user?.id ? 1 : 0);
        });

        const nextTurn = matched ? currentTurn : opponent?.id;

        setCards(updatedCards);
        setFlippedCards([]);
        setCurrentTurn(nextTurn || null);
        setIsProcessing(false);
        setPlayers(prev => prev.map(p => ({ ...p, score: newScores[p.id] })));

        // Update database
    await supabase
      .from("game_rooms")
      .update({
        game_state: { cards: updatedCards } as any,
        current_turn: nextTurn,
      })
      .eq("id", roomId);

        if (matched) {
          await supabase
            .from("game_room_players")
            .update({ score: newScores[user!.id] })
            .eq("room_id", roomId)
            .eq("user_id", user!.id);
        }

        channelRef?.send({
          type: "broadcast",
          event: "match_result",
          payload: { matched, newCards: updatedCards, nextTurn, scores: newScores }
        });

        // Check game end
        if (updatedCards.every(c => c.isMatched)) {
          const winnerId = Object.entries(newScores).sort((a, b) => b[1] - a[1])[0][0];
          
          await supabase
            .from("game_rooms")
            .update({ status: "finished", winner_id: winnerId })
            .eq("id", roomId);

          channelRef?.send({
            type: "broadcast",
            event: "game_end",
            payload: { winnerId, scores: newScores }
          });

          setGameStatus("finished");

          if (winnerId === user?.id) {
            playCelebration();
            confetti({ particleCount: 150, spread: 80 });
            
            await supabase.from("game_scores").insert({
              user_id: user.id,
              game_type: "memory-multiplayer",
              score: newScores[user.id],
            });
          }
        }
      }, 1000);
    }
  };

  const handleNewGame = async () => {
    const newCards = initializeCards();
    const firstPlayer = players.find(p => p.symbol === "player1");
    
    setCards(newCards);
    setFlippedCards([]);
    setCurrentTurn(firstPlayer?.id || null);
    setGameStatus("playing");
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));

    // Reset scores in database
    for (const p of players) {
      await supabase
        .from("game_room_players")
        .update({ score: 0 })
        .eq("room_id", roomId)
        .eq("user_id", p.id);
    }

    await supabase
      .from("game_rooms")
      .update({
        game_state: { cards: newCards },
        current_turn: firstPlayer?.id,
        status: "playing",
        winner_id: null,
      })
      .eq("id", roomId);

    channelRef?.send({
      type: "broadcast",
      event: "new_game",
      payload: { cards: newCards, firstTurn: firstPlayer?.id }
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

  const winner = isGameOver ? players.sort((a, b) => b.score - a.score)[0] : null;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
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
              <AvatarFallback>{player.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{player.username}</p>
              <span className="text-lg font-bold text-primary">{player.score} cặp</span>
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

      {/* Winner announcement */}
      {isGameOver && winner && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-2"
        >
          <p className="text-xl font-bold text-primary">
            {winner.id === user?.id ? "🎉 Bạn thắng!" : `${winner.username} thắng!`}
          </p>
          <p className="text-muted-foreground">{winner.score} cặp</p>
        </motion.div>
      )}

      {/* Game board */}
      {cards.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {cards.map((card) => (
            <motion.button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`
                w-16 h-16 sm:w-20 sm:h-20
                rounded-lg text-3xl
                flex items-center justify-center
                transition-all
                ${card.isFlipped || card.isMatched
                  ? "bg-primary/20"
                  : "bg-muted hover:bg-accent"
                }
                ${card.isMatched ? "opacity-50" : ""}
                ${isMyTurn && !card.isFlipped && !card.isMatched && !isProcessing
                  ? "cursor-pointer"
                  : "cursor-default"
                }
              `}
              disabled={!isMyTurn || card.isFlipped || card.isMatched || isProcessing}
              whileTap={{ scale: 0.95 }}
            >
              {card.isFlipped || card.isMatched ? card.emoji : "❓"}
            </motion.button>
          ))}
        </div>
      )}

      {/* Turn indicator */}
      {gameStatus === "playing" && !isGameOver && (
        <p className="text-sm text-muted-foreground">
          {isMyTurn ? "👉 Lượt của bạn" : `⏳ Đợi ${opponent?.username || "đối thủ"}...`}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {isGameOver && (
          <Button onClick={handleNewGame}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Chơi lại
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
