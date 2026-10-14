import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Hand, Users, MessageSquare, Share2, 
  PhoneOff, Crown, ChevronDown, UserCheck, Send, Sparkles, Youtube, Play, StopCircle 
} from 'lucide-react';
import { AppUser, VoiceRoom, RoomParticipant, RoomMessage } from '../types';
import { 
  createMicAnalyser, 
  MicAnalyserHandle, 
  playChimeSound, 
  playPopSound, 
  playClapSound, 
  playMicToggleSound, 
  startAmbientVibe, 
  AmbientController 
} from '../utils/audioVibeEngine';

interface VoiceRoomModalProps {
  room: VoiceRoom;
  currentUser: AppUser | null;
  isOpen: boolean;
  onMinimize: () => void;
  onLeaveRoom: () => void;
  onUpdateRoom: (updated: VoiceRoom) => void;
  onRequireLogin: () => void;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  leftPercent: number;
}

const REACTION_EMOJIS = ['❤️', '🔥', '👏', '🎉', '✨'];

export const VoiceRoomModal: React.FC<VoiceRoomModalProps> = ({
  room,
  currentUser,
  isOpen,
  onMinimize,
  onLeaveRoom,
  onUpdateRoom,
  onRequireLogin,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [localVolume, setLocalVolume] = useState(0);
  const [isSpeakingLocally, setIsSpeakingLocally] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // YouTube Background Player States
  const [showYtPlayer, setShowYtPlayer] = useState(false);
  const [ytInput, setYtInput] = useState('');
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);

  // WebRTC & Audio States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [uid: string]: MediaStream }>({});
  
  const micHandleRef = useRef<MicAnalyserHandle | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isHost = currentUser?.uid === room.hostUid;
  const isSpeaker = isHost || room.speakers.some((s) => s.uid === currentUser?.uid);
  
  const hostParticipant = room.speakers.find(s => s.uid === room.hostUid) || room.speakers[0];
  const otherSpeakers = room.speakers.filter(s => s.uid !== hostParticipant?.uid);

  // WebRTC Microphone Access
  useEffect(() => {
    if (isSpeaker && !localStream) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          setLocalStream(stream);
          createMicAnalyser().then((handle) => {
            if (handle) {
              micHandleRef.current = handle;
              handle.setMuted(isMuted);
              const checkVolume = () => {
                const vol = handle.getVolumeLevel();
                setLocalVolume(vol);
                setIsSpeakingLocally(!isMuted && vol > 12);
                requestAnimationFrame(checkVolume);
              };
              requestAnimationFrame(checkVolume);
            }
          });
        })
        .catch(() => alert("Please allow microphone access."));
    }
    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (micHandleRef.current) micHandleRef.current.cleanup();
    };
  }, [isSpeaker]);

  // Hardware Mute/Unmute
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }
    if (micHandleRef.current) micHandleRef.current.setMuted(isMuted);
  }, [isMuted, localStream]);

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    playMicToggleSound(!nextState);
    if (currentUser) {
      const updated = room.speakers.map((s) => s.uid === currentUser.uid ? { ...s, isMuted: nextState } : s);
      onUpdateRoom({ ...room, speakers: updated });
    }
  };

  const toggleHandRaise = () => {
    if (!currentUser) return onRequireLogin();
    const nextState = !hasRaisedHand;
    setHasRaisedHand(nextState);
    if (nextState) playChimeSound();
    const updated = room.listeners.map((l) => l.uid === currentUser.uid ? { ...l, hasRaisedHand: nextState } : l);
    onUpdateRoom({ ...room, listeners: updated });
  };

  const handleSendReaction = (emoji: string) => {
    emoji === '👏' ? playClapSound() : playPopSound();
    const newReaction = { id: `react-${Date.now()}`, emoji, leftPercent: 20 + Math.random() * 60 };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id)), 1800);
  };

  const handleShareRoom = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Extract YouTube ID from URL
  const handlePlayYt = (e: React.FormEvent) => {
    e.preventDefault();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = ytInput.match(regExp);
    if (match && match[2].length === 11) {
      setYtVideoId(match[2]);
      setYtInput('');
    } else {
      alert("Please enter a valid YouTube link");
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-3xl transition-opacity ${!isOpen ? 'hidden' : 'animate-fadeIn'}`}>
      
      {/* Hidden Audio Players */}
      <div className="hidden">
        {Object.entries(remoteStreams).map(([uid, stream]) => (
          <audio key={uid} autoPlay playsInline ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream; }} />
        ))}
      </div>

      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingReactions.map((r) => (
          <div key={r.id} style={{ left: `${r.leftPercent}%`, bottom: '120px' }} className="absolute text-4xl animate-float-reaction">
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="w-full h-full max-w-[470px] relative flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black sm:rounded-[40px] sm:h-[95vh] sm:border border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.15)] overflow-hidden">
        
        {/* Floating Top Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30">
          <button onClick={onMinimize} className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all">
            <ChevronDown className="w-5 h-5" />
          </button>
          
          <div className="px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex flex-col items-center shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-[0.2em]">
              {room.topic}
            </span>
            <span className="text-white font-semibold text-sm truncate max-w-[150px]">{room.title}</span>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* YouTube Music Button */}
            <button onClick={() => setShowYtPlayer(!showYtPlayer)} className={`p-3 backdrop-blur-xl border rounded-full transition-all ${showYtPlayer ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
              <Youtube className="w-5 h-5" />
            </button>

            {/* YouTube Player Panel */}
            {showYtPlayer && (
              <div className="absolute top-14 right-0 w-72 bg-black/80 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-fadeIn">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5"><Youtube className="w-4 h-4 text-red-500"/> Background Music</h3>
                
                <form onSubmit={handlePlayYt} className="flex gap-2 mb-3">
                  <input type="text" value={ytInput} onChange={(e) => setYtInput(e.target.value)} placeholder="Paste YouTube link..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-red-500/50" />
                  <button type="submit" className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600"><Play className="w-4 h-4" /></button>
                </form>

                {ytVideoId && (
                  <div className="space-y-2">
                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&loop=1&playlist=${ytVideoId}`} 
                        frameBorder="0" 
                        allow="autoplay; encrypted-media" 
                        allowFullScreen 
                      />
                    </div>
                    <button onClick={() => setYtVideoId(null)} className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      <StopCircle className="w-3.5 h-3.5" /> Stop Music
                    </button>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleShareRoom} className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all relative">
              <Share2 className="w-5 h-5" />
              {copiedLink && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-indigo-500 text-white px-2 py-1 rounded-full">Copied!</span>}
            </button>
          </div>
        </div>

        {/* Center Stage: The Host (Main Focus) */}
        <div className="flex-1 flex flex-col items-center justify-center pt-10 pb-32 px-4 relative z-10">
          
          {/* Main Host Avatar */}
          {hostParticipant && (
            <div className="relative flex flex-col items-center mb-10 group">
              <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full"></div>
              
              {/* Audio visualizer rings for host */}
              {((hostParticipant.uid === currentUser?.uid && isSpeakingLocally) || hostParticipant.isSpeaking) && (
                <>
                  <div className="absolute -inset-4 border border-cyan-400/50 rounded-full animate-ping [animation-duration:1.5s]"></div>
                  <div className="absolute -inset-8 border border-indigo-500/30 rounded-full animate-ping [animation-duration:2s]"></div>
                </>
              )}
              
              <div className="relative w-36 h-36 rounded-full p-1 bg-gradient-to-b from-cyan-400 to-indigo-600 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                <div className="w-full h-full bg-black rounded-full overflow-hidden border-4 border-black">
                  <img src={hostParticipant.avatar || `https://ui-avatars.com/api/?name=${hostParticipant.username}`} alt="Host" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-black p-1.5 rounded-full border border-zinc-800">
                  {hostParticipant.isMuted ? <MicOff className="w-5 h-5 text-rose-500" /> : <Mic className="w-5 h-5 text-cyan-400" />}
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-1">
                  <Crown className="w-3 h-3" /> HOST
                </div>
              </div>
              <span className="mt-4 text-lg font-bold text-white shadow-black drop-shadow-md">@{hostParticipant.username}</span>
            </div>
          )}

          {/* Floating Orbiting Speakers */}
          <div className="flex flex-wrap justify-center gap-6 w-full px-2">
            {otherSpeakers.map((speaker) => {
              const isLocal = speaker.uid === currentUser?.uid;
              const isSpeaking = isLocal ? isSpeakingLocally : speaker.isSpeaking;
              
              return (
                <div key={speaker.uid} className="flex flex-col items-center relative transform hover:scale-110 transition-transform">
                  {isSpeaking && <div className="absolute inset-0 bg-rose-500/30 blur-2xl rounded-full"></div>}
                  
                  <div className={`w-20 h-20 rounded-2xl rotate-3 overflow-hidden p-0.5 shadow-lg ${isSpeaking ? 'bg-gradient-to-tr from-rose-500 to-orange-500' : 'bg-white/10'}`}>
                    <div className="w-full h-full bg-zinc-900 rounded-[14px] overflow-hidden -rotate-3 border-2 border-black relative">
                      <img src={speaker.avatar || `https://ui-avatars.com/api/?name=${speaker.username}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 bg-black/80 p-1 rounded-lg backdrop-blur-md">
                         {speaker.isMuted ? <MicOff className="w-3 h-3 text-rose-400" /> : <Mic className="w-3 h-3 text-emerald-400" />}
                      </div>
                    </div>
                  </div>
                  <span className="mt-2 text-xs font-medium text-zinc-300">@{speaker.username}</span>
                </div>
              )
            })}
          </div>

          {/* Stardust Audience Section */}
          <div className="mt-10 w-full">
             <div className="flex items-center justify-center gap-2 mb-3">
               <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
               <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1">
                 <Users className="w-3 h-3" /> Audience ({room.listeners.length})
               </span>
               <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
             </div>
             
             <div className="flex flex-wrap justify-center gap-2.5">
               {room.listeners.map((listener) => (
                 <div key={listener.uid} className="relative group">
                   {listener.hasRaisedHand && <div className="absolute -top-3 -right-2 text-base animate-bounce z-10">✋</div>}
                   <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
                     <img src={listener.avatar || `https://ui-avatars.com/api/?name=${listener.username}`} className="w-full h-full object-cover" />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* The Magic Pill Controls (Floating at bottom) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-max">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-2 rounded-full flex items-center gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            
            {isSpeaker ? (
              <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white/10 text-white hover:bg-rose-500/20' : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]'}`}>
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            ) : (
              <button onClick={toggleHandRaise} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${hasRaisedHand ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-white/10 text-white'}`}>
                <Hand className="w-6 h-6" />
              </button>
            )}

            <div className="w-[1px] h-8 bg-white/20 mx-1"></div>

            {REACTION_EMOJIS.slice(0, 3).map((emoji) => (
              <button key={emoji} onClick={() => handleSendReaction(emoji)} className="w-12 h-12 rounded-full flex items-center justify-center text-xl hover:bg-white/10 transition-colors">
                {emoji}
              </button>
            ))}

            <button onClick={() => setIsChatOpen(true)} className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            <div className="w-[1px] h-8 bg-white/20 mx-1"></div>

            <button onClick={onLeaveRoom} className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors border border-rose-500/30">
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Chat Panel overlay */}
        {isChatOpen && (
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-black/60 backdrop-blur-3xl rounded-t-[40px] border-t border-white/10 z-50 flex flex-col animate-fadeIn">
            <div className="p-4 flex justify-between items-center border-b border-white/10">
              <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400" /> Live Chat</h3>
              <button onClick={() => setIsChatOpen(false)} className="p-2 bg-white/10 rounded-full text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map(m => (
                <div key={m.id} className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <img src={m.avatar} className="w-8 h-8 rounded-full" />
                  <div>
                    <span className="text-[10px] text-indigo-300 font-bold">@{m.username}</span>
                    <p className="text-sm text-white">{m.text}</p>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-4 bg-black/40 border-t border-white/10">
               <form onSubmit={(e) => { e.preventDefault(); if(chatInput.trim()){ setMessages(p => [...p, {id: Date.now().toString(), uid: currentUser!.uid, username: currentUser!.username, avatar: currentUser!.photoURL, text: chatInput, createdAt: Date.now()}]); setChatInput(''); } }} className="flex gap-2">
                 <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/10 border border-white/20 rounded-full px-5 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-indigo-400" />
                 <button type="submit" className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white"><Send className="w-4 h-4" /></button>
               </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
