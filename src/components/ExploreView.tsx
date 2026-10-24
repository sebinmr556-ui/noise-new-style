import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  MessageCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Flame,
  TrendingUp,
  Tag,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { Post, AppUser, PublicUserProfile } from '../types';
import { searchRegisteredUsers, getSuggestedDatabaseUsers } from '../utils/userSearch';

export interface TrendingTopic {
  id: string;
  rank: number;
  tag: string;
  name: string;
  category: string;
  postCount: string;
  growth: string;
  isHot?: boolean;
}

export const POPULAR_HASHTAGS: TrendingTopic[] = [
  {
    id: '1',
    rank: 1,
    tag: '#NoiseVibes',
    name: 'Noise Vibes',
    category: 'Community',
    postCount: '52.4K',
    growth: '+48%',
    isHot: true,
  },
  {
    id: '2',
    rank: 2,
    tag: '#StreetPhotography',
    name: 'Street Photography',
    category: 'Photography',
    postCount: '38.1K',
    growth: '+32%',
    isHot: true,
  },
  {
    id: '3',
    rank: 3,
    tag: '#LofiBeats',
    name: 'Lo-Fi Beats',
    category: 'Music & Audio',
    postCount: '29.7K',
    growth: '+61%',
    isHot: true,
  },
  {
    id: '4',
    rank: 4,
    tag: '#GoldenHour',
    name: 'Golden Hour',
    category: 'Visual Art',
    postCount: '24.5K',
    growth: '+19%',
  },
  {
    id: '5',
    rank: 5,
    tag: '#CyberpunkAesthetic',
    name: 'Cyberpunk Aesthetic',
    category: 'Digital Art',
    postCount: '19.8K',
    growth: '+27%',
    isHot: true,
  },
  {
    id: '6',
    rank: 6,
    tag: '#VintageFilm',
    name: 'Vintage 35mm',
    category: 'Retro Film',
    postCount: '16.3K',
    growth: '+14%',
  },
  {
    id: '7',
    rank: 7,
    tag: '#TokyoNights',
    name: 'Tokyo Nights',
    category: 'Travel & Mood',
    postCount: '14.9K',
    growth: '+35%',
  },
  {
    id: '8',
    rank: 8,
    tag: '#IndieCreators',
    name: 'Indie Creators',
    category: 'Community',
    postCount: '11.8K',
    growth: '+22%',
  },
];

