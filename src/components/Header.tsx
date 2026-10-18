import React from 'react';
import { Heart, MessageCircle, LogIn, LogOut, Coins, Menu, Radio } from 'lucide-react';
import { AppUser } from '../types';

interface HeaderProps {
  currentUser: AppUser | null;
  coinsBalance?: number;
  onOpenLogin: () => void;
  onSignOut: () => void;
  onOpenDirect: () => void;
  onOpenNotifications: () => void;
  onOpenVoiceRooms?: () => void;
  onOpenAdmin?: () => void;
  onOpenMenu?: () => void;
  onOpenCoins?: () => void;
  unreadCount?: number;
  hasActiveLiveRoom?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  coinsBalance = 150,
  onOpenLogin,
  onSignOut,
  onOpenDirect,
  onOpenNotifications,
  onOpenVoiceRooms,
  onOpenAdmin,
  onOpenMenu,
  onOpenCoins,
  unreadCount = 0,
  hasActiveLiveRoom = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img 
          src="/SVG.svg" 
          alt="App Logo" 
          className="h-8 w-auto cursor-pointer hover:opacity-90 transition-opacity" 
        />
        <h1 className="font-brand text-3xl font-bold tracking-tight select-none cursor-pointer hover:opacity-90 transition-opacity brand-gradient-text">
          Noise
        </h1>
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
          PRO
        </span>

        {/* Coin Balance Badge */}
        {currentUser && (
          <button
            onClick={onOpenCoins}
            className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-xs font-bold text-amber-400 hover:bg-zinc-800 transition-all ml-1"
            title="Buy Coins"
            type="button"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{coinsBalance}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Top Right Chatroom Icon */}
        {onOpenVoiceRooms && (
          <button
            onClick={onOpenVoiceRooms}
            className="relative p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-full transition-all group"
            title="Voice Chatrooms"
            type="button"
          >
            <Radio className="w-5 h-5 text-rose-500 animate-pulse group-hover:scale-110 transition-transform" />
            {hasActiveLiveRoom && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-zinc-950 animate-ping" />
            )}
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-full transition-colors"
          title="Notifications"
          type="button"
        >
          <Heart className="w-5 h-5 stroke-[1.8] hover:text-rose-500 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff3040] rounded-full ring-2 ring-zinc-950"></span>
          )}
        </button>

        {/* Direct Messages: Changed flight icon to message icon */}
        <button
          onClick={onOpenDirect}
          className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-full transition-colors relative"
          title="Direct Messages"
          type="button"
        >
          <MessageCircle className="w-5 h-5 stroke-[1.8]" />
          <span className="absolute top-1 right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-[9px] font-bold text-white ring-2 ring-zinc-950 shadow-sm">
            2
          </span>
        </button>

        {/* 3-Line Hamburger Menu Button */}
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-full transition-colors"
            title="Menu"
            type="button"
          >
            <Menu className="w-6 h-6 stroke-[1.8]" />
          </button>
        )}

        {currentUser ? (
          <div className="flex items-center gap-2 pl-1">
            {currentUser.username === 'shoebell_shoe' && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="text-[10px] font-bold text-red-400 border border-red-500/30 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 transition-colors uppercase"
                title="Master Dashboard"
                type="button"
              >
                Admin
              </button>
            )}

            <button
              onClick={onSignOut}
              className="text-xs font-semibold text-zinc-400 hover:text-rose-400 transition-colors flex items-center gap-1 border border-zinc-800 px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800"
              title="Sign Out"
              type="button"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
            type="button"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
        )}
      </div>
    </header>
  );
};
