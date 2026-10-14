import React, { useState, useRef } from 'react';
import { X, Check, User, Camera, Trash2 } from 'lucide-react';
import { AppUser } from '../types';

interface EditProfileModalProps {
  currentUser: AppUser;
  onClose: () => void;
  onUpdateAvatar?: (dataUrl: string) => void;
  onRemoveAvatar?: () => void;
  onSaveProfile: (updates: {
    displayName: string;
    username: string;
    bio: string;
    website?: string;
  }) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  currentUser,
  onClose,
  onUpdateAvatar,
  onRemoveAvatar,
  onSaveProfile,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || 'Digital Creator ✨\nNoise App Official 🚀');
  const [website, setWebsite] = useState(currentUser.website || 'https://noise.app');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPhoto = Boolean(
    currentUser.photoURL &&
    !currentUser.photoURL.includes('unsplash.com') &&
    !currentUser.photoURL.includes('ui-avatars.com')
  );

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateAvatar) return;

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
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      displayName: displayName.trim() || 'User',
      username: username.trim().toLowerCase().replace(/\s+/g, '_') || 'user',
      bio: bio.trim(),
      website: website.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-950 text-zinc-100 border border-zinc-800 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs font-medium"
            type="button"
          >
            Cancel
          </button>
          <h3 className="text-xs font-bold text-white">Edit Profile</h3>
          <button
            onClick={handleSubmit}
            className="text-xs font-bold text-rose-500 hover:text-rose-400"
            type="button"
          >
            Done
          </button>
        </div>

        {/* Profile Photo Manager */}
        <div className="flex flex-col items-center justify-center pt-5 pb-2 border-b border-zinc-800/60">
          <div className="relative mb-2">
            <div className="w-20 h-20 rounded-full p-[2px] ig-story-gradient">
              <div className="w-full h-full rounded-full bg-zinc-950 p-[2px] overflow-hidden flex items-center justify-center">
                {hasPhoto ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
                    <User className="w-9 h-9 text-zinc-400 stroke-[1.8]" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{hasPhoto ? 'Change Photo' : 'Add Photo'}</span>
            </button>

            {hasPhoto && onRemoveAvatar && (
              <button
                type="button"
                onClick={onRemoveAvatar}
                className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFile}
            className="hidden"
          />
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourlink.com"
              className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md mt-2 transition-opacity"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};
