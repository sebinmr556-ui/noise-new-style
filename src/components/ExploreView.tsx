import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Heart, 
  X, 
  Video, 
  UserCheck, 
  UserPlus, 
  Copy, 
  Check, 
  Users, 
  Sparkles, 
  Fingerprint, 
  Hash, 
  Filter 
} from 'lucide-react';
import { Post, AppUser, PublicUserProfile } from '../types';
import { getAllDiscoverableUsers } from '../data/usersData';

interface ExploreViewProps {
  allPosts: Post[];
  currentUser: AppUser | null;
  followingList?: string[];
  onFollowToggle?: (user: PublicUserProfile) => void;
  onSelectPost: (post: Post) => void;
  onSelectUser?: (user: PublicUserProfile) => void;
  onRequireLogin?: () => void;
}

const TRENDING_TAGS = [
  'All',
  'Photography',
  'Travel',
  'Art',
  'Music',
  'Architecture',
  'Vintage',
  'Nature',
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  allPosts,
  currentUser,
  followingList = [],
  onFollowToggle,
  onSelectPost,
  onSelectUser,
  onRequireLogin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'accounts' | 'posts'>('all');
  const [selectedTag, setSelectedTag] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Retrieve all discoverable users including preset creators and post authors
  const allUsers = useMemo(() => {
    return getAllDiscoverableUsers(allPosts);
  }, [allPosts]);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleFollowClick = (e: React.MouseEvent, user: PublicUserProfile) => {
    e.stopPropagation();
    if (!currentUser) {
      onRequireLogin?.();
      return;
    }
    onFollowToggle?.(user);
  };

  const isUserFollowed = (user: PublicUserProfile) => {
    const targetKey1 = user.username.toLowerCase();
    const targetKey2 = user.uid.toLowerCase();
    const targetKey3 = user.userId.toLowerCase();
    return followingList.some(
      (f) =>
        f.toLowerCase() === targetKey1 ||
        f.toLowerCase() === targetKey2 ||
        f.toLowerCase() === targetKey3
    );
  };

  // Filtered Users based on ID, username, or display name
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim().replace(/^@/, '').replace(/^id:/, '');
    if (!q) {
      // In accounts tab or default, show recommended creators
      return allUsers.filter(
        (u) => !currentUser || u.uid !== currentUser.uid && u.username.toLowerCase() !== currentUser.username.toLowerCase()
      );
    }

    return allUsers.filter((user) => {
      const matchId = (user.userId || '').toLowerCase().includes(q) || user.uid.toLowerCase().includes(q);
      const matchUsername = user.username.toLowerCase().includes(q);
      const matchName = user.displayName.toLowerCase().includes(q);
      const matchBio = (user.bio || '').toLowerCase().includes(q);
      return matchId || matchUsername || matchName || matchBio;
    });
  }, [allUsers, searchQuery, currentUser]);

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const query = searchQuery.toLowerCase().trim();
      const tagMatch =
        selectedTag === 'All' ||
        post.caption.toLowerCase().includes(selectedTag.toLowerCase()) ||
        post.filter?.toLowerCase() === selectedTag.toLowerCase();

      if (!query) return tagMatch;

      return (
        tagMatch &&
        (post.caption.toLowerCase().includes(query) ||
          post.username.toLowerCase().includes(query) ||
          (post.location && post.location.toLowerCase().includes(query)))
      );
    }).sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }, [allPosts, searchQuery, selectedTag]);

  // Check if search query looks like an exact custom ID not in users list
  const cleanQuery = searchQuery.trim().toLowerCase().replace(/^id:/, '');
  const hasExactUserMatch = allUsers.some(
    (u) =>
      u.userId.toLowerCase() === cleanQuery ||
      u.username.toLowerCase() === cleanQuery ||
      u.uid.toLowerCase() === cleanQuery
  );
  const showCustomIdFallback = cleanQuery.length >= 3 && !hasExactUserMatch;

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-[calc(100vh-110px)] pb-24">
      {/* Search Header */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-xl px-3 pt-3 pb-2.5 border-b border-zinc-800/80">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by User ID (e.g. maya_9021), @username, or posts..."
            className="w-full bg-zinc-900/90 hover:bg-zinc-850 focus:bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 pl-9 pr-9 py-2.5 rounded-xl border border-zinc-800 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 text-zinc-500 hover:text-zinc-200"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Mode Tabs (All / User ID & People / Posts) */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
            }`}
            type="button"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Top</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
            }`}
            type="button"
          >
            <Fingerprint className="w-3.5 h-3.5 text-purple-300" />
            <span>User ID & Accounts</span>
            {filteredUsers.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-zinc-300 font-mono">
                {filteredUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'posts'
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
            }`}
            type="button"
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Posts</span>
          </button>
        </div>

        {/* Tags horizontal pills (when viewing all or posts) */}
        {activeTab !== 'accounts' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5">
            {TRENDING_TAGS.map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  type="button"
                  className={`flex-none text-xs px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-850'
                  }`}
                >
                  {tag === 'All' ? tag : `#${tag}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 1: USER ID SEARCH RESULTS */}
      {(activeTab === 'accounts' || (searchQuery.trim().length > 0 && activeTab === 'all')) && (
        <div className="p-3">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                {searchQuery ? 'Matching Accounts & User IDs' : 'Suggested Creators & IDs'}
              </h3>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">
              {filteredUsers.length} found
            </span>
          </div>

          {/* User Results List */}
          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const isFollowing = isUserFollowed(user);
              const isMe = currentUser && (currentUser.uid === user.uid || currentUser.username.toLowerCase() === user.username.toLowerCase());

              return (
                <div
                  key={user.uid || user.username}
                  onClick={() => onSelectUser?.(user)}
                  className="p-3 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="relative flex-none">
                      <div className="w-12 h-12 rounded-full p-[1.5px] ig-story-gradient flex items-center justify-center">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=3a1af2&color=fff`}
                          alt={user.displayName}
                          className="w-full h-full rounded-full object-cover bg-zinc-950 p-[1px]"
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                          {user.displayName}
                        </span>
                        {user.isVerified && (
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white" title="Verified Creator">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-zinc-400 font-medium">
                          @{user.username}
                        </span>

                        {/* Explicit User ID badge with copy */}
                        <button
                          onClick={(e) => handleCopyId(e, user.userId || user.uid)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/90 hover:bg-zinc-750 text-[10px] font-mono text-purple-300 border border-purple-500/20 transition-colors"
                          title="Click to copy User ID"
                          type="button"
                        >
                          <span>ID: {user.userId || user.uid}</span>
                          {copiedId === (user.userId || user.uid) ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-zinc-400" />
                          )}
                        </button>
                      </div>

                      {user.bio && (
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                          {user.bio}
                        </p>
                      )}

                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        <span className="text-zinc-300 font-semibold">{user.followersCount + (isFollowing ? 1 : 0)}</span> followers
                      </div>
                    </div>
                  </div>

                  {/* Follow / Following Button */}
                  {!isMe ? (
                    <button
                      onClick={(e) => handleFollowClick(e, user)}
                      className={`flex-none py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                        isFollowing
                          ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 hover:text-rose-400'
                          : 'bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white shadow-purple-500/20'
                      }`}
                      type="button"
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-500 px-2 font-medium">You</span>
                  )}
                </div>
              );
            })}

            {/* Custom / Direct User ID Lookup Card */}
            {showCustomIdFallback && (
              <div className="p-3.5 bg-gradient-to-br from-purple-950/40 to-zinc-900 border border-purple-500/30 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Direct User ID Lookup</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Search network for ID: <span className="text-purple-300 font-mono font-bold">{cleanQuery}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    const fallbackUser: PublicUserProfile = {
                      uid: `usr_${cleanQuery}`,
                      userId: cleanQuery,
                      username: cleanQuery,
                      displayName: cleanQuery.replace(/_/g, ' ').toUpperCase(),
                      avatar: '',
                      bio: `Noise Network User with ID ${cleanQuery}`,
                      followersCount: 1,
                      followingCount: 0,
                    };
                    onSelectUser?.(fallbackUser);
                  }}
                  className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1"
                  type="button"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>View Profile</span>
                </button>
              </div>
            )}

            {filteredUsers.length === 0 && !showCustomIdFallback && (
              <div className="py-10 text-center text-zinc-500 text-xs bg-zinc-900/30 rounded-2xl border border-zinc-850">
                <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-300 font-semibold">No users matching "{searchQuery}"</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Try searching by an exact User ID (e.g. maya_9021, alex_4082) or @username.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: EXPLORE POSTS GRID */}
      {activeTab !== 'accounts' && (
        <div className="mt-2">
          {searchQuery && activeTab === 'all' && (
            <div className="px-4 py-1.5 flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <Hash className="w-3.5 h-3.5 text-zinc-500" />
              <span>Posts & Content ({filteredPosts.length})</span>
            </div>
          )}

          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 p-1">
              {filteredPosts.map((post) => {
                const isVideo =
                  post.mediaType === 'video' ||
                  post.image?.startsWith('data:video/') ||
                  post.image?.includes('.mp4') ||
                  post.image?.includes('.webm') ||
                  post.caption?.includes('🎥');

                return (
                  <div
                    key={post.id}
                    onClick={() => onSelectPost(post)}
                    className="group relative aspect-square bg-zinc-900 overflow-hidden cursor-pointer"
                  >
                    {isVideo ? (
                      <video
                        src={post.image}
                        muted
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />
                    ) : (
                      <img
                        src={post.image}
                        alt={post.caption || 'Explore post'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}

                    {isVideo && (
                      <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-md text-white z-10">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2">
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <Heart className="w-4 h-4 fill-white" />
                        <span>{post.likes || 0}</span>
                      </div>
                      {post.caption && (
                        <span className="text-[10px] text-zinc-200 mt-1 truncate max-w-full text-center">
                          {post.caption}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-4 text-zinc-500 text-xs">
              {searchQuery ? (
                <p>No posts matching "{searchQuery}".</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold text-zinc-300">No explore posts yet</p>
                  <p className="text-zinc-500">Share your photo or video to be first on Explore!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
