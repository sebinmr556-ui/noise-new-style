import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Grid, 
  Bookmark, 
  Film, 
  Heart, 
  MessageCircle, 
  Settings, 
  ExternalLink, 
  User, 
  Trash2, 
  Camera, 
  X,
  Copy,
  Check,
  UserCheck,
  UserPlus,
  Users,
  Search,
  Fingerprint
} from 'lucide-react';
import { AppUser, Post, PublicUserProfile } from '../types';
import { EditProfileModal } from './EditProfileModal';
import { getAllDiscoverableUsers } from '../data/usersData';

interface ProfileViewProps {
  currentUser: AppUser | null;
  posts: Post[];
  savedPosts: Post[];
  followingList?: string[];
  onFollowToggle?: (user: PublicUserProfile | string) => void;
  onSelectUser?: (user: PublicUserProfile) => void;
  onUpdateAvatar: (dataUrl: string) => void;
  onRemoveAvatar: () => void;
  onUpdateProfile: (updates: {
    displayName: string;
    username: string;
    bio: string;
    website?: string;
  }) => void;
  onSelectPost: (post: Post) => void;
  onOpenUpload: () => void;
  onRequireLogin: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  posts,
  savedPosts,
  followingList = [],
  onFollowToggle,
  onSelectUser,
  onUpdateAvatar,
  onRemoveAvatar,
  onUpdateProfile,
  onSelectPost,
  onOpenUpload,
  onRequireLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedMyId, setCopiedMyId] = useState(false);
  const [showFollowListModal, setShowFollowListModal] = useState<'following' | 'followers' | null>(null);
  const [followSearchQuery, setFollowSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return (
      <div className="bg-zinc-950 min-h-[calc(100vh-110px)] flex flex-col items-center justify-center p-6 text-center text-zinc-100">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
          <Settings className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Log in to view your profile</h3>
        <p className="text-xs text-zinc-400 max-w-xs mb-5">
          Sign in to post pictures, save favorite photos, and customize your Noise profile.
        </p>
        <button
          onClick={onRequireLogin}
          className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-md"
          type="button"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  const hasPhoto = Boolean(
    currentUser.photoURL &&
    !currentUser.photoURL.includes('unsplash.com') &&
    !currentUser.photoURL.includes('ui-avatars.com')
  );

  const userPosts = posts.filter(
    (p) => p.uid === currentUser.uid || p.username === currentUser.username
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // ഫോട്ടോ സ്ട്രെച്ച് ആവാതിരിക്കാൻ സെന്റർ ക്രോപ്പ് ചെയ്യുന്നു
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          
          ctx.drawImage(img, x, y, size, size, 0, 0, 200, 200);
          const res = canvas.toDataURL('image/jpeg', 0.85);
          onUpdateAvatar(res);
          setShowPhotoModal(false);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    if (hasPhoto) {
      setShowPhotoModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${currentUser.displayName} on Noise`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-[calc(100vh-110px)] pb-20">
      {/* Profile Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80">
        <div className="flex items-center justify-between gap-4">
          {/* Avatar with + button */}
          <div className="relative flex-none">
            <div
              onClick={handleAvatarClick}
              className="w-20 h-20 rounded-full p-[2px] ig-story-gradient cursor-pointer group"
              title={hasPhoto ? "Manage profile photo" : "Upload profile photo"}
            >
              <div className="w-full h-full rounded-full bg-zinc-950 p-[2px] overflow-hidden flex items-center justify-center">
                {hasPhoto ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-full h-full rounded-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-800 transition-colors">
                    <User className="w-9 h-9 text-zinc-400 stroke-[1.8]" />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleAvatarClick}
              className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full flex items-center justify-center border-2 border-zinc-950 hover:opacity-90 shadow-md transition-transform active:scale-95 cursor-pointer"
              title={hasPhoto ? "Change or remove profile photo" : "Add Profile Photo"}
              type="button"
            >
              {hasPhoto ? (
                <Camera className="w-3 h-3 stroke-[2.5]" />
              ) : (
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Stats Bar */}
          <div className="flex flex-1 justify-around text-center">
            <div className="cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-base font-bold text-white">{userPosts.length}</div>
              <div className="text-xs text-zinc-400 font-normal">posts</div>
            </div>
            <div 
              onClick={() => setShowFollowListModal('followers')}
              className="cursor-pointer hover:opacity-80 transition-opacity group"
              title="View Followers"
            >
              <div className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                {currentUser.followersCount || 0}
              </div>
              <div className="text-xs text-zinc-400 font-normal group-hover:text-zinc-200">followers</div>
            </div>
            <div 
              onClick={() => setShowFollowListModal('following')}
              className="cursor-pointer hover:opacity-80 transition-opacity group"
              title="View Following list"
            >
              <div className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                {followingList.length > 0 ? followingList.length : (currentUser.followingCount || 0)}
              </div>
              <div className="text-xs text-zinc-400 font-normal group-hover:text-zinc-200">following</div>
            </div>
          </div>
        </div>

        {/* Bio Section with User ID Badge */}
        <div className="mt-3.5 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-bold text-white">{currentUser.displayName}</h2>
            {currentUser.isVerified && (
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white" title="Verified Creator">
                <Check className="w-2 h-2 stroke-[3]" />
              </span>
            )}
            
            {/* User ID Tag */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(currentUser.uid);
                setCopiedMyId(true);
                setTimeout(() => setCopiedMyId(false), 2000);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-purple-300 border border-purple-500/30 transition-colors ml-1 cursor-pointer"
              title="Click to copy your unique User ID"
              type="button"
            >
              <Fingerprint className="w-3 h-3 text-purple-400" />
              <span>ID: {currentUser.uid}</span>
              {copiedMyId ? (
                <Check className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-zinc-400" />
              )}
            </button>
          </div>

          <p className="text-xs text-zinc-400 font-medium">@{currentUser.username}</p>
          <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
            {currentUser.bio || 'Digital Creator ✨\nNoise App Official 🚀'}
          </p>
          {currentUser.website && (
            <a
              href={currentUser.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{currentUser.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-colors border border-zinc-800"
            type="button"
          >
            Edit profile
          </button>
          <button
            onClick={handleShareProfile}
            className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-colors border border-zinc-800"
            type="button"
          >
            {copiedShare ? 'Link Copied!' : 'Share profile'}
          </button>
          {hasPhoto && (
            <button
              onClick={onRemoveAvatar}
              className="py-1.5 px-3 bg-zinc-900 hover:bg-red-950/40 text-red-400 text-xs font-semibold rounded-xl transition-colors border border-zinc-800 hover:border-red-800/60 flex items-center gap-1"
              title="Remove profile photo"
              type="button"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remove</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
          type="button"
        >
          <Grid className="w-4 h-4" />
          <span className="hidden sm:inline">POSTS</span>
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'reels'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
          type="button"
        >
          <Film className="w-4 h-4" />
          <span className="hidden sm:inline">REELS</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'saved'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
          type="button"
        >
          <Bookmark className="w-4 h-4" />
          <span className="hidden sm:inline">SAVED</span>
        </button>
      </div>

      {/* Grid Content */}
      <div className="p-1">
        {activeTab === 'posts' && (
          userPosts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-full border-2 border-zinc-800 mx-auto flex items-center justify-center mb-3">
                <Grid className="w-6 h-6 text-zinc-600" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Share Photos</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4">
                When you share photos with filters, they will appear here.
              </p>
              <button
                onClick={onOpenUpload}
                className="text-xs font-bold text-rose-400 hover:text-rose-300"
                type="button"
              >
                Share your first photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="aspect-square bg-zinc-900 relative group cursor-pointer overflow-hidden rounded-xs"
                >
                  <img
                    src={post.image}
                    alt={post.caption || 'User post'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                    <Heart className="w-4 h-4 fill-white" />
                    <span>{post.likes}</span>
                    <MessageCircle className="w-4 h-4 fill-white ml-2" />
                    <span>{post.comments?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'reels' && (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-full border-2 border-zinc-800 mx-auto flex items-center justify-center mb-3">
              <Film className="w-6 h-6 text-zinc-600" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">No Reels Yet</h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4">
              Explore trending reels in the Reels tab.
            </p>
          </div>
        )}

        {activeTab === 'saved' && (
          savedPosts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-full border-2 border-zinc-800 mx-auto flex items-center justify-center mb-3">
                <Bookmark className="w-6 h-6 text-zinc-600" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Save Posts</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {savedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="aspect-square bg-zinc-900 relative group cursor-pointer overflow-hidden rounded-xs"
                >
                  <img
                    src={post.image}
                    alt={post.caption || 'Saved post'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                    <Heart className="w-4 h-4 fill-white" />
                    <span>{post.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Photo Options Modal (Change / Remove Photo) */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-950 text-zinc-100 border border-zinc-800 max-w-xs w-full rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-4 text-center">
            <h3 className="font-bold text-white text-sm mb-1">Change Profile Photo</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Update or remove your current profile picture.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md transition-opacity flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Upload New Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onRemoveAvatar();
                  setShowPhotoModal(false);
                }}
                className="w-full py-2.5 bg-zinc-900 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-zinc-800 hover:border-red-900/50 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Current Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="w-full py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <EditProfileModal
          currentUser={currentUser}
          onClose={() => setIsEditing(false)}
          onUpdateAvatar={onUpdateAvatar}
          onRemoveAvatar={onRemoveAvatar}
          onSaveProfile={onUpdateProfile}
        />
      )}

      {/* Followers & Following List Modal */}
      {showFollowListModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white capitalize">
                  {showFollowListModal === 'following' ? `Following (${followingList.length})` : 'Followers'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowFollowListModal(null);
                  setFollowSearchQuery('');
                }}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input within following/followers */}
            <div className="p-3 border-b border-zinc-800/60 bg-zinc-950">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by User ID or username..."
                  value={followSearchQuery}
                  onChange={(e) => setFollowSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 pl-8 pr-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-purple-500/80"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
              {(() => {
                const allDiscovered = getAllDiscoverableUsers(posts);
                const q = followSearchQuery.toLowerCase().trim();

                let listToShow: PublicUserProfile[] = [];

                if (showFollowListModal === 'following') {
                  listToShow = followingList.map((idOrUsername) => {
                    const found = allDiscovered.find(
                      (u) =>
                        u.uid.toLowerCase() === idOrUsername.toLowerCase() ||
                        u.username.toLowerCase() === idOrUsername.toLowerCase() ||
                        u.userId.toLowerCase() === idOrUsername.toLowerCase()
                    );
                    if (found) return found;
                    return {
                      uid: idOrUsername,
                      userId: idOrUsername,
                      username: idOrUsername.replace(/^usr_|^id_/, ''),
                      displayName: idOrUsername.replace(/_/g, ' '),
                      avatar: '',
                      followersCount: 1,
                      followingCount: 0,
                    };
                  });
                } else {
                  // Followers list
                  listToShow = allDiscovered.slice(0, 4);
                }

                if (q) {
                  listToShow = listToShow.filter(
                    (u) =>
                      u.username.toLowerCase().includes(q) ||
                      u.displayName.toLowerCase().includes(q) ||
                      u.userId.toLowerCase().includes(q) ||
                      u.uid.toLowerCase().includes(q)
                  );
                }

                if (listToShow.length === 0) {
                  return (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      <Users className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                      <p className="font-semibold text-zinc-400">
                        {q ? `No accounts matching "${q}"` : showFollowListModal === 'following' ? "You aren't following anyone yet" : "No followers yet"}
                      </p>
                      {showFollowListModal === 'following' && !q && (
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Explore creators and search by User ID to follow people!
                        </p>
                      )}
                    </div>
                  );
                }

                return listToShow.map((user) => {
                  const isFollowingThis = followingList.some(
                    (f) =>
                      f.toLowerCase() === user.username.toLowerCase() ||
                      f.toLowerCase() === user.uid.toLowerCase() ||
                      f.toLowerCase() === user.userId.toLowerCase()
                  );

                  return (
                    <div
                      key={user.uid || user.username}
                      onClick={() => {
                        onSelectUser?.(user);
                        setShowFollowListModal(null);
                      }}
                      className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/70 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full p-[1.5px] ig-story-gradient flex items-center justify-center flex-none">
                          <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=3a1af2&color=fff`}
                            alt={user.displayName}
                            className="w-full h-full rounded-full object-cover bg-zinc-950 p-[1px]"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                              {user.displayName}
                            </span>
                            {user.isVerified && (
                              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-blue-500 text-white">
                                <Check className="w-2 h-2 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                            <span>@{user.username}</span>
                            <span>•</span>
                            <span className="text-purple-300">ID: {user.userId || user.uid}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFollowToggle?.(user);
                        }}
                        className={`py-1 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 ${
                          isFollowingThis
                            ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/80 hover:text-rose-400'
                            : 'bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 text-white shadow-xs'
                        }`}
                        type="button"
                      >
                        {isFollowingThis ? (
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
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