interface ExploreViewProps {
  allPosts: Post[];
  currentUser: AppUser | null;
  followingList?: string[];
  onFollowToggle?: (user: PublicUserProfile) => void;
  onSelectPost: (post: Post) => void;
  onSelectUser?: (user: PublicUserProfile) => void;
  onOpenDirect?: (user: PublicUserProfile) => void;
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
  onOpenDirect,
  onRequireLogin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'accounts' | 'posts'>('all');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Persistent Recent Searches State (localStorage)
  const RECENT_SEARCHES_KEY = 'noise_recent_searches';
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('noise_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0).slice(0, 15);
        }
      }
    } catch (e) {
      console.debug('Error reading recent searches from localStorage:', e);
    }
    return [];
  });

  const addRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== clean.toLowerCase());
      const nextList = [clean, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextList));
      } catch (e) {
        console.debug('Error saving recent searches to localStorage:', e);
      }
      return nextList;
    });
  };

  const removeRecentSearch = (termToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches((prev) => {
      const nextList = prev.filter((item) => item.toLowerCase() !== termToRemove.toLowerCase());
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextList));
      } catch (e) {
        console.debug('Error removing recent search:', e);
      }
      return nextList;
    });
  };

  const clearAllRecentSearches = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      console.debug('Error clearing recent searches:', e);
    }
  };

  // Real Database Users State
  const [dbUsers, setDbUsers] = useState<PublicUserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);

  // Initial load of suggested registered users from the real database
  useEffect(() => {
    let isCancelled = false;

    const fetchInitialUsers = async () => {
      setIsLoadingUsers(true);
      setUserSearchError(null);
      try {
        const users = await getSuggestedDatabaseUsers(currentUser, 20);
        if (!isCancelled) {
          setDbUsers(users);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load registered users from database:', err);
          setUserSearchError('Failed to load registered users from database.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingUsers(false);
        }
      }
    };

    fetchInitialUsers();

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  // Handle debounced search when user types
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      // Re-fetch default suggested registered users
      setIsLoadingUsers(true);
      setUserSearchError(null);
      getSuggestedDatabaseUsers(currentUser, 20)
        .then((users) => {
          setDbUsers(users);
        })
        .catch((err) => {
          console.error('Error fetching initial users:', err);
          setUserSearchError('Could not load users.');
        })
        .finally(() => {
          setIsLoadingUsers(false);
        });
      return;
    }

    setIsLoadingUsers(true);
    setUserSearchError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchRegisteredUsers(trimmedQuery, {
          currentUser,
          maxResults: 30,
        });
        setDbUsers(results);
        if (trimmedQuery.length >= 3) {
          addRecentSearch(trimmedQuery);
        }
      } catch (err: any) {
        console.error('User search error:', err);
        setUserSearchError('Error connecting to the users database. Please try again.');
      } finally {
        setIsLoadingUsers(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, currentUser]);

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

  const handleMessageClick = (e: React.MouseEvent, user: PublicUserProfile) => {
    e.stopPropagation();
    if (!currentUser) {
      onRequireLogin?.();
      return;
    }
    onOpenDirect?.(user);
  };

  const isUserFollowed = (user: PublicUserProfile) => {
    const targetUid = user.uid.toLowerCase();
    const targetUsername = user.username.toLowerCase();
    const targetUserId = (user.userId || '').toLowerCase();
    return followingList.some(
      (f) => {
        const lower = f.toLowerCase();
        return lower === targetUid || lower === targetUsername || lower === targetUserId;
      }
    );
  };

  // Filtered Posts from feed
  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const query = searchQuery.toLowerCase().trim();
      const tagMatch =
        selectedTag === 'All' ||
        post.caption.toLowerCase().includes(selectedTag.toLowerCase()) ||
        post.filter?.toLowerCase() === selectedTag.toLowerCase();

      const topicMatch =
        !selectedTopic ||
        post.caption.toLowerCase().includes(selectedTopic.tag.toLowerCase()) ||
        post.caption.toLowerCase().includes(selectedTopic.tag.replace('#', '').toLowerCase()) ||
        post.caption.toLowerCase().includes(selectedTopic.name.toLowerCase()) ||
        (post.filter && post.filter.toLowerCase().includes(selectedTopic.name.toLowerCase()));

      if (!query) return tagMatch && topicMatch;

      return (
        tagMatch &&
        topicMatch &&
        (post.caption.toLowerCase().includes(query) ||
          post.username.toLowerCase().includes(query) ||
          (post.location && post.location.toLowerCase().includes(query)))
      );
    }).sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }, [allPosts, searchQuery, selectedTag, selectedTopic]);

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-[calc(100vh-110px)] pb-24">
      {/* Search Header */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-xl px-3 pt-3 pb-2.5 border-b border-zinc-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              addRecentSearch(searchQuery.trim());
            }
          }}
          className="relative"
        >
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                addRecentSearch(searchQuery.trim());
              }
            }}
            placeholder="Search by registered User ID, @username, or name..."
            className="w-full bg-zinc-900/90 hover:bg-zinc-850 focus:bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 pl-9 pr-9 py-2.5 rounded-xl border border-zinc-800 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 focus:outline-none transition-all shadow-inner"
          />
          {isLoadingUsers ? (
            <div className="absolute right-3.5 top-3">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            </div>
          ) : searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              type="button"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </form>

        {/* View Mode Tabs (Top / User ID & Accounts / Posts) */}
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
            <span>Registered Accounts & IDs</span>
            {dbUsers.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-zinc-300 font-mono">
                {dbUsers.length}
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

      {/* RECENT SEARCHES SECTION (Persistent across sessions via localStorage) */}
      {!searchQuery && recentSearches.length > 0 && (
        <div className="px-3.5 py-3 border-b border-zinc-900 bg-zinc-950/70 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Recent Searches
              </h3>
            </div>
            <button
              onClick={clearAllRecentSearches}
              type="button"
              className="text-[11px] text-zinc-500 hover:text-rose-400 font-medium transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-900"
              title="Clear all recent searches"
            >
              Clear all
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {recentSearches.map((term) => (
              <div
                key={term}
                onClick={() => {
                  setSearchQuery(term);
                  addRecentSearch(term);
                }}
                className="group flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-purple-500/50 text-xs text-zinc-200 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Search className="w-3 h-3 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                <span className="truncate max-w-[150px] font-medium">{term}</span>
                <button
                  type="button"
                  onClick={(e) => removeRecentSearch(term, e)}
                  className="p-0.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors ml-0.5 cursor-pointer"
                  title={`Remove "${term}"`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 1: REAL DATABASE USER RESULTS */}
      {(activeTab === 'accounts' || (searchQuery.trim().length > 0 && activeTab === 'all')) && (
        <div className="p-3">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                {searchQuery ? 'Matching Database Users' : 'Registered Users in Database'}
              </h3>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">
              {isLoadingUsers ? 'Searching...' : `${dbUsers.length} found`}
            </span>
          </div>

          {/* Error Message */}
          {userSearchError && (
            <div className="mb-3 p-3 bg-red-950/40 border border-red-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-none" />
                <span>{userSearchError}</span>
              </div>
              <button
                onClick={() => {
                  setUserSearchError(null);
                  searchRegisteredUsers(searchQuery, { currentUser })
                    .then(setDbUsers)
                    .catch((e) => setUserSearchError(e.message));
                }}
                className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 rounded-lg text-xs font-semibold text-white flex items-center gap-1"
                type="button"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoadingUsers && dbUsers.length === 0 && (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex-none" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 bg-zinc-800 rounded" />
                    <div className="h-2.5 w-40 bg-zinc-800/60 rounded" />
                    <div className="h-2 w-20 bg-zinc-850 rounded" />
                  </div>
                  <div className="w-16 h-8 bg-zinc-800 rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {/* User Results List */}
          <div className="space-y-2">
            {dbUsers.map((user) => {
              const isFollowing = isUserFollowed(user);
              const isMe = currentUser && (currentUser.uid === user.uid || currentUser.username.toLowerCase() === user.username.toLowerCase());
              const displayAvatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=3a1af2&color=fff`;

              return (
                <div
                  key={user.uid}
                  onClick={() => {
                    if (searchQuery.trim()) {
                      addRecentSearch(searchQuery.trim());
                    }
                    onSelectUser?.(user);
                  }}
                  className="p-3 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="relative flex-none">
                      <div className="w-12 h-12 rounded-full p-[1.5px] noise-story-gradient flex items-center justify-center">
                        <img
                          src={displayAvatar}
                          alt={user.displayName}
                          className="w-full h-full rounded-full object-cover bg-zinc-950 p-[1px]"
                          onError={(e: any) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=6366f1&color=fff`;
                          }}
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
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white" title="Verified Account">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </span>
                        )}
                        {user.isPrivate && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            <span>Private</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-zinc-400 font-medium">
                          @{user.username}
                        </span>

                        {/* Real Database User ID Badge with 1-click copy */}
                        <button
                          onClick={(e) => handleCopyId(e, user.uid)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/90 hover:bg-zinc-750 text-[10px] font-mono text-purple-300 border border-purple-500/20 transition-colors cursor-pointer"
                          title="Click to copy exact Database User ID"
                          type="button"
                        >
                          <span className="max-w-[130px] sm:max-w-[200px] truncate">ID: {user.uid}</span>
                          {copiedId === user.uid ? (
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

                  {/* Actions (Message + Follow / Following) */}
                  {!isMe ? (
                    <div className="flex items-center gap-1.5 flex-none">
                      {/* Message Button with real User ID */}
                      {onOpenDirect && (
                        <button
                          onClick={(e) => handleMessageClick(e, user)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-750"
                          title={`Message @${user.username}`}
                          type="button"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-zinc-300" />
                        </button>
                      )}

                      {/* Follow Button with real User ID */}
                      <button
                        onClick={(e) => handleFollowClick(e, user)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
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
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500 px-2 font-medium">You</span>
                  )}
                </div>
              );
            })}

            {/* Empty State */}
            {!isLoadingUsers && dbUsers.length === 0 && (
              <div className="py-12 text-center text-zinc-500 text-xs bg-zinc-900/30 rounded-2xl border border-zinc-850 p-6">
                <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-200 font-semibold text-sm">No registered users matching "{searchQuery}"</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto">
                  Try searching by an exact registered database ID (e.g. 6VNAsBIMzdU6Zfr3BtmYzqP3gu22), display name, or @username.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: EXPLORE POSTS GRID */}
      {activeTab !== 'accounts' && (
        <div className="mt-2">
          {/* Trending Topics & Popular Tags Section (displayed when not searching or when viewing feed) */}
          {!searchQuery && (
            <div className="mb-4 pt-1">
              {/* Section Header */}
              <div className="px-3.5 flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/30">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 tracking-wide flex items-center gap-1.5">
                      Trending Topics
                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded-full">
                        Popular Tags
                      </span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Live Pulse</span>
                </div>
              </div>

              {/* Horizontal Scroll of Trending Topic Cards */}
              <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar px-3 pb-1">
                {POPULAR_HASHTAGS.map((topic) => {
                  const isSelected = selectedTopic?.id === topic.id;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(isSelected ? null : topic)}
                      type="button"
                      className={`flex-none w-[168px] text-left p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-gradient-to-b from-purple-950/60 to-zinc-900 border-purple-500/80 ring-1 ring-purple-500/50 shadow-lg shadow-purple-950/40'
                          : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700/80 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Rank & Hot Badge */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 group-hover:text-zinc-300">
                          #{topic.rank}
                        </span>
                        <div className="flex items-center gap-1">
                          {topic.isHot && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 fill-amber-400" />
                              HOT
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-500 group-hover:text-zinc-400 truncate max-w-[70px]">
                            {topic.category}
                          </span>
                        </div>
                      </div>

                      {/* Tag Name */}
                      <p className={`text-xs font-bold truncate transition-colors ${
                        isSelected ? 'text-purple-300' : 'text-zinc-100 group-hover:text-purple-300'
                      }`}>
                        {topic.tag}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {topic.name}
                      </p>

                      {/* Bottom Row: Posts count & Growth */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60 text-[10px]">
                        <span className="text-zinc-400 font-medium">
                          {topic.postCount}
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" />
                          {topic.growth}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Popular Tags Quick Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 pt-2">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-500 flex-none pr-1">
                  <Tag className="w-3 h-3 text-zinc-500" />
                  <span>Tags:</span>
                </div>
                {POPULAR_HASHTAGS.map((topic) => {
                  const isSelected = selectedTopic?.id === topic.id;
                  return (
                    <button
                      key={`chip-${topic.id}`}
                      onClick={() => setSelectedTopic(isSelected ? null : topic)}
                      type="button"
                      className={`flex-none text-[11px] px-2.5 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-purple-600 text-white font-semibold shadow-xs'
                          : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      <span>{topic.tag}</span>
                      <span className="text-[9px] text-zinc-500 opacity-80">{topic.postCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filter Bar if a topic is selected */}
          {selectedTopic && (
            <div className="mx-3 mb-3 p-2.5 bg-gradient-to-r from-purple-950/40 to-indigo-950/30 border border-purple-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-md bg-purple-500/20 text-purple-300 flex-none">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-white truncate">{selectedTopic.tag}</span>
                    <span className="text-[10px] text-purple-300 font-medium">({selectedTopic.postCount} posts)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    Showing content matching topic "{selectedTopic.name}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer flex-none"
                type="button"
                title="Clear topic filter"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          )}

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
                    onClick={() => {
                      if (searchQuery.trim()) {
                        addRecentSearch(searchQuery.trim());
                      }
                      onSelectPost(post);
                    }}
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
              {selectedTopic ? (
                <div className="space-y-2 max-w-xs mx-auto">
                  <div className="w-10 h-10 rounded-full bg-purple-950/40 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-zinc-200">No local posts tagged {selectedTopic.tag} yet</p>
                  <p className="text-zinc-500 text-[11px]">
                    This topic has {selectedTopic.postCount} global mentions! Create a post using {selectedTopic.tag} to be featured first.
                  </p>
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    type="button"
                  >
                    <span>Clear Tag Filter</span>
                  </button>
                </div>
              ) : searchQuery ? (
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
