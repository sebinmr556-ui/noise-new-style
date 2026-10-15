import React, { useState, useEffect } from 'react';
import { X, Heart, Send, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Story, AppUser } from '../types';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  currentUser: AppUser | null;
  onClose: () => void;
  onStorySeen?: (storyId: string) => void;
  onDeleteStory?: (storyId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  currentUser,
  onClose,
  onStorySeen,
  onDeleteStory,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const activeStory = stories[currentIndex];

  useEffect(() => {
    if (activeStory && onStorySeen) {
      onStorySeen(activeStory.id);
    }
    setProgress(0);
    setIsLiked(false);
    setReplySent(false);
  }, [currentIndex, activeStory]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((curr) => curr + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // ~5 seconds total
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, stories.length, onClose]);

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

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySent(true);
    setReplyText('');
    setTimeout(() => setReplySent(false), 2000);
  };

  if (!activeStory) return null;

  // ലോഗിൻ ചെയ്ത യൂസറുടെ സ്വന്തം സ്റ്റോറി ആണോ എന്ന് പരിശോധിക്കുന്നു
  const isOwner = currentUser && (
    activeStory.userId === currentUser.uid || 
    activeStory.authorId === currentUser.uid || 
    activeStory.uid === currentUser.uid
  );
  
  // മാസ്റ്റർ അഡ്മിൻ പവർ (shoebell_shoe)
  const isMasterAdmin = currentUser?.username === 'shoebell_shoe';
  const canDelete = isOwner || isMasterAdmin;

  // മീഡിയ വീഡിയോ ആണോ എന്ന് പരിശോധിക്കുന്നു
  const isVideo = 
    activeStory.mediaUrl?.includes('data:video/') || 
    activeStory.mediaUrl?.includes('.mp4') || 
    activeStory.mediaUrl?.includes('.webm') || 
    activeStory.mediaUrl?.includes('.mov') ||
    activeStory.caption?.includes('🎥');

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm select-none">
      <div 
        className="relative w-full max-w-[430px] h-[92vh] max-h-[820px] bg-neutral-900 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Background Media (Image or Video Support) */}
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
          {isVideo ? (
            <video
              src={activeStory.mediaUrl}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              onEnded={handleNext}
            />
          ) : (
            <img
              src={activeStory.mediaUrl}
              alt={activeStory.caption || 'Story'}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
        </div>

        {/* Top Progress Bars & User Info */}
        <div className="relative z-10 p-3 pt-3.5 space-y-2.5">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 w-full">
            {stories.map((s, idx) => {
              let width = '0%';
              if (idx < currentIndex) width = '100%';
              else if (idx === currentIndex) width = `${progress}%`;

              return (
                <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{ width }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Details & Delete/Close buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={activeStory.avatar}
                alt={activeStory.username}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white/80"
              />
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-semibold drop-shadow-sm">
                  {activeStory.username}
                </span>
                <span className="text-white/70 text-xs drop-shadow-sm">
                  {activeStory.timestamp}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* ഡിലീറ്റ് ചെയ്യാനുള്ള ബട്ടൺ */}
              {canDelete && onDeleteStory && (
                <button
                  onClick={() => {
                    setIsPaused(true); 
                    if (window.confirm("ഈ സ്റ്റോറി ഡിലീറ്റ് ചെയ്യണോ?")) {
                      onDeleteStory(activeStory.id);
                      onClose();
                    } else {
                      setIsPaused(false);
                    }
                  }}
                  className="p-1.5 rounded-full text-white/90 hover:text-red-500 hover:bg-white/10 transition-colors"
                  type="button"
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

        {/* Tap areas to navigate */}
        <div className="absolute inset-y-16 inset-x-0 z-10 flex">
          <div
            className="w-1/3 h-full cursor-pointer"
            onClick={handlePrev}
          />
          <div
            className="w-2/3 h-full cursor-pointer"
            onClick={handleNext}
          />
        </div>

        {/* Previous / Next Arrow buttons on desktop */}
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

        {/* Bottom Caption & Reply Bar */}
        <div className="relative z-20 p-4 space-y-3">
          {activeStory.caption && (
            <p className="text-white text-sm font-medium drop-shadow-md px-1">
              {activeStory.caption}
            </p>
          )}

          {/* Quick Reaction Pills */}
          <div className="flex gap-2">
            {['🔥', '❤️', '😍', '👏', '🙌'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setReplySent(true);
                  setTimeout(() => setReplySent(false), 2000);
                }}
                type="button"
                className="text-lg bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Send message to ${activeStory.username}...`}
              className="flex-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2.5 text-xs text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2.5 rounded-full transition-colors ${
                isLiked ? 'text-[#ff3040] bg-white/20' : 'text-white bg-white/20 hover:bg-white/30'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#ff3040]' : ''}`} />
            </button>
          </form>

          {replySent && (
            <div className="text-center text-xs font-semibold text-emerald-400 bg-black/60 py-1 rounded-full animate-fade-in">
              Reply sent to {activeStory.username}!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
