import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Hand, Users, MessageSquare, Share2, 
  PhoneOff, Crown, ChevronDown, Send, Sparkles, Youtube, 
  Play, StopCircle, Heart, Swords, Dices, Flame, Trophy, 
  RotateCw, HelpCircle, Coins, Volume2, UserPlus, ArrowRight,
  Trash2
} from 'lucide-react';
import { AppUser, VoiceRoom, RoomParticipant, RoomMessage, PKBattle, InteractiveGame } from '../types';
import { isGlobalAdmin } from '../utils/admin';
import { 
  createMicAnalyser, 
  MicAnalyserHandle, 
  playChimeSound, 
  playPopSound, 
  playClapSound, 
  playMicToggleSound, 
  playGongSound,
  playVictorySound,
  playDiceRollSound
} from '../utils/audioVibeEngine';

interface VoiceRoomModalProps {
  room: VoiceRoom;
  currentUser: AppUser | null;
  isOpen: boolean;
  onMinimize: () => void;
  onLeaveRoom: () => void;
  onUpdateRoom: (updated: VoiceRoom) => void;
  onDeleteRoom?: (roomId: string) => void;
  onRequireLogin: () => void;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  xPercent: number;
  yPercent: number;
}

const REACTION_EMOJIS = ['❤️', '🔥', '👏', '🎉', '✨', '💎'];

const WHEEL_ITEMS = [
  { text: 'Sing 15s 🎤', color: '#ec4899' },
  { text: 'Secret 🤫', color: '#8b5cf6' },
  { text: '+50 Likes ❤️', color: '#f43f5e' },
  { text: 'Lion Roar 🦁', color: '#f59e0b' },
  { text: 'Pass Mic 👑', color: '#10b981' },
  { text: 'Imitate Voice 🎭', color: '#06b6d4' },
  { text: 'Hot Take 🔥', color: '#ef4444' },
  { text: 'Free Pass ⭐', color: '#6366f1' },
];

const TRUTH_PROMPTS = [
  'What is the most embarrassing song in your playlist?',
  'What is a secret talent that almost nobody here knows about?',
  'Who in this room has the most soothing speaking voice?',
  'What is the wildest thing you have ever bought on impulse?',
  'What is your biggest fear or strange phobia?'
];

const DARE_PROMPTS = [
  'Sing the chorus of your favorite song in opera style!',
  'Do a dramatic 15-second movie villain monologue!',
  'Speak in an exaggerated accent for your next 3 sentences!',
  'Tell a terrible dad joke with a completely straight face!',
  'Make the sound of a sports car revving up at full throttle!'
];

