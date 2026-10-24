/**
 * WebRTC Voice Chat Engine
 * Free, peer-to-peer real-time two-way live audio using standard WebRTC APIs
 * and public Google STUN servers. Supports signaling via Firebase Firestore
 * and BroadcastChannel for cross-device and multi-tab communication.
 */

import { db, isFirebaseConfigured } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  Unsubscribe
} from 'firebase/firestore';

export interface VoiceCallParticipant {
  uid: string;
  username: string;
  displayName: string;
  avatar?: string;
}

export interface CallSessionData {
  id: string;
  channelId: string;
  caller: VoiceCallParticipant;
  receiver: VoiceCallParticipant;
  status: 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'failed';
  offer?: {
    type: 'offer';
    sdp: string;
  };
  answer?: {
    type: 'answer';
    sdp: string;
  };
  createdAt: number;
  endedAt?: number;
}

export type WebRTCCallStatus = 
  | 'idle' 
  | 'requesting-permission'
  | 'calling' 
  | 'ringing' 
  | 'connecting' 
  | 'connected' 
  | 'ended' 
  | 'rejected' 
  | 'failed';

export const FREE_STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Creates a deterministic unique conversation call ID from two usernames or UIDs
 */
export function getCallChannelId(userA: string, userB: string): string {
  const sorted = [userA.toLowerCase().trim(), userB.toLowerCase().trim()].sort();
  return `call_${sorted[0]}_${sorted[1]}`.replace(/[^a-z0-9_]/g, '_');
}

export interface WebRTCVoiceCallbacks {
  onStatusChange?: (status: WebRTCCallStatus) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onError?: (errorMessage: string) => void;
  onLocalAudioLevel?: (level: number) => void;
  onRemoteAudioLevel?: (level: number) => void;
  onIncomingCall?: (call: CallSessionData) => void;
}

/**
 * WebRTC Voice Chat Session Manager
 */
