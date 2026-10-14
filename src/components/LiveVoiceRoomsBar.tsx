import React from 'react';
import { Radio, Plus, Users, Mic, ChevronRight } from 'lucide-react';
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
    <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-tight">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Voice Chatrooms</span>
          </div>
          {activeRooms.length > 0 && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded-full">
              {activeRooms.length} Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateRoom}
            className="flex items-center gap-1 text-[11px] font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 px-2 py-0.5 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-xs"
            type="button"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>Go Live</span>
          </button>

          {activeRooms.length > 1 && (
            <button
              onClick={onOpenAllRooms}
              className="text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-0.5 transition-colors"
              type="button"
            >
              <span>All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
        {/* Quick Start Room Card */}
        <button
          onClick={onOpenCreateRoom}
          className="flex-none w-36 h-24 rounded-2xl bg-zinc-900/80 border border-dashed border-zinc-700/80 hover:border-rose-500/60 p-2.5 flex flex-col justify-between text-left transition-all group hover:bg-zinc-850 shadow-xs"
          type="button"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
              Host a Room
            </p>
            <p className="text-[10px] text-zinc-400">Start talking live</p>
          </div>
        </button>

        {/* Active Rooms */}
        {activeRooms.map((room) => {
          const totalPeople = room.speakers.length + room.listeners.length;
          return (
            <div
              key={room.id}
              onClick={() => onJoinRoom(room)}
              className="flex-none w-48 h-24 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-rose-500/50 p-2.5 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm relative overflow-hidden group"
            >
              {/* Top Row: Live badge & Listener Count */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-live-pulse"></span>
                  LIVE
                </span>

                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                  {totalPeople}
                </span>
              </div>

              {/* Middle: Title & Host */}
              <div className="min-w-0 my-0.5">
                <p className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                  {room.title}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  @{room.hostUsername} • {room.topic}
                </p>
              </div>

              {/* Bottom: Avatars & Join Button */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center -space-x-1.5">
                  {room.speakers.slice(0, 3).map((speaker) => (
                    <div
                      key={speaker.uid}
                      className="w-5 h-5 rounded-full ring-1 ring-zinc-900 bg-zinc-800 overflow-hidden flex items-center justify-center text-[8px] font-bold text-zinc-300"
                    >
                      {speaker.avatar ? (
                        <img src={speaker.avatar} alt={speaker.username} className="w-full h-full object-cover" />
                      ) : (
                        speaker.username.charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                </div>

                <span className="text-[10px] font-bold text-rose-400 group-hover:underline">
                  Join &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
