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
  User,
  Volume2,
  VolumeX,
  Play,
  Video,
  Flag,
  AlertCircle,
  X,
  UserX,
  ShieldCheck,
  UserPlus,
  UserCheck,
  Copy
} from 'lucide-react';
import { Post, AppUser } from '../types';
import { isGlobalAdmin } from '../utils/admin';
import { formatRelativeTime } from '../utils/time';

interface PostCardProps {
  post: Post;
  currentUser: AppUser | null;
  isFollowing?: boolean;
  onLikeToggle: (postId: string) => void;
  onSaveToggle: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onQuickComment: (postId: string, text: string) => void;
  onFollowToggle?: (userIdOrUsername: string) => void;
  onSelectUser?: (username: string, uid?: string, avatar?: string) => void;
  onDeletePost?: (postId: string) => void;
  onBlockUser?: (userId: string) => void;
  onRequireLogin: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  isFollowing = false,
  onLikeToggle,
  onSaveToggle,
  onOpenComments,
  onQuickComment,
  onFollowToggle,
  onSelectUser,
  onDeletePost,
  onBlockUser,
  onRequireLogin,
}) => {
  const [inlineComment, setInlineComment] = useState('');
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [heartAnimKey, setHeartAnimKey] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [isPostHidden, setIsPostHidden] = useState(false);
  const [hiddenReason, setHiddenReason] = useState<'report' | 'block'>('report');
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const REPORT_REASONS = [
    "It's spam or scam",
    "Nudity or sexual activity",
    "Hate speech or symbols",
    "Violence or dangerous content",
    "Bullying or harassment",
    "False information or misleading",
    "I simply don't want to see this",
  ];

  const isVideo =
    post.mediaType === 'video' ||
    post.image?.startsWith('data:video/') ||
    post.image?.includes('.mp4') ||
    post.image?.includes('.webm') ||
    post.image?.includes('.mov') ||
    post.caption?.includes('🎥');

  const handleMediaClick = (e: React.MouseEvent) => {
    if (isVideo && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 700);
    }
  };

  // Ref to track touch timestamps for mobile double-tap detection
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);

  const isLiked = currentUser ? post.likedBy?.includes(currentUser.uid) : false;
  const isSaved = currentUser ? post.savedBy?.includes(currentUser.uid) : false;
  const isOwner = currentUser && (post.uid === currentUser.uid || currentUser.username === post.username);
  const isAdmin = isGlobalAdmin(currentUser);
  const canDelete = isOwner || isAdmin;

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


  if (isPostHidden) {
    return (
      <article className="bg-zinc-950 border-b border-zinc-800/80 mb-3 sm:rounded-2xl sm:border sm:border-zinc-800 sm:bg-zinc-900/40 p-5 text-center transition-all animate-fadeIn">
        {hiddenReason === 'block' ? (
          <>
            <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-2 text-orange-400">
              <UserX className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-white mb-0.5">User Blocked</h4>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mb-1">
              You have blocked @{post.username}. All their posts and content will be hidden from your feed.
            </p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 text-amber-400">
              <Flag className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-white mb-0.5">Post Reported</h4>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mb-2.5">
              Thank you for reporting. We've hidden this post from your feed.
            </p>
            <button
              onClick={() => setIsPostHidden(false)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-white underline cursor-pointer"
            >
              Show post anyway
            </button>
          </>
        )}
      </article>
    );
  }

  return (
    <article className="bg-zinc-950 border-b border-zinc-800/80 mb-3 sm:rounded-2xl sm:border sm:border-zinc-800 sm:bg-zinc-900/40 transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div 
            onClick={() => onSelectUser?.(post.username, post.uid, post.avatar)}
            className="w-8 h-8 rounded-full p-[1.5px] ig-story-gradient flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
            title={`View @${post.username}'s profile`}
          >
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                onClick={() => onSelectUser?.(post.username, post.uid, post.avatar)}
                className="text-xs font-bold text-zinc-100 hover:text-purple-300 transition-colors cursor-pointer"
              >
                {post.username}
              </span>

              {post.isVerified && (
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white" title="Verified Creator">
                  <Check className="w-2 h-2 stroke-[3]" />
                </span>
              )}

              {/* Follow / Following button directly in post header for non-owners */}
              {!isOwner && onFollowToggle && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!currentUser) {
                      onRequireLogin();
                      return;
                    }
                    onFollowToggle(post.uid || post.username);
                  }}
                  className={`ml-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition-all flex items-center gap-1 active:scale-95 ${
                    isFollowing
                      ? 'bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-700/60'
                      : 'text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 shadow-xs'
                  }`}
                  type="button"
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}

              <span className="text-zinc-600 text-[10px]">•</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {formatRelativeTime(post.createdAt)}
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
            <div className="absolute right-0 top-8 z-30 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-1.5 w-44 text-xs text-zinc-200 animate-in fade-in duration-150">
              <button
                onClick={handleCopyLink}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-800"
                type="button"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied link!' : 'Copy link'}</span>
              </button>

              {/* View Profile */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  onSelectUser?.(post.username, post.uid, post.avatar);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-800"
                type="button"
              >
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>View @{post.username}</span>
              </button>

              {/* Copy Author User ID */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  const idToCopy = post.uid || post.username;
                  navigator.clipboard?.writeText(idToCopy);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-800 font-mono text-[11px]"
                type="button"
              >
                <Copy className="w-3.5 h-3.5 text-purple-400" />
                <span>Copy User ID</span>
              </button>

              {/* Follow / Unfollow from menu */}
              {!isOwner && onFollowToggle && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (!currentUser) {
                      onRequireLogin();
                      return;
                    }
                    onFollowToggle(post.uid || post.username);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-800 text-purple-300 font-semibold"
                  type="button"
                >
                  {isFollowing ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>{isFollowing ? `Unfollow @${post.username}` : `Follow @${post.username}`}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowReportModal(true);
                  setIsReportSubmitted(false);
                  setSelectedReportReason(null);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-amber-400 hover:bg-zinc-800 transition-colors"
                type="button"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report post</span>
              </button>

              {/* Block User Button */}
              {currentUser && post.uid !== currentUser.uid && onBlockUser && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowBlockConfirmModal(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-orange-400 hover:bg-zinc-800 transition-colors"
                  type="button"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Block @{post.username}</span>
                </button>
              )}

              {/* Delete button: visible to admin on ANY post, but hidden from regular users unless viewing their own post */}
              {canDelete && onDeletePost && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirmModal(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-400 hover:bg-rose-950/30"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isAdmin && !isOwner ? 'Delete (Master Admin 👑)' : 'Delete post'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Image / Video with Double Tap Heart Trigger */}
      <div 
        className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center cursor-pointer select-none"
        onClick={handleMediaClick}
        onDoubleClick={handleDoubleClick}
        onTouchEnd={handleTouchEnd}
      >
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              src={post.image}
              autoPlay
              loop
              playsInline
              muted={isVideoMuted}
              className="w-full h-full object-cover select-none pointer-events-none"
            />
            {/* Video Indicator Badge */}
            <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white flex items-center gap-1 border border-white/10 pointer-events-none z-10">
              <Video className="w-3 h-3 text-rose-500" />
              <span>Video</span>
            </div>

            {/* Mute / Unmute Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsVideoMuted(!isVideoMuted);
              }}
              className="absolute bottom-2.5 right-2.5 p-2 bg-black/75 hover:bg-black text-white rounded-full transition-colors z-20 shadow-md border border-white/10"
              title={isVideoMuted ? 'Unmute' : 'Mute'}
            >
              {isVideoMuted ? <VolumeX className="w-4 h-4 text-zinc-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Play / Pause Flash Overlay */}
            {showPlayIcon && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-fadeIn">
                <div className="p-3.5 bg-black/60 rounded-full backdrop-blur-sm text-white">
                  {isVideoPlaying ? <Play className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 opacity-40" />}
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={post.image}
            alt={post.caption || 'Post image'}
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="lazy"
          />
        )}

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

      {/* Report Post Modal */}
      {showReportModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Report Post</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isReportSubmitted ? (
              <div className="p-6 text-center space-y-3.5">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Report Received</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                    Thank you for letting us know. We have received your report regarding <span className="text-rose-400 font-medium">"{selectedReportReason}"</span> from @{post.username}.
                  </p>
                </div>
                {reportDetails && (
                  <p className="text-[11px] bg-zinc-800/60 border border-zinc-800 rounded-lg p-2 text-zinc-300 italic text-left">
                    "{reportDetails}"
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                  >
                    Keep in Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false);
                      setIsPostHidden(true);
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-md"
                  >
                    Done & Hide Post
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-zinc-200 font-semibold">
                    Why are you reporting this post from @{post.username}?
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Your report is anonymous. If someone is in immediate danger, call local emergency services.
                  </p>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar pr-1">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedReportReason(reason)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                        selectedReportReason === reason
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                          : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 border border-transparent'
                      }`}
                    >
                      <span>{reason}</span>
                      {selectedReportReason === reason && (
                        <Check className="w-3.5 h-3.5 text-rose-400 flex-none ml-2" />
                      )}
                    </button>
                  ))}
                </div>

                {selectedReportReason && (
                  <div className="pt-1">
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Additional details (optional):
                    </label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Add any context to help our moderators..."
                      rows={2}
                      className="w-full bg-zinc-800/80 border border-zinc-700/70 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!selectedReportReason}
                    onClick={() => setIsReportSubmitted(true)}
                    className="flex-1 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-indigo-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-lg"
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block User Confirmation Modal */}
      {showBlockConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center max-w-xs w-full shadow-2xl">
            <div className="w-11 h-11 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-3 text-orange-400">
              <UserX className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Block @{post.username}?
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              They will not be able to interact with you, and their posts and stories will be hidden from your feed.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBlockConfirmModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBlockConfirmModal(false);
                  if (onBlockUser) onBlockUser(post.uid);
                  setHiddenReason('block');
                  setIsPostHidden(true);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors shadow-lg"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Post Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center max-w-xs w-full shadow-2xl">
            <div className="w-11 h-11 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-500">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {isAdmin && !isOwner ? 'Admin: Delete Post?' : 'Delete Post?'}
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              {isAdmin && !isOwner
                ? `Master Admin 👑 action: Are you sure you want to delete @${post.username}'s post? This will permanently remove it from the platform.`
                : 'Are you sure you want to delete your post? This cannot be undone.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  if (onDeletePost) onDeletePost(post.id);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