export const VoiceRoomModal: React.FC<VoiceRoomModalProps> = ({
  room,
  currentUser,
  isOpen,
  onMinimize,
  onLeaveRoom,
  onUpdateRoom,
  onDeleteRoom,
  onRequireLogin,
}) => {
  const isHost = room.hostUid === currentUser?.uid || (currentUser && room.hostUsername === currentUser.username);
  const isAdmin = isGlobalAdmin(currentUser);
  const canDeleteRoom = isHost || isAdmin;
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [localVolume, setLocalVolume] = useState(0);
  const [isSpeakingLocally, setIsSpeakingLocally] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<RoomMessage[]>([
    {
      id: 'm-welcome',
      uid: 'system',
      username: 'Room Bot',
      avatar: 'https://ui-avatars.com/api/?name=Noise+Bot&background=6366f1&color=fff',
      text: `Welcome to "${room.title}"! Tap any slot heart to send love ❤️`,
      createdAt: Date.now() - 30000,
    }
  ]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Slot Likes state (10 slots)
  const [slotLikes, setSlotLikes] = useState<{ [slotIdx: number]: number }>(() => room.slotLikes || {});
  const [pulsingSlot, setPulsingSlot] = useState<number | null>(null);

  // Center Modes: 'idle' | 'pk' | 'games'
  const [centerMode, setCenterMode] = useState<'idle' | 'pk' | 'games'>('idle');

  // PK Battle State
  const [pkBattle, setPkBattle] = useState<PKBattle | null>(null);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [pkWinnerModal, setPkWinnerModal] = useState<'red' | 'blue' | 'draw' | null>(null);

  // Interactive Games State
  const [activeGameTab, setActiveGameTab] = useState<'wheel' | 'dice' | 'truthOrDare' | 'coinFlip'>('wheel');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);

  const [diceValues, setDiceValues] = useState<[number, number]>([3, 4]);
  const [isRollingDice, setIsRollingDice] = useState(false);

  const [currentPrompt, setCurrentPrompt] = useState<{ type: 'truth' | 'dare'; text: string }>({
    type: 'truth',
    text: TRUTH_PROMPTS[0],
  });

  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinSide, setCoinSide] = useState<'heads' | 'tails'>('heads');

  // YouTube Background Player
  const [showYtPlayer, setShowYtPlayer] = useState(false);
  const [ytInput, setYtInput] = useState('');
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);

  // Audience list sheet
  const [showAudienceSheet, setShowAudienceSheet] = useState(false);

  // WebRTC
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const micHandleRef = useRef<MicAnalyserHandle | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isSpeaker = isHost || room.speakers.some((s) => s.uid === currentUser?.uid);

  // Build the 10 speaker slots array
  // Slot 0 is reserved for the Host
  // Slots 1 to 9 are for other speakers or empty
  const slots: (RoomParticipant | null)[] = Array.from({ length: 10 }, (_, i) => {
    if (i === 0) {
      // Host slot
      return room.speakers.find((s) => s.uid === room.hostUid) || room.speakers[0] || null;
    }
    const otherSpeakers = room.speakers.filter((s) => s.uid !== room.hostUid);
    return otherSpeakers[i - 1] || null;
  });

  // Microphone and Audio analysis
  useEffect(() => {
    if (isSpeaker && !localStream) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          setLocalStream(stream);
          createMicAnalyser().then((handle) => {
            if (handle) {
              micHandleRef.current = handle;
              handle.setMuted(isMuted);
              const checkVolume = () => {
                const vol = handle.getVolumeLevel();
                setLocalVolume(vol);
                setIsSpeakingLocally(!isMuted && vol > 12);
                requestAnimationFrame(checkVolume);
              };
              requestAnimationFrame(checkVolume);
            }
          });
        })
        .catch(() => console.log('Mic access optional in preview mode'));
    }
    return () => {
      if (localStream) localStream.getTracks().forEach((track) => track.stop());
      if (micHandleRef.current) micHandleRef.current.cleanup();
    };
  }, [isSpeaker]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
    }
    if (micHandleRef.current) micHandleRef.current.setMuted(isMuted);
  }, [isMuted, localStream]);

  // PK Battle Countdown Timer
  useEffect(() => {
    if (!pkBattle?.isActive) return;

    const timer = setInterval(() => {
      setPkBattle((prev) => {
        if (!prev || !prev.isActive) return null;
        if (prev.timeLeft <= 1) {
          playVictorySound();
          let winner: 'red' | 'blue' | 'draw' = 'draw';
          if (prev.teamRed.score > prev.teamBlue.score) winner = 'red';
          else if (prev.teamBlue.score > prev.teamRed.score) winner = 'blue';
          setPkWinnerModal(winner);
          return { ...prev, timeLeft: 0, isActive: false, winner };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pkBattle?.isActive]);

  // Auto-scroll chat inside glassmorphism container
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    playMicToggleSound(!nextState);
    if (currentUser) {
      const updated = room.speakers.map((s) => s.uid === currentUser.uid ? { ...s, isMuted: nextState } : s);
      onUpdateRoom({ ...room, speakers: updated });
    }
  };

  const toggleHandRaise = () => {
    if (!currentUser) return onRequireLogin();
    const nextState = !hasRaisedHand;
    setHasRaisedHand(nextState);
    if (nextState) playChimeSound();
    const updated = room.listeners.map((l) => l.uid === currentUser.uid ? { ...l, hasRaisedHand: nextState } : l);
    onUpdateRoom({ ...room, listeners: updated });
  };

  const handleSendReaction = (emoji: string) => {
    emoji === '👏' ? playClapSound() : playPopSound();
    const newReaction: FloatingReaction = {
      id: `react-${Date.now()}-${Math.random()}`,
      emoji,
      xPercent: 20 + Math.random() * 60,
      yPercent: 75,
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2000);
  };

  // Like button on the border of a slot
  const handleLikeSlot = (slotIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playPopSound();
    setPulsingSlot(slotIdx);
    setTimeout(() => setPulsingSlot(null), 400);

    const newLikes = (slotLikes[slotIdx] || 0) + 1;
    const updatedSlotLikes = { ...slotLikes, [slotIdx]: newLikes };
    setSlotLikes(updatedSlotLikes);
    onUpdateRoom({ ...room, slotLikes: updatedSlotLikes });

    // Spawn floating heart from slot position
    const angle = (slotIdx * 36) - 90;
    const rad = (angle * Math.PI) / 180;
    // Map polar to percentage roughly around center
    const x = 50 + 38 * Math.cos(rad);
    const y = 38 + 32 * Math.sin(rad);

    const heartReaction: FloatingReaction = {
      id: `slot-heart-${Date.now()}-${Math.random()}`,
      emoji: '❤️',
      xPercent: x,
      yPercent: y,
    };
    setFloatingReactions((prev) => [...prev, heartReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== heartReaction.id));
    }, 2000);
  };

  // Taking an empty slot seat
  const handleTakeSeat = (slotIdx: number) => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (isSpeaker) return; // already a speaker

    playChimeSound();
    const newSpeaker: RoomParticipant = {
      uid: currentUser.uid,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatar: currentUser.photoURL,
      isSpeaker: true,
      isMuted: false,
      isSpeaking: false,
      joinedAt: Date.now(),
      seatNumber: slotIdx,
    };

    const remainingListeners = room.listeners.filter((l) => l.uid !== currentUser.uid);
    const updatedSpeakers = [...room.speakers, newSpeaker];
    onUpdateRoom({
      ...room,
      speakers: updatedSpeakers,
      listeners: remainingListeners,
    });
  };

  // PK Battle Controls
  const handleStartPkBattle = () => {
    if (!isSpeaker && !isHost) {
      alert('Only speakers or the host can start a PK Battle!');
      return;
    }
    playGongSound();

    const redSpeaker = slots[0] || {
      uid: room.hostUid,
      username: room.hostUsername,
      displayName: room.hostDisplayName,
      avatar: room.hostAvatar,
    };
    const blueSpeaker = slots[1] || slots[2] || {
      uid: 'challenger-1',
      username: 'Challenger',
      displayName: 'Room Challenger',
      avatar: 'https://ui-avatars.com/api/?name=Challenger&background=06b6d4&color=fff',
    };

    setPkBattle({
      isActive: true,
      teamRed: {
        uid: redSpeaker.uid,
        username: redSpeaker.username,
        displayName: redSpeaker.displayName,
        avatar: redSpeaker.avatar,
        score: 10,
      },
      teamBlue: {
        uid: blueSpeaker.uid,
        username: blueSpeaker.username,
        displayName: blueSpeaker.displayName,
        avatar: blueSpeaker.avatar,
        score: 10,
      },
      timeLeft: 60,
      duration: 60,
      winner: null,
    });
    setCenterMode('pk');
  };

  const handleBoostTeam = (team: 'red' | 'blue') => {
    playPopSound();
    const addScore = 5 * comboMultiplier;
    setComboMultiplier((prev) => Math.min(prev + 1, 10));

    // Reset combo multiplier after 2s inactivity
    setTimeout(() => {
      setComboMultiplier(1);
    }, 2000);

    setPkBattle((prev) => {
      if (!prev) return null;
      if (team === 'red') {
        return {
          ...prev,
          teamRed: { ...prev.teamRed, score: prev.teamRed.score + addScore },
        };
      } else {
        return {
          ...prev,
          teamBlue: { ...prev.teamBlue, score: prev.teamBlue.score + addScore },
        };
      }
    });

    handleSendReaction(team === 'red' ? '❤️' : '💙');
  };

  // Interactive Games Logic
  const handleSpinWheel = () => {
    if (isSpinningWheel) return;
    setIsSpinningWheel(true);
    setWheelResult(null);
    playDiceRollSound();

    const spinDegrees = 1440 + Math.floor(Math.random() * 360);
    const newRotation = wheelRotation + spinDegrees;
    setWheelRotation(newRotation);

    setTimeout(() => {
      setIsSpinningWheel(false);
      const normalized = (newRotation % 360 + 360) % 360;
      const index = Math.floor(((360 - normalized + 22.5) % 360) / 45);
      const prize = WHEEL_ITEMS[index]?.text || 'Hot Take 🔥';
      setWheelResult(prize);
      playVictorySound();
    }, 3200);
  };

  const handleRollDice = () => {
    if (isRollingDice) return;
    setIsRollingDice(true);
    playDiceRollSound();
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setDiceValues([d1, d2]);
      setIsRollingDice(false);
      playChimeSound();
    }, 800);
  };

  const handleNextPrompt = (type: 'truth' | 'dare') => {
    playPopSound();
    const pool = type === 'truth' ? TRUTH_PROMPTS : DARE_PROMPTS;
    const randomPrompt = pool[Math.floor(Math.random() * pool.length)];
    setCurrentPrompt({ type, text: randomPrompt });
  };

  const handleFlipCoin = () => {
    if (coinFlipping) return;
    setCoinFlipping(true);
    playDiceRollSound();
    setTimeout(() => {
      const outcome = Math.random() > 0.5 ? 'heads' : 'tails';
      setCoinSide(outcome);
      setCoinFlipping(false);
      playChimeSound();
    }, 1000);
  };

  // Chat message submit
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!currentUser) {
      onRequireLogin();
      return;
    }

    const newMsg: RoomMessage = {
      id: `msg-${Date.now()}`,
      uid: currentUser.uid,
      username: currentUser.username,
      avatar: currentUser.photoURL,
      text: chatInput.trim(),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    playPopSound();
  };

  const handleShareRoom = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // YouTube audio player handler
  const handlePlayYt = (e: React.FormEvent) => {
    e.preventDefault();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = ytInput.match(regExp);
    if (match && match[2].length === 11) {
      setYtVideoId(match[2]);
      setYtInput('');
    } else {
      alert('Please enter a valid YouTube link');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-3xl transition-opacity ${!isOpen ? 'hidden' : 'animate-fadeIn'}`}>
      
      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.xPercent}%`, top: `${r.yPercent}%` }}
            className="absolute text-4xl animate-float-reaction"
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="w-full h-full max-w-[480px] relative flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/60 via-zinc-950 to-black sm:rounded-[40px] sm:h-[95vh] sm:border border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.25)] overflow-hidden">
        
        {/* Top Header */}
        <div className="pt-3 px-4 pb-2 flex items-center justify-between z-30">
          <button
            onClick={onMinimize}
            className="p-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all active:scale-95"
            title="Minimize room"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <div className="px-3.5 py-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex flex-col items-center shadow-lg">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-widest">
                {room.topic}
              </span>
            </div>
            <span className="text-white font-bold text-xs truncate max-w-[170px]">{room.title}</span>
          </div>

          <div className="flex items-center gap-1.5 relative">
            {/* YouTube Music */}
            <button
              onClick={() => setShowYtPlayer(!showYtPlayer)}
              className={`p-2.5 backdrop-blur-xl border rounded-full transition-all ${showYtPlayer ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
              title="Background Music"
            >
              <Youtube className="w-4 h-4" />
            </button>

            {/* YouTube Player Dropdown */}
            {showYtPlayer && (
              <div className="absolute top-12 right-0 w-72 bg-zinc-900/95 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-3.5 shadow-2xl z-50 animate-fadeIn">
                <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-500" /> Room Background Audio
                </h3>
                <form onSubmit={handlePlayYt} className="flex gap-1.5 mb-2.5">
                  <input
                    type="text"
                    value={ytInput}
                    onChange={(e) => setYtInput(e.target.value)}
                    placeholder="YouTube music URL..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:border-red-500/50"
                  />
                  <button type="submit" className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </form>
                {ytVideoId && (
                  <div className="space-y-2">
                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&loop=1&playlist=${ytVideoId}`} 
                        frameBorder="0" 
                        allow="autoplay; encrypted-media" 
                        allowFullScreen 
                      />
                    </div>
                    <button
                      onClick={() => setYtVideoId(null)}
                      className="w-full py-1 bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <StopCircle className="w-3.5 h-3.5" /> Stop Music
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Share */}
            <button
              onClick={handleShareRoom}
              className="p-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all relative"
              title="Share Room"
            >
              <Share2 className="w-4 h-4" />
              {copiedLink && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] bg-indigo-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
                  Copied!
                </span>
              )}
            </button>

            {/* Delete / End Room (Master Admin on ANY room, Host on own room) */}
            {canDeleteRoom && onDeleteRoom && (
              <button
                onClick={() => setShowDeleteRoomModal(true)}
                className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-full text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-md"
                title={isAdmin && !isHost ? "Delete Room (Master Admin 👑)" : "End & Delete Room"}
                type="button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* TOP STATUS BAR: Quick Action Badges */}
        <div className="px-4 py-1 flex items-center justify-between text-xs z-20">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCenterMode(centerMode === 'pk' ? 'idle' : 'pk')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-all ${
                centerMode === 'pk'
                  ? 'bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                  : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-rose-400" />
              <span>PK Battle</span>
            </button>

            <button
              onClick={() => setCenterMode(centerMode === 'games' ? 'idle' : 'games')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-all ${
                centerMode === 'games'
                  ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                  : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Games</span>
            </button>
          </div>

          <button
            onClick={() => setShowAudienceSheet(!showAudienceSheet)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 bg-white/5 rounded-full border border-white/5 transition-colors"
          >
            <Users className="w-3 h-3 text-indigo-400" />
            <span>Audience ({room.listeners.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CIRCULAR 10-SPEAKER STAGE (RADIUS RING) */}
        {/* ========================================================================= */}
        <div className="relative flex-1 flex items-center justify-center select-none overflow-hidden min-h-[340px] max-h-[380px]">
          
          {/* Subtle Ring Track Background */}
          <div className="absolute w-[270px] h-[270px] rounded-full border border-indigo-500/20 pointer-events-none" />
          <div className="absolute w-[276px] h-[276px] rounded-full border border-dashed border-white/10 pointer-events-none animate-spin [animation-duration:120s]" />
          
          {/* Ambient Glow in center */}
          <div className="absolute w-44 h-44 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

          {/* ------------------------------------------------------------- */}
          {/* CENTER ARENA: PK Battle, Interactive Game, or Audio Wave Hub  */}
          {/* ------------------------------------------------------------- */}
          <div className="absolute w-[150px] h-[150px] rounded-full flex flex-col items-center justify-center z-10 p-2 text-center">
            
            {/* MODE 1: PK BATTLE ACTIVE */}
            {centerMode === 'pk' && pkBattle?.isActive ? (
              <div className="w-full flex flex-col items-center justify-center animate-fadeIn">
                <div className="flex items-center gap-1 text-[10px] font-black text-amber-400 uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded-full border border-amber-500/30 mb-1">
                  <Flame className="w-3 h-3 text-rose-500 animate-pulse" />
                  <span>PK 00:{pkBattle.timeLeft.toString().padStart(2, '0')}</span>
                </div>

                {/* Split Score Bar */}
                <div className="w-full h-3 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex my-1 shadow-md">
                  <div
                    className="bg-gradient-to-r from-rose-600 to-rose-400 h-full transition-all duration-300 flex items-center justify-start pl-1 text-[8px] font-black text-white"
                    style={{
                      width: `${Math.max(10, Math.min(90, (pkBattle.teamRed.score / (pkBattle.teamRed.score + pkBattle.teamBlue.score || 1)) * 100))}%`,
                    }}
                  >
                    {pkBattle.teamRed.score}
                  </div>
                  <div
                    className="bg-gradient-to-l from-cyan-600 to-cyan-400 h-full flex-1 transition-all duration-300 flex items-center justify-end pr-1 text-[8px] font-black text-white"
                  >
                    {pkBattle.teamBlue.score}
                  </div>
                </div>

                {/* Boost Buttons */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => handleBoostTeam('red')}
                    className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-bold rounded-lg shadow-sm active:scale-90 transition-transform flex items-center gap-0.5"
                  >
                    <span>🔴 +{5 * comboMultiplier}</span>
                  </button>
                  <button
                    onClick={() => handleBoostTeam('blue')}
                    className="px-2 py-1 bg-cyan-500 hover:bg-cyan-600 text-white text-[9px] font-bold rounded-lg shadow-sm active:scale-90 transition-transform flex items-center gap-0.5"
                  >
                    <span>🔵 +{5 * comboMultiplier}</span>
                  </button>
                </div>
              </div>
            ) : centerMode === 'pk' ? (
              /* PK Battle Launcher */
              <div className="flex flex-col items-center justify-center p-2 animate-fadeIn">
                <Swords className="w-8 h-8 text-rose-400 mb-1 animate-bounce" />
                <span className="text-[11px] font-bold text-white mb-1.5">PK Battle Duel</span>
                <button
                  onClick={handleStartPkBattle}
                  className="px-3 py-1 bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-[10px] font-black rounded-full shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  START BATTLE
                </button>
              </div>
            ) : centerMode === 'games' ? (
              /* MODE 2: INTERACTIVE GAMES CENTER */
              <div className="w-full flex flex-col items-center justify-center animate-fadeIn">
                
                {/* Mini game switcher */}
                <div className="flex items-center gap-1 mb-1">
                  <button
                    onClick={() => setActiveGameTab('wheel')}
                    className={`p-1 rounded-md text-[10px] ${activeGameTab === 'wheel' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="Lucky Wheel"
                  >
                    🎡
                  </button>
                  <button
                    onClick={() => setActiveGameTab('dice')}
                    className={`p-1 rounded-md text-[10px] ${activeGameTab === 'dice' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="Roll Dice"
                  >
                    🎲
                  </button>
                  <button
                    onClick={() => setActiveGameTab('truthOrDare')}
                    className={`p-1 rounded-md text-[10px] ${activeGameTab === 'truthOrDare' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="Truth or Dare"
                  >
                    💭
                  </button>
                  <button
                    onClick={() => setActiveGameTab('coinFlip')}
                    className={`p-1 rounded-md text-[10px] ${activeGameTab === 'coinFlip' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="Coin Flip"
                  >
                    🪙
                  </button>
                </div>

                {/* GAME 1: LUCKY WHEEL */}
                {activeGameTab === 'wheel' && (
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-md">
                      <div
                        className="w-full h-full rounded-full transition-transform duration-[3200ms] cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          background: 'conic-gradient(#ec4899 0deg 45deg, #8b5cf6 45deg 90deg, #f43f5e 90deg 135deg, #f59e0b 135deg 180deg, #10b981 180deg 225deg, #06b6d4 225deg 270deg, #ef4444 270deg 315deg, #6366f1 315deg 360deg)',
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-black border border-white flex items-center justify-center text-[8px] font-bold text-white">
                          🎯
                        </div>
                      </div>
                    </div>
                    {wheelResult ? (
                      <span className="text-[9px] font-bold text-amber-300 mt-1 truncate max-w-[130px]">
                        {wheelResult}
                      </span>
                    ) : null}
                    <button
                      onClick={handleSpinWheel}
                      disabled={isSpinningWheel}
                      className="mt-1 px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black rounded-full active:scale-95 transition-all shadow-md"
                    >
                      {isSpinningWheel ? 'Spinning...' : 'SPIN'}
                    </button>
                  </div>
                )}

                {/* GAME 2: DICE DUEL */}
                {activeGameTab === 'dice' && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 my-1">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr from-white to-zinc-200 text-zinc-950 font-black text-base flex items-center justify-center shadow-lg border border-zinc-300 ${isRollingDice ? 'animate-spin' : ''}`}>
                        {diceValues[0]}
                      </div>
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr from-white to-zinc-200 text-zinc-950 font-black text-base flex items-center justify-center shadow-lg border border-zinc-300 ${isRollingDice ? 'animate-spin' : ''}`}>
                        {diceValues[1]}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-zinc-300">
                      Total: {diceValues[0] + diceValues[1]}
                    </span>
                    <button
                      onClick={handleRollDice}
                      disabled={isRollingDice}
                      className="mt-1 px-2.5 py-0.5 bg-indigo-500 hover:bg-indigo-400 text-white text-[9px] font-bold rounded-full active:scale-95 transition-all shadow-md"
                    >
                      {isRollingDice ? 'Rolling...' : 'ROLL'}
                    </button>
                  </div>
                )}

                {/* GAME 3: TRUTH OR DARE */}
                {activeGameTab === 'truthOrDare' && (
                  <div className="flex flex-col items-center max-w-[135px]">
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                      {currentPrompt.type.toUpperCase()}
                    </span>
                    <p className="text-[8px] text-zinc-200 line-clamp-2 my-1 text-center font-medium">
                      "{currentPrompt.text}"
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleNextPrompt('truth')}
                        className="px-2 py-0.5 bg-purple-600/80 hover:bg-purple-500 text-white text-[8px] font-bold rounded-full"
                      >
                        Truth
                      </button>
                      <button
                        onClick={() => handleNextPrompt('dare')}
                        className="px-2 py-0.5 bg-rose-600/80 hover:bg-rose-500 text-white text-[8px] font-bold rounded-full"
                      >
                        Dare
                      </button>
                    </div>
                  </div>
                )}

                {/* GAME 4: COIN FLIP */}
                {activeGameTab === 'coinFlip' && (
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-yellow-200 text-black font-black text-[10px] flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)] my-1 ${coinFlipping ? 'animate-spin' : ''}`}>
                      {coinSide === 'heads' ? 'HEADS' : 'TAILS'}
                    </div>
                    <button
                      onClick={handleFlipCoin}
                      disabled={coinFlipping}
                      className="mt-0.5 px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-bold rounded-full active:scale-95 transition-all shadow-md"
                    >
                      FLIP
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* MODE 3: DEFAULT IDLE HUB */
              <div className="flex flex-col items-center justify-center p-2">
                <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mb-1 relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                  <Mic className="w-5 h-5 text-indigo-300 absolute" />
                </div>
                <span className="text-[10px] font-bold text-white tracking-wide">Live Stage</span>
                <span className="text-[9px] text-zinc-400">10 Seats Ring</span>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* THE 10 SPEAKER SLOTS IN A CIRCULAR ARRANGEMENT */}
          {/* ------------------------------------------------------------- */}
          {slots.map((participant, index) => {
            // Polar coordinates for 10 items (36 degrees apart)
            // 0 index is at -90 degrees (12 o'clock top center)
            const angleDeg = (index * 36) - 90;
            const angleRad = (angleDeg * Math.PI) / 180;
            const radius = 135; // px distance from center

            const leftPx = `calc(50% + ${Math.round(radius * Math.cos(angleRad))}px)`;
            const topPx = `calc(50% + ${Math.round(radius * Math.sin(angleRad))}px)`;

            const isOccupied = participant !== null;
            const isLocalUser = participant?.uid === currentUser?.uid;
            const isSpeaking = isLocalUser ? isSpeakingLocally : participant?.isSpeaking;
            const currentLikes = slotLikes[index] || 0;
            const isPulsing = pulsingSlot === index;

            return (
              <div
                key={`slot-${index}`}
                style={{
                  position: 'absolute',
                  left: leftPx,
                  top: topPx,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`flex flex-col items-center justify-center z-20 group transition-transform ${isPulsing ? 'scale-115' : 'hover:scale-105'}`}
              >
                {/* Slot Outer Circle / Seat */}
                <div
                  onClick={() => {
                    if (!isOccupied) handleTakeSeat(index);
                  }}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isOccupied
                      ? index === 0
                        ? 'p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                        : isSpeaking
                        ? 'p-[2px] bg-gradient-to-tr from-rose-500 to-orange-400 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                        : 'p-[1.5px] bg-white/20 hover:bg-white/40'
                      : 'border-2 border-dashed border-white/25 hover:border-indigo-400 hover:bg-indigo-500/10 cursor-pointer'
                  }`}
                >
                  {/* Speaking Wave Ripple */}
                  {isSpeaking && (
                    <div className="absolute -inset-1.5 rounded-full border border-rose-500/60 animate-ping [animation-duration:1.2s] pointer-events-none" />
                  )}

                  {isOccupied ? (
                    <div className="w-full h-full rounded-full bg-zinc-950 overflow-hidden relative">
                      <img
                        src={participant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.username)}&background=18181b&color=fff`}
                        alt={participant.username}
                        className="w-full h-full object-cover"
                      />

                      {/* Mic status indicator */}
                      <div className="absolute bottom-0 right-0 p-0.5 bg-black/80 rounded-full">
                        {participant.isMuted ? (
                          <MicOff className="w-2.5 h-2.5 text-rose-500" />
                        ) : (
                          <Mic className="w-2.5 h-2.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-500 group-hover:text-indigo-400">
                      <UserPlus className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Top Badge: Crown for Host on Slot 1 or Seat Number */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    {index === 0 ? (
                      <span className="bg-amber-400 text-black p-0.5 rounded-full shadow-md flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span className="bg-zinc-800/90 text-zinc-300 text-[8px] font-extrabold px-1 py-0.2 rounded-full border border-white/10 shadow-sm">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* ======================================================== */}
                  {/* LIKE BUTTON ON THE BORDER OF EACH SLOT */}
                  {/* ======================================================== */}
                  <button
                    type="button"
                    onClick={(e) => handleLikeSlot(index, e)}
                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white rounded-full px-1 py-0.5 flex items-center gap-0.5 shadow-md border border-white/20 active:scale-125 transition-transform cursor-pointer z-30"
                    title={`Like seat ${index + 1}`}
                  >
                    <Heart className="w-2.5 h-2.5 fill-white" />
                    {currentLikes > 0 && (
                      <span className="text-[8px] font-black leading-none">
                        {currentLikes > 999 ? `${(currentLikes / 1000).toFixed(1)}k` : currentLikes}
                      </span>
                    )}
                  </button>
                </div>

                {/* Username or Seat label underneath */}
                <span className="text-[9px] font-medium text-zinc-300 mt-1 max-w-[50px] truncate text-center shadow-black drop-shadow-sm">
                  {isOccupied ? `@${participant.username}` : `Seat ${index + 1}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* GLASSMORPHISM CONTAINER AT THE BOTTOM FOR COMMENTS WITH BLURRED BG */}
        {/* ========================================================================= */}
        <div className="mx-4 mb-2 z-30">
          <div className="backdrop-blur-2xl bg-black/45 border border-white/10 rounded-2xl p-2.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] flex flex-col">
            
            {/* Header info / Reaction chips */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5">
              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Live Chat & Reactions
              </span>
              <div className="flex items-center gap-1">
                {REACTION_EMOJIS.slice(0, 4).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="text-xs hover:scale-125 active:scale-95 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrolling Comment Stream */}
            <div className="h-20 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-1.5 text-left animate-fadeIn">
                  <img
                    src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username)}&background=18181b&color=fff`}
                    alt={m.username}
                    className="w-4 h-4 rounded-full object-cover flex-none mt-0.5 ring-1 ring-white/10"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-indigo-300 mr-1.5">
                      {m.username}:
                    </span>
                    <span className="text-[11px] text-zinc-200 break-words font-normal">
                      {m.text}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Comment Input Form */}
            <form onSubmit={handleSendMessage} className="mt-2 pt-2 border-t border-white/5 flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something nice in room..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 transition-colors"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white flex items-center justify-center hover:opacity-90 active:scale-90 transition-all flex-none shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM ACTION CONTROLS */}
        {/* ========================================================================= */}
        <div className="px-4 pb-4 pt-1 flex items-center justify-between z-30">
          {/* Mic Toggle or Raise Hand */}
          {isSpeaker ? (
            <button
              onClick={toggleMute}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs shadow-lg transition-all active:scale-95 ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isMuted ? 'Muted' : 'Speaking'}</span>
            </button>
          ) : (
            <button
              onClick={toggleHandRaise}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs shadow-lg transition-all active:scale-95 ${
                hasRaisedHand
                  ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
              }`}
            >
              <Hand className="w-4 h-4" />
              <span>{hasRaisedHand ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>
          )}

          {/* Quick Reaction & Leave Room */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendReaction('👏')}
              className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white active:scale-90 transition-transform"
              title="Clap"
            >
              👏
            </button>

            {/* End / Delete Room Button */}
            {canDeleteRoom && onDeleteRoom && (
              <button
                onClick={() => setShowDeleteRoomModal(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold active:scale-95"
                title={isAdmin && !isHost ? "Master Admin Delete 👑" : "End & Delete Room"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isAdmin && !isHost ? 'Admin 👑' : 'End Room'}</span>
              </button>
            )}

            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* PK Victory Celebration Modal */}
        {pkWinnerModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
            <h2 className="text-xl font-black text-white mb-1">PK BATTLE OVER!</h2>
            <p className="text-sm font-bold text-amber-400 mb-4">
              {pkWinnerModal === 'draw'
                ? "It's a Tie! Both Teams Played Amazing!"
                : pkWinnerModal === 'red'
                ? '🏆 TEAM RED WINS THE DUEL!'
                : '🏆 TEAM BLUE WINS THE DUEL!'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPkWinnerModal(null);
                  handleStartPkBattle();
                }}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                REMATCH ⚡
              </button>
              <button
                onClick={() => {
                  setPkWinnerModal(null);
                  setCenterMode('idle');
                }}
                className="px-5 py-2 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Audience List Sheet */}
        {showAudienceSheet && (
          <div className="absolute inset-x-0 bottom-0 max-h-[60%] bg-zinc-900/95 backdrop-blur-3xl rounded-t-[32px] border-t border-white/10 z-50 flex flex-col animate-fadeIn p-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Room Attendees ({room.speakers.length + room.listeners.length})
              </h3>
              <button onClick={() => setShowAudienceSheet(false)} className="p-1 rounded-full text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2 no-scrollbar">
              <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Speakers</span>
              {room.speakers.map((s) => (
                <div key={s.uid} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2.5">
                    <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.username)}`} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1">
                        {s.displayName || s.username}
                        {s.isHost && <Crown className="w-3 h-3 text-amber-400" />}
                      </p>
                      <p className="text-[10px] text-zinc-400">@{s.username}</p>
                    </div>
                  </div>
                  {s.isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              ))}

              <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider pt-2 block">Listeners</span>
              {room.listeners.length === 0 ? (
                <p className="text-xs text-zinc-500 italic pl-1">No listeners in audience yet</p>
              ) : (
                room.listeners.map((l) => (
                  <div key={l.uid} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2.5">
                      <img src={l.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(l.username)}`} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-bold text-white">{l.displayName || l.username}</p>
                        <p className="text-[10px] text-zinc-400">@{l.username}</p>
                      </div>
                    </div>
                    {l.hasRaisedHand && <span className="text-sm animate-bounce">✋</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Delete Room Confirmation Modal */}
        {showDeleteRoomModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center max-w-xs w-full shadow-2xl">
              <div className="w-11 h-11 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAdmin && !isHost ? 'Admin: Delete Voice Room?' : 'End Voice Room?'}
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                {isAdmin && !isHost
                  ? `Master Admin 👑 action: Are you sure you want to delete @${room.hostUsername}'s chatroom "${room.title}"? All participants will be disconnected.`
                  : 'Are you sure you want to end your voice room? All listeners and speakers will be disconnected.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteRoomModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteRoomModal(false);
                    if (onDeleteRoom) onDeleteRoom(room.id);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg"
                >
                  {isAdmin && !isHost ? 'Delete Room' : 'End Room'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
