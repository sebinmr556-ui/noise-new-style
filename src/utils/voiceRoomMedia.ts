/**
 * Voice Room Media Track Manager
 * Centralizes local MediaStream and audio track state for VoiceRoomModal & VoiceRoomMiniPlayer.
 * Ensures that toggling mute dynamically controls the hardware media track (track.enabled).
 */

type MuteListener = (isMuted: boolean) => void;

let activeMediaStream: MediaStream | null = null;
let currentIsMuted: boolean = false;
const listeners = new Set<MuteListener>();

export function getActiveVoiceRoomStream(): MediaStream | null {
  return activeMediaStream;
}

export function setActiveVoiceRoomStream(stream: MediaStream | null, initialMuted: boolean = false): void {
  activeMediaStream = stream;
  currentIsMuted = initialMuted;

  if (activeMediaStream) {
    activeMediaStream.getAudioTracks().forEach((track) => {
      track.enabled = !currentIsMuted;
    });
  }

  notifyListeners(currentIsMuted);
}

export function isLocalMediaTrackMuted(): boolean {
  if (!activeMediaStream) return currentIsMuted;
  const audioTracks = activeMediaStream.getAudioTracks();
  if (audioTracks.length === 0) return currentIsMuted;
  // If track.enabled is false, it is muted
  return !audioTracks[0].enabled;
}

export function setLocalMediaTrackMuted(muted: boolean): boolean {
  currentIsMuted = muted;

  if (activeMediaStream) {
    activeMediaStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  notifyListeners(muted);

  // Dispatch standard custom events so any detached UI updates immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mute-hardware-mic', { detail: muted }));
    window.dispatchEvent(new CustomEvent('voice-room-mic-status', { detail: { isMuted: muted } }));
  }

  return currentIsMuted;
}

export function toggleLocalMediaTrack(): boolean {
  const nextMuted = !isLocalMediaTrackMuted();
  return setLocalMediaTrackMuted(nextMuted);
}

export function stopActiveVoiceRoomStream(): void {
  if (activeMediaStream) {
    try {
      activeMediaStream.getTracks().forEach((track) => track.stop());
    } catch {}
    activeMediaStream = null;
  }
  currentIsMuted = false;
  notifyListeners(false);
}

export function subscribeToMediaTrackChanges(listener: MuteListener): () => void {
  listeners.add(listener);
  // Initial callback with current state
  listener(isLocalMediaTrackMuted());

  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(isMuted: boolean) {
  listeners.forEach((listener) => {
    try {
      listener(isMuted);
    } catch (e) {
      console.error('Error in media track listener:', e);
    }
  });
}
