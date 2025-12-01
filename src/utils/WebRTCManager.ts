interface SignalingCallbacks {
  onOffer: (offer: RTCSessionDescriptionInit) => Promise<void>;
  onAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  onIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  onReady: () => Promise<void>;
  sendOffer: (offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (candidate: RTCIceCandidateInit) => void;
  sendReady: () => void;
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private userId: string;
  private targetUserId: string;
  private conversationId: string;
  private onRemoteStream?: (stream: MediaStream) => void;
  private onCallEnded?: () => void;
  private isCallerRole: boolean = true;
  private signalingCallbacks?: SignalingCallbacks;

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

  setSignalingCallbacks(callbacks: SignalingCallbacks) {
    this.signalingCallbacks = callbacks;
    
    // Set up incoming signal handlers
    callbacks.onOffer = async (offer: RTCSessionDescriptionInit) => {
      await this.handleOffer(offer);
    };
    
    callbacks.onAnswer = async (answer: RTCSessionDescriptionInit) => {
      await this.handleAnswer(answer);
    };
    
    callbacks.onIceCandidate = async (candidate: RTCIceCandidateInit) => {
      await this.handleIceCandidate(candidate);
    };
    
    callbacks.onReady = async () => {
      // Caller receives this - callee is ready, now send offer
      if (this.isCallerRole && this.pc) {
        console.log('=== Peer is ready, creating and sending offer ===');
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.signalingCallbacks?.sendOffer(offer);
      }
    };
  }

  async initialize(isCaller: boolean = true) {
    this.isCallerRole = isCaller;
    console.log(`=== WebRTCManager initialized as ${isCaller ? 'caller' : 'callee'} ===`);
    
    // Setup peer connection immediately
    this.setupPeerConnection();
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

      console.log('=== Getting user media with constraints ===', constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      this.localStream.getTracks().forEach(track => {
        this.pc?.addTrack(track, this.localStream!);
      });

      console.log("=== Caller setup complete, waiting for peer-ready signal ===");

      return this.localStream;
    } catch (error) {
      console.error("=== Error starting call ===", error);
      throw error;
    }
  }

  async answerCall(videoEnabled: boolean = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: true
      });

      this.localStream.getTracks().forEach(track => {
        this.pc?.addTrack(track, this.localStream!);
      });

      console.log("=== Callee setup complete, sending ready signal ===");
      
      // Callee sends ready signal to caller
      this.signalingCallbacks?.sendReady();

      return this.localStream;
    } catch (error) {
      console.error("=== Error answering call ===", error);
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
        console.log('=== Sending ICE candidate ===');
        this.signalingCallbacks?.sendIceCandidate(event.candidate.toJSON());
      }
    };

    this.pc.ontrack = (event) => {
      console.log("=== Received remote track ===");
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      }
      this.remoteStream.addTrack(event.track);
    };

    this.pc.onconnectionstatechange = () => {
      console.log("=== Connection state: ===", this.pc?.connectionState);
      if (this.pc?.connectionState === 'disconnected' || 
          this.pc?.connectionState === 'failed' ||
          this.pc?.connectionState === 'closed') {
        this.onCallEnded?.();
      }
    };
    
    console.log('=== Peer connection setup complete ===');
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    console.log('=== Handling offer ===');
    
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

    console.log('=== Sending answer ===');
    this.signalingCallbacks?.sendAnswer(answer);
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    console.log('=== Handling answer ===');
    await this.pc?.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      console.log('=== Adding ICE candidate ===');
      await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("=== Error adding ICE candidate ===", error);
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
    console.log('=== Cleaning up WebRTC resources ===');
    
    this.localStream?.getTracks().forEach(track => track.stop());
    this.pc?.close();
    
    this.localStream = null;
    this.remoteStream = null;
    this.pc = null;
    
    this.onCallEnded?.();
  }
}
