import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  ShieldCheck, 
  Grid, 
  UserPlus, 
  UserCheck, 
  ExternalLink, 
  UserX, 
  Heart,
  Video,
  Sparkles
} from 'lucide-react';
import { PublicUserProfile, Post, AppUser } from '../types';

interface UserProfileModalProps {
  user: PublicUserProfile | null;
  currentUser: AppUser | null;
  posts: Post[];
  isFollowing: boolean;
  onFollowToggle: (user: PublicUserProfile) => void;
  onOpenDirect: (username: string) => void;
  onBlockUser?: (userId: string) => void;
  onSelectPost: (post: Post) => void;
  onClose: () => void;
  onRequireLogin: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  posts,
  isFollowing,
  onFollowToggle,
  onOpenDirect,
  onBlockUser,
  onSelectPost,
  onClose,
  onRequireLogin,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  if (!user) return null;

  const isMe = currentUser && (currentUser.uid === user.uid || currentUser.username.toLowerCase() === user.username.toLowerCase());

  // Filter posts by this user
  const userPosts = posts.filter(
    (p) =>
      p.uid === user.uid ||
      p.username.toLowerCase() === user.username.toLowerCase()
  );

  const handleCopyId = () => {
    navigator.clipboard?.writeText(user.userId || user.uid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?user=${user.username}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    setShowOptions(false);
  };

  const handleFollowClick = () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    onFollowToggle(user);
  };

  const followerDisplayCount = (user.followersCount || 0) + (isFollowing ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] bg-zinc-950 border-x sm:border border-zinc-800 sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">@{user.username}</span>
            {user.isVerified && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white" title="Verified User">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
                type="button"
                title="Options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {showOptions && (
                <div className="absolute right-0 top-10 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-1.5 w-48 text-xs text-zinc-200 z-30 animate-in fade-in duration-150">
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-zinc-800 transition-colors"
                    type="button"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-zinc-400" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Share Profile'}</span>
                  </button>
                  <button
                    onClick={handleCopyId}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-zinc-800 transition-colors"
                    type="button"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                    <span>Copy User ID</span>
                  </button>
                  {!isMe && onBlockUser && (
                    <button
                      onClick={() => {
                        onBlockUser(user.uid);
                        setShowOptions(false);
                        onClose();
                      }}
                      className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-zinc-800/80"
                      type="button"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Block @{user.username}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-4 sm:p-5 border-b border-zinc-800/70">
            <div className="flex items-center gap-4">
              {/* Avatar with gradient border */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full p-[2px] ig-story-gradient flex items-center justify-center">
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=3a1af2&color=fff`}
                    alt={user.displayName}
                    className="w-full h-full rounded-full object-cover bg-zinc-950 p-[2px]"
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 flex justify-around text-center">
                <div>
                  <div className="text-base font-bold text-white">{userPosts.length}</div>
                  <div className="text-xs text-zinc-400">posts</div>
                </div>
                <div>
                  <div className="text-base font-bold text-white">{followerDisplayCount}</div>
                  <div className="text-xs text-zinc-400">followers</div>
                </div>
                <div>
                  <div className="text-base font-bold text-white">{user.followingCount || 0}</div>
                  <div className="text-xs text-zinc-400">following</div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="mt-3.5 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-white">{user.displayName}</h3>
                {user.isVerified && (
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white">
                    <Check className="w-2 h-2 stroke-[3]" />
                  </span>
                )}
                
                {/* User ID Tag */}
                <button
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors ml-1"
                  title="Click to copy User ID"
                  type="button"
                >
                  <span>ID: {user.userId || user.uid}</span>
                  {copiedId ? (
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-zinc-500" />
                  )}
                </button>
              </div>

              {user.bio && (
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {user.bio}
                </p>
              )}

              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{user.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>

            {/* Action Buttons */}
            {!isMe ? (
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleFollowClick}
                  className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
                    isFollowing
                      ? 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-700/80 hover:text-rose-400'
                      : 'bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white shadow-rose-500/20'
                  }`}
                  type="button"
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    onOpenDirect(user.username);
                    onClose();
                  }}
                  className="flex-1 py-2 px-4 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                  type="button"
                >
                  <MessageCircle className="w-4 h-4 text-zinc-400" />
                  <span>Message</span>
                </button>
              </div>
            ) : (
              <div className="mt-4 py-2 px-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-400">
                This is your account profile
              </div>
            )}
          </div>

          {/* Posts Grid Header */}
          <div className="flex items-center justify-center gap-2 py-2.5 border-b border-zinc-800 text-xs font-bold text-zinc-300">
            <Grid className="w-3.5 h-3.5 text-white" />
            <span>POSTS ({userPosts.length})</span>
          </div>

          {/* Posts */}
          {userPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 p-1">
              {userPosts.map((post) => {
                const isVideo =
                  post.mediaType === 'video' ||
                  post.image?.startsWith('data:video/') ||
                  post.image?.includes('.mp4');

                return (
                  <div
                    key={post.id}
                    onClick={() => {
                      onSelectPost(post);
                      onClose();
                    }}
                    className="group relative aspect-square bg-zinc-900 overflow-hidden cursor-pointer"
                  >
                    {isVideo ? (
                      <video
                        src={post.image}
                        muted
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <img
                        src={post.image}
                        alt={post.caption || 'User post'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}

                    {isVideo && (
                      <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-md text-white z-10">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <Heart className="w-3.5 h-3.5 fill-white" />
                        <span>{post.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-500 text-xs px-4">
              <Sparkles className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
              <p className="font-semibold text-zinc-400">No posts shared yet</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">When @{user.username} shares photos or videos, they'll appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
