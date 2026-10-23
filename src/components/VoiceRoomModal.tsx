import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Hand, Users, Share2, 
  ChevronDown, Send, Swords, 
  Coins, UserPlus, Trash2, Gift, Lock, Palette, Check
} from 'lucide-react';
import { AppUser, VoiceRoom, RoomParticipant, RoomMessage, PKBattle } from '../types';
import { isGlobalAdmin } from '../utils/admin';
import { 
  createMicAnalyser, 
  MicAnalyserHandle, 
  playChimeSound, 
  playPopSound, 
  playClapSound, 
  playMicToggleSound, 
  playVictorySound
} from '../utils/audioVibeEngine';
import {
  setActiveVoiceRoomStream,
  setLocalMediaTrackMuted,
  stopActiveVoiceRoomStream,
  subscribeToMediaTrackChanges,
} from '../utils/voiceRoomMedia';
import { db, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp 
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
  { id: 'heart', name: 'Lit Heart', icon: '💖', coins: 1, category: 'Hot' },
  { id: 'rose', name: 'Rose', icon: '🌹', coins: 5, category: 'Hot' },
  { id: 'star', name: 'Star', icon: '⭐', coins: 25, category: 'Hot' },
  { id: 'kiss', name: 'Kiss', icon: '💋', coins: 120, category: 'Hot' },
  { id: 'ring', name: 'Love Ring', icon: '💍', coins: 1100, category: '3D' },
  { id: 'cocktail', name: 'Zoma Chat', icon: '🍹', coins: 2500, category: 'Classic' },
  { id: 'dog', name: 'Dog Singing', icon: '🐶', coins: 2500, category: 'Classic' },
  { id: 'piggy', name: 'Piggy', icon: '🐷', coins: 750, category: 'Hot' },
  { id: 'supercar', name: 'Cyber Car', icon: '🏎️', coins: 15000, category: '3D' },
  { id: 'crown', name: 'Golden Crown', icon: '👑', coins: 20000, category: 'VIP' },
];

