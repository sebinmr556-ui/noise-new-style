import { Heart, Send, LogIn, LogOut, Radio } from 'lucide-react';
import { AppUser } from '../types';

interface HeaderProps {
  currentUser: AppUser | null;
  onOpenLogin: () => void;
  onSignOut: () => void;
  onOpenDirect: () => void;
  onOpenNotifications: () => void;
  onOpenVoiceRooms?: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLogin,
  onSignOut,
  onOpenDirect,
  onOpenNotifications,
  onOpenVoiceRooms,
  unreadCount = 2,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="font-brand text-3xl font-bold tracking-tight select-none cursor-pointer hover:opacity-90 transition-opacity brand-gradient-text">
          Noise
        </h1>
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
          PRO
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Voice Chatrooms Live button */}
        {onOpenVoiceRooms && (
          <button
            onClick={onOpenVoiceRooms}
            className="relative p-1.5 text-zinc-300 hover:text-white transition-colors"
            title="Voice Chatrooms"
            type="button"
          >
            <Radio className="w-5.5 h-5.5 stroke-[1.8]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-zinc-950 animate-ping"></span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-zinc-950"></span>
          </button>
        )}

        {/* Activity / Heart icon */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 text-zinc-300 hover:text-white transition-colors"
          title="Notifications"
          type="button"
        >
          <Heart className="w-6 h-6 stroke-[1.8]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff3040] rounded-full ring-2 ring-zinc-950"></span>
          )}
        </button>

        {/* Direct Messages icon */}
        <button
          onClick={onOpenDirect}
          className="p-1.5 text-zinc-300 hover:text-white transition-colors relative"
          title="Direct Messages"
          type="button"
        >
          <Send className="w-6 h-6 stroke-[1.8] -rotate-12" />
          <span className="absolute top-0 right-0 text-[10px] bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold px-1 rounded-full min-w-[16px] text-center shadow-xs">
            3
          </span>
        </button>

        {/* Login or user logout */}
        {currentUser ? (
          <div className="flex items-center gap-2 pl-1">
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
