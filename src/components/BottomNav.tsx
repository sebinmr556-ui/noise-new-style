import React from 'react';
import { Home, Search, PlusSquare, Clapperboard, User as UserIcon } from 'lucide-react';
import { NavTab, AppUser } from '../types';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: AppUser | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  currentUser,
}) => {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[470px] bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 h-13 z-40 flex items-center justify-around px-2 shadow-lg shadow-black/50">
      {/* Home */}
      <button
        onClick={() => onTabChange('home')}
        className={`p-2 transition-transform active:scale-75 ${
          activeTab === 'home' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
        type="button"
        title="Home"
      >
        <Home className={`w-6 h-6 stroke-[1.8] ${activeTab === 'home' ? 'fill-white' : ''}`} />
      </button>

      {/* Search */}
      <button
        onClick={() => onTabChange('search')}
        className={`p-2 transition-transform active:scale-75 ${
          activeTab === 'search' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
        type="button"
        title="Search"
      >
        <Search className={`w-6 h-6 ${activeTab === 'search' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
      </button>

      {/* Create / Upload */}
      <button
        onClick={() => onTabChange('upload')}
        className={`p-2 transition-transform active:scale-75 ${
          activeTab === 'upload' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
        type="button"
        title="Create post"
      >
        <PlusSquare className={`w-6 h-6 stroke-[1.8] ${activeTab === 'upload' ? 'fill-white text-zinc-950' : ''}`} />
      </button>

      {/* Reels */}
      <button
        onClick={() => onTabChange('reels')}
        className={`p-2 transition-transform active:scale-75 ${
          activeTab === 'reels' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
        type="button"
        title="Reels"
      >
        <Clapperboard className={`w-6 h-6 stroke-[1.8] ${activeTab === 'reels' ? 'fill-white' : ''}`} />
      </button>

      {/* Profile */}
      <button
        onClick={() => onTabChange('profile')}
        className="p-2 transition-transform active:scale-75 relative"
        type="button"
        title="Profile"
      >
        {currentUser?.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt="Profile"
            className={`w-6 h-6 rounded-full object-cover border-2 transition-colors ${
              activeTab === 'profile' ? 'border-white ring-1 ring-rose-500' : 'border-transparent'
            }`}
          />
        ) : (
          <UserIcon
            className={`w-6 h-6 stroke-[1.8] ${
              activeTab === 'profile' ? 'text-white stroke-[2.5]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          />
        )}
      </button>
    </nav>
  );
};
