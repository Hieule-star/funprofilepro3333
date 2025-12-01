import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMultiplayerGame, GameRoom } from "@/hooks/useMultiplayerGame";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Search, UserPlus, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface MultiplayerLobbyProps {
  gameType: string;
  gameName: string;
  onJoinRoom: (roomId: string) => void;
}

export default function MultiplayerLobby({ gameType, gameName, onJoinRoom }: MultiplayerLobbyProps) {
  const { user } = useAuth();
  const { rooms, isLoading, createRoom, joinRoom, joinByCode, findRandomMatch, refreshRooms } = useMultiplayerGame(gameType);
  const [inviteCode, setInviteCode] = useState("");
  const [showInviteFriends, setShowInviteFriends] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("friendships")
        .select(`
          friend:profiles!friendships_friend_id_fkey(id, username, avatar_url),
          user:profiles!friendships_user_id_fkey(id, username, avatar_url)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (data) {
        const friendList = data.map((f: any) => 
          f.friend.id === user.id ? f.user : f.friend
        );
        setFriends(friendList);
      }
    };

    fetchFriends();
  }, [user]);

  const handleCreatePublicRoom = async () => {
    const roomId = await createRoom(gameType, false);
    if (roomId) {
      onJoinRoom(roomId);
    }
  };

  const handleCreatePrivateRoom = async () => {
    const roomId = await createRoom(gameType, true);
    if (roomId) {
      // Get the invite code
      const { data } = await supabase
        .from("game_rooms")
        .select("invite_code")
        .eq("id", roomId)
        .single();
      
      if (data?.invite_code) {
        setCreatedRoomCode(data.invite_code);
        setShowInviteFriends(true);
      }
      onJoinRoom(roomId);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    const success = await joinByCode(inviteCode);
    if (success) {
      // Get the room ID from code
      const { data } = await supabase
        .from("game_rooms")
        .select("id")
        .eq("invite_code", inviteCode.toUpperCase())
        .single();
      
      if (data) {
        onJoinRoom(data.id);
      }
    }
    setInviteCode("");
  };

  const handleRandomMatch = async () => {
    const success = await findRandomMatch(gameType);
    if (success) {
      // Get my current room
      const { data } = await supabase
        .from("game_room_players")
        .select("room_id")
        .eq("user_id", user?.id)
        .order("joined_at", { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        onJoinRoom(data.room_id);
      }
    }
  };

  const handleJoinRoom = async (room: GameRoom) => {
    const success = await joinRoom(room.id);
    if (success) {
      onJoinRoom(room.id);
    }
  };

  const copyInviteCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      toast.success("Đã copy mã mời!");
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{gameName} - Multiplayer</h2>
        <p className="text-muted-foreground">Chơi với bạn bè hoặc người chơi ngẫu nhiên</p>
      </div>

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick">Nhanh</TabsTrigger>
          <TabsTrigger value="rooms">Phòng chờ</TabsTrigger>
          <TabsTrigger value="private">Riêng tư</TabsTrigger>
        </TabsList>

        {/* Quick Match Tab */}
        <TabsContent value="quick" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Button 
                onClick={handleRandomMatch} 
                className="w-full h-16 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 mr-2" />
                )}
                Tìm đối thủ ngẫu nhiên
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">hoặc</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Nhập mã mời..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase"
                />
                <Button onClick={handleJoinByCode} disabled={!inviteCode.trim()}>
                  Vào phòng
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Public Rooms Tab */}
        <TabsContent value="rooms" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {rooms.length} phòng đang chờ
            </span>
            <Button variant="ghost" size="sm" onClick={refreshRooms}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : rooms.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Chưa có phòng nào</p>
                <Button onClick={handleCreatePublicRoom} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo phòng mới
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <Card key={room.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={room.creator?.avatar_url || ""} />
                          <AvatarFallback>
                            {room.creator?.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{room.creator?.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {room.players?.length || 1}/2 người chơi
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => handleJoinRoom(room)}>
                        Vào chơi
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button onClick={handleCreatePublicRoom} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Tạo phòng công khai
          </Button>
        </TabsContent>

        {/* Private Room Tab */}
        <TabsContent value="private" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tạo phòng riêng tư</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleCreatePrivateRoom} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Tạo & Mời bạn bè
              </Button>

              {createdRoomCode && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">Mã mời của bạn:</p>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-2xl px-4 py-2 font-mono">
                      {createdRoomCode}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={copyInviteCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Gửi mã này cho bạn bè để vào chơi cùng
                  </p>
                </div>
              )}

              {friends.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Bạn bè của bạn:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={friend.avatar_url || ""} />
                            <AvatarFallback>{friend.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{friend.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
