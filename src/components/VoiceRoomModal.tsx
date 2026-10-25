import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Hand, 
  Users, 
  Share2, 
  ChevronDown, 
  Send, 
  Coins, 
  Trash2, 
  Gift, 
  Lock, 
  Unlock,
  Palette, 
  Check, 
  Crown, 
  ShieldCheck, 
  Shield, 
  UserMinus, 
  Volume2, 
  VolumeX, 
  Youtube, 
  Radio, 
  Sparkles, 
  MoreVertical,
  LogOut,
  Bell,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  AppUser, 
  VoiceRoom, 
  RoomParticipant, 
  RoomMessage, 
  RoomRole, 
  SpeakingRequest,
  RoomYouTubeState
} from '../types';
import { isGlobalAdmin, isVerifiedUser } from '../utils/admin';
import { 
  playChimeSound, 
  playPopSound, 
  playClapSound, 
  playMicToggleSound, 
  playVictorySound
} from '../utils/audioVibeEngine';
import { db, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { YouTubeWatchTogether } from './YouTubeWatchTogether';
import LudoGame from './games/LudoGame';

// LiveKit Components & Styles import
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';

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

// LiveKit-ൽ മൈക്ക് കൺട്രോൾ ചെയ്യാനുള്ള കോമ്പോണന്റ്
const LiveKitMicController = ({ isSpeaker, isMuted }: { isSpeaker: boolean, isMuted: boolean }) => {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(isSpeaker && !isMuted).catch((err) => {
        console.log('LiveKit Mic Error:', err);
      });
    }
  }, [localParticipant, isSpeaker, isMuted]);

  return null;
};

