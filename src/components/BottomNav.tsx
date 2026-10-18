import React from 'react';
import { 
  Home, 
  Search, 
  PlusSquare, 
  Clapperboard, 
  User as UserIcon,
  Compass
} from 'lucide-react';
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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[470px] bg-zinc-950/92 backdrop-blur-2xl border-t border-white/[0.08] h-16 z-40 flex items-center justify-around px-4 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.6)]">
      {/* Home */}
      <button
        onClick={() => onTabChange('home')}
        className="relative flex flex-col items-center justify-center p-2.5 group transition-all duration-200 active:scale-90"
        type="button"
        title="Home Feed"
      >
        <Home 
          className={`w-[26px] h-[26px] transition-all duration-200 ${
            activeTab === 'home' 
              ? 'stroke-[2.5] text-white fill-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
              : 'stroke-[1.8] text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105'
          }`} 
        />
        {activeTab === 'home' && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-indigo-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-in zoom-in-50 duration-150" />
        )}
      </button>

      {/* Explore / Search */}
      <button
        onClick={() => onTabChange('search')}
        className="relative flex flex-col items-center justify-center p-2.5 group transition-all duration-200 active:scale-90"
        type="button"
        title="Explore & Search"
      >
        <Search 
          className={`w-[26px] h-[26px] transition-all duration-200 ${
            activeTab === 'search' 
              ? 'stroke-[2.8] text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
              : 'stroke-[1.8] text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105'
          }`} 
        />
        {activeTab === 'search' && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-indigo-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-in zoom-in-50 duration-150" />
        )}
      </button>

      {/* Create / Upload - Modern Elevated Center Button */}
      <button
        onClick={() => onTabChange('upload')}
        className="relative flex flex-col items-center justify-center p-1 group transition-all duration-200 active:scale-90 -translate-y-0.5"
        type="button"
        title="Create New Post or Reel"
      >
        <div 
          className={`p-2 rounded-2xl transition-all duration-200 flex items-center justify-center ${
            activeTab === 'upload'
              ? 'bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-110 ring-2 ring-white/30'
              : 'border border-zinc-700/80 hover:border-rose-500/50 bg-gradient-to-tr from-zinc-900 to-zinc-800 text-zinc-200 hover:text-white shadow-md hover:shadow-rose-500/20 group-hover:scale-105'
          }`}
        >
          <PlusSquare className="w-5 h-5 stroke-[2.4]" />
        </div>
      </button>

      {/* Reels */}
      <button
        onClick={() => onTabChange('reels')}
        className="relative flex flex-col items-center justify-center p-2.5 group transition-all duration-200 active:scale-90"
        type="button"
        title="Reels"
      >
        <Clapperboard 
          className={`w-[26px] h-[26px] transition-all duration-200 ${
            activeTab === 'reels' 
              ? 'stroke-[2.5] text-white fill-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
              : 'stroke-[1.8] text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105'
          }`} 
        />
        {activeTab === 'reels' && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-indigo-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-in zoom-in-50 duration-150" />
        )}
      </button>

      {/* Profile */}
      <button
        onClick={() => onTabChange('profile')}
        className="relative flex flex-col items-center justify-center p-2 group transition-all duration-200 active:scale-90"
        type="button"
        title="Profile"
      >
        {currentUser?.photoURL ? (
          <div className={`p-[2px] rounded-full transition-all duration-200 ${
            activeTab === 'profile'
              ? 'ring-2 ring-[#3a1af2] ring-offset-2 ring-offset-zinc-950 scale-110 shadow-[0_0_12px_rgba(58,26,242,0.6)]'
              : 'ring-1.5 ring-zinc-700 group-hover:ring-zinc-400'
          }`}>
            <img
              src={currentUser.photoURL}
              alt="Profile"
              className="w-6 h-6 rounded-full object-cover border border-[#3a1af2]"
            />
          </div>
        ) : (
          <UserIcon
            className={`w-[26px] h-[26px] transition-all duration-200 ${
              activeTab === 'profile'
                ? 'stroke-[2.5] text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                : 'stroke-[1.8] text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105'
            }`}
          />
        )}
        {activeTab === 'profile' && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-indigo-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-in zoom-in-50 duration-150" />
        )}
      </button>
    </nav>
  );
};