export class WebRTCVoiceManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private status: WebRTCCallStatus = 'idle';
  private channelId: string | null = null;
  private isCaller: boolean = false;
  private currentCallData: CallSessionData | null = null;
  private isMuted: boolean = false;
  private speakerVolume: number = 1;
  private callbacks: WebRTCVoiceCallbacks = {};
  
  // Signaling listeners
  private firestoreUnsubscribe: Unsubscribe | null = null;
  private candidatesUnsubscribe: Unsubscribe | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  
  // Audio level analysis
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(callbacks?: WebRTCVoiceCallbacks) {
    if (callbacks) this.callbacks = callbacks;
    this.initBroadcastChannel();
    this.initRemoteAudioElement();
  }

  public setCallbacks(callbacks: WebRTCVoiceCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private initRemoteAudioElement() {
    if (typeof window !== 'undefined') {
      this.remoteAudioElement = document.createElement('audio');
      this.remoteAudioElement.autoplay = true;
      (this.remoteAudioElement as any).playsInline = true;
      this.remoteAudioElement.volume = this.speakerVolume;
      document.body.appendChild(this.remoteAudioElement);
    }
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('noise_webrtc_voice_channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported:', e);
      }
    }
  }

  private handleBroadcastMessage(data: any) {
    if (!data || !data.channelId) return;

    // Incoming call invitation
    if (data.type === 'CALL_INVITE' && data.callData) {
      if (this.callbacks.onIncomingCall && this.status === 'idle') {
        this.callbacks.onIncomingCall(data.callData);
      }
      return;
    }

    if (this.channelId && data.channelId === this.channelId) {
      if (data.type === 'CALL_ANSWER' && this.isCaller && this.pc) {
        this.handleRemoteAnswer(data.answer);
      } else if (data.type === 'ICE_CANDIDATE' && this.pc) {
        if (data.isCaller !== this.isCaller) {
          this.addRemoteCandidate(data.candidate);
        }
      } else if (data.type === 'CALL_ENDED' || data.type === 'CALL_REJECTED') {
        this.setStatus(data.type === 'CALL_REJECTED' ? 'rejected' : 'ended');
        this.cleanup();
      }
    }
  }

  public getStatus(): WebRTCCallStatus {
    return this.status;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getSpeakerVolume(): number {
    return this.speakerVolume;
  }

  private setStatus(newStatus: WebRTCCallStatus) {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  /**
   * Acquire user microphone with optimized voice constraints
   */
  public async getMicrophoneStream(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    this.setStatus('requesting-permission');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC audio capture is not supported by this browser. HTTPS or localhost is required.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });

      this.localStream = stream;
      this.setupLocalAudioAnalyser(stream);
      return stream;
    } catch (err: any) {
      console.error('Microphone error:', err);
      let message = 'Failed to access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission was denied. Please allow microphone access in your browser site settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device was detected on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Microphone is already in use by another application.';
      }
      this.setStatus('failed');
      this.callbacks.onError?.(message);
      throw new Error(message);
    }
  }

  /**
   * Start outgoing call
   */
  public async startCall(
    caller: VoiceCallParticipant,
    receiver: VoiceCallParticipant
  ): Promise<void> {
    try {
      this.channelId = getCallChannelId(caller.username, receiver.username);
      this.isCaller = true;
      this.setStatus('calling');

      // 1. Get microphone
      const stream = await this.getMicrophoneStream();

      // 2. Create PeerConnection
      this.createPeerConnection();

      // 3. Add local audio tracks
      stream.getAudioTracks().forEach((track) => {
        if (this.pc) this.pc.addTrack(track, stream);
      });

      // 4. Create Offer
      const offer = await this.pc!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await this.pc!.setLocalDescription(offer);

      const callData: CallSessionData = {
        id: this.channelId,
        channelId: this.channelId,
        caller,
        receiver,
        status: 'calling',
        offer: {
          type: 'offer',
          sdp: offer.sdp || '',
        },
        createdAt: Date.now(),
      };
      this.currentCallData = callData;

      // 5. Store offer in Firestore if available
      if (isFirebaseConfigured && db) {
        try {
          const callDocRef = doc(db, 'calls', this.channelId);
          await setDoc(callDocRef, callData, { merge: true });
        } catch (err) {
          console.warn('Firestore call signal write warning:', err);
        }
      }

      // 6. Broadcast via BroadcastChannel
      this.broadcastChannel?.postMessage({
        type: 'CALL_INVITE',
        channelId: this.channelId,
        callData,
      });

      // 7. Listen for answer and candidates
      this.listenForAnswerAndCandidates(this.channelId);
      this.startAudioLevelLoop();
    } catch (err: any) {
      console.error('startCall failed:', err);
      this.setStatus('failed');
      this.cleanup();
      throw err;
    }
  }

  /**
   * Accept incoming call
   */
  public async acceptCall(callData: CallSessionData): Promise<void> {
    try {
      this.channelId = callData.channelId;
      this.currentCallData = callData;
      this.isCaller = false;
      this.setStatus('connecting');

      // 1. Get microphone
      const stream = await this.getMicrophoneStream();

      // 2. Create PeerConnection
      this.createPeerConnection();

      // 3. Add local audio tracks
      stream.getAudioTracks().forEach((track) => {
        if (this.pc) this.pc.addTrack(track, stream);
      });

      // 4. Set remote offer
      if (callData.offer) {
        await this.pc!.setRemoteDescription(
          new RTCSessionDescription({
            type: 'offer',
            sdp: callData.offer.sdp,
          })
        );
        await this.drainPendingCandidates();
      }

      // 5. Create Answer
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);

      // 6. Update Firestore
      if (isFirebaseConfigured && db && this.channelId) {
        try {
          const callDocRef = doc(db, 'calls', this.channelId);
          await updateDoc(callDocRef, {
            status: 'connected',
            answer: {
              type: 'answer',
              sdp: answer.sdp || '',
            },
          });
        } catch (err) {
          console.warn('Firestore answer write warning:', err);
        }
      }

      // 7. Broadcast answer
      this.broadcastChannel?.postMessage({
        type: 'CALL_ANSWER',
        channelId: this.channelId,
        answer: {
          type: 'answer',
          sdp: answer.sdp || '',
        },
      });

      this.setStatus('connected');
      this.listenForAnswerAndCandidates(this.channelId);
      this.startAudioLevelLoop();
    } catch (err: any) {
      console.error('acceptCall failed:', err);
      this.setStatus('failed');
      this.cleanup();
      throw err;
    }
  }

  /**
   * Reject incoming call
   */
  public async rejectCall(callData: CallSessionData): Promise<void> {
    const channelId = callData.channelId;
    this.setStatus('rejected');

    if (isFirebaseConfigured && db && channelId) {
      try {
        const callDocRef = doc(db, 'calls', channelId);
        await updateDoc(callDocRef, {
          status: 'rejected',
          endedAt: Date.now(),
        });
      } catch (err) {
        console.warn('Firestore reject write warning:', err);
      }
    }

    this.broadcastChannel?.postMessage({
      type: 'CALL_REJECTED',
      channelId,
    });

    this.cleanup();
  }

  /**
   * End current call
   */
  public async endCall(): Promise<void> {
    const channelId = this.channelId;
    this.setStatus('ended');

    if (channelId) {
      if (isFirebaseConfigured && db) {
        try {
          const callDocRef = doc(db, 'calls', channelId);
          await updateDoc(callDocRef, {
            status: 'ended',
            endedAt: Date.now(),
          });
        } catch (err) {
          console.warn('Firestore endCall write warning:', err);
        }
      }

      this.broadcastChannel?.postMessage({
        type: 'CALL_ENDED',
        channelId,
      });
    }

    this.cleanup();
  }

  private createPeerConnection() {
    this.cleanupPeerConnection();

    this.pc = new RTCPeerConnection(FREE_STUN_SERVERS);

    // ICE Candidate handler
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.channelId) {
        this.sendIceCandidate(event.candidate);
      }
    };

    // Connection state handler
    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.connectionState;
      if (state === 'connected') {
        this.setStatus('connected');
      } else if (state === 'connecting') {
        this.setStatus('connecting');
      } else if (state === 'disconnected' || state === 'closed') {
        this.setStatus('ended');
      } else if (state === 'failed') {
        this.setStatus('failed');
        this.callbacks.onError?.('WebRTC connection failed. Network or NAT restrictions might require a TURN relay.');
      }
    };

    // Remote Track handler (Real-time live audio)
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.remoteAudioElement) {
          this.remoteAudioElement.srcObject = event.streams[0];
          const playPromise = this.remoteAudioElement.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => {
              console.warn('Audio auto-play policy notice (will unlock on user touch/click):', e);
              const unlockAudio = () => {
                if (this.remoteAudioElement && this.remoteStream) {
                  this.remoteAudioElement.play().catch(() => {});
                }
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                  this.audioCtx.resume().catch(() => {});
                }
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('touchstart', unlockAudio);
              };
              window.addEventListener('click', unlockAudio, { once: true });
              window.addEventListener('touchstart', unlockAudio, { once: true });
            });
          }
        }
        this.setupRemoteAudioAnalyser(event.streams[0]);
        this.callbacks.onRemoteStream?.(event.streams[0]);
      }
    };
  }

  private async sendIceCandidate(candidate: RTCIceCandidate) {
    if (!this.channelId) return;

    const candidateData = {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      isCaller: this.isCaller,
    };

    // 1. BroadcastChannel
    this.broadcastChannel?.postMessage({
      type: 'ICE_CANDIDATE',
      channelId: this.channelId,
      isCaller: this.isCaller,
      candidate: candidateData,
    });

    // 2. Firestore candidate subcollection
    if (isFirebaseConfigured && db) {
      try {
        const subcolName = this.isCaller ? 'callerCandidates' : 'calleeCandidates';
        const candColRef = collection(db, 'calls', this.channelId, subcolName);
        await addDoc(candColRef, candidateData);
      } catch (err) {
        console.warn('Error sending candidate to Firestore:', err);
      }
    }
  }

  private listenForAnswerAndCandidates(channelId: string) {
    if (!isFirebaseConfigured || !db) return;

    // Listen to call doc for answer or status changes
    const callDocRef = doc(db, 'calls', channelId);
    this.firestoreUnsubscribe = onSnapshot(callDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as CallSessionData;

      if (data.status === 'ended' || data.status === 'rejected') {
        this.setStatus(data.status);
        this.cleanup();
        return;
      }

      // If caller and received answer
      if (this.isCaller && data.answer && this.pc && this.pc.signalingState !== 'stable') {
        try {
          await this.pc.setRemoteDescription(
            new RTCSessionDescription({
              type: 'answer',
              sdp: data.answer.sdp,
            })
          );
          await this.drainPendingCandidates();
          this.setStatus('connected');
        } catch (e) {
          console.warn('Error setting remote answer:', e);
        }
      }
    });

    // Listen to remote candidates
    const remoteSubcol = this.isCaller ? 'calleeCandidates' : 'callerCandidates';
    const candColRef = collection(db, 'calls', channelId, remoteSubcol);
    this.candidatesUnsubscribe = onSnapshot(candColRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candData = change.doc.data();
          this.addRemoteCandidate(candData);
        }
      });
    });
  }

  private async drainPendingCandidates() {
    if (!this.pc || !this.pc.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const cand = this.pendingCandidates.shift();
      if (cand && this.pc) {
        try {
          await this.pc.addIceCandidate(cand);
        } catch (e) {
          console.warn('Error applying queued candidate:', e);
        }
      }
    }
  }

  private async handleRemoteAnswer(answer: { type: 'answer'; sdp: string }) {
    if (this.pc && this.pc.signalingState !== 'stable') {
      try {
        await this.pc.setRemoteDescription(
          new RTCSessionDescription({
            type: 'answer',
            sdp: answer.sdp,
          })
        );
        await this.drainPendingCandidates();
        this.setStatus('connected');
      } catch (e) {
        console.warn('Error applying broadcast answer:', e);
      }
    }
  }

  private async addRemoteCandidate(candData: any) {
    if (!candData || !candData.candidate) return;
    const candidateInit: RTCIceCandidateInit = {
      candidate: candData.candidate,
      sdpMid: candData.sdpMid,
      sdpMLineIndex: candData.sdpMLineIndex,
    };
    if (!this.pc || !this.pc.remoteDescription || !this.pc.remoteDescription.type) {
      this.pendingCandidates.push(candidateInit);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidateInit));
    } catch (e) {
      console.warn('Error adding ICE candidate:', e);
    }
  }

  /**
   * Toggle local microphone mute
   */
  public toggleMute(): boolean {
    if (!this.localStream) return false;
    const tracks = this.localStream.getAudioTracks();
    if (tracks.length > 0) {
      const nextMuted = tracks[0].enabled;
      tracks.forEach((t) => (t.enabled = !nextMuted));
      this.isMuted = nextMuted;
      return this.isMuted;
    }
    return false;
  }

  /**
   * Set speaker volume (0 to 1)
   */
  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.speakerVolume = clamped;
    if (this.remoteAudioElement) {
      this.remoteAudioElement.volume = clamped;
    }
  }

  /**
   * Web Audio API volume analyzers for visual wave indicators
   */
  private setupLocalAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.localAnalyser = this.audioCtx.createAnalyser();
      this.localAnalyser.fftSize = 64;
      source.connect(this.localAnalyser);
    } catch (e) {
      console.debug('Local analyser notice:', e);
    }
  }

  private setupRemoteAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.remoteAnalyser = this.audioCtx.createAnalyser();
      this.remoteAnalyser.fftSize = 64;
      source.connect(this.remoteAnalyser);
    } catch (e) {
      console.debug('Remote analyser notice:', e);
    }
  }

  private startAudioLevelLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const checkLevels = () => {
      // Local mic level
      if (this.localAnalyser && !this.isMuted) {
        const dataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        this.callbacks.onLocalAudioLevel?.(level);
      } else {
        this.callbacks.onLocalAudioLevel?.(0);
      }

      // Remote incoming level
      if (this.remoteAnalyser) {
        const dataArray = new Uint8Array(this.remoteAnalyser.frequencyBinCount);
        this.remoteAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        this.callbacks.onRemoteAudioLevel?.(level);
      } else {
        this.callbacks.onRemoteAudioLevel?.(0);
      }

      if (this.status === 'calling' || this.status === 'connecting' || this.status === 'connected') {
        this.animFrameId = requestAnimationFrame(checkLevels);
      }
    };

    this.animFrameId = requestAnimationFrame(checkLevels);
  }

  private cleanupPeerConnection() {
    this.pendingCandidates = [];
    if (this.pc) {
      try {
        this.pc.onicecandidate = null;
        this.pc.ontrack = null;
        this.pc.onconnectionstatechange = null;
        this.pc.close();
      } catch (e) {}
      this.pc = null;
    }
  }

  public cleanup() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }

    if (this.candidatesUnsubscribe) {
      this.candidatesUnsubscribe();
      this.candidatesUnsubscribe = null;
    }

    // Stop microphone tracks cleanly
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.localStream = null;
    }

    this.remoteStream = null;
    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }

    this.cleanupPeerConnection();

    this.localAnalyser = null;
    this.remoteAnalyser = null;
    this.channelId = null;
    this.isCaller = false;
    this.isMuted = false;
  }

  public destroy() {
    this.cleanup();
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (e) {}
      this.broadcastChannel = null;
    }
    if (this.remoteAudioElement && this.remoteAudioElement.parentNode) {
      this.remoteAudioElement.parentNode.removeChild(this.remoteAudioElement);
      this.remoteAudioElement = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }
}