export const VoiceRoomModal: React.FC<VoiceRoomModalProps> = ({
  room: initialRoom,
  currentUser,
  isOpen,
  onMinimize,
  onLeaveRoom,
  onUpdateRoom,
  onDeleteRoom,
  onRequireLogin,
}) => {
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom>(initialRoom);
  const roomId = currentRoom.id;

  // Real-time roles calculation
  const isSuperAdmin = isGlobalAdmin(currentUser);
  const isOwner = currentRoom.hostUid === currentUser?.uid || (currentUser && currentRoom.hostUsername === currentUser.username);
  const isCoAdmin = Boolean(currentRoom.coAdmins?.includes(currentUser?.uid || ''));
  const userRole: RoomRole = isSuperAdmin ? 'super_admin' : isOwner ? 'owner' : isCoAdmin ? 'co_admin' : 'visitor';
  const canModerate = isSuperAdmin || isOwner || isCoAdmin;
  const canDeleteRoom = isSuperAdmin || isOwner;

  // Real Mic seats configuration
  const lockedSeats = currentRoom.seats?.filter(s => s.isLocked).map(s => s.seatNumber) || [];

  // Active user speaking status on seat
  const mySpeakerRecord = currentRoom.speakers.find((s) => s.uid === currentUser?.uid);
  const isSpeaker = Boolean(mySpeakerRecord);
  const [isMuted, setIsMuted] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [isSpeakingLocally, setIsSpeakingLocally] = useState(false);

  // -------------------------------------------------------------
  // LIVEKIT TOKEN & CONNECTION STATES (എല്ലാ യൂസർമാർക്കും ടോക്കൺ എടുക്കും)
  // -------------------------------------------------------------
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL;

  useEffect(() => {
    if (isOpen && currentUser && roomId) {
      fetch('/api/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomId,
          username: currentUser.username || currentUser.displayName || 'Guest',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.token) {
            setLiveKitToken(data.token);
          } else {
            console.error('Failed to get LiveKit token:', data.error);
          }
        })
        .catch((err) => console.error('Error fetching LiveKit token:', err));
    }
  }, [isOpen, currentUser, roomId]);

  // UI sheets and modals
  const [showAudienceSheet, setShowAudienceSheet] = useState(false);
  const [showRequestsSheet, setShowRequestsSheet] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [selectedSeatAction, setSelectedSeatAction] = useState<{ seatNum: number; occupant: RoomParticipant | null } | null>(null);

  // YouTube Watch Together & Ludo state
  const [showYouTube, setShowYouTube] = useState<boolean>(Boolean(currentRoom.youtubeState?.videoId));
  const [isYouTubeMinimized, setIsYouTubeMinimized] = useState<boolean>(false);
  const [showLudo, setShowLudo] = useState<boolean>(false);

  // Chat & Gifts
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [currentTheme, setCurrentTheme] = useState(LUXURY_THEMES[0]);
  const [selectedGiftTab, setSelectedGiftTab] = useState<'Hot' | 'Classic' | '3D' | 'VIP'>('Hot');
  const [selectedGift, setSelectedGift] = useState<GiftItem>(LUXURY_GIFTS[0]);
  const [userCoins, setUserCoins] = useState(2500);
  const [flyingGift, setFlyingGift] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 1. Sync Live Voice Room Document from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !roomId) return;

    const roomDocRef = doc(db, 'voice_rooms', roomId);
    const unsubscribe = onSnapshot(roomDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as VoiceRoom;
        setCurrentRoom((prev) => ({
          ...prev,
          ...data,
          speakers: Array.isArray(data.speakers) ? data.speakers : prev.speakers,
          listeners: Array.isArray(data.listeners) ? data.listeners : prev.listeners,
          speakingRequests: Array.isArray(data.speakingRequests) ? data.speakingRequests : [],
          coAdmins: Array.isArray(data.coAdmins) ? data.coAdmins : prev.coAdmins,
          youtubeState: data.youtubeState || prev.youtubeState,
        }));
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  // 2. Sync Chat Messages from Firestore Subcollection
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !roomId) return;

    const msgsCol = collection(db, 'voice_rooms', roomId, 'messages');
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
  }, [roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentRoom.youtubeState?.videoId && !showYouTube && !showLudo) {
      setShowYouTube(true);
    }
  }, [currentRoom.youtubeState?.videoId, showLudo]);

  if (!isOpen) return null;

  const updateRoomState = async (updates: Partial<VoiceRoom>) => {
    const nextRoom = { ...currentRoom, ...updates };
    setCurrentRoom(nextRoom);
    onUpdateRoom(nextRoom);

    if (isFirebaseConfigured && db && roomId) {
      try {
        await updateDoc(doc(db, 'voice_rooms', roomId), updates);
      } catch (e) {
        console.warn('Failed to update voice room in Firestore:', e);
      }
    }
  };

  const handleToggleMediaTrack = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playMicToggleSound(!nextMuted);

    if (currentUser) {
      const updatedSpeakers = currentRoom.speakers.map((s) => 
        s.uid === currentUser.uid ? { ...s, isMuted: nextMuted } : s
      );
      updateRoomState({ speakers: updatedSpeakers });
    }
  };

  const toggleHandRaise = async () => {
    if (!currentUser) return onRequireLogin();
    if (isSpeaker) return;

    playChimeSound();
    const existingReq = currentRoom.speakingRequests?.some((r) => r.uid === currentUser.uid);

    if (existingReq) {
      const updated = (currentRoom.speakingRequests || []).filter((r) => r.uid !== currentUser.uid);
      setHasRaisedHand(false);
      updateRoomState({ speakingRequests: updated });
    } else {
      const newReq: SpeakingRequest = {
        uid: currentUser.uid,
        username: currentUser.username,
        displayName: currentUser.displayName || currentUser.username,
        avatar: currentUser.photoURL || '',
        requestedAt: Date.now(),
      };
      setHasRaisedHand(true);
      updateRoomState({ speakingRequests: [...(currentRoom.speakingRequests || []), newReq] });
    }
  };

  const handleApproveRequest = async (request: SpeakingRequest) => {
    if (!canModerate) return;
    playChimeSound();

    const occupiedSeats = currentRoom.speakers.map((s) => s.seatNumber || 1);
    let targetSeat = 2;
    for (let i = 2; i <= 10; i++) {
      if (!occupiedSeats.includes(i) && !lockedSeats.includes(i)) {
        targetSeat = i;
        break;
      }
    }

    const newSpeaker: RoomParticipant = {
      uid: request.uid,
      username: request.username,
      displayName: request.displayName,
      avatar: request.avatar,
      isSpeaker: true,
      isMuted: false,
      joinedAt: Date.now(),
      seatNumber: targetSeat,
    };

    const remainingRequests = (currentRoom.speakingRequests || []).filter((r) => r.uid !== request.uid);
    const updatedSpeakers = [...currentRoom.speakers.filter((s) => s.uid !== request.uid), newSpeaker];
    const updatedListeners = currentRoom.listeners.filter((l) => l.uid !== request.uid);

    updateRoomState({
      speakers: updatedSpeakers,
      listeners: updatedListeners,
      speakingRequests: remainingRequests,
    });
  };

  const handleDeclineRequest = (uid: string) => {
    if (!canModerate) return;
    const remainingRequests = (currentRoom.speakingRequests || []).filter((r) => r.uid !== uid);
    updateRoomState({ speakingRequests: remainingRequests });
  };

  const handleSeatClick = (seatNum: number) => {
    if (!currentUser) return onRequireLogin();

    const occupant = currentRoom.speakers.find((s) => s.seatNumber === seatNum) || null;
    const isLocked = lockedSeats.includes(seatNum);

    if (occupant) {
      setSelectedSeatAction({ seatNum, occupant });
      return;
    }

    if (canModerate) {
      setSelectedSeatAction({ seatNum, occupant: null });
    } else {
      if (isLocked) {
        alert('This seat is locked by the room host. Raise hand to request permission.');
        return;
      }
      if (isSpeaker) {
        const updatedSpeakers = currentRoom.speakers.map((s) =>
          s.uid === currentUser.uid ? { ...s, seatNumber: seatNum } : s
        );
        updateRoomState({ speakers: updatedSpeakers });
      } else {
        playChimeSound();
        const newSpeaker: RoomParticipant = {
          uid: currentUser.uid,
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatar: currentUser.photoURL,
          isSpeaker: true,
          isMuted: false,
          joinedAt: Date.now(),
          seatNumber: seatNum,
        };
        updateRoomState({
          speakers: [...currentRoom.speakers, newSpeaker],
          listeners: currentRoom.listeners.filter((l) => l.uid !== currentUser.uid),
        });
      }
    }
  };

  const handleToggleLockSeat = (seatNum: number) => {
    if (!canModerate) return;
    const isCurrentlyLocked = lockedSeats.includes(seatNum);
    const nextLocked = isCurrentlyLocked
      ? lockedSeats.filter((n) => n !== seatNum)
      : [...lockedSeats, seatNum];

    const updatedSeats = Array.from({ length: 10 }, (_, i) => {
      const num = i + 1;
      return {
        seatNumber: num,
        user: currentRoom.speakers.find((s) => s.seatNumber === num) || null,
        isLocked: nextLocked.includes(num),
      };
    });

    updateRoomState({ seats: updatedSeats });
    setSelectedSeatAction(null);
  };

  const handleRemoveFromSeat = (targetUid: string) => {
    if (!canModerate) return;
    const targetSpeaker = currentRoom.speakers.find((s) => s.uid === targetUid);
    if (!targetSpeaker) return;

    const updatedSpeakers = currentRoom.speakers.filter((s) => s.uid !== targetUid);
    const listenerRecord: RoomParticipant = {
      ...targetSpeaker,
      isSpeaker: false,
      seatNumber: undefined,
    };

    updateRoomState({
      speakers: updatedSpeakers,
      listeners: [...currentRoom.listeners.filter((l) => l.uid !== targetUid), listenerRecord],
    });
    setSelectedSeatAction(null);
  };

  const handleToggleCoAdmin = (targetUid: string) => {
    if (!isOwner && !isSuperAdmin) return;
    const currentCoAdmins = currentRoom.coAdmins || [];
    const isAlready = currentCoAdmins.includes(targetUid);
    const updated = isAlready 
      ? currentCoAdmins.filter((id) => id !== targetUid)
      : [...currentCoAdmins, targetUid];

    updateRoomState({ coAdmins: updated });
    setSelectedSeatAction(null);
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

    if (isFirebaseConfigured && db && roomId) {
      try {
        await addDoc(collection(db, 'voice_rooms', roomId, 'messages'), {
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

  const handleUpdateYouTube = (newYtState: RoomYouTubeState) => {
    updateRoomState({ youtubeState: newYtState });
  };

  const totalOnlineCount = currentRoom.speakers.length + currentRoom.listeners.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none">
      
      {/* ------------------------------------------------------------- */}
      {/* LIVEKIT AUDIO RENDERER & CONTROLLER */}
      {/* ------------------------------------------------------------- */}
      {liveKitToken && liveKitUrl && (
        <LiveKitRoom
          video={false}
          audio={false} // Controller വഴിയാണ് ഇനി മൈക്ക് കൺട്രോൾ ചെയ്യുന്നത് 
          token={liveKitToken}
          serverUrl={liveKitUrl}
          connect={true}
          style={{ display: 'none' }}
        >
          <RoomAudioRenderer />
          <LiveKitMicController isSpeaker={isSpeaker} isMuted={isMuted} />
        </LiveKitRoom>
      )}

      {/* Floating Reactions Layer */}
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

      {/* Main Social Room Frame */}
      <div className="w-full h-full max-w-[430px] relative flex flex-col bg-zinc-950 sm:rounded-[40px] sm:h-[95vh] sm:border border-amber-500/40 shadow-[0_0_100px_rgba(245,158,11,0.25)] overflow-hidden">
        
        {/* ROOM THEME BACKGROUND */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 inset-x-0 h-[460px] bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-amber-500/35 via-yellow-400/45 to-amber-500/35 blur-2xl opacity-90 z-10" />
          <div className="absolute inset-0 z-0 flex items-center justify-center">
            <img 
              src={currentTheme.image} 
              alt={currentTheme.name} 
              className="w-full h-full object-cover object-bottom brightness-95 contrast-125 scale-110"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-black z-10" />
          <div className="absolute bottom-28 inset-x-0 h-96 bg-gradient-to-t from-black via-black/90 to-transparent z-10" />
        </div>

        {/* 1. TOP HEADER BAR */}
        <div className="pt-3 px-3.5 pb-2 flex items-center justify-between z-30">
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md border border-amber-400/40 rounded-full py-1 pl-1 pr-3 shadow-lg">
            <div className="relative w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-yellow-300 to-amber-600">
              <img 
                src={currentRoom.hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"} 
                alt="host" 
                className="w-full h-full rounded-full object-cover" 
              />
              <span className="absolute -top-1 -right-1 text-[9px]">👑</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-amber-200 leading-tight truncate max-w-[95px]">
                {currentRoom.title}
              </span>
              <span className="text-[10px] text-zinc-400 truncate max-w-[95px]">
                @{currentRoom.hostUsername}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                setShowLudo(!showLudo);
                if (!showLudo) setShowYouTube(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shadow-md active:scale-95 cursor-pointer ${
                showLudo 
                  ? 'bg-blue-600/90 hover:bg-blue-500 text-white border-blue-500 shadow-blue-600/30 ring-1 ring-blue-400' 
                  : 'bg-black/60 border-amber-400/40 text-amber-300 hover:bg-black/80'
              }`}
              title="Play Ludo"
              type="button"
            >
              <span>🎲 Ludo</span>
            </button>

            <button 
              onClick={() => {
                setShowYouTube(!showYouTube);
                if (!showYouTube) {
                  setIsYouTubeMinimized(false);
                  setShowLudo(false);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shadow-md active:scale-95 cursor-pointer ${
                showYouTube 
                  ? 'bg-red-600/90 hover:bg-red-500 text-white border-red-500 shadow-red-600/30 ring-1 ring-red-400' 
                  : 'bg-black/60 border-amber-400/40 text-amber-300 hover:bg-black/80'
              }`}
              title="YouTube Watch Together"
              type="button"
            >
              <Youtube className="w-3.5 h-3.5 text-red-500 fill-current" />
              <span className="hidden xs:inline">Watch</span>
            </button>

            {canModerate && (currentRoom.speakingRequests?.length || 0) > 0 && (
              <button
                onClick={() => setShowRequestsSheet(true)}
                className="relative p-1.5 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center justify-center animate-pulse shadow-md"
                title="Speaking Requests"
                type="button"
              >
                <Hand className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {currentRoom.speakingRequests?.length}
                </span>
              </button>
            )}

            <button 
              onClick={() => setShowAudienceSheet(!showAudienceSheet)}
              className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full border border-white/15 text-[11px] font-bold text-amber-300 hover:bg-black/80 transition-colors"
              type="button"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{totalOnlineCount}</span>
            </button>

            <button 
              onClick={() => setShowThemeModal(true)}
              className="w-7 h-7 bg-black/60 border border-amber-400/40 rounded-full text-amber-300 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
              title="Theme Store"
              type="button"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onMinimize}
              className="w-7 h-7 bg-black/60 border border-white/15 rounded-full text-white flex items-center justify-center hover:bg-zinc-800 transition-colors"
              type="button"
              title="Minimize"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {canDeleteRoom ? (
              <button
                onClick={() => setShowDeleteRoomModal(true)}
                className="w-7 h-7 bg-rose-500/20 border border-rose-500/40 rounded-full text-rose-400 flex items-center justify-center hover:bg-rose-500/30 transition-colors"
                type="button"
                title="End Room"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onLeaveRoom}
                className="w-7 h-7 bg-zinc-800/80 border border-white/15 rounded-full text-zinc-300 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                type="button"
                title="Leave Room"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. YOUTUBE WATCH TOGETHER DOCKED PLAYER */}
        {showYouTube && (
          <div className="z-30 relative px-2.5 pb-1">
            <YouTubeWatchTogether
              roomId={roomId}
              currentUser={currentUser}
              userRole={userRole}
              youtubeState={currentRoom.youtubeState}
              onUpdateYouTubeState={handleUpdateYouTube}
              onClose={() => setShowYouTube(false)}
              isMinimized={isYouTubeMinimized}
              onToggleMinimize={() => setIsYouTubeMinimized(!isYouTubeMinimized)}
            />
          </div>
        )}

        {/* LUDO GAME BOARD */}
        {showLudo && (
          <div className="z-30 relative px-2.5 pb-2">
            <div className="bg-black/80 border border-blue-500/40 rounded-xl p-2 shadow-2xl">
               <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">🎲 Ludo Room</span>
                  <button onClick={() => setShowLudo(false)} className="text-zinc-400 hover:text-rose-400">
                    <X className="w-4 h-4" />
                  </button>
               </div>
               <LudoGame roomId={roomId} currentUser={currentUser} />
            </div>
          </div>
        )}

        {/* 3. 10 REAL MICROPHONE SEATS GRID */}
        <div className="relative z-20 flex-1 px-3 py-2 flex flex-col justify-center overflow-y-auto">
          <div className="flex items-center justify-center gap-6 mb-3">
            {/* SEAT 1: ROOM OWNER */}
            {(() => {
              const hostSpeaker = currentRoom.speakers.find((s) => s.isHost || s.seatNumber === 1 || s.uid === currentRoom.hostUid);
              const isHostSpeaking = (isOwner && isSpeakingLocally) || Boolean(hostSpeaker?.isSpeaking);

              return (
                <div 
                  onClick={() => handleSeatClick(1)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="relative">
                    <div className={`w-[68px] h-[68px] rounded-full p-1 bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 shadow-[0_0_25px_rgba(245,158,11,0.7)] transition-transform group-hover:scale-105 ${
                      isHostSpeaking ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-black' : ''
                    }`}>
                      <img 
                        src={currentRoom.hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop"} 
                        alt={currentRoom.hostDisplayName} 
                        className="w-full h-full rounded-full object-cover" 
                      />
                    </div>

                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-lg border border-yellow-200 whitespace-nowrap">
                      👑 1 Host
                    </div>

                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center bg-black/90 px-1.5 py-0.5 rounded-full border border-amber-400/60 shadow-md">
                      {hostSpeaker?.isMuted ? (
                        <MicOff className="w-2.5 h-2.5 text-rose-400" />
                      ) : (
                        <div className="flex items-end gap-0.5">
                          <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-bounce" />
                          <span className="w-0.5 h-3 bg-yellow-300 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-200 mt-1.5 truncate max-w-[80px]">
                    @{currentRoom.hostUsername}
                  </span>
                </div>
              );
            })()}

            {/* SEAT 2 */}
            {(() => {
              const seatNum = 2;
              const occupant = currentRoom.speakers.find((s) => s.seatNumber === seatNum && s.uid !== currentRoom.hostUid);
              const isLocked = lockedSeats.includes(seatNum);

              return (
                <div 
                  onClick={() => handleSeatClick(seatNum)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="relative">
                    {occupant ? (
                      <div className="w-[68px] h-[68px] rounded-full p-1 bg-gradient-to-b from-purple-500 via-rose-500 to-amber-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] transition-transform group-hover:scale-105">
                        <img 
                          src={occupant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(occupant.username)}`} 
                          alt={occupant.displayName} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      </div>
                    ) : isLocked ? (
                      <div className="w-[68px] h-[68px] rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/50 shadow-lg">
                        <Lock className="w-6 h-6 text-white/60" />
                      </div>
                    ) : (
                      <div className="w-[68px] h-[68px] rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:border-amber-400/80 hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-amber-300 hover:scale-105 active:scale-95 transition-all shadow-lg">
                        <span className="text-2xl font-light">+</span>
                      </div>
                    )}

                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg border border-purple-300 whitespace-nowrap">
                      ⭐ Seat 2
                    </div>

                    {occupant && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center bg-black/90 px-1.5 py-0.5 rounded-full border border-purple-400/60 shadow-md">
                        {occupant.isMuted ? (
                          <MicOff className="w-2.5 h-2.5 text-rose-400" />
                        ) : (
                          <Mic className="w-2.5 h-2.5 text-emerald-400" />
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-zinc-200 mt-1.5 truncate max-w-[80px]">
                    {occupant ? occupant.username : isLocked ? 'Locked' : 'Open Seat'}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Seats 3 to 10 */}
          <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 max-w-sm mx-auto w-full">
            {Array.from({ length: 8 }, (_, i) => {
              const seatNum = i + 3;
              const occupant = currentRoom.speakers.find((s) => s.seatNumber === seatNum && s.uid !== currentRoom.hostUid);
              const isLocked = lockedSeats.includes(seatNum);

              return (
                <div 
                  key={seatNum} 
                  onClick={() => handleSeatClick(seatNum)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="relative w-14 h-14">
                    {occupant ? (
                      <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] group-hover:scale-105 transition-transform">
                        <img 
                          src={occupant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(occupant.username)}`} 
                          alt={occupant.username} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    ) : isLocked ? (
                      <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/50 shadow-lg">
                        <Lock className="w-5 h-5 text-white/60" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:border-amber-400/80 hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-amber-300 hover:scale-105 active:scale-95 transition-all shadow-lg">
                        <span className="text-xl font-light">+</span>
                      </div>
                    )}
                    
                    <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-fit text-[9px] font-black text-amber-200 bg-black/90 px-1.5 py-0.2 rounded-full border border-amber-400/50 shadow-md">
                      {seatNum}
                    </span>

                    {occupant && (
                      <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-black/90 border border-white/20 flex items-center justify-center">
                        {occupant.isMuted ? (
                          <MicOff className="w-2.5 h-2.5 text-rose-400" />
                        ) : (
                          <Mic className="w-2.5 h-2.5 text-emerald-400" />
                        )}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-zinc-300 font-semibold mt-2 truncate max-w-[62px]">
                    {occupant ? occupant.username : isLocked ? 'Locked' : `Seat ${seatNum}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. ANNOUNCEMENT & CHAT */}
        <div className="relative z-20 px-3.5 py-1 h-36 flex flex-col justify-end pointer-events-none">
          <div className="overflow-y-auto space-y-1.5 max-h-36 pointer-events-auto">
            <div className="bg-amber-950/70 border border-amber-500/40 backdrop-blur-md rounded-2xl p-2 text-[11px] text-amber-200 shadow-lg max-w-[92%]">
              <span className="font-black text-amber-400 block uppercase tracking-wider text-[9px] mb-0.5">
                📢 Announcement :
              </span>
              <span>{currentRoom.announcement || `Welcome to ${currentRoom.title}! Respect each other and enjoy voice & videos.`}</span>
            </div>

            {messages.map((m) => (
              <div 
                key={m.id}
                className="bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-1.5 text-xs text-white max-w-[88%] w-fit shadow-md flex items-center gap-1.5"
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

        {/* 5. BOTTOM CONTROL BAR */}
        <div className="relative z-20 px-3 py-3 bg-gradient-to-t from-black via-zinc-950 to-transparent flex items-center gap-2">
          <button 
            onClick={() => handleSendReaction('❤️')}
            className="w-10 h-10 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-rose-500 hover:scale-105 active:scale-95 transition-transform"
            type="button"
          >
            ❤️
          </button>

          <form onSubmit={handleSendMessage} className="flex-1 relative flex items-center">
            <input 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message room..."
              className="w-full bg-zinc-900/90 border border-amber-500/40 rounded-full pl-4 pr-9 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-all shadow-inner"
            />
            <button type="submit" className="absolute right-3 text-amber-400 hover:text-amber-300">
              <Send className="w-4 h-4" />
            </button>
          </form>

          {isSpeaker ? (
            <button 
              onClick={handleToggleMediaTrack}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                isMuted 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 ring-2 ring-rose-500/40' 
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              }`}
              type="button"
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          ) : (
            <button 
              onClick={toggleHandRaise}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                hasRaisedHand 
                  ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50' 
                  : 'bg-zinc-900/90 border-white/10 text-zinc-300 hover:text-white'
              }`}
              type="button"
              title={hasRaisedHand ? 'Speaking request pending' : 'Request to speak'}
            >
              <Hand className="w-4 h-4" />
            </button>
          )}

          <button 
            onClick={() => setShowGiftModal(true)}
            className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-[2px] shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            type="button"
          >
            <div className="w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          </button>
        </div>

        {/* FLYING GIFT ANIMATION OVERLAY */}
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

        {/* SEAT MODERATION DIALOG MODAL */}
        {selectedSeatAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 max-w-xs w-full shadow-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-white">
                  Seat {selectedSeatAction.seatNum} Controls
                </span>
                <button 
                  onClick={() => setSelectedSeatAction(null)} 
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedSeatAction.occupant ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                    <img 
                      src={selectedSeatAction.occupant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSeatAction.occupant.username)}`} 
                      className="w-9 h-9 rounded-full object-cover" 
                      alt="" 
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{selectedSeatAction.occupant.displayName}</p>
                      <p className="text-[10px] text-zinc-400 truncate">@{selectedSeatAction.occupant.username}</p>
                    </div>
                  </div>

                  {canModerate && selectedSeatAction.occupant.uid !== currentRoom.hostUid && (
                    <button
                      onClick={() => handleRemoveFromSeat(selectedSeatAction.occupant!.uid)}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                      <span>Move to Audience</span>
                    </button>
                  )}

                  {isOwner && selectedSeatAction.occupant.uid !== currentRoom.hostUid && (
                    <button
                      onClick={() => handleToggleCoAdmin(selectedSeatAction.occupant!.uid)}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      <span>{currentRoom.coAdmins?.includes(selectedSeatAction.occupant!.uid) ? 'Revoke Co-Admin' : 'Appoint Co-Admin'}</span>
                    </button>
                  )}

                  {selectedSeatAction.occupant.uid === currentUser?.uid && (
                    <button
                      onClick={() => handleRemoveFromSeat(currentUser.uid)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Leave Seat</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">
                    Seat {selectedSeatAction.seatNum} is currently empty.
                  </p>
                  {canModerate && selectedSeatAction.seatNum > 1 && (
                    <button
                      onClick={() => handleToggleLockSeat(selectedSeatAction.seatNum)}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {lockedSeats.includes(selectedSeatAction.seatNum) ? (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-400" />
                          <span>Unlock Seat</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Lock Seat</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SPEAKING REQUESTS SHEET */}
        {showRequestsSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-[430px] mx-auto bg-zinc-900 border-t-2 border-amber-500/50 rounded-t-3xl p-4 shadow-2xl space-y-3 max-h-[60vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Hand className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Speaking Requests ({currentRoom.speakingRequests?.length || 0})</span>
                </div>
                <button onClick={() => setShowRequestsSheet(false)} className="p-1 text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1">
                {(!currentRoom.speakingRequests || currentRoom.speakingRequests.length === 0) ? (
                  <p className="text-xs text-zinc-500 text-center py-6 italic">No pending requests to speak.</p>
                ) : (
                  currentRoom.speakingRequests.map((req) => (
                    <div key={req.uid} className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={req.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{req.displayName}</p>
                          <p className="text-[10px] text-zinc-400 truncate">@{req.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-none">
                        <button
                          onClick={() => handleDeclineRequest(req.uid)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleApproveRequest(req)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* AUDIENCE SHEET */}
        {showAudienceSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-[430px] mx-auto bg-zinc-900 border-t-2 border-amber-500/50 rounded-t-3xl p-4 shadow-2xl space-y-3 max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Room Members ({totalOnlineCount})</span>
                </div>
                <button onClick={() => setShowAudienceSheet(false)} className="p-1 text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider pt-1">On Stage Speakers ({currentRoom.speakers.length})</p>
                {currentRoom.speakers.map((s) => (
                  <div key={s.uid} className="flex items-center justify-between p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.username)}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-white truncate">{s.displayName}</p>
                          {s.uid === currentRoom.hostUid ? (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded font-bold">Owner</span>
                          ) : currentRoom.coAdmins?.includes(s.uid) ? (
                            <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1 rounded font-bold">Co-Admin</span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">Seat {s.seatNumber || 1}</p>
                      </div>
                    </div>
                    {canModerate && s.uid !== currentRoom.hostUid && (
                      <button
                        onClick={() => handleRemoveFromSeat(s.uid)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400"
                        title="Remove from seat"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pt-2">Audience ({currentRoom.listeners.length})</p>
                {currentRoom.listeners.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-2 italic text-center">No other audience members right now.</p>
                ) : (
                  currentRoom.listeners.map((l) => (
                    <div key={l.uid} className="flex items-center justify-between p-2 bg-zinc-950 rounded-xl border border-zinc-800/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={l.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(l.username)}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-white truncate">{l.displayName}</p>
                            {currentRoom.coAdmins?.includes(l.uid) && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1 rounded font-bold">Co-Admin</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 truncate">@{l.username}</p>
                        </div>
                      </div>

                      {canModerate && (
                        <button
                          onClick={() => {
                            const emptySeats = [2,3,4,5,6,7,8,9,10].filter((n) => !currentRoom.speakers.some((s) => s.seatNumber === n) && !lockedSeats.includes(n));
                            if (emptySeats.length > 0) {
                              const newSpeaker: RoomParticipant = {
                                ...l,
                                isSpeaker: true,
                                seatNumber: emptySeats[0],
                              };
                              updateRoomState({
                                speakers: [...currentRoom.speakers, newSpeaker],
                                listeners: currentRoom.listeners.filter((x) => x.uid !== l.uid),
                              });
                            } else {
                              alert('No open mic seats available.');
                            }
                          }}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-semibold text-amber-300"
                        >
                          Invite to Mic
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* GIFT DRAWER MODAL */}
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

        {/* THEME STORE MODAL */}
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
                    if (onDeleteRoom) onDeleteRoom(roomId);
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
