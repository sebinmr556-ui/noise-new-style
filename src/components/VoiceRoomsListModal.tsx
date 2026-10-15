import React, { useState } from 'react';
import { X, Search, Radio, Plus, Users, Mic, Music, Hash, Trash2 } from 'lucide-react';
import { VoiceRoom, AppUser } from '../types';
import { isGlobalAdmin } from '../utils/admin';

interface VoiceRoomsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: VoiceRoom[];
  currentUser: AppUser | null;
  onJoinRoom: (room: VoiceRoom) => void;
  onOpenCreateRoom: () => void;
  onDeleteRoom?: (roomId: string) => void;
}

const CATEGORIES = ['All', 'Chill & Lo-Fi', 'Casual Hangout', 'Photography & Art', 'Creators & Tech', 'Late Night Lounge'];

export const VoiceRoomsListModal: React.FC<VoiceRoomsListModalProps> = ({
  isOpen,
  onClose,
  rooms,
  currentUser,
  onJoinRoom,
  onOpenCreateRoom,
  onDeleteRoom,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [roomToDelete, setRoomToDelete] = useState<VoiceRoom | null>(null);

  if (!isOpen) return null;

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.hostUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || r.topic.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-md">
              <Radio className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Voice Chatrooms</h2>
              <p className="text-xs text-zinc-400">Join conversations or start your own stage</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCreateRoom();
              }}
              className="flex items-center gap-1 bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-xs"
              type="button"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Host Room</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms, tags, or hosts..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {/* Categories Horizontal Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-none px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-black shadow-xs'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                }`}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 mx-auto flex items-center justify-center text-zinc-400">
                <Radio className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">No rooms found</p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Be the first to start a conversation in this topic!
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenCreateRoom();
                }}
                className="mt-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 transition-opacity"
                type="button"
              >
                Start a Voice Room
              </button>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const totalPeople = room.speakers.length + room.listeners.length;
              return (
                <div
                  key={room.id}
                  onClick={() => {
                    onClose();
                    onJoinRoom(room);
                  }}
                  className="bg-zinc-950 border border-zinc-800/80 hover:border-rose-500/60 rounded-2xl p-4 cursor-pointer transition-all hover:bg-zinc-850/60 shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-live-pulse"></span>
                          LIVE
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md">
                          {room.topic}
                        </span>
                        {room.ambientVibe && room.ambientVibe !== 'none' && (
                          <span className="text-[10px] text-rose-400 font-medium flex items-center gap-0.5">
                            <Music className="w-2.5 h-2.5" />
                            {room.ambientVibe}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                        {room.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Hosted by <span className="text-zinc-300 font-semibold">@{room.hostUsername}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-none">
                      {onDeleteRoom && (isGlobalAdmin(currentUser) || room.hostUid === currentUser?.uid) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomToDelete(room);
                          }}
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title={isGlobalAdmin(currentUser) && room.hostUid !== currentUser?.uid ? 'Delete Room (Master Admin 👑)' : 'Delete Room'}
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-xs"
                        type="button"
                      >
                        Join
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {room.tags && room.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap my-2">
                      {room.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer with speakers preview and listeners count */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-850/80 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center -space-x-1.5">
                        {room.speakers.slice(0, 4).map((s) => (
                          <div
                            key={s.uid}
                            className="w-6 h-6 rounded-full ring-2 ring-zinc-950 bg-zinc-800 overflow-hidden flex items-center justify-center text-[9px] font-bold text-zinc-200"
                          >
                            {s.avatar ? (
                              <img src={s.avatar} alt={s.username} className="w-full h-full object-cover" />
                            ) : (
                              s.username.charAt(0).toUpperCase()
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {room.speakers.length} {room.speakers.length === 1 ? 'speaker' : 'speakers'}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300">
                      <Users className="w-3.5 h-3.5 text-zinc-500" />
                      {totalPeople} listening
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Room Delete Confirmation Dialog */}
        {roomToDelete && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center max-w-xs w-full shadow-2xl">
              <div className="w-11 h-11 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isGlobalAdmin(currentUser) && roomToDelete.hostUid !== currentUser?.uid
                  ? 'Admin: Delete Room?'
                  : 'Delete Voice Room?'}
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                {isGlobalAdmin(currentUser) && roomToDelete.hostUid !== currentUser?.uid
                  ? `Master Admin 👑 action: Delete "${roomToDelete.title}" by @${roomToDelete.hostUsername}? All participants will be disconnected.`
                  : `Are you sure you want to delete your voice room "${roomToDelete.title}"?`}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRoomToDelete(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = roomToDelete.id;
                    setRoomToDelete(null);
                    if (onDeleteRoom) onDeleteRoom(id);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
