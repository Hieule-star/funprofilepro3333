import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebSocketMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'call' | 'call-response' | 'ready' | 'peer-ready';
  conversationId?: string;
  senderId?: string;
  targetId?: string;
  data?: any;
}

const connections = new Map<string, WebSocket>();
const pendingReadySignals = new Map<string, string>(); // targetId -> senderId

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426, headers: corsHeaders });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let userId: string | null = null;

  socket.onopen = () => {
    console.log("WebSocket connection opened");
  };

  socket.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log("Received message:", message.type, "from:", message.senderId);

      if (message.type === 'join' && message.senderId) {
        userId = message.senderId;
        connections.set(userId, socket);
        console.log(`User ${userId} joined. Total connections: ${connections.size}`);
        
        // Check if there's a pending ready signal for this user
        if (pendingReadySignals.has(userId)) {
          const calleeId = pendingReadySignals.get(userId);
          console.log(`Found pending ready signal from ${calleeId}, sending peer-ready to ${userId}`);
          socket.send(JSON.stringify({
            type: 'peer-ready',
            senderId: calleeId
          }));
          pendingReadySignals.delete(userId);
        }
        
        return;
      }

      // Handle ready signal from callee
      if (message.type === 'ready' && message.senderId && message.targetId) {
        console.log(`User ${message.senderId} is ready, notifying ${message.targetId}`);
        
        // Check if target is online
        if (connections.has(message.targetId)) {
          const targetSocket = connections.get(message.targetId);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: 'peer-ready',
              senderId: message.senderId
            }));
            console.log(`Sent peer-ready to ${message.targetId}`);
            return;
          }
        }
        
        // Target not online yet, queue the ready signal
        console.log(`Target ${message.targetId} not online, queuing ready signal from ${message.senderId}`);
        pendingReadySignals.set(message.targetId, message.senderId);
        return;
      }

      // Relay signaling messages to target user
      if (message.targetId && connections.has(message.targetId)) {
        const targetSocket = connections.get(message.targetId);
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify(message));
          console.log(`Relayed ${message.type} from ${message.senderId} to ${message.targetId}`);
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  };

  socket.onclose = () => {
    if (userId) {
      connections.delete(userId);
      
      // Clean up any pending signals FROM this user
      for (const [targetId, senderId] of pendingReadySignals.entries()) {
        if (senderId === userId) {
          pendingReadySignals.delete(targetId);
          console.log(`Cleaned up pending ready signal from ${userId} to ${targetId}`);
        }
      }
      
      console.log(`User ${userId} disconnected. Total connections: ${connections.size}`);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return response;
});