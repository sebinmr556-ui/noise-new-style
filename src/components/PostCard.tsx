import React, { useState, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  Trash2, 
  Link as LinkIcon, 
  Check,
  User
} from 'lucide-react';
import { Post, AppUser } from '../types';

interface PostCardProps {
  post: Post;
  currentUser: AppUser | null;
  onLikeToggle: (postId: string) => void;
  onSaveToggle: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onQuickComment: (postId: string, text: string) => void;
  onDeletePost?: (postId: string) => void;
  onRequireLogin: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onLikeToggle,
  onSaveToggle,
  onOpenComments,
  onQuickComment,
  onDeletePost,
  onRequireLogin,
}) => {
  const [inlineComment, setInlineComment] = useState('');
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [heartAnimKey, setHeartAnimKey] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);

  // Ref to track touch timestamps for mobile double-tap detection
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);

  const isLiked = currentUser ? post.likedBy?.includes(currentUser.uid) : false;
  const isSaved = currentUser ? post.savedBy?.includes(currentUser.uid) : false;
  const isOwner = currentUser && (post.uid === currentUser.uid || currentUser.username === post.username);

  // Trigger double-tap heart animation & like action
  const triggerDoubleTap = () => {
    setHeartAnimKey((k) => k + 1);
    setShowHeartAnim(true);
    setHeartPulse(true);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 30, 40]);
      } catch {}
    }

    setTimeout(() => {
      setShowHeartAnim(false);
    }, 1000);

    setTimeout(() => {
      setHeartPulse(false);
    }, 400);

    if (!currentUser) {
      setTimeout(() => {
        onRequireLogin();
      }, 500);
      return;
    }

    if (!isLiked) {
      onLikeToggle(post.id);
    }
  };

  const handleDoubleClick = () => {
    triggerDoubleTap();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const currentTime = Date.now();
    const tapLength = currentTime - lastTapRef.current;

    if (tapLength > 0 && tapLength < 320) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      triggerDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = currentTime;
      tapTimeoutRef.current = setTimeout(() => {
        lastTapRef.current = 0;
      }, 350);
    }
  };

  const handleLikeClick = () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    setHeartPulse(true);
    setTimeout(() => setHeartPulse(false), 300);
    onLikeToggle(post.id);
  };

  const handleSaveClick = () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    onSaveToggle(post.id);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (!inlineComment.trim()) return;
    onQuickComment(post.id, inlineComment.trim());
    setInlineComment('');
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowMenu(false);
    }, 1500);
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'recently';
    if (typeof ts === 'number') {
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    }
    return 'recently';
  };

  return (
    <article className="bg-zinc-950 border-b border-zinc-800/80 mb-3 sm:rounded-2xl sm:border sm:border-zinc-800 sm:bg-zinc-900/40 transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full p-[1.5px] ig-story-gradient flex items-center justify-center">
            {post.avatar && !post.avatar.includes('unsplash.com') && !post.avatar.includes('ui-avatars.com') ? (
              <img
                src={post.avatar}
                alt={post.username}
                className="w-full h-full rounded-full object-cover bg-zinc-950 p-[1px]"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-zinc-400">
                <User className="w-4 h-4 stroke-[2]" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-100 hover:underline cursor-pointer">
                {post.username}
              </span>
              <span className="text-zinc-600 text-[10px]">•</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {formatTime(post.createdAt)}
              </span>
            </div>
            {post.location && (
              <p className="text-[10px] text-zinc-400 font-normal truncate max-w-[220px]">
                {post.location}
              </p>
            )}
          </div>
        </div>

        {/* Options Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
            type="button"
            title="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-30 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-1.5 w-40 text-xs text-zinc-200 animate-in fade-in duration-150">
              <button
                onClick={handleCopyLink}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-800"
                type="button"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied link!' : 'Copy link'}</span>
              </button>

              {isOwner && onDeletePost && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDeletePost(post.id);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-400 hover:bg-rose-950/30"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Image with Double Tap Heart Trigger */}
      <div 
        className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center cursor-pointer select-none"
        onDoubleClick={handleDoubleClick}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={post.image}
          alt={post.caption || 'Post image'}
          className="w-full h-full object-cover select-none pointer-events-none"
          loading="lazy"
        />

        {/* Double-Tap Heart Visual Feedback Animation */}
        {showHeartAnim && (
          <div 
            key={heartAnimKey}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="absolute w-36 h-36 bg-rose-500/25 rounded-full blur-2xl animate-pulse" />
            <div className="relative animate-heart-pop flex items-center justify-center">
              <Heart 
                className="w-28 h-28 text-white fill-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] stroke-[1.2]" 
              />
              <Heart 
                className="absolute w-28 h-28 text-[#ff3040] fill-[#ff3040] opacity-90 scale-90" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-3.5 pt-2.5 pb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <button
            onClick={handleLikeClick}
            className={`transition-transform active:scale-75 ${heartPulse ? 'animate-heart-pulse' : ''} ${
              isLiked ? 'text-[#ff3040]' : 'text-zinc-300 hover:text-white'
            }`}
            type="button"
            title="Like"
          >
            <Heart className={`w-6 h-6 stroke-[1.8] ${isLiked ? 'fill-[#ff3040]' : ''}`} />
          </button>

          <button
            onClick={() => onOpenComments(post)}
            className="text-zinc-300 hover:text-white active:scale-75 transition-transform"
            type="button"
            title="Comments"
          >
            <MessageCircle className="w-6 h-6 stroke-[1.8] -rotate-4" />
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Noise post', text: post.caption, url: window.location.href }).catch(() => {});
              } else {
                handleCopyLink();
              }
            }}
            className="text-zinc-300 hover:text-white active:scale-75 transition-transform"
            type="button"
            title="Share"
          >
            <Send className="w-6 h-6 stroke-[1.8] -rotate-12" />
          </button>
        </div>

        <button
          onClick={handleSaveClick}
          className={`transition-transform active:scale-75 ${
            isSaved ? 'text-white' : 'text-zinc-300 hover:text-white'
          }`}
          type="button"
          title="Save"
        >
          <Bookmark className={`w-6 h-6 stroke-[1.8] ${isSaved ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* Likes Count */}
      <div className="px-3.5 py-1">
        <p className="text-xs font-bold text-zinc-100">
          {(post.likes || 0).toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
        </p>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-3.5 py-1 text-xs text-zinc-200 leading-relaxed">
          <span className="font-bold text-white mr-1.5">{post.username}</span>
          <span>
            {post.caption.split(' ').map((word, i) => {
              if (word.startsWith('#')) {
                return (
                  <span key={i} className="text-rose-400 font-medium mr-1 hover:underline cursor-pointer">
                    {word}{' '}
                  </span>
                );
              }
              return word + ' ';
            })}
          </span>
        </div>
      )}

      {/* View Comments trigger */}
      {post.comments && post.comments.length > 0 && (
        <div className="px-3.5 pt-0.5">
          <button
            onClick={() => onOpenComments(post)}
            className="text-xs text-zinc-500 hover:text-zinc-400 font-normal"
            type="button"
          >
            View all {post.comments.length} comments
          </button>
        </div>
      )}

      {/* Inline Quick Comment Form */}
      <form onSubmit={handleQuickSubmit} className="px-3.5 py-2.5 border-t border-zinc-800/60 mt-2 flex items-center justify-between gap-2">
        <input
          type="text"
          value={inlineComment}
          onChange={(e) => setInlineComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full text-xs placeholder-zinc-500 text-zinc-100 bg-transparent focus:outline-none"
        />
        {inlineComment.trim() && (
          <button
            type="submit"
            className="text-xs font-semibold text-rose-500 hover:text-rose-400 flex-none px-1"
          >
            Post
          </button>
        )}
      </form>
    </article>
  );
};