const LUXURY_THEMES = [
  {
    id: 'supercar',
    name: 'Cyber Supercar',
    // Realistic Red & Gold glowing front hypercar
    image: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1000&q=80',
    cost: 15000
  },
  {
    id: 'crescent_palace',
    name: 'Crescent Palace',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
    cost: 15000
  },
  {
    id: 'golden_phoenix',
    name: 'Golden Phoenix',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1000&q=80',
    cost: 15000
  }
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
  const [isSpeakingLocally, setIsSpeakingLocally] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  const [currentTheme, setCurrentTheme] = useState(LUXURY_THEMES[0]);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedGiftTab, setSelectedGiftTab] = useState<'Hot' | 'Classic' | '3D' | 'VIP'>('Hot');
  const [selectedGift, setSelectedGift] = useState<GiftItem>(LUXURY_GIFTS[0]);
  const [userCoins, setUserCoins] = useState(2510);
  const [flyingGift, setFlyingGift] = useState<string | null>(null);

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

  const [showAudienceSheet, setShowAudienceSheet] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const micHandleRef = useRef<MicAnalyserHandle | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isSpeaker = isHost || room.speakers.some((s) => s.uid === currentUser?.uid);

  const bottomSlots: (RoomParticipant | null)[] = Array.from({ length: 8 }, (_, i) => {
    const otherSpeakers = room.speakers.filter((s) => s.uid !== room.hostUid);
    return otherSpeakers[i + 1] || null;
  });

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
      (err) => console.debug('Voice room messages listener error:', err)
    );

    return () => unsubscribe();
  }, [room?.id]);

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
    const unsubscribe = subscribeToMediaTrackChanges((muted) => setIsMuted(muted));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
    }
    if (micHandleRef.current) micHandleRef.current.setMuted(isMuted);
  }, [isMuted, localStream]);

  useEffect(() => {
    if (!pkBattle?.isActive) return;
    const timer = setInterval(() => {
      setPkBattle((prev) => {
        if (!prev || !prev.isActive) return null;
        if (prev.timeLeft <= 1) {
          playVictorySound();
          return { ...prev, timeLeft: 0, isActive: false };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pkBattle?.isActive]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleMediaTrack = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    playMicToggleSound(!nextState);
    setLocalMediaTrackMuted(nextState);

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
  };

  const handleSendReaction = (emoji: string) => {
    playPopSound();
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
    if (!currentUser) return onRequireLogin();
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
      seatNumber: slotIdx + 3,
    };

    onUpdateRoom({
      ...room,
      speakers: [...room.speakers, newSpeaker],
      listeners: room.listeners.filter((l) => l.uid !== currentUser.uid),
    });
  };

  const handleSendGift = () => {
    if (userCoins < selectedGift.coins) {
      alert('Not enough coins! Please Top Up.');
      return;
    }
    playChimeSound();
    setUserCoins((prev) => prev - selectedGift.coins);
    setFlyingGift(selectedGift.icon);
    setTimeout(() => setFlyingGift(null), 2500);
    setShowGiftModal(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    if (!currentUser) return onRequireLogin();

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
        console.error('Failed to post message:', err);
      }
    }
  };

  const handleShareRoom = () => {
    navigator.clipboard?.writeText(window.location.href);
    playPopSound();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none">
      
      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.xPercent}%`, top: `${r.yPercent}%` }}
            className="absolute text-4xl animate-bounce"
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Main Screen Container */}
      <div className="w-full h-full max-w-[430px] relative flex flex-col bg-zinc-950 sm:rounded-[40px] sm:h-[95vh] sm:border border-amber-500/40 shadow-[0_0_100px_rgba(245,158,11,0.25)] overflow-hidden">
        
        {/* ========================================================= */}
        {/* 🔥 REALISTIC SUPERCAR & GOLDEN STAGE SUNBURST BACKGROUND   */}
        {/* ========================================================= */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Top Golden Sunburst / Light Beams */}
          <div className="absolute -top-10 inset-x-0 h-[420px] bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-amber-600/30 via-yellow-400/40 to-amber-600/30 blur-xl opacity-80 z-10" />

          {/* Hypercar Visual */}
          <div className="absolute inset-0 z-0 flex items-center justify-center">
            <img 
              src={currentTheme.image} 
              alt={currentTheme.name} 
              className="w-full h-full object-cover object-bottom brightness-90 contrast-125 scale-110"
            />
          </div>

          {/* Luxury Atmosphere Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black z-10" />
          <div className="absolute bottom-28 inset-x-0 h-96 bg-gradient-to-t from-black via-black/90 to-transparent z-10" />
        </div>

        {/* ========================================================= */}
        {/* 1. TOP HEADER BAR                                         */}
        {/* ========================================================= */}
        <div className="pt-3 px-3.5 pb-1 flex items-center justify-between z-30">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-amber-400/40 rounded-full py-1 pl-1 pr-3 shadow-lg">
            <div className="relative w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-yellow-300 to-amber-600">
              <img 
                src={room.hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"} 
                alt="host" 
                className="w-full h-full rounded-full object-cover" 
              />
              <span className="absolute -top-1 -right-1 text-[9px]">👑</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-amber-200 leading-tight truncate max-w-[85px]">
                {room.title || 'Zoma Team'}
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                💎 {userCoins}
              </span>
            </div>
            <button 
              onClick={() => setShowGiftModal(true)}
              className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black text-xs ml-1 shadow-sm"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme Store Button */}
            <button 
              onClick={() => setShowThemeModal(true)}
              className="w-7 h-7 bg-black/60 border border-amber-400/40 rounded-full text-amber-300 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
              title="Theme Store"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            <button 
              onClick={() => setShowAudienceSheet(!showAudienceSheet)}
              className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full border border-white/15 text-[10px] font-bold text-amber-300"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{room.listeners.length + room.speakers.length}</span>
            </button>

            <button
              onClick={onMinimize}
              className="w-7 h-7 bg-black/60 border border-white/15 rounded-full text-white flex items-center justify-center"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleShareRoom}
              className="w-7 h-7 bg-black/60 border border-white/15 rounded-full text-white flex items-center justify-center"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {canDeleteRoom && (
              <button
                onClick={() => setShowDeleteRoomModal(true)}
                className="w-7 h-7 bg-rose-500/20 border border-rose-500/40 rounded-full text-rose-400 flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. TOP PK PODIUM (Host Crown & Challenger Crest)          */}
        {/* ========================================================= */}
        <div className="relative z-20 px-4 pt-1 pb-1 flex items-center justify-center gap-8">
          {/* Seat 1: Host */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-[68px] h-[68px] rounded-full p-1 bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 shadow-[0_0_25px_rgba(245,158,11,0.7)]">
                <img 
                  src={room.hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop"} 
                  alt="Rank 1" 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>

              {/* Gold Crown Banner */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-lg border border-yellow-200 whitespace-nowrap">
                👑 1 Host
              </div>

              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-0.5 bg-black/90 px-2 py-0.5 rounded-full border border-amber-400/60 shadow-md">
                <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-bounce" />
                <span className="w-0.5 h-3 bg-yellow-300 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
            <span className="text-xs font-bold text-amber-200 mt-1.5">@{room.hostUsername}</span>
            <span className="text-[11px] text-amber-400 font-extrabold">💎 2.5K</span>
          </div>

          {/* PK Swords Badge */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-rose-600 flex items-center justify-center shadow-[0_0_18px_rgba(244,63,94,0.7)] border border-yellow-300/60">
              <Swords className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-black text-rose-400 tracking-wider mt-1 bg-black/60 px-2 py-0.5 rounded-full border border-rose-500/30">
              {pkBattle?.isActive ? `00:${pkBattle.timeLeft.toString().padStart(2, '0')}` : 'VS'}
            </span>
          </div>

          {/* Seat 2: Challenger */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-[68px] h-[68px] rounded-full p-1 bg-gradient-to-b from-rose-500 via-purple-600 to-amber-600 shadow-[0_0_25px_rgba(244,63,94,0.7)]">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" 
                  alt="Rank 2" 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>

              {/* Phoenix Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 via-rose-400 to-amber-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-lg border border-rose-300 whitespace-nowrap">
                🦅 2 King Jr
              </div>

              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-0.5 bg-black/90 px-2 py-0.5 rounded-full border border-rose-500/60 shadow-md">
                <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce" />
                <span className="w-0.5 h-3 bg-rose-300 rounded-full animate-bounce [animation-delay:200ms]" />
              </div>
            </div>
            <span className="text-xs font-bold text-zinc-200 mt-1.5">King Jr</span>
            <span className="text-[11px] text-rose-400 font-extrabold">💎 1.8K</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. 8 MIC SEATS (Translucent Glassmorphic Circles - Exact Match) */}
        {/* ========================================================= */}
        <div className="relative z-20 flex-1 px-4 py-2 flex flex-col justify-center">
          <div className="grid grid-cols-4 gap-y-4 gap-x-2.5 max-w-sm mx-auto w-full">
            {bottomSlots.map((seat, index) => {
              const seatNum = index + 3; // Seats 3 to 10
              const isOccupied = Boolean(seat);
              const isLocked = seatNum === 4 || seatNum === 6 || seatNum === 10;

              return (
                <div key={seatNum} className="flex flex-col items-center">
                  <div className="relative w-14 h-14">
                    {isOccupied && seat ? (
                      <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <img 
                          src={seat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(seat.username)}`} 
                          alt={seat.username} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    ) : isLocked ? (
                      /* Solid Glassmorphic Locked Button */
                      <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/50 shadow-lg">
                        <Lock className="w-5 h-5 text-white/60" />
                      </div>
                    ) : (
                      /* Solid Glassmorphic Add User (+) Button (Like in reference) */
                      <button 
                        onClick={() => handleTakeSeat(index)}
                        className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:border-amber-400/80 hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-amber-300 hover:scale-105 active:scale-95 transition-all shadow-lg group"
                      >
                        <span className="text-xl font-light group-hover:scale-110 transition-transform">+</span>
                      </button>
                    )}
                    
                    {/* Glowing Seat Tag */}
                    <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-fit text-[9px] font-black text-amber-200 bg-black/90 px-1.5 py-0.2 rounded-full border border-amber-400/50 shadow-md">
                      {seatNum}
                    </span>
                  </div>

                  <span className="text-[11px] text-zinc-300 font-semibold mt-2 truncate max-w-[62px]">
                    {isOccupied && seat ? seat.username : `Seat ${seatNum}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. ANNOUNCEMENT & FLOATING CHAT                           */}
        {/* ========================================================= */}
        <div className="relative z-20 px-3.5 py-1 h-36 flex flex-col justify-end pointer-events-none">
          <div className="overflow-y-auto space-y-1.5 max-h-36 pointer-events-auto">
            {/* Announcement Banner */}
            <div className="bg-amber-950/70 border border-amber-500/40 backdrop-blur-md rounded-2xl p-2.5 text-[11px] text-amber-200 shadow-lg max-w-[90%]">
              <span className="font-black text-amber-400 block uppercase tracking-wider text-[9px] mb-0.5">
                📢 Announcement :
              </span>
              The owner @raihan entered the room. Send gifts to level up!
            </div>

            {/* Chat Bubbles */}
            {messages.map((m) => (
              <div 
                key={m.id}
                className="bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-1.5 text-xs text-white max-w-[85%] w-fit shadow-md flex items-center gap-1.5"
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
        {/* 5. BOTTOM CONTROL BAR                                     */}
        {/* ========================================================= */}
        <div className="relative z-20 px-3 py-3 bg-gradient-to-t from-black via-zinc-950 to-transparent flex items-center gap-2">
          <button 
            onClick={() => handleSendReaction('❤️')}
            className="w-10 h-10 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-rose-500 hover:scale-105 active:scale-95 transition-transform"
          >
            ❤️
          </button>

          <form onSubmit={handleSendMessage} className="flex-1 relative flex items-center">
            <input 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message here..."
              className="w-full bg-zinc-900/90 border border-amber-500/40 rounded-full pl-4 pr-9 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-all shadow-inner"
            />
            <button type="submit" className="absolute right-3 text-amber-400 hover:text-amber-300">
              <Send className="w-4 h-4" />
            </button>
          </form>

          {isSpeaker ? (
            <button 
              onClick={handleToggleMediaTrack}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
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
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                hasRaisedHand 
                  ? 'bg-amber-500 border-amber-400 text-black' 
                  : 'bg-zinc-900/90 border-white/10 text-zinc-300'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>
          )}

          {/* 🌟 3D Gifting Button */}
          <button 
            onClick={() => setShowGiftModal(true)}
            className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-[2px] shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          >
            <div className="w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 6. FLYING GIFT ANIMATION OVERLAY                          */}
        {/* ========================================================= */}
        {flyingGift && (
          <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center animate-bounce">
            <div className="text-8xl drop-shadow-[0_10px_30px_rgba(255,215,0,0.8)] filter">
              {flyingGift}
            </div>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-black/85 border border-amber-400 text-amber-300 text-xs font-black tracking-widest uppercase shadow-2xl">
              ✨ LUXURY GIFT SENT! ✨
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. GIFT COIN DRAWER MODAL                                 */}
        {/* ========================================================= */}
        {showGiftModal && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-fadeIn">
            <div 
              className="w-full max-w-[430px] mx-auto bg-gradient-to-b from-purple-950/90 via-zinc-950 to-black border-t-2 border-purple-500/50 rounded-t-3xl p-4 shadow-2xl flex flex-col max-h-[62vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-black text-xs font-bold">
                    👑
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">Gift Coin</span>
                </div>
                <button 
                  onClick={() => setShowGiftModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-5 py-2.5 border-b border-zinc-800/80 text-xs font-bold text-zinc-400">
                {(['Hot', 'Classic', '3D', 'VIP'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedGiftTab(tab)}
                    className={`pb-1 transition-all ${
                      selectedGiftTab === tab 
                        ? 'text-purple-400 border-b-2 border-purple-400 font-black' 
                        : 'hover:text-zinc-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2.5 py-3 overflow-y-auto max-h-52">
                {LUXURY_GIFTS.filter(g => selectedGiftTab === 'Hot' || g.category === selectedGiftTab).map((gift) => {
                  const isSelected = selectedGift.id === gift.id;
                  return (
                    <button
                      key={gift.id}
                      onClick={() => setSelectedGift(gift)}
                      className={`p-2.5 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-400 shadow-md shadow-purple-500/30 scale-105'
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

              <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full border border-amber-500/30">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-black text-amber-300">{userCoins}</span>
                  </div>
                  <button className="text-xs font-bold text-purple-400 underline">
                    Top Up
                  </button>
                </div>

                <button
                  onClick={handleSendGift}
                  className="px-6 py-2 rounded-full font-black text-xs uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500 shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-95 transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. THEME STORE MODAL                                      */}
        {/* ========================================================= */}
        {showThemeModal && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-fadeIn">
            <div 
              className="w-full max-w-[430px] mx-auto bg-gradient-to-b from-zinc-900 to-black border-t-2 border-amber-500/50 rounded-t-3xl p-4 shadow-2xl flex flex-col max-h-[75vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Select your theme</h3>
                <button 
                  onClick={() => setShowThemeModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 py-4 overflow-y-auto max-h-72">
                {LUXURY_THEMES.map((theme) => {
                  const isSelected = currentTheme.id === theme.id;
                  return (
                    <div 
                      key={theme.id}
                      onClick={() => setCurrentTheme(theme)}
                      className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105' : 'border-zinc-800 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={theme.image} alt={theme.name} className="w-full h-28 object-cover" />
                      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/80 backdrop-blur-sm flex items-center justify-between">
                        <span className="text-[9px] font-bold text-amber-300">🪙 {theme.cost}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setShowThemeModal(false)}
                  className="w-full py-3 rounded-full font-black text-xs uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500 shadow-xl shadow-purple-600/30 hover:brightness-110 active:scale-95 transition-all"
                >
                  Save Theme
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Room Modal */}
        {showDeleteRoomModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
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
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteRoomModal(false);
                    if (onDeleteRoom) onDeleteRoom(room.id);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg"
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
