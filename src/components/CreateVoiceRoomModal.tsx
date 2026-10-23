import React, { useState } from 'react';
import { 
  X, 
  Mic, 
  Sparkles, 
  Crown, 
  Swords, 
  Users, 
  Flame, 
  Lock, 
  Volume2, 
  Gift, 
  Palette,
  Check
} from 'lucide-react';
import { AppUser } from '../types';

interface CreateVoiceRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onCreateRoom: (roomData: {
    title: string;
    topic: string;
    tags: string[];
    roomType: 'party_8' | 'pk_battle' | 'vip_lounge';
    roomTheme: string;
    seatCount: number;
    ambientVibe: 'none' | 'lofi' | 'rain' | 'cafe' | 'synth';
  }) => void;
}

const LUXURY_THEMES = [
  {
    id: 'supercar',
    name: 'Cyber Supercar',
    preview: '🏎️',
    gradient: 'from-amber-600 via-rose-900 to-black',
    border: 'border-amber-500/60',
    cost: 'Free'
  },
  {
    id: 'golden_palace',
    name: 'Imperial Palace',
    preview: '👑',
    gradient: 'from-yellow-700 via-amber-950 to-zinc-950',
    border: 'border-yellow-400/70',
    cost: 'VIP'
  },
  {
    id: 'neon_night',
    name: 'Neon Cyberpunk',
    preview: '🌌',
    gradient: 'from-fuchsia-600 via-purple-950 to-black',
    border: 'border-fuchsia-500/70',
    cost: 'Hot'
  },
  {
    id: 'fantasy_realm',
    name: 'Fantasy Realm',
    preview: '🦅',
    gradient: 'from-cyan-600 via-indigo-950 to-black',
    border: 'border-cyan-400/60',
    cost: '15k'
  }
];

const ROOM_MODES = [
  {
    id: 'party_8' as const,
    name: '8-Mic Party',
    desc: '8 seats with audio waves & reactions',
    icon: Users,
    seats: 8,
    badge: 'Popular'
  },
  {
    id: 'pk_battle' as const,
    name: '1v1 PK Battle',
    desc: 'Live head-to-head gifting challenge',
    icon: Swords,
    seats: 2,
    badge: 'Trending'
  },
  {
    id: 'vip_lounge' as const,
    name: '10-Mic VIP Club',
    desc: 'Reserved premium seats & host controls',
    icon: Crown,
    seats: 10,
    badge: 'Elite'
  }
];

const POPULAR_TAGS = ['Party', 'Singing', 'Chill', 'Gaming', 'Dating', 'PK Battle', 'Malayalam', 'Music'];

export const CreateVoiceRoomModal: React.FC<CreateVoiceRoomModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateRoom,
}) => {
  const [title, setTitle] = useState('');
  const [selectedMode, setSelectedMode] = useState<'party_8' | 'pk_battle' | 'vip_lounge'>('party_8');
  const [selectedTheme, setSelectedTheme] = useState('supercar');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Party', 'Chill']);
  const [ambientVibe, setAmbientVibe] = useState<'none' | 'lofi' | 'rain' | 'cafe' | 'synth'>('lofi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length < 4) {
        setSelectedTags([...selectedTags, tag]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const activeMode = ROOM_MODES.find(m => m.id === selectedMode) || ROOM_MODES[0];

    onCreateRoom({
      title: title.trim(),
      topic: selectedMode === 'pk_battle' ? 'Live PK Battle' : 'Voice Party',
      tags: selectedTags.length > 0 ? selectedTags : ['voice', 'party'],
      roomType: selectedMode,
      roomTheme: selectedTheme,
      seatCount: activeMode.seats,
      ambientVibe,
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
      {/* Background glow effects */}
      <div className="absolute w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -bottom-10 -right-10" />

      <div 
        className="w-full max-w-md bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-amber-950/40 flex flex-col max-h-[92vh] relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Gold Bar */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-600 w-full" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">Create Live Room</h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  VIP Club
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Open mic stage with interactive gifting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* Room Title */}
          <div>
            <label className="block text-xs font-bold text-amber-300/90 uppercase tracking-wider mb-1.5">
              Room Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter party title (e.g. Royal Supercar Night)"
                maxLength={50}
                required
                className="w-full bg-zinc-900/90 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
              />
              <span className="absolute right-3 top-3 text-[10px] text-amber-500/60 font-semibold">
                {title.length}/50
              </span>
            </div>
          </div>

          {/* Mode Selector (8-Mic, PK Battle, VIP) */}
          <div>
            <label className="block text-xs font-bold text-amber-300/90 uppercase tracking-wider mb-2">
              Select Room Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSelectedMode(mode.id)}
                    className={`relative p-2.5 rounded-2xl flex flex-col items-center justify-center text-center border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500/20 to-purple-600/20 border-amber-400 text-white shadow-lg shadow-amber-500/10 scale-[1.02]'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span className="absolute -top-2 px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider">
                      {mode.badge}
                    </span>
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-amber-300' : 'text-zinc-400'}`} />
                    <span className="text-xs font-bold truncate w-full">{mode.name}</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">{mode.seats} Seats</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Luxury Theme Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-amber-300/90 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                Stage Theme & Wallpaper
              </label>
              <span className="text-[10px] text-yellow-400 font-semibold">Live Preview</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {LUXURY_THEMES.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`relative p-3 rounded-2xl border text-left flex items-center gap-3 overflow-hidden transition-all bg-gradient-to-r ${theme.gradient} ${
                      isSelected
                        ? 'border-yellow-400 ring-2 ring-yellow-400/40 shadow-lg'
                        : 'border-zinc-800 opacity-75 hover:opacity-100 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-xl flex-none border border-white/10">
                      {theme.preview}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{theme.name}</div>
                      <div className="text-[10px] text-amber-300/80 font-medium">{theme.cost}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Mic Stage Preview (Like the reference photo) */}
          <div className="p-3 bg-gradient-to-b from-zinc-900 to-black rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold text-zinc-400">Stage Preview</span>
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <Flame className="w-3 h-3" /> VIP Seats Active
              </span>
            </div>

            {/* Mic Seats Grid */}
            <div className="grid grid-cols-4 gap-2">
              {/* Host Seat */}
              <div className="flex flex-col items-center">
                <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-amber-500 to-rose-500 shadow-md">
                  <div className="w-full h-full rounded-full bg-zinc-950 overflow-hidden flex items-center justify-center">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="Host" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white uppercase">{currentUser?.username?.[0] || 'H'}</span>
                    )}
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center text-[9px]">
                    👑
                  </div>
                  <div className="absolute -bottom-1 inset-x-0 mx-auto w-fit px-1 bg-rose-600 rounded-full text-[8px] font-bold text-white leading-tight">
                    Host
                  </div>
                </div>
                <span className="text-[9px] text-zinc-300 font-medium mt-1 truncate max-w-[50px]">
                  {currentUser?.displayName || 'You'}
                </span>
              </div>

              {/* Guest Empty Mic Seats */}
              {[2, 3, 4].map((num) => (
                <div key={num} className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-zinc-900/90 border border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
                    <span className="text-base font-light">+</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1">Seat {num}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-amber-300/90 uppercase tracking-wider mb-1.5">
              Room Tags <span className="text-[10px] text-zinc-500 font-normal">(Select up to 4)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TAGS.map((tag) => {
                const isActive = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-yellow-300 border border-amber-400 font-semibold shadow-xs'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide text-black uppercase bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4 fill-black" />
              <span>Launch Live Party</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
