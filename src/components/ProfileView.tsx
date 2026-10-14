import React, { useState, useRef } from 'react';
import { Plus, Grid, Bookmark, Film, Heart, MessageCircle, Settings, ExternalLink, User, Trash2, Camera, X } from 'lucide-react';
import { AppUser, Post } from '../types';
import { EditProfileModal } from './EditProfileModal';

interface ProfileViewProps {
  currentUser: AppUser | null;
  posts: Post[];
  savedPosts: Post[];
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
            <div className="cursor-pointer">
              <div className="text-base font-bold text-white">{userPosts.length}</div>
              <div className="text-xs text-zinc-400 font-normal">posts</div>
            </div>
            <div className="cursor-pointer">
              <div className="text-base font-bold text-white">{currentUser.followersCount || 0}</div>
              <div className="text-xs text-zinc-400 font-normal">followers</div>
            </div>
            <div className="cursor-pointer">
              <div className="text-base font-bold text-white">{currentUser.followingCount || 0}</div>
              <div className="text-xs text-zinc-400 font-normal">following</div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mt-3.5 space-y-1">
          <h2 className="text-sm font-bold text-white">{currentUser.displayName}</h2>
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
    </div>
  );
};
