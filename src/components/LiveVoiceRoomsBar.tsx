import React from 'react';
import { Radio, Plus, Users, Crown, Sparkles, ChevronRight, Swords, Flame, Mic } from 'lucide-react';
import { VoiceRoom, AppUser } from '../types';

interface LiveVoiceRoomsBarProps {
  rooms: VoiceRoom[];
  currentUser: AppUser | null;
  onOpenCreateRoom: () => void;
  onJoinRoom: (room: VoiceRoom) => void;
  onOpenAllRooms: () => void;
}

export const LiveVoiceRoomsBar: React.FC<LiveVoiceRoomsBarProps> = ({
  rooms,
  currentUser,
  onOpenCreateRoom,
  onJoinRoom,
  onOpenAllRooms,
}) => {
  const activeRooms = rooms.filter((r) => r.isLive);

  return (
    <div className="relative px-4 py-3 border-b border-amber-500/20 bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute -left-10 top-0 w-32 h-full bg-amber-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -right-10 top-0 w-32 h-full bg-purple-600/10 blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm shadow-amber-500/40">
              <Crown className="w-3 h-3 text-black stroke-[2.5]" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500">
              VIP Party Rooms
            </span>
          </div>

          {activeRooms.length > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 rounded-full shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {activeRooms.length} Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateRoom}
            className="group relative flex items-center gap-1.5 text-[11px] font-black tracking-wide uppercase text-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-3 py-1 rounded-full hover:brightness-110 active:scale-95 transition-all shadow-md shadow-amber-500/25"
            type="button"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Go Live</span>
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
          </button>

          {activeRooms.length > 1 && (
            <button
              onClick={onOpenAllRooms}
              className="text-[11px] font-bold text-zinc-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors"
              type="button"
            >
              <span>Explore</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div className="relative z-10 flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
        {/* Quick Launch VIP Stage Card */}
        <button
          onClick={onOpenCreateRoom}
          className="flex-none w-36 h-28 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-black/90 border border-dashed border-amber-500/40 hover:border-amber-400 p-2.5 flex flex-col justify-between text-left transition-all group hover:scale-[1.02] shadow-sm relative overflow-hidden"
          type="button"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 flex items-center justify-center text-black shadow-md shadow-amber-500/20 group-hover:rotate-6 transition-transform">
              <Mic className="w-4 h-4 stroke-[2.5]" />
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
              Open Stage
            </p>
            <p className="text-[10px] text-zinc-400 font-medium">Earn VIP Gifts</p>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Active Live Rooms */}
        {activeRooms.map((room) => {
          const totalPeople = (room.speakers?.length || 0) + (room.listeners?.length || 0);
          const isPK = (room as any).roomType === 'pk_battle' || room.topic?.toLowerCase().includes('pk');

          return (
            <div
              key={room.id}
              onClick={() => onJoinRoom(room)}
              className="flex-none w-52 h-28 rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-amber-500/30 hover:border-amber-400/80 p-2.5 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-lg shadow-black/60 relative overflow-hidden group"
            >
              {/* Glowing Corner Accent */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent pointer-events-none" />

              {/* Top Row: Mode Badge & Live Wave Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.5 rounded-full shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    LIVE
                  </span>

                  {isPK && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 rounded-full">
                      <Swords className="w-2.5 h-2.5" />
                      PK
                    </span>
                  )}
                </div>

                {/* Audience Count */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-200/90 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5">
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>{totalPeople}</span>
                </div>
              </div>

              {/* Middle: Title & Room Info */}
              <div className="min-w-0 my-0.5">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-black text-white truncate group-hover:text-amber-300 transition-colors">
                    {room.title}
                  </p>
                  <Flame className="w-3 h-3 text-rose-500 flex-none" />
                </div>
                <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                  <span className="text-amber-400/80 font-bold">@{room.hostUsername}</span>
                  <span>•</span>
                  <span>{room.topic}</span>
                </p>
              </div>

              {/* Bottom: Mic Seats & Join CTA */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                {/* Speakers Mic Stack with Royal Ring */}
                <div className="flex items-center -space-x-1.5">
                  {room.speakers.slice(0, 3).map((speaker, idx) => (
                    <div
                      key={speaker.uid || idx}
                      className="relative w-5 h-5 rounded-full ring-1 ring-amber-400/60 bg-zinc-900 overflow-hidden flex items-center justify-center text-[8px] font-black text-amber-300 shadow-sm"
                    >
                      {speaker.avatar ? (
                        <img src={speaker.avatar} alt={speaker.username} className="w-full h-full object-cover" />
                      ) : (
                        speaker.username.charAt(0).toUpperCase()
                      )}
                      {idx === 0 && (
                        <div className="absolute -top-0.5 -right-0.5 text-[6px]">👑</div>
                      )}
                    </div>
                  ))}

                  {/* Audio Wave Bars */}
                  <div className="flex items-end gap-0.5 ml-2.5 h-3">
                    <span className="w-0.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    <span className="w-0.5 h-3 bg-amber-300 rounded-full animate-pulse [animation-delay:150ms]" />
                    <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>

                {/* Join Button */}
                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-300 group-hover:text-amber-200 transition-colors flex items-center gap-0.5">
                  Enter <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
