import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Radio, 
  Hand, 
  Users, 
  MessageSquare, 
  Share2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Minimize2, 
  Music, 
  Send, 
  Crown, 
  Smile, 
  PhoneOff, 
  Flame, 
  Heart,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { AppUser, VoiceRoom, RoomParticipant, RoomMessage } from '../types';
import { 
  createMicAnalyser, 
  MicAnalyserHandle, 
  playChimeSound, 
  playPopSound, 
  playClapSound, 
  playMicToggleSound, 
  startAmbientVibe, 
  AmbientController 
} from '../utils/audioVibeEngine';

interface VoiceRoomModalProps {
  room: VoiceRoom;
  currentUser: AppUser | null;
  isOpen: boolean;
  onMinimize: () => void;
  onLeaveRoom: () => void;
  onUpdateRoom: (updated: VoiceRoom) => void;
  onRequireLogin: () => void;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  leftPercent: number;
}

const REACTION_EMOJIS = ['❤️', '🔥', '👏', '☕', '🎉', '🎙️', '✨'];

export const VoiceRoomModal: React.FC<VoiceRoomModalProps> = ({
  room,
  currentUser,
  isOpen,
  onMinimize,
  onLeaveRoom,
  onUpdateRoom,
  onRequireLogin,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [localVolume, setLocalVolume] = useState(0);
  const [isSpeakingLocally, setIsSpeakingLocally] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<RoomMessage[]>([
    {
      id: 'm-1',
      uid: room.hostUid,
      username: room.hostUsername,
      avatar: room.hostAvatar,
      text: `Welcome to ${room.title}! Feel free to raise your hand to speak 🎙️`,
      createdAt: Date.now() - 30000,
    },
  ]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [ambientVibe, setAmbientVibe] = useState<'none' | 'lofi' | 'rain' | 'cafe' | 'synth'>(
    room.ambientVibe || 'none'
  );
  const [ambientVolume, setAmbientVolume] = useState(0.2);
  const [showVibeMenu, setShowVibeMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Audio references
  const micHandleRef = useRef<MicAnalyserHandle | null>(null);
  const ambientControllerRef = useRef<AmbientController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isHost = currentUser?.uid === room.hostUid;
  const isSpeaker = isHost || room.speakers.some((s) => s.uid === currentUser?.uid);

  // Initialize Microphone for speakers
  useEffect(() => {
    let animId: number;

    if (isSpeaker) {
      createMicAnalyser().then((handle) => {
        if (handle) {
          micHandleRef.current = handle;
          handle.setMuted(isMuted);

          // Metering loop
          const checkVolume = () => {
            const vol = handle.getVolumeLevel();
            setLocalVolume(vol);
            setIsSpeakingLocally(!isMuted && vol > 12);
            animId = requestAnimationFrame(checkVolume);
          };
          animId = requestAnimationFrame(checkVolume);
        }
      });
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (micHandleRef.current) {
        micHandleRef.current.cleanup();
        micHandleRef.current = null;
      }
    };
  }, [isSpeaker]);

  // Sync mute state to mic stream
  useEffect(() => {
    if (micHandleRef.current) {
      micHandleRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  // Ambient vibe controller
  useEffect(() => {
    if (ambientControllerRef.current) {
      ambientControllerRef.current.stop();
      ambientControllerRef.current = null;
    }

    if (ambientVibe !== 'none') {
      const controller = startAmbientVibe(ambientVibe, ambientVolume);
      ambientControllerRef.current = controller;
    }

    return () => {
      if (ambientControllerRef.current) {
        ambientControllerRef.current.stop();
        ambientControllerRef.current = null;
      }
    };
  }, [ambientVibe]);

  // Adjust ambient volume
  useEffect(() => {
    if (ambientControllerRef.current) {
      ambientControllerRef.current.setVolume(ambientVolume);
    }
  }, [ambientVolume]);

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Handle Mute Toggle
  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    playMicToggleSound(!nextState);

    // Update speaker status in room
    if (currentUser) {
      const updatedSpeakers = room.speakers.map((s) =>
        s.uid === currentUser.uid ? { ...s, isMuted: nextState } : s
      );
      onUpdateRoom({ ...room, speakers: updatedSpeakers });
    }
  };

  // Handle Hand Raise Toggle
  const toggleHandRaise = () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }

    const nextState = !hasRaisedHand;
    setHasRaisedHand(nextState);

    if (nextState) {
      playChimeSound();
    }

    // Update in listeners list
    const updatedListeners = room.listeners.map((l) =>
      l.uid === currentUser.uid ? { ...l, hasRaisedHand: nextState } : l
    );
    onUpdateRoom({ ...room, listeners: updatedListeners });
  };

  // Host invites listener to speak
  const handlePromoteToSpeaker = (listener: RoomParticipant) => {
    playChimeSound();
    const newSpeaker: RoomParticipant = {
      ...listener,
      isSpeaker: true,
      hasRaisedHand: false,
      isMuted: false,
    };
    const updatedListeners = room.listeners.filter((l) => l.uid !== listener.uid);
    const updatedSpeakers = [...room.speakers, newSpeaker];
    onUpdateRoom({ ...room, speakers: updatedSpeakers, listeners: updatedListeners });
  };

  // Demote speaker to listener
  const handleDemoteToListener = (speaker: RoomParticipant) => {
    if (speaker.uid === room.hostUid) return; // Cannot demote host
    const newListener: RoomParticipant = {
      ...speaker,
      isSpeaker: false,
      hasRaisedHand: false,
    };
    const updatedSpeakers = room.speakers.filter((s) => s.uid !== speaker.uid);
    const updatedListeners = [...room.listeners, newListener];
    onUpdateRoom({ ...room, speakers: updatedSpeakers, listeners: updatedListeners });
  };

  // Trigger floating reaction
  const handleSendReaction = (emoji: string) => {
    if (emoji === '👏') {
      playClapSound();
    } else {
      playPopSound();
    }

    const newReaction: FloatingReaction = {
      id: `react-${Date.now()}-${Math.random()}`,
      emoji,
      leftPercent: 25 + Math.random() * 50,
    };

    setFloatingReactions((prev) => [...prev, newReaction]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 1800);
  };

  // Send In-Room Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) {
      if (!currentUser) onRequireLogin();
      return;
    }

    const newMsg: RoomMessage = {
      id: `m-${Date.now()}`,
      uid: currentUser.uid,
      username: currentUser.username,
      avatar: currentUser.photoURL,
      text: chatInput.trim(),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  // Copy share link
  const handleShareRoom = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  const handRaisers = room.listeners.filter((l) => l.hasRaisedHand);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn">
      {/* Floating Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.leftPercent}%`, bottom: '100px' }}
            className="absolute text-3xl select-none animate-float-reaction"
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div 
        className="w-full h-full max-w-lg bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-white flex flex-col relative sm:h-[92vh] sm:rounded-3xl sm:border sm:border-zinc-800/80 shadow-2xl overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md z-20">
          <button
            onClick={onMinimize}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Minimize to background mini-player"
            type="button"
          >
            <ChevronDown className="w-5 h-5" />
            <span className="hidden sm:inline">Minimize</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-live-pulse"></span>
              LIVE
            </span>
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {room.speakers.length + room.listeners.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Share link button */}
            <button
              onClick={handleShareRoom}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors relative"
              title="Share Room"
              type="button"
            >
              <Share2 className="w-4 h-4" />
              {copiedLink && (
                <span className="absolute -bottom-7 right-0 text-[10px] bg-white text-black font-bold px-1.5 py-0.5 rounded shadow">
                  Copied!
                </span>
              )}
            </button>

            {/* Ambient Vibe Toggle Menu */}
            <div className="relative">
              <button
                onClick={() => setShowVibeMenu(!showVibeMenu)}
                className={`p-2 rounded-full transition-colors flex items-center gap-1 ${
                  ambientVibe !== 'none'
                    ? 'text-rose-400 bg-rose-500/20 border border-rose-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Ambient Atmosphere"
                type="button"
              >
                <Music className="w-4 h-4" />
              </button>

              {showVibeMenu && (
                <div className="absolute right-0 top-11 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl z-40 animate-fadeIn">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">
                    Ambient Vibes
                  </div>
                  <div className="space-y-1">
                    {[
                      { id: 'none', label: 'Off', icon: '🔇' },
                      { id: 'lofi', label: 'Lo-Fi Chill', icon: '🎧' },
                      { id: 'rain', label: 'Rain Ambience', icon: '🌧️' },
                      { id: 'cafe', label: 'Cozy Cafe', icon: '☕' },
                      { id: 'synth', label: 'Ambient Synth', icon: '✨' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setAmbientVibe(opt.id as any);
                          setShowVibeMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors ${
                          ambientVibe === opt.id
                            ? 'bg-rose-500 text-white font-bold'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                        type="button"
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  {ambientVibe !== 'none' && (
                    <div className="mt-3 pt-2 border-t border-zinc-800 px-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                        <span>Volume</span>
                        <span>{Math.round(ambientVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={ambientVolume}
                        onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                        className="w-full accent-rose-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Leave Room Button */}
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-2.5 py-1 rounded-full text-xs font-bold transition-all border border-rose-500/30"
              type="button"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Room Title & Topic Header */}
        <div className="px-5 pt-3 pb-2 text-center bg-zinc-950/30">
          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 mb-1">
            {room.topic}
          </span>
          <h1 className="text-lg font-bold text-white tracking-tight line-clamp-1">
            {room.title}
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-zinc-400">
            <span>Hosted by</span>
            <span className="font-bold text-zinc-200">@{room.hostUsername}</span>
            {ambientVibe !== 'none' && (
              <>
                <span>•</span>
                <span className="text-rose-400 font-medium flex items-center gap-0.5">
                  <Music className="w-3 h-3" />
                  {ambientVibe.toUpperCase()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Hand Raise Host Notification Banner */}
        {isHost && handRaisers.length > 0 && (
          <div className="mx-4 my-2 p-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-base">✋</span>
              <div>
                <p className="text-xs font-bold text-amber-300">
                  {handRaisers.length} {handRaisers.length === 1 ? 'person wants' : 'people want'} to speak
                </p>
                <p className="text-[10px] text-amber-200/80 truncate max-w-[200px]">
                  {handRaisers.map((h) => `@${h.username}`).join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => handlePromoteToSpeaker(handRaisers[0])}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
              type="button"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          </div>
        )}

        {/* Scrollable Stage Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-5 no-scrollbar">
          {/* SPEAKERS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-rose-500" />
                Speakers ({room.speakers.length})
              </h2>
              {isSpeaker && currentUser && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">Mic Level:</span>
                  <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-75 ${
                        isMuted ? 'bg-zinc-600' : 'bg-gradient-to-r from-emerald-500 to-rose-500'
                      }`}
                      style={{ width: `${isMuted ? 0 : localVolume}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {room.speakers.map((speaker) => {
                const isLocal = speaker.uid === currentUser?.uid;
                const isSpeaking = isLocal ? isSpeakingLocally : speaker.isSpeaking;
                const speakerMuted = isLocal ? isMuted : speaker.isMuted;
                const isSpeakerHost = speaker.uid === room.hostUid;

                return (
                  <div
                    key={speaker.uid}
                    className="relative bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 flex flex-col items-center text-center transition-all hover:border-zinc-700 shadow-sm group"
                  >
                    {/* Pulsing Speaking Wave Rings */}
                    <div className="relative mb-2 mt-1">
                      {isSpeaking && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 animate-audio-wave pointer-events-none -z-0"></div>
                      )}

                      <div
                        className={`w-16 h-16 rounded-full p-[2px] transition-all relative z-10 ${
                          isSpeaking
                            ? 'bg-gradient-to-tr from-emerald-400 via-rose-500 to-purple-600 ring-4 ring-emerald-500/20'
                            : 'bg-zinc-800'
                        }`}
                      >
                        <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                          {speaker.avatar ? (
                            <img
                              src={speaker.avatar}
                              alt={speaker.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-white uppercase">
                              {speaker.username?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mic Status Badge */}
                      <div
                        className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-zinc-950 z-20 ${
                          speakerMuted
                            ? 'bg-rose-500/90 text-white'
                            : isSpeaking
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {speakerMuted ? (
                          <MicOff className="w-3 h-3" />
                        ) : (
                          <Mic className="w-3 h-3" />
                        )}
                      </div>

                      {/* Host Crown */}
                      {isSpeakerHost && (
                        <div className="absolute -top-1.5 -left-1.5 p-1 bg-amber-500 rounded-full border-2 border-zinc-950 text-black z-20 shadow-xs">
                          <Crown className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                    </div>

                    {/* Speaker Details */}
                    <div className="w-full min-w-0">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {isLocal ? 'You' : speaker.displayName || speaker.username}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 truncate block">
                        @{speaker.username}
                      </span>
                    </div>

                    {/* Host action on other speakers */}
                    {isHost && !isSpeakerHost && (
                      <button
                        onClick={() => handleDemoteToListener(speaker)}
                        className="mt-2 text-[10px] text-zinc-400 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Move to audience"
                        type="button"
                      >
                        Move to listeners
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AUDIENCE / LISTENERS SECTION */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 px-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-500" />
              Audience ({room.listeners.length})
            </h2>

            {room.listeners.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center">
                <p className="text-xs text-zinc-400">Audience is empty. Invite friends to join!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {room.listeners.map((listener) => {
                  const isLocal = listener.uid === currentUser?.uid;
                  return (
                    <div
                      key={listener.uid}
                      className="bg-zinc-950/70 border border-zinc-850 rounded-xl p-2.5 flex flex-col items-center text-center relative group"
                    >
                      {/* Raised Hand Badge */}
                      {listener.hasRaisedHand && (
                        <div className="absolute top-1.5 right-1.5 text-sm animate-bounce">
                          ✋
                        </div>
                      )}

                      <div className="w-10 h-10 rounded-full bg-zinc-800 p-[1.5px] mb-1.5 flex-none">
                        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                          {listener.avatar ? (
                            <img
                              src={listener.avatar}
                              alt={listener.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-zinc-300 uppercase">
                              {listener.username?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] font-medium text-zinc-200 truncate w-full">
                        {isLocal ? 'You' : listener.displayName || listener.username}
                      </span>
                      <span className="text-[9px] text-zinc-500 truncate w-full">
                        @{listener.username}
                      </span>

                      {/* Host can invite listener to stage */}
                      {isHost && (
                        <button
                          onClick={() => handlePromoteToSpeaker(listener)}
                          className="mt-1.5 text-[10px] text-rose-400 hover:text-rose-300 font-semibold transition-colors opacity-0 group-hover:opacity-100"
                          type="button"
                        >
                          Invite to speak
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* IN-ROOM LIVE CHAT DRAWER */}
        {isChatOpen && (
          <div className="border-t border-zinc-800 bg-zinc-950/95 flex flex-col h-56 transition-all animate-fadeIn z-20">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-850 text-xs font-bold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                Live Room Chat
              </span>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs no-scrollbar">
              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex-none flex items-center justify-center overflow-hidden">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold">{m.username.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-zinc-200 mr-1.5">@{m.username}:</span>
                    <span className="text-zinc-300 break-words">{m.text}</span>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-2 border-t border-zinc-850 flex items-center gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something to the room..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* BOTTOM CONTROLS STAGE BAR */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-950/95 z-20 space-y-3">
          {/* EMOJI REACTIONS ROW */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-lg transition-transform active:scale-125 hover:scale-110 flex-none border border-zinc-800/60 shadow-xs"
                type="button"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* MAIN BUTTONS ROW */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Primary Mic or Hand Raise Button */}
            {isSpeaker ? (
              <button
                onClick={toggleMute}
                className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                  isMuted
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white shadow-emerald-950/40'
                }`}
                type="button"
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-5 h-5 text-rose-400" />
                    <span>Unmute Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 text-white animate-pulse" />
                    <span>Mute Mic</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={toggleHandRaise}
                className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  hasRaisedHand
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                }`}
                type="button"
              >
                <span className="text-base">{hasRaisedHand ? '✋' : '✋'}</span>
                <span>{hasRaisedHand ? 'Hand Raised' : 'Request to Speak'}</span>
              </button>
            )}

            {/* Chat Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-3 rounded-2xl border transition-all ${
                isChatOpen
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
              title="Toggle Live Chat"
              type="button"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Soundboard Clap button */}
            <button
              onClick={() => handleSendReaction('👏')}
              className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all active:scale-95"
              title="Clap / Applause"
              type="button"
            >
              <span className="text-base leading-none">👏</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
