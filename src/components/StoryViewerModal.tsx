import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Heart, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Share2, 
  AtSign, 
  Film, 
  Check, 
  Copy, 
  MessageCircle,
  Radio,
  Mic,
  Users,
  Sparkles
} from 'lucide-react';
import { Story, AppUser } from '../types';
import { isGlobalAdmin, isVerifiedUser } from '../utils/admin';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  currentUser: AppUser | null;
  onClose: () => void;
  onStorySeen?: (storyId: string) => void;
  onDeleteStory?: (storyId: string) => void;
  onOpenDirectChat?: (username: string) => void;
  onOpenChatroom?: (targetUsername?: string) => void;
}

interface FloatingReaction {
  id: number;
  emoji: string;
  left: number; // percentage
  bottom: number; // percentage
  rotation: number;
  scale: number;
  duration: number; // seconds
}

const HOLD_REACTION_EMOJIS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '💯', label: '100' },
  { emoji: '🚀', label: 'Rocket' },
];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  currentUser,
  onClose,
  onStorySeen,
  onDeleteStory,
  onOpenDirectChat,
  onOpenChatroom,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showChatroomSheet, setShowChatroomSheet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Floating emoji animations state
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const reactionIdRef = useRef(0);

  // Hold-down on Screen Quick Reaction states
  const [isHoldingScreen, setIsHoldingScreen] = useState(false);
  const [holdSelectedEmoji, setHoldSelectedEmoji] = useState('🔥');
  const [holdTouchPos, setHoldTouchPos] = useState<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef<any>(null);
  const holdStreamIntervalRef = useRef<any>(null);
  const pointerStartRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const didTriggerHoldRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeStory = stories[currentIndex];
  const activeStoryId = activeStory?.id;

  // Circular progress calculations (Radius = 19, Circumference ≈ 119.38)
  const CIRCLE_RADIUS = 19;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // 119.38
  const strokeOffset = CIRCLE_CIRCUMFERENCE - (progress / 100) * CIRCLE_CIRCUMFERENCE;

  useEffect(() => {
    setProgress(0);
    setIsLiked(false);
    setReplySent(false);
    setFeedbackToast(null);

    if (activeStoryId && !activeStory?.hasSeen && onStorySeen) {
      const timer = setTimeout(() => {
        onStorySeen(activeStoryId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, activeStoryId]);

  useEffect(() => {
    if (isPaused || showDeleteConfirm || showShareModal || showChatroomSheet || isHoldingScreen) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, showDeleteConfirm, showShareModal, showChatroomSheet, isHoldingScreen, currentIndex]);

  useEffect(() => {
    if (progress >= 100) {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex((curr) => curr + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [progress, currentIndex, stories.length, onClose]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdStreamIntervalRef.current) clearInterval(holdStreamIntervalRef.current);
    };
  }, []);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((curr) => curr - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((curr) => curr + 1);
    } else {
      onClose();
    }
  };

  // Helper to spawn floating emojis from a specific source position
  const spawnFloatingEmojis = (
    emoji: string, 
    originXPercent?: number, 
    originYPercent?: number, 
    count = 1
  ) => {
    const newItems: FloatingReaction[] = [];
    for (let i = 0; i < count; i++) {
      reactionIdRef.current += 1;
      const baseLeft = originXPercent ?? (25 + Math.random() * 50);
      const baseBottom = originYPercent ? Math.max(15, 100 - originYPercent) : (18 + Math.random() * 10);
      
      newItems.push({
        id: reactionIdRef.current,
        emoji,
        left: Math.max(10, Math.min(90, baseLeft + (Math.random() - 0.5) * 26)),
        bottom: Math.max(12, Math.min(85, baseBottom + (Math.random() - 0.5) * 12)),
        rotation: (Math.random() - 0.5) * 45,
        scale: 0.85 + Math.random() * 0.65,
        duration: 1.3 + Math.random() * 0.7,
      });
    }

    setFloatingReactions((prev) => [...prev, ...newItems]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((p) => !newItems.some((n) => n.id === p.id)));
    }, 2200);
  };

  // Trigger floating reaction animation from bottom bar
  const triggerEmojiReaction = (emoji: string) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([15, 20]);
      } catch {}
    }

    spawnFloatingEmojis(emoji, 50, 80, 5);

    // Show temporary feedback banner
    setFeedbackToast(`Reacted ${emoji} to @${activeStory.username}`);
    setTimeout(() => {
      setFeedbackToast((current) => (current?.startsWith('Reacted') ? null : current));
    }, 2000);
  };

  // Hold-down on Screen Interaction Handlers
  const handleHoldStart = (clientX: number, clientY: number) => {
    pointerStartRef.current = { time: Date.now(), x: clientX, y: clientY };
    didTriggerHoldRef.current = false;
    setIsPaused(true);

    const rect = containerRef.current?.getBoundingClientRect();
    const relX = rect ? ((clientX - rect.left) / rect.width) * 100 : 50;
    const relY = rect ? ((clientY - rect.top) / rect.height) * 100 : 50;

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdStreamIntervalRef.current) clearInterval(holdStreamIntervalRef.current);

    // Hold threshold: 280ms
    holdTimerRef.current = setTimeout(() => {
      didTriggerHoldRef.current = true;
      setIsHoldingScreen(true);
      setHoldTouchPos({ x: relX, y: relY });

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([30, 45]);
        } catch {}
      }

      // Initial pop
      spawnFloatingEmojis(holdSelectedEmoji, relX, relY, 3);

      // Continuous stream while holding down!
      holdStreamIntervalRef.current = setInterval(() => {
        spawnFloatingEmojis(holdSelectedEmoji, relX, relY, 2);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(12);
          } catch {}
        }
      }, 200);
    }, 280);
  };

  const handleHoldMove = (clientX: number, clientY: number) => {
    if (!didTriggerHoldRef.current && !isHoldingScreen) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = ((clientX - rect.left) / rect.width) * 100;
    const relY = ((clientY - rect.top) / rect.height) * 100;
    setHoldTouchPos({ x: relX, y: relY });
  };

  const handleHoldEnd = (wasLeftTap: boolean) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdStreamIntervalRef.current) clearInterval(holdStreamIntervalRef.current);

    if (didTriggerHoldRef.current || isHoldingScreen) {
      // User held down: send final celebratory burst & toast
      const posX = holdTouchPos?.x ?? 50;
      const posY = holdTouchPos?.y ?? 50;
      spawnFloatingEmojis(holdSelectedEmoji, posX, posY, 5);

      setFeedbackToast(`Sent ${holdSelectedEmoji} reaction to @${activeStory.username}!`);
      setTimeout(() => {
        setFeedbackToast((c) => (c?.startsWith('Sent') ? null : c));
      }, 2400);

      setIsHoldingScreen(false);
      setHoldTouchPos(null);
      didTriggerHoldRef.current = false;
      setTimeout(() => setIsPaused(false), 300);
      return;
    }

    // It was a quick tap (< 280ms)
    setIsPaused(false);
    if (wasLeftTap) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySent(true);
    setReplyText('');
    setTimeout(() => setReplySent(false), 2200);
  };

  const handleCopyStoryLink = () => {
    const url = `${window.location.origin}/#story=${activeStory.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEnterChatroom = () => {
    setIsPaused(true);
    if (onOpenChatroom) {
      onOpenChatroom(activeStory.username);
      onClose();
    }
  };

  if (!activeStory) return null;

  const isOwner = currentUser && (
    activeStory.userId === currentUser.uid || 
    activeStory.authorId === currentUser.uid || 
    activeStory.uid === currentUser.uid
  );
  
  const isMasterAdmin = isGlobalAdmin(currentUser);
  const canDelete = isOwner || isMasterAdmin;
  const isVerified = isVerifiedUser(activeStory);

  const isVideo = 
    activeStory.mediaUrl?.includes('data:video/') || 
    activeStory.mediaUrl?.includes('.mp4') || 
    activeStory.mediaUrl?.includes('.webm') || 
    activeStory.mediaUrl?.includes('.mov') ||
    activeStory.caption?.includes('🎥');

  // Detect mention tag in story or parse from caption
  const detectedMention = activeStory.mentionTag || (() => {
    const match = activeStory.caption?.match(/@([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  })();

  // Shared reel data if present
  const sharedReel = activeStory.sharedReel;

  const QUICK_REACTIONS = [
    { emoji: '🔥', label: 'Fire' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '👏', label: 'Clap' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '🎉', label: 'Party' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md select-none">
      <div 
        ref={containerRef}
        className="relative w-full max-w-[430px] h-[92vh] max-h-[820px] bg-neutral-950 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl border border-zinc-800/80"
      >
        {/* Background Media */}
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
          {isVideo ? (
            <video
              src={activeStory.mediaUrl}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain"
              onEnded={handleNext}
            />
          ) : (
            <img
              src={activeStory.mediaUrl}
              alt={activeStory.caption || 'Story'}
              className="w-full h-full object-contain"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85 pointer-events-none" />
        </div>

        {/* Floating Emoji Particles Layer */}
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          {floatingReactions.map((reaction) => (
            <div
              key={reaction.id}
              className="absolute animate-float-reaction text-3xl sm:text-4xl filter drop-shadow-lg"
              style={{
                left: `${reaction.left}%`,
                bottom: `${reaction.bottom}%`,
                transform: `rotate(${reaction.rotation}deg) scale(${reaction.scale})`,
                animationDuration: `${reaction.duration}s`,
              }}
            >
              {reaction.emoji}
            </div>
          ))}
        </div>

        {/* Top Progress Bars & User Info with Circular Avatar Timer */}
        <div className="relative z-20 p-3 pt-3.5 space-y-2.5">
          {/* Horizontal multi-story progress bar segments */}
          <div className="flex items-center gap-1.5 w-full">
            {stories.map((s, idx) => {
              let width = '0%';
              if (idx < currentIndex) width = '100%';
              else if (idx === currentIndex) width = `${progress}%`;

              return (
                <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear shadow-sm"
                    style={{ width }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Circular Progress Indicator around Avatar showing Story Remaining Time */}
              <div 
                className="relative w-11 h-11 flex items-center justify-center cursor-pointer group"
                title={`Story progress: ${Math.round(progress)}%`}
              >
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 44 44">
                  <defs>
                    <linearGradient id="storyCircularProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00D4FF" />
                      <stop offset="40%" stopColor="#3B82F6" />
                      <stop offset="80%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  {/* Subtle track background */}
                  <circle
                    cx="22"
                    cy="22"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeWidth="2.5"
                  />
                  {/* Active circular remaining time progress */}
                  <circle
                    cx="22"
                    cy="22"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="url(#storyCircularProgressGrad)"
                    strokeWidth="2.75"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-100 ease-linear filter drop-shadow(0 0 3px rgba(0,212,255,0.6))"
                  />
                </svg>

                {/* Avatar Image nested inside circular progress indicator */}
                <img
                  src={activeStory.avatar}
                  alt={activeStory.username}
                  className="w-8 h-8 rounded-full object-cover shadow-md z-10 transition-transform group-hover:scale-105"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm font-semibold drop-shadow-sm flex items-center gap-1">
                  {activeStory.username}
                  {isVerified && (
                    <span 
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white shadow-sm ring-1 ring-white/40"
                      title="Verified User"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                    </span>
                  )}
                </span>
                <span className="text-white/60 text-xs drop-shadow-sm">
                  • {activeStory.timestamp}
                </span>
              </div>
            </div>

            {/* Top Action Controls: Chatroom Option, Mute, Share, Delete, Close */}
            <div className="flex items-center gap-1.5">
              {/* CHATROOM OPTION: Quick Live Voice Room Button */}
              <button
                onClick={() => {
                  setIsPaused(true);
                  setShowChatroomSheet(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-500/90 via-purple-600/90 to-indigo-600/90 hover:opacity-100 text-white text-[11px] font-bold shadow-md hover:scale-105 active:scale-95 transition-all border border-white/20"
                type="button"
                title="Open Voice Chatroom"
              >
                <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
                <span>Chatroom</span>
              </button>

              {isVideo && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                  type="button"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-zinc-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                </button>
              )}

              {/* Share Story / Reel Button */}
              <button
                onClick={() => {
                  setIsPaused(true);
                  setShowShareModal(true);
                }}
                className="p-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                type="button"
                title="Share Story / Reel"
              >
                <Share2 className="w-5 h-5" />
              </button>

              {canDelete && onDeleteStory && (
                <button
                  onClick={() => {
                    setIsPaused(true);
                    setShowDeleteConfirm(true);
                  }}
                  className="p-1.5 rounded-full text-white/90 hover:text-red-500 hover:bg-white/10 transition-colors"
                  type="button"
                  title={isMasterAdmin && !isOwner ? "Delete Story (Master Admin 👑)" : "Delete Story"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Story Stickers: Mention Tag & Shared Reel */}
        <div className="relative z-20 flex-1 px-4 flex flex-col justify-center items-center pointer-events-none">
          {/* Mention Tag Sticker */}
          {detectedMention && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setFeedbackToast(`Viewing @${detectedMention}`);
                if (onOpenDirectChat) onOpenDirectChat(detectedMention);
              }}
              className="pointer-events-auto cursor-pointer group bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/25 hover:border-white/50 text-white rounded-full px-3.5 py-1.5 shadow-xl flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 mb-3"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold">
                <AtSign className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span className="text-xs font-semibold tracking-wide">
                @{detectedMention}
              </span>
              <span className="text-[10px] text-sky-400 group-hover:underline ml-0.5">
                Profile
              </span>
            </div>
          )}

          {/* Shared Reel Sticker */}
          {sharedReel && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setFeedbackToast(`Opening reel by @${sharedReel.username}`);
              }}
              className="pointer-events-auto cursor-pointer group max-w-xs bg-zinc-900/80 hover:bg-zinc-900 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 shadow-2xl flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <Film className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300">
                  <Film className="w-3 h-3 text-pink-400" />
                  <span>Shared Reel</span>
                  <span>•</span>
                  <span className="text-white truncate">@{sharedReel.username}</span>
                </div>
                <p className="text-xs text-zinc-100 font-medium truncate mt-0.5">
                  {sharedReel.caption || 'Watch on Reels'}
                </p>
              </div>
              <div className="px-2 py-1 bg-white/20 group-hover:bg-white/30 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider">
                Watch
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center max-w-xs w-full shadow-2xl">
              <div className="w-11 h-11 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isMasterAdmin && !isOwner ? 'Admin: Delete Story?' : 'Delete Story?'}
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                {isMasterAdmin && !isOwner
                  ? `Are you sure you want to delete @${activeStory.username}'s story? This cannot be undone.`
                  : 'Are you sure you want to delete your story? This cannot be undone.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setIsPaused(false);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    if (onDeleteStory) onDeleteStory(activeStory.id);
                    onClose();
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHATROOM OPTION SHEET OVERLAY */}
        {showChatroomSheet && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full max-w-sm shadow-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Live Voice Chatrooms</h3>
                    <p className="text-[10px] text-zinc-400">Audio hangs, PK Battles & Music</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowChatroomSheet(false);
                    setIsPaused(false);
                  }}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleEnterChatroom}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-900/40 via-purple-900/40 to-indigo-900/40 border border-rose-500/30 hover:border-rose-500/60 text-left transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-rose-300">
                        Join or Start Room with @{activeStory.username}
                      </p>
                      <p className="text-[10px] text-zinc-300">Hop into live voice discussion</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>

                <button
                  onClick={() => {
                    setShowChatroomSheet(false);
                    if (onOpenChatroom) {
                      onOpenChatroom();
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Browse All Active Chatrooms</p>
                      <p className="text-[10px] text-zinc-400">See who is live right now</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Story / Reel Modal Overlay */}
        {showShareModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full max-w-sm shadow-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white">Share Story</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowShareModal(false);
                    setIsPaused(false);
                  }}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCopyStoryLink}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Copy className="w-4 h-4 text-zinc-300" />
                    <div>
                      <p className="text-xs font-semibold text-white">Copy Link</p>
                      <p className="text-[10px] text-zinc-400">Share with friends anywhere</p>
                    </div>
                  </div>
                  {copiedLink && <span className="text-xs font-bold text-emerald-400">Copied!</span>}
                </button>

                <button
                  onClick={() => {
                    if (onOpenDirectChat) {
                      onOpenDirectChat(activeStory.username);
                      setShowShareModal(false);
                      onClose();
                    } else {
                      setFeedbackToast(`Shared with @${activeStory.username}`);
                      setShowShareModal(false);
                      setIsPaused(false);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-xs font-semibold text-white">Send in Direct Message</p>
                      <p className="text-[10px] text-zinc-400">Send story privately in chat</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>

                {/* Chatroom Share Option */}
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShowChatroomSheet(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-rose-400" />
                    <div>
                      <p className="text-xs font-semibold text-white">Discuss in Live Chatroom</p>
                      <p className="text-[10px] text-zinc-400">Talk about this story live on mic</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>

                {detectedMention && (
                  <button
                    onClick={() => {
                      if (onOpenDirectChat) {
                        onOpenDirectChat(detectedMention);
                        setShowShareModal(false);
                        onClose();
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 hover:bg-sky-900/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <AtSign className="w-4 h-4 text-sky-400" />
                      <div>
                        <p className="text-xs font-semibold text-white">Chat with Mentioned User</p>
                        <p className="text-[10px] text-sky-300">@{detectedMention}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-sky-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hold-down on Screen Quick Reaction Floating Radial & Dock Overlay */}
        {isHoldingScreen && (
          <div className="absolute inset-0 z-40 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
            {/* Pulsing Touch Indicator Ring */}
            {holdTouchPos && (
              <div 
                className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rose-500/80 animate-ping pointer-events-none"
                style={{
                  left: `${holdTouchPos.x}%`,
                  top: `${holdTouchPos.y}%`,
                }}
              />
            )}

            {/* Quick Reactions Radial Bar */}
            <div className="pointer-events-auto bg-zinc-950/90 border border-white/20 rounded-full px-4 py-3 shadow-2xl flex items-center gap-2.5 backdrop-blur-md transform animate-in zoom-in-90 duration-150">
              {HOLD_REACTION_EMOJIS.map((item) => {
                const isSelected = holdSelectedEmoji === item.emoji;
                return (
                  <button
                    key={item.emoji}
                    type="button"
                    onPointerEnter={() => {
                      setHoldSelectedEmoji(item.emoji);
                      if (holdTouchPos) {
                        spawnFloatingEmojis(item.emoji, holdTouchPos.x, holdTouchPos.y, 2);
                      }
                    }}
                    onClick={() => {
                      setHoldSelectedEmoji(item.emoji);
                      triggerEmojiReaction(item.emoji);
                    }}
                    className={`relative rounded-full transition-all duration-150 flex items-center justify-center ${
                      isSelected
                        ? 'scale-140 bg-rose-500/25 ring-2 ring-rose-500 -translate-y-2 p-1.5'
                        : 'scale-100 hover:scale-125 p-1'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl filter drop-shadow-md select-none">
                      {item.emoji}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-6 px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-[9px] font-bold text-white uppercase whitespace-nowrap shadow-lg">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Helper Banner */}
            <div className="mt-4 px-3.5 py-1.5 rounded-full bg-zinc-900/85 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Streaming {holdSelectedEmoji} reactions • Release to finish</span>
            </div>
          </div>
        )}

        {/* Tap & Hold Down Interactive Areas */}
        <div 
          className="absolute inset-y-16 inset-x-0 z-10 flex"
          onPointerMove={(e) => handleHoldMove(e.clientX, e.clientY)}
        >
          {/* Left tap area (prev story or hold to react) */}
          <div 
            className="w-1/3 h-full cursor-pointer"
            onPointerDown={(e) => handleHoldStart(e.clientX, e.clientY)}
            onPointerUp={() => handleHoldEnd(true)}
            onPointerCancel={() => handleHoldEnd(true)}
          />
          {/* Right tap area (next story or hold to react) */}
          <div 
            className="w-2/3 h-full cursor-pointer"
            onPointerDown={(e) => handleHoldStart(e.clientX, e.clientY)}
            onPointerUp={() => handleHoldEnd(false)}
            onPointerCancel={() => handleHoldEnd(false)}
          />
        </div>

        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 hidden sm:flex"
            type="button"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 hidden sm:flex"
            type="button"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Bottom Caption, Quick Emoji Reactions Bar & Reply Bar */}
        <div className="relative z-20 p-3.5 space-y-2.5 bg-gradient-to-t from-black via-black/80 to-transparent">
          {activeStory.caption && (
            <p className="text-white text-xs sm:text-sm font-medium drop-shadow-md px-1 line-clamp-2">
              {activeStory.caption}
            </p>
          )}

          {/* Quick Reaction Emoji Bar with Floating Animation Trigger & Hold Hint */}
          <div className="flex items-center justify-between gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 pl-1.5 hidden xs:inline" title="Hold anywhere on screen to stream reactions">
              React:
            </span>
            <div className="flex items-center justify-around flex-1">
              {QUICK_REACTIONS.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => triggerEmojiReaction(r.emoji)}
                  type="button"
                  title={`Send ${r.label} (or hold on screen)`}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-130 active:scale-95 transition-all duration-150 hover:bg-white/10"
                >
                  {r.emoji}
                </button>
              ))}
            </div>

            {/* Quick Mic / Chatroom Icon in reaction bar */}
            <button
              onClick={() => {
                setIsPaused(true);
                setShowChatroomSheet(true);
              }}
              type="button"
              title="Voice Chatroom"
              className="p-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 hover:scale-110 active:scale-95 transition-all"
            >
              <Radio className="w-4 h-4 animate-pulse" />
            </button>
          </div>

          {/* Message input & Actions */}
          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Send message to ${activeStory.username}...`}
              className="flex-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-xs text-white placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-white/80"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const nextLiked = !isLiked;
                setIsLiked(nextLiked);
                if (nextLiked) {
                  triggerEmojiReaction('❤️');
                }
              }}
              className={`p-2 rounded-full transition-colors ${
                isLiked ? 'text-[#ff3040] bg-white/20' : 'text-white bg-white/20 hover:bg-white/30'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#ff3040]' : ''}`} />
            </button>
          </form>

          {/* Feedback Toast */}
          {(replySent || feedbackToast) && (
            <div className="text-center text-xs font-semibold text-emerald-400 bg-black/70 backdrop-blur-md border border-emerald-500/30 py-1.5 px-3 rounded-full animate-fade-in shadow-lg">
              {replySent ? `Reply sent to ${activeStory.username}!` : feedbackToast}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
