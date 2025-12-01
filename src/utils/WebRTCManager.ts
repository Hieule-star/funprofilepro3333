import { SignalPayload } from "@/hooks/useWebRTCSignaling";

export type SignalingStep = 'idle' | 'ready-sent' | 'offer-sent' | 'answer-sent' | 'ice-exchanging' | 'signaling-done';

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private userId: string;
  private isCallerRole: boolean = true;
  private sendSignal: ((payload: SignalPayload) => void) | null = null;
  
  // Callbacks
  private onRemoteStream?: (stream: MediaStream) => void;
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  private onSignalingStepChange?: (step: SignalingStep) => void;

  constructor(
    userId: string,
    onRemoteStream?: (stream: MediaStream) => void,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void,
    onSignalingStepChange?: (step: SignalingStep) => void
  ) {
    this.userId = userId;
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
    this.onSignalingStepChange = onSignalingStepChange;
  }

  // Set sendSignal callback from hook
  setSendSignal(sendSignal: (payload: SignalPayload) => void) {
    this.sendSignal = sendSignal;
  }

  // Handle incoming signals from hook
  async handleSignal(payload: SignalPayload) {
    console.log(`[WEBRTC] handleSignal`, payload.type, payload);
    
    switch (payload.type) {
      case 'webrtc-ready':
        await this.onPeerReady();
        break;
      case 'webrtc-offer':
        await this.handleOffer(payload.data);
        break;
      case 'webrtc-answer':
        await this.handleAnswer(payload.data);
        break;
      case 'webrtc-ice-candidate':
        await this.handleIceCandidate(payload.data);
        break;
    }
  }

  // Initialize peer connection
  async initialize(isCaller: boolean) {
    this.isCallerRole = isCaller;
    console.log(`[WebRTCManager] Initializing as ${isCaller ? 'caller' : 'callee'}`);
    this.setupPeerConnection();
  }

  // Caller: Start call and wait for peer-ready
  async startCall(
    videoEnabled: boolean = true, 
    videoDeviceId?: string, 
    audioDeviceId?: string
  ): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      video: videoEnabled 
        ? (videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true)
        : false,
      audio: audioDeviceId 
        ? { deviceId: { exact: audioDeviceId } } 
        : true
    };

    console.log('[WebRTCManager] Getting user media for caller');
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

    this.localStream.getTracks().forEach(track => {
      this.pc?.addTrack(track, this.localStream!);
    });

    console.log('[WebRTCManager] Caller ready, waiting for peer-ready signal');
    return this.localStream;
  }

  // Callee: Answer call and send ready signal
  async answerCall(videoEnabled: boolean = true): Promise<MediaStream> {
    console.log('[WebRTCManager] Getting user media for callee');
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: videoEnabled,
      audio: true
    });

    this.localStream.getTracks().forEach(track => {
      this.pc?.addTrack(track, this.localStream!);
    });

    // Send ready signal to caller
    console.log('[WebRTCManager] Callee sending ready signal');
    this.onSignalingStepChange?.('ready-sent');
    this.sendSignal?.({
      type: 'webrtc-ready',
      senderId: this.userId
    });

    return this.localStream;
  }

  // When callee is ready - caller creates and sends offer
  private async onPeerReady() {
    if (!this.isCallerRole || !this.pc) return;
    
    console.log('[WEBRTC] creating offer');
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    
    console.log('[WEBRTC] sending offer');
    this.onSignalingStepChange?.('offer-sent');
    this.sendSignal?.({
      type: 'webrtc-offer',
      senderId: this.userId,
      data: offer
    });
  }

  // Handle incoming offer (callee)
  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    
    console.log('[WEBRTC] received offer, creating answer');
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    
    console.log('[WEBRTC] sending answer');
    this.onSignalingStepChange?.('answer-sent');
    this.sendSignal?.({
      type: 'webrtc-answer',
      senderId: this.userId,
      data: answer
    });
  }

  // Handle incoming answer (caller)
  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    
    console.log('[WEBRTC] received answer, setting remote description');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  // Handle ICE candidate
  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;
    
    try {
      console.log('[WEBRTC] addIceCandidate', candidate);
      this.onSignalingStepChange?.('ice-exchanging');
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[WEBRTC] Error adding ICE candidate:', error);
    }
  }

  // Setup RTCPeerConnection
  private setupPeerConnection() {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    // Send ICE candidates to peer
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WEBRTC] sending ICE candidate');
        this.onSignalingStepChange?.('ice-exchanging');
        this.sendSignal?.({
          type: 'webrtc-ice-candidate',
          senderId: this.userId,
          data: event.candidate.toJSON()
        });
      }
    };

    // Receive remote tracks
    this.pc.ontrack = (event) => {
      console.log('[WebRTCManager] Received remote track');
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.onRemoteStream?.(this.remoteStream);
      }
      this.remoteStream.addTrack(event.track);
    };

    // Monitor connection state
    this.pc.onconnectionstatechange = () => {
      console.log('[WEBRTC] connectionState', this.pc?.connectionState);
      if (this.pc?.connectionState === 'connected') {
        this.onSignalingStepChange?.('signaling-done');
      }
      this.onConnectionStateChange?.(this.pc?.connectionState || 'closed');
    };

    console.log('[WebRTCManager] Peer connection setup complete');
  }

  // Control methods
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
    console.log('[WebRTCManager] Ending call, cleaning up');
    this.localStream?.getTracks().forEach(track => track.stop());
    this.pc?.close();
    
    this.localStream = null;
    this.remoteStream = null;
    this.pc = null;
  }
}
