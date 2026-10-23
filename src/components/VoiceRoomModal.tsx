import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Hand, Users, MessageSquare, Share2, 
  PhoneOff, Crown, ChevronDown, Send, Sparkles, Youtube, 
  Play, StopCircle, Heart, Swords, Dices, Flame, Trophy, 
  RotateCw, HelpCircle, Coins, Volume2, UserPlus, ArrowRight,
  Trash2, Gift, Lock
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
import {
  setActiveVoiceRoomStream,
  setLocalMediaTrackMuted,
  isLocalMediaTrackMuted,
  stopActiveVoiceRoomStream,
  subscribeToMediaTrackChanges,
} from '../utils/voiceRoomMedia';
import { db, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  query 
} from 'firebase/firestore';

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

interface GiftItem {
  id: string;
  name: string;
  icon: string;
  coins: number;
  category: 'Hot' | 'Classic' | '3D' | 'VIP';
}

const LUXURY_GIFTS: GiftItem[] = [
  { id: 'heart', name: 'Love Heart', icon: '💖', coins: 1, category: 'Hot' },
  { id: 'rose', name: 'Velvet Rose', icon: '🌹', coins: 5, category: 'Hot' },
  { id: 'star', name: 'Golden Star', icon: '⭐', coins: 25, category: 'Hot' },
  { id: 'kiss', name: 'Sweet Kiss', icon: '💋', coins: 50, category: 'Hot' },
  { id: 'ring', name: 'Love Ring', icon: '💍', coins: 199, category: '3D' },
  { id: 'cocktail', name: 'Champagne', icon: '🥂', coins: 500, category: 'Classic' },
  { id: 'supercar', name: 'Cyber Car', icon: '🏎️', coins: 2500, category: '3D' },
  { id: 'crown', name: 'Imperial Crown', icon: '👑', coins: 5000, category: 'VIP' },
];

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
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Gifting System
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedGiftTab, setSelectedGiftTab] = useState<'Hot' | 'Classic' | '3D' | 'VIP'>('Hot');
  const [selectedGift, setSelectedGift] = useState<GiftItem>(LUXURY_GIFTS[0]);
  const [userCoins, setUserCoins] = useState(2510);
  const [flyingGift, setFlyingGift] = useState<string | null>(null);

  // Real-Time Voice Room Chat Sync via Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !room?.id) return;

    const msgsCol = collection(db, 'voice_rooms', room.id, 'messages');
    const unsubscribe = onSnapshot(
      msgsCol,
      (snapshot) => {
        const loaded: RoomMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          loaded.push({
            id: docSnap.id,
            uid: d.uid || 'user',
            username: d.username || 'User',
            displayName: d.displayName || d.username || 'User',
            avatar: d.avatar || '',
            text: d.text || '',
            createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : (d.createdAt || Date.now()),
          });
        });

        loaded.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setMessages(loaded);
      },
      (err) => {
        console.debug('Voice room messages listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [room?.id]);

  // Slot Likes state (8 slots)
  const [slotLikes, setSlotLikes] = useState<{ [slotIdx: number]: number }>(() => room.slotLikes || {});
  const [pulsingSlot, setPulsingSlot] = useState<number | null>(null);

  // Center Modes: 'idle' | 'pk' | 'games'
  const [centerMode, setCenterMode] = useState<'idle' | 'pk' | 'games'>('pk');

  // PK Battle State
  const [pkBattle, setPkBattle] = useState<PKBattle | null>({
    isActive: true,
    teamRed: {
      uid: room.hostUid,
      username: room.hostUsername,
      displayName: room.hostDisplayName,
      avatar: room.hostAvatar,
      score: 2500,
    },
    teamBlue: {
      uid: 'challenger-1',
      username: 'King Jr',
      displayName: 'King Jr',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
      score: 1800,
    },
    timeLeft: 38,
    duration: 60,
    winner: null,
  });
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

  // 8 Seater Grid Layout (Poppo / Yalla Live Style)
  const slots: (RoomParticipant | null)[] = Array.from({ length: 8 }, (_, i) => {
    if (i === 0) {
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
          setActiveVoiceRoomStream(stream, isMuted);
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
      stopActiveVoiceRoomStream();
    };
  }, [isSpeaker]);

  useEffect(() => {
    const unsubscribe = subscribeToMediaTrackChanges((muted) => {
      setIsMuted(muted);
    });

    const handleMicSignal = (e: CustomEvent<boolean | { isMuted: boolean }>) => {
      const nextMuted = typeof e.detail === 'boolean' ? e.detail : e.detail?.isMuted;
      if (typeof nextMuted === 'boolean') {
        setIsMuted(nextMuted);
      }
    };

    window.addEventListener('mute-hardware-mic', handleMicSignal as EventListener);
    window.addEventListener('voice-room-mic-status', handleMicSignal as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener('mute-hardware-mic', handleMicSignal as EventListener);
      window.removeEventListener('voice-room-mic-status', handleMicSignal as EventListener);
    };
  }, []);

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

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleMediaTrack = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    playMicToggleSound(!nextState);

    setLocalMediaTrackMuted(nextState);
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = !nextState; });
    }
    if (micHandleRef.current) {
      micHandleRef.current.setMuted(nextState);
    }

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
      xPercent: 30 + Math.random() * 40,
      yPercent: 70,
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2000);
  };

  const handleTakeSeat = (slotIdx: number) => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (isSpeaker) return;

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

  const handleStartPkBattle = () => {
    playGongSound();
    setPkBattle({
      isActive: true,
      teamRed: {
        uid: room.hostUid,
        username: room.hostUsername,
        displayName: room.hostDisplayName,
        avatar: room.hostAvatar,
        score: 100,
      },
      teamBlue: {
        uid: 'challenger-1',
        username: 'King Jr',
        displayName: 'King Jr',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
        score: 100,
      },
      timeLeft: 60,
      duration: 60,
      winner: null,
    });
    setCenterMode('pk');
  };

  const handleBoostTeam = (team: 'red' | 'blue') => {
    playPopSound();
    const addScore = 50 * comboMultiplier;
    setComboMultiplier((prev) => Math.min(prev + 1, 10));

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

  const handleSendGift = () => {
    if (userCoins < selectedGift.coins) {
      alert('Not enough coins! Please Top Up.');
      return;
    }

    playChimeSound();
    setUserCoins((prev) => prev - selectedGift.coins);
    setFlyingGift(selectedGift.icon);

    if (pkBattle?.isActive) {
      handleBoostTeam('red');
    }

    setTimeout(() => {
      setFlyingGift(null);
    }, 2500);

    setShowGiftModal(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    if (!currentUser) {
      onRequireLogin();
      return;
    }

    setChatInput('');
    playPopSound();

    if (isFirebaseConfigured && db && room?.id) {
      try {
        await addDoc(collection(db, 'voice_rooms', room.id, 'messages'), {
          uid: currentUser.uid,
          username: currentUser.username,
          displayName: currentUser.displayName || currentUser.username,
          avatar: currentUser.photoURL || '',
          text: text,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Failed to post voice room message:', err);
      }
    } else {
      const newMsg: RoomMessage = {
        id: `msg-${Date.now()}`,
        uid: currentUser.uid,
        username: currentUser.username,
        avatar: currentUser.photoURL,
        text: text,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  };

  const handleShareRoom = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-3xl select-none ${!isOpen ? 'hidden' : 'animate-fadeIn'}`}>
      
      {/* Flying Reactions */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
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

      {/* Main Screen Container (Mobile frame styling) */}
      <div className="w-full h-full max-w-[430px] relative flex flex-col bg-black sm:rounded-[40px] sm:h-[95vh] sm:border border-amber-500/30 shadow-[0_0_80px_rgba(245,158,11,0.2)] overflow-hidden">
        
        {/* ========================================================= */}
        {/* LUXURY SUPERCAR & GOLDEN GLOW BACKGROUND                  */}
        {/* ========================================================= */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/40 via-purple-950/40 to-black z-10" />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/20 blur-[100px] rounded-full" />
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-80 h-80 bg-rose-600/15 blur-[110px] rounded-full" />

          {/* Supercar Neon Contour Effect */}
          <div className="absolute top-36 inset-x-0 flex justify-center opacity-40 scale-105">
            <svg viewBox="0 0 400 240" className="w-full max-w-sm text-amber-500 stroke-current fill-none stroke-[1.4]">
              <path d="M 60 170 C 100 130, 150 110, 200 110 C 250 110, 300 130, 340 170 L 360 200 L 40 200 Z" opacity="0.5" />
              <path d="M 130 110 L 165 60 L 235 60 L 270 110 Z" opacity="0.8" />
              <line x1="165" y1="85" x2="235" y2="85" stroke="yellow" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TOP STATUS BAR                                            */}
        {/* ========================================================= */}
        <div className="pt-3 px-3.5 pb-2 flex items-center justify-between z-30">
          {/* Host Info Capsule */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-amber-500/30 rounded-full py-1 pl-1 pr-3">
            <div className="relative w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-amber-600">
              <img 
                src={room.hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"} 
                alt="host" 
                className="w-full h-full rounded-full object-cover" 
              />
              <span className="absolute -top-1 -right-1 text-[9px]">👑</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-amber-200 leading-tight truncate max-w-[85px]">
                {room.title || 'VIP Party'}
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                💎 {userCoins}
              </span>
            </div>
            <button 
              onClick={() => setShowGiftModal(true)}
              className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black text-xs ml-1 shadow-xs"
            >
              +
            </button>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5">
            {/* Audience Count */}
            <button 
              onClick={() => setShowAudienceSheet(true)}
              className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full border border-white/10 text-[10px] font-bold text-amber-300"
            >
              <Users className="w-3 h-3 text-amber-400" />
              <span>{room.listeners.length + room.speakers.length}</span>
            </button>

            {/* Minimize */}
            <button
              onClick={onMinimize}
              className="w-7 h-7 bg-white/5 border border-white/10 rounded-full text-white flex items-center justify-center hover:bg-white/10"
              title="Minimize"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Share */}
            <button
              onClick={handleShareRoom}
              className="w-7 h-7 bg-white/5 border border-white/10 rounded-full text-white flex items-center justify-center hover:bg-white/10"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* End Room */}
            {canDeleteRoom && (
              <button
                onClick={() => setShowDeleteRoomModal(true)}
                className="w-7 h-7 bg-rose-500/20 border border-rose-500/40 rounded-full text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white"
                title="End Room"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PK BATTLE & STAGE TOP DUEL (Exact reference match)         */}
        {/* ========================================================= */}
        <div className="relative z-20 px-4 py-1 flex items-center justify-center gap-6">
          {/* Host / Team Red */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30">
                <img 
                  src={room.hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop"} 
                  alt="Rank 1" 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 whitespace-nowrap">
                👑 1st Host
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-0.5 bg-black/80 px-1.5 py-0.5 rounded-full border border-amber-500/50">
                <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-bounce" />
                <span className="w-0.5 h-3 bg-yellow-300 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
            <span className="text-xs font-bold text-amber-200 mt-2">@{room.hostUsername}</span>
            <span className="text-[10px] text-amber-400 font-extrabold">💎 2.5K</span>
          </div>

          {/* VS PK Badge */}
          <div className="flex flex-col items-center justify-center">
            <div 
              onClick={handleStartPkBattle}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/60 border border-yellow-300/40 cursor-pointer active:scale-95 transition-transform"
            >
              <Swords className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-black text-rose-400 tracking-wider mt-1">
              {pkBattle?.isActive ? `00:${pkBattle.timeLeft.toString().padStart(2, '0')}` : 'VS'}
            </span>
          </div>

          {/* Challenger / Team Blue */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-b from-rose-500 via-purple-600 to-amber-600 shadow-lg shadow-rose-500/30">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" 
                  alt="Rank 2" 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-zinc-300 to-zinc-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 whitespace-nowrap">
                ⚔️ 2nd King
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-0.5 bg-black/80 px-1.5 py-0.5 rounded-full border border-rose-500/50">
                <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce" />
                <span className="w-0.5 h-3 bg-rose-300 rounded-full animate-bounce [animation-delay:200ms]" />
              </div>
            </div>
            <span className="text-xs font-bold text-zinc-200 mt-2">King Jr</span>
            <span className="text-[10px] text-rose-400 font-extrabold">💎 1.8K</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 8-SEATER MIC STAGE GRID (Poppo / Yalla Live Style)         */}
        {/* ========================================================= */}
        <div className="relative z-20 flex-1 px-5 py-2 flex flex-col justify-center">
          <div className="grid grid-cols-4 gap-y-3 gap-x-2 max-w-sm mx-auto w-full">
            {slots.map((seat, index) => {
              const seatNum = index + 1;
              const isOccupied = Boolean(seat);
              const isLocalUser = seat?.uid === currentUser?.uid;
              const isLocked = index === 3 || index === 7;

              return (
                <div key={index} className="flex flex-col items-center">
                  <div className="relative w-12 h-12">
                    {isOccupied && seat ? (
                      <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-yellow-500 shadow-md">
                        <img 
                          src={seat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(seat.username)}`} 
                          alt={seat.username} 
                          className="w-full h-full rounded-full object-cover"
                        />
                        {seat.isSpeaking && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
                            <Mic className="w-2.5 h-2.5 text-black" />
                          </span>
                        )}
                      </div>
                    ) : isLocked ? (
                      <div className="w-12 h-12 rounded-full bg-zinc-950/70 border border-zinc-800 flex items-center justify-center text-zinc-600">
                        <Lock className="w-4 h-4 text-zinc-500" />
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleTakeSeat(index)}
                        className="w-12 h-12 rounded-full bg-zinc-900/60 border border-dashed border-amber-500/40 flex items-center justify-center text-amber-400 hover:border-amber-400 active:scale-95 transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Seat Number Tag */}
                    <span className="absolute -bottom-1 inset-x-0 mx-auto w-fit text-[8px] font-black text-amber-300 bg-black/80 px-1 rounded-full border border-amber-500/30">
                      {seatNum}
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-400 font-medium mt-1.5 truncate max-w-[55px]">
                    {isOccupied && seat ? seat.username : `Seat ${seatNum}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* FLOATING LIVE CHAT                                        */}
        {/* ========================================================= */}
        <div className="relative z-20 px-4 py-1 h-32 flex flex-col justify-end pointer-events-none">
          <div className="overflow-y-auto space-y-1.5 max-h-32 no-scrollbar pointer-events-auto">
            {/* Announcement Banner */}
            <div className="bg-amber-950/40 border border-amber-500/30 backdrop-blur-md rounded-xl p-2 text-[11px] text-amber-200 shadow-sm max-w-[85%]">
              <span className="font-black text-amber-400 block uppercase tracking-wider text-[9px] mb-0.5">
                📢 Announcement
              </span>
              The owner entered the room. Send gifts to level up!
            </div>

            {/* Chat Messages */}
            {messages.map((m) => (
              <div 
                key={m.id}
                className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-white max-w-[85%] w-fit shadow-md flex items-center gap-1.5"
              >
                <span className="font-extrabold text-amber-400 text-[11px]">
                  @{m.username}:
                </span>
                <span className="text-zinc-200">{m.text}</span>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM ACTION BAR (MESSAGE INPUT + LUXURY GIFT BUTTON)    */}
        {/* ========================================================= */}
        <div className="relative z-20 px-3 py-2.5 bg-gradient-to-t from-black via-zinc-950 to-transparent flex items-center gap-2">
          {/* Reaction Tray Button */}
          <button 
            onClick={() => handleSendReaction('❤️')}
            className="w-9 h-9 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-rose-500 hover:scale-105 active:scale-95 transition-transform"
          >
            ❤️
          </button>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="flex-1 relative flex items-center">
            <input 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message here..."
              className="w-full bg-zinc-900/90 border border-amber-500/30 rounded-full pl-3.5 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-all shadow-inner"
            />
            <button type="submit" className="absolute right-2 text-amber-400 hover:text-amber-300">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Mic Toggle Button */}
          {isSpeaker ? (
            <button 
              onClick={handleToggleMediaTrack}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                isMuted 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          ) : (
            <button 
              onClick={toggleHandRaise}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                hasRaisedHand 
                  ? 'bg-amber-500 border-amber-400 text-black' 
                  : 'bg-zinc-900/90 border-white/10 text-zinc-300'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>
          )}

          {/* 🌟 3D GLOWING GIFT BUTTON */}
          <button 
            onClick={() => setShowGiftModal(true)}
            className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-[1.5px] shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          >
            <div className="w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* FLYING GIFT ANIMATION OVERLAY                             */}
        {/* ========================================================= */}
        {flyingGift && (
          <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center animate-bounce">
            <div className="text-8xl drop-shadow-[0_10px_30px_rgba(255,215,0,0.8)] filter">
              {flyingGift}
            </div>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-black/80 border border-amber-400 text-amber-300 text-xs font-black tracking-widest uppercase shadow-2xl">
              ✨ LUXURY GIFT SENT! ✨
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* BOTTOM GIFT VAULT MODAL                                   */}
        {/* ========================================================= */}
        {showGiftModal && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-fadeIn">
            <div 
              className="w-full max-w-[430px] mx-auto bg-gradient-to-b from-zinc-900 to-black border-t-2 border-amber-500/50 rounded-t-3xl p-4 shadow-2xl flex flex-col max-h-[60vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">Gift Vault</span>
                </div>
                <button 
                  onClick={() => setShowGiftModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Gift Categories */}
              <div className="flex items-center gap-4 py-2 border-b border-zinc-800/80 text-xs font-bold text-zinc-400">
                {(['Hot', 'Classic', '3D', 'VIP'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedGiftTab(tab)}
                    className={`pb-1 transition-all ${
                      selectedGiftTab === tab 
                        ? 'text-amber-400 border-b-2 border-amber-400 font-black' 
                        : 'hover:text-zinc-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Gift Items Grid */}
              <div className="grid grid-cols-4 gap-2.5 py-3 overflow-y-auto max-h-52 no-scrollbar">
                {LUXURY_GIFTS.filter(g => selectedGiftTab === 'Hot' || g.category === selectedGiftTab).map((gift) => {
                  const isSelected = selectedGift.id === gift.id;
                  return (
                    <button
                      key={gift.id}
                      onClick={() => setSelectedGift(gift)}
                      className={`p-2 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-2xl mb-1">{gift.icon}</span>
                      <span className="text-[10px] font-bold text-white truncate w-full text-center">{gift.name}</span>
                      <span className="text-[9px] text-amber-400 font-extrabold flex items-center gap-0.5 mt-0.5">
                        🪙 {gift.coins}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Balance & Send */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full border border-amber-500/30">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-black text-amber-300">{userCoins}</span>
                  <button className="text-[10px] font-bold text-yellow-400 underline ml-1">
                    Top Up
                  </button>
                </div>

                <button
                  onClick={handleSendGift}
                  className="px-6 py-2 rounded-full font-black text-xs uppercase tracking-wider text-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all"
                >
                  Send Gift
                </button>
              </div>
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
              <h3 className="text-sm font-bold text-white mb-1">End Voice Room?</h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Are you sure you want to end this room? All participants will be disconnected.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteRoomModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
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
                  End Room
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
