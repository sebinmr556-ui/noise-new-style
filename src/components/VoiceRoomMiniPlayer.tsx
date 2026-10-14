import React from 'react';
import { Mic, MicOff, PhoneOff, Maximize2, Users, Music } from 'lucide-react';
import { VoiceRoom, AppUser } from '../types';
import { playMicToggleSound } from '../utils/audioVibeEngine';

interface VoiceRoomMiniPlayerProps {
  room: VoiceRoom;
  currentUser: AppUser | null;
  onExpand: () => void;
  onLeave: () => void;
  onUpdateRoom: (room: VoiceRoom) => void;
}

export const VoiceRoomMiniPlayer: React.FC<VoiceRoomMiniPlayerProps> = ({
  room,
  currentUser,
  onExpand,
  onLeave,
  onUpdateRoom,
}) => {
  const isHost = currentUser?.uid === room.hostUid;
  const localSpeaker = room.speakers.find((s) => s.uid === currentUser?.uid);
  const isSpeaker = Boolean(localSpeaker || isHost);
  const isMuted = localSpeaker?.isMuted ?? false;

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    const nextMuted = !isMuted;
    playMicToggleSound(!nextMuted);

    // Update Firebase state
    const updatedSpeakers = room.speakers.map((s) =>
      s.uid === currentUser.uid ? { ...s, isMuted: nextMuted } : s
    );
    onUpdateRoom({ ...room, speakers: updatedSpeakers });

    // Send signal to VoiceRoomModal to mute hardware mic
    window.dispatchEvent(new CustomEvent('mute-hardware-mic', { detail: nextMuted }));
  };

  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLeave();
  };

  return (
    <div
      onClick={onExpand}
      className="fixed bottom-14 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[450px] z-30 bg-zinc-900/95 backdrop-blur-md border border-rose-500/40 rounded-2xl p-2.5 shadow-xl shadow-black/60 flex items-center justify-between gap-3 cursor-pointer hover:border-rose-500 transition-all group animate-fadeIn"
      title="Tap to expand voice room"
    >
      {/* Left: Wave / Live Indicator + Room Info */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center flex-none relative overflow-hidden shadow-sm">
          {/* Audio equalizing wave bars */}
          <div className="flex items-end gap-0.5 h-4">
            <span className="w-0.5 h-3 bg-white rounded-full animate-bounce"></span>
            <span className="w-0.5 h-4 bg-white rounded-full animate-bounce [animation-delay:150ms]"></span>
            <span className="w-0.5 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]"></span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
              LIVE
            </span>
            <span className="text-xs font-bold text-white truncate">
              {room.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span className="truncate">@{room.hostUsername}</span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" />
              {room.speakers.length + room.listeners.length}
            </span>
            {room.ambientVibe && room.ambientVibe !== 'none' && (
              <>
                <span>•</span>
                <span className="text-rose-400 flex items-center gap-0.5">
                  <Music className="w-2.5 h-2.5" />
                  {room.ambientVibe}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-1.5 flex-none" onClick={(e) => e.stopPropagation()}>
        {isSpeaker && (
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-all shadow-xs ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
            type="button"
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 animate-pulse" />}
          </button>
        )}

        <button
          onClick={handleLeave}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-rose-400 transition-colors"
          title="Leave Room"
          type="button"
        >
          <PhoneOff className="w-4 h-4" />
        </button>

        <button
          onClick={onExpand}
          className="p-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
          title="Expand"
          type="button"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
