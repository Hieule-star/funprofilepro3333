export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private userId: string;
  private targetUserId: string;
  private conversationId: string;
  private onRemoteStream?: (stream: MediaStream) => void;
  private onCallEnded?: () => void;

  constructor(
    userId: string,
    targetUserId: string,
    conversationId: string,
    onRemoteStream?: (stream: MediaStream) => void,
    onCallEnded?: () => void
  ) {
    this.userId = userId;
    this.targetUserId = targetUserId;
    this.conversationId = conversationId;
    this.onRemoteStream = onRemoteStream;
    this.onCallEnded = onCallEnded;
  }

  async initialize() {
    return new Promise<void>((resolve, reject) => {
      const projectRef = "krajdsugcvwytpsqnbzs";
      this.ws = new WebSocket(`wss://${projectRef}.supabase.co/functions/v1/realtime-video`);

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
        this.cleanup();
      }, 10000);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        clearTimeout(timeout);
        this.ws?.send(JSON.stringify({
          type: 'join',
          senderId: this.userId,
          conversationId: this.conversationId
        }));
        resolve();
      };

      this.ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log("Received signaling message:", message.type);

        switch (message.type) {
          case 'offer':
            await this.handleOffer(message.data);
            break;
          case 'answer':
            await this.handleAnswer(message.data);
            break;
          case 'ice-candidate':
            await this.handleIceCandidate(message.data);
            break;
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        clearTimeout(timeout);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed");
        clearTimeout(timeout);
        this.cleanup();
      };
    });
  }

  async startCall(
    videoEnabled: boolean = true, 
    videoDeviceId?: string, 
    audioDeviceId?: string
  ) {
    try {
      const constraints: MediaStreamConstraints = {
        video: videoEnabled 
          ? (videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true)
          : false,
        audio: audioDeviceId 
          ? { deviceId: { exact: audioDeviceId } } 
          : true
      };

      console.log('Getting user media with constraints:', constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      this.setupPeerConnection();
      
      this.localStream.getTracks().forEach(track => {
        this.pc?.addTrack(track, this.localStream!);
      });

      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        targetId: this.targetUserId,
        senderId: this.userId,
        data: offer
      });

      return this.localStream;
    } catch (error) {
      console.error("Error starting call:", error);
      throw error;
    }
  }

  async answerCall(videoEnabled: boolean = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: true
      });

      return this.localStream;
    } catch (error) {
      console.error("Error answering call:", error);
      throw error;
    }
  }

  private setupPeerConnection() {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          targetId: this.targetUserId,
          senderId: this.userId,
          data: event.candidate
        });
      }
    };

    this.pc.ontrack = (event) => {
      console.log("Received remote track");
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      }
      this.remoteStream.addTrack(event.track);
    };

    this.pc.onconnectionstatechange = () => {
      console.log("Connection state:", this.pc?.connectionState);
      if (this.pc?.connectionState === 'disconnected' || 
          this.pc?.connectionState === 'failed' ||
          this.pc?.connectionState === 'closed') {
        this.onCallEnded?.();
      }
    };
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) {
      this.setupPeerConnection();
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.pc?.addTrack(track, this.localStream!);
      });
    }

    await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);

    this.sendSignalingMessage({
      type: 'answer',
      targetId: this.targetUserId,
      senderId: this.userId,
      data: answer
    });
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc?.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  private sendSignalingMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  endCall() {
    this.cleanup();
  }

  private cleanup() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.pc?.close();
    this.ws?.close();
    
    this.localStream = null;
    this.remoteStream = null;
    this.pc = null;
    this.ws = null;
    
    this.onCallEnded?.();
  }
}