import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Plus, 
  Trash2, 
  X, 
  Minimize2, 
  Maximize2, 
  Youtube, 
  AlertCircle, 
  ListMusic, 
  Radio, 
  Lock, 
  Check, 
  Settings, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { AppUser, RoomRole, RoomYouTubeState, YouTubeQueueItem } from '../types';
import { 
  extractYouTubeVideoId, 
  fetchYouTubeVideoInfo, 
  loadYouTubeIframeApi, 
  getYouTubeThumbnailUrl 
} from '../utils/youtubeUtils';

interface YouTubeWatchTogetherProps {
  roomId: string;
  currentUser: AppUser | null;
  userRole: RoomRole;
  youtubeState: RoomYouTubeState | undefined;
  onUpdateYouTubeState: (state: RoomYouTubeState) => void;
  onClose?: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export const YouTubeWatchTogether: React.FC<YouTubeWatchTogetherProps> = ({
  roomId,
  currentUser,
  userRole,
  youtubeState,
  onUpdateYouTubeState,
  onClose,
  isMinimized,
  onToggleMinimize,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'settings'>('player');

  // Player state
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [volume, setVolume] = useState<number>(70);
  const [isMuted, setIsMuted] = useState(false);
  const [localDuration, setLocalDuration] = useState(0);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);

  const playerRef = useRef<any>(null);
  const containerIdRef = useRef<string>(`yt-player-${roomId}`);
  const isSyncingFromRemoteRef = useRef(false);
  const lastBroadcastTimeRef = useRef(0);
  const timeUpdateIntervalRef = useRef<any>(null);

  // Role permissions
  const isSuperAdmin = userRole === 'super_admin';
  const isOwner = userRole === 'owner';
  const isCoAdmin = userRole === 'co_admin';
  const canControlPlayback = isSuperAdmin || isOwner || (isCoAdmin && (youtubeState?.allowCoAdminControl ?? true));
  const canAddVideos = isSuperAdmin || isOwner || isCoAdmin || (youtubeState?.allowVisitorSuggest ?? true);

  // Default state fallback
  const currentState: RoomYouTubeState = youtubeState || {
    videoId: '',
    title: '',
    thumbnail: '',
    playbackState: 'stopped',
    positionSeconds: 0,
    updatedAt: Date.now(),
    queue: [],
    allowVisitorSuggest: true,
    allowCoAdminControl: true,
  };

  // 1. Initialize YouTube Iframe Player
  useEffect(() => {
    let isCancelled = false;

    loadYouTubeIframeApi().then(() => {
      if (isCancelled) return;
      if (typeof window === 'undefined' || !(window as any).YT || !(window as any).YT.Player) return;

      const container = document.getElementById(containerIdRef.current);
      if (!container) return;

      // Clean up previous instance
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
      }

      try {
        playerRef.current = new (window as any).YT.Player(containerIdRef.current, {
          height: '100%',
          width: '100%',
          videoId: currentState.videoId || '',
          playerVars: {
            autoplay: 1,
            controls: canControlPlayback ? 1 : 0,
            disablekb: canControlPlayback ? 0 : 1,
            enablejsapi: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              setIsPlayerReady(true);
              event.target.setVolume(volume);
              if (currentState.videoId) {
                syncToRemoteState(currentState);
              }
            },
            onStateChange: (event: any) => {
              handlePlayerStateChange(event.data);
            },
            onError: (event: any) => {
              console.warn('[YouTube Player] Error code:', event.data);
              let msg = 'Failed to play YouTube video.';
              if (event.data === 101 || event.data === 150) {
                msg = 'Playback is restricted from embedded players by the video owner.';
              } else if (event.data === 100) {
                msg = 'This video has been removed or marked private.';
              } else if (event.data === 2) {
                msg = 'Invalid YouTube video ID or URL format.';
              }
              setPlayerError(msg);
            },
          },
        });
      } catch (e) {
        console.warn('Error initializing YT Player:', e);
      }
    });

    return () => {
      isCancelled = true;
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  // 2. Periodic time tracking for seek bar
  useEffect(() => {
    if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);

    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const curr = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          setLocalCurrentTime(curr);
          setLocalDuration(dur);

          // Drift correction for non-controlling members
          if (!canControlPlayback && currentState.playbackState === 'playing' && currentState.videoId) {
            const elapsedSinceUpdate = (Date.now() - currentState.updatedAt) / 1000;
            const expectedTime = Math.max(0, currentState.positionSeconds + elapsedSinceUpdate);
            const drift = Math.abs(curr - expectedTime);

            if (drift > 3.0 && dur > 0 && expectedTime < dur) {
              isSyncingFromRemoteRef.current = true;
              playerRef.current.seekTo(expectedTime, true);
              setTimeout(() => {
                isSyncingFromRemoteRef.current = false;
              }, 600);
            }
          }
        } catch {}
      }
    }, 1000);

    return () => {
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    };
  }, [canControlPlayback, currentState.playbackState, currentState.updatedAt, currentState.positionSeconds, currentState.videoId]);

  // 3. React to Remote State Changes
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    if (isSyncingFromRemoteRef.current) return;

    syncToRemoteState(currentState);
  }, [currentState.videoId, currentState.playbackState, currentState.updatedAt]);

  const syncToRemoteState = (remote: RoomYouTubeState) => {
    if (!playerRef.current || typeof playerRef.current.loadVideoById !== 'function') return;

    setPlayerError(null);
    isSyncingFromRemoteRef.current = true;

    try {
      const currentLoadedId = playerRef.current.getVideoData?.()?.video_id;

      // Load new video if changed
      if (remote.videoId && remote.videoId !== currentLoadedId) {
        const elapsed = remote.playbackState === 'playing' ? (Date.now() - remote.updatedAt) / 1000 : 0;
        const startSeconds = Math.max(0, remote.positionSeconds + elapsed);
        
        playerRef.current.loadVideoById({
          videoId: remote.videoId,
          startSeconds: startSeconds,
        });

        if (remote.playbackState === 'paused') {
          setTimeout(() => {
            playerRef.current?.pauseVideo();
          }, 400);
        }
      } else if (remote.videoId) {
        // Sync play / pause
        if (remote.playbackState === 'playing') {
          const elapsed = (Date.now() - remote.updatedAt) / 1000;
          const expectedTime = remote.positionSeconds + elapsed;
          const currentLocalTime = playerRef.current.getCurrentTime() || 0;

          if (Math.abs(currentLocalTime - expectedTime) > 3.0) {
            playerRef.current.seekTo(expectedTime, true);
          }
          playerRef.current.playVideo();
        } else if (remote.playbackState === 'paused') {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(remote.positionSeconds, true);
        } else if (remote.playbackState === 'stopped') {
          playerRef.current.stopVideo();
        }
      }
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setTimeout(() => {
        isSyncingFromRemoteRef.current = false;
      }, 700);
    }
  };

  // 4. Handle Local Player State Changes (Broadcast to room if authorized)
  const handlePlayerStateChange = (ytState: number) => {
    if (!canControlPlayback || isSyncingFromRemoteRef.current) return;

    // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (ytState === 1) { // Playing
      broadcastPlaybackCommand('playing');
    } else if (ytState === 2) { // Paused
      broadcastPlaybackCommand('paused');
    } else if (ytState === 0) { // Ended
      handlePlayNextInQueue();
    }
  };

  const broadcastPlaybackCommand = (playbackState: 'playing' | 'paused' | 'stopped', customPosition?: number) => {
    if (!canControlPlayback) return;
    const now = Date.now();
    if (now - lastBroadcastTimeRef.current < 400) return;
    lastBroadcastTimeRef.current = now;

    let pos = customPosition;
    if (pos === undefined && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      try {
        pos = playerRef.current.getCurrentTime() || 0;
      } catch {
        pos = 0;
      }
    }

    const updated: RoomYouTubeState = {
      ...currentState,
      playbackState,
      positionSeconds: Math.max(0, Math.round((pos || 0) * 10) / 10),
      updatedAt: now,
    };

    onUpdateYouTubeState(updated);
  };

  // 5. User Controls (Play / Pause / Seek)
  const togglePlayPause = () => {
    if (!canControlPlayback) return;
    if (currentState.playbackState === 'playing') {
      playerRef.current?.pauseVideo();
      broadcastPlaybackCommand('paused');
    } else {
      playerRef.current?.playVideo();
      broadcastPlaybackCommand('playing');
    }
  };

  const handleSeek = (seconds: number) => {
    if (!canControlPlayback) return;
    isSyncingFromRemoteRef.current = true;
    playerRef.current?.seekTo(seconds, true);
    setLocalCurrentTime(seconds);
    broadcastPlaybackCommand(currentState.playbackState === 'playing' ? 'playing' : 'paused', seconds);
    setTimeout(() => {
      isSyncingFromRemoteRef.current = false;
    }, 500);
  };

  // 6. Volume Control (Only affects YouTube audio locally; preserves WebRTC voice chat)
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newVol);
      if (newVol > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume || 50);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  // 7. Queue & Playlist Actions
  const handleAddVideo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUrlError(null);
    const videoId = extractYouTubeVideoId(urlInput);

    if (!videoId) {
      setUrlError('Please enter a valid YouTube link or video ID.');
      return;
    }

    setIsLoadingVideo(true);

    try {
      const info = await fetchYouTubeVideoInfo(videoId);
      const queueItem: YouTubeQueueItem = {
        id: `yt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        videoId: info.videoId,
        title: info.title,
        thumbnail: info.thumbnail,
        addedBy: currentUser?.displayName || currentUser?.username || 'Member',
        addedByUid: currentUser?.uid || '',
        addedAt: Date.now(),
      };

      // If no video is currently loaded, play this video immediately
      if (!currentState.videoId || currentState.playbackState === 'stopped') {
        const updatedState: RoomYouTubeState = {
          ...currentState,
          videoId: info.videoId,
          title: info.title,
          thumbnail: info.thumbnail,
          playbackState: 'playing',
          positionSeconds: 0,
          updatedAt: Date.now(),
        };
        onUpdateYouTubeState(updatedState);
      } else {
        // Add to queue
        const updatedQueue = [...(currentState.queue || []), queueItem];
        onUpdateYouTubeState({
          ...currentState,
          queue: updatedQueue,
        });
      }

      setUrlInput('');
      setActiveTab('player');
    } catch (err: any) {
      setUrlError(err.message || 'Failed to load video details.');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handlePlayNextInQueue = () => {
    if (!canControlPlayback) return;
    const queue = currentState.queue || [];
    if (queue.length === 0) {
      onUpdateYouTubeState({
        ...currentState,
        videoId: '',
        title: '',
        thumbnail: '',
        playbackState: 'stopped',
        positionSeconds: 0,
        updatedAt: Date.now(),
      });
      return;
    }

    const nextVideo = queue[0];
    const remainingQueue = queue.slice(1);

    onUpdateYouTubeState({
      ...currentState,
      videoId: nextVideo.videoId,
      title: nextVideo.title,
      thumbnail: nextVideo.thumbnail,
      playbackState: 'playing',
      positionSeconds: 0,
      updatedAt: Date.now(),
      queue: remainingQueue,
    });
  };

  const handleRemoveFromQueue = (itemId: string) => {
    if (!canControlPlayback && userRole === 'visitor') return;
    const updatedQueue = (currentState.queue || []).filter((item) => item.id !== itemId);
    onUpdateYouTubeState({
      ...currentState,
      queue: updatedQueue,
    });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If minimized, display compact watch-together bar
  if (isMinimized) {
    return (
      <div className="bg-zinc-950/95 border-b border-amber-500/30 px-3 py-2 flex items-center justify-between text-xs z-30 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex-none border border-zinc-800">
            {currentState.thumbnail ? (
              <img src={currentState.thumbnail} alt={currentState.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-red-600/20 text-red-500">
                <Youtube className="w-4 h-4" />
              </div>
            )}
            {currentState.playbackState === 'playing' && (
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1">
                <Youtube className="w-3 h-3 text-red-500" />
                <span>Watch Together</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                {formatSeconds(localCurrentTime)}
              </span>
            </div>
            <p className="text-xs font-semibold text-white truncate leading-tight">
              {currentState.title || 'No video playing'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-none ml-2">
          {canControlPlayback && currentState.videoId && (
            <button
              onClick={togglePlayPause}
              className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
              title={currentState.playbackState === 'playing' ? 'Pause' : 'Play'}
            >
              {currentState.playbackState === 'playing' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onToggleMinimize}
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
            title="Expand Watch Together"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/95 border-b border-amber-500/30 flex flex-col z-30 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
      
      {/* Top Header of Watch Together */}
      <div className="px-3 py-2 bg-gradient-to-r from-red-950/40 via-zinc-900/90 to-amber-950/40 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md">
            <Youtube className="w-3.5 h-3.5 fill-current" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>YouTube Watch Together</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold uppercase">
                Synchronized
              </span>
            </h4>
            <p className="text-[10px] text-zinc-400">
              Shared playback for everyone in room • Voice chat active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Navigation Tabs */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab('player')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeTab === 'player' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Player
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                activeTab === 'queue' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Queue</span>
              {(currentState.queue?.length || 0) > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">
                  {currentState.queue?.length}
                </span>
              )}
            </button>
            {(isOwner || isSuperAdmin) && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`p-1 rounded-md transition-colors ${
                  activeTab === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
                title="Watch Together Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onToggleMinimize}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            title="Minimize Player"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
              title="Close Watch Together"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'player' && (
        <div className="p-3 space-y-2.5">
          {/* Video Container */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-inner group">
            {/* The YouTube iframe mounts here */}
            <div id={containerIdRef.current} className="w-full h-full" />

            {/* Empty State Overlay */}
            {!currentState.videoId && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-zinc-950/90 text-zinc-400">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center mb-2 shadow-lg">
                  <Youtube className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-white mb-0.5">No video currently playing</h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mb-3">
                  Paste any YouTube link, Shorts, or watch URL below to watch together with voice participants.
                </p>
                {canAddVideos && (
                  <button
                    onClick={() => setActiveTab('queue')}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Video</span>
                  </button>
                )}
              </div>
            )}

            {/* Error Overlay */}
            {playerError && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10">
                <AlertCircle className="w-7 h-7 text-rose-500 mb-2" />
                <p className="text-xs font-bold text-rose-300 mb-1">{playerError}</p>
                <p className="text-[10px] text-zinc-400 max-w-xs mb-3">
                  The video may be restricted from third-party players or private.
                </p>
                {canControlPlayback && (
                  <button
                    onClick={handlePlayNextInQueue}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Skip to Next</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Video Title & Sync Status Banner */}
          {currentState.videoId && (
            <div className="flex items-center justify-between text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <h5 className="font-bold text-white text-xs truncate leading-tight">
                  {currentState.title || 'YouTube Video'}
                </h5>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {currentState.playbackState === 'playing' ? 'Playing Live' : 'Paused'}
                  </span>
                  <span>•</span>
                  <span>{formatSeconds(localCurrentTime)} / {formatSeconds(localDuration)}</span>
                  {!canControlPlayback && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-500 italic">Controlled by host</span>
                    </>
                  )}
                </div>
              </div>

              {/* Seek Bar for Authorized Controller */}
              {canControlPlayback && localDuration > 0 && (
                <div className="w-28 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={localDuration}
                    step="1"
                    value={localCurrentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                    title="Seek position"
                  />
                </div>
              )}
            </div>
          )}

          {/* Playback Controls & Local YouTube Volume Slider */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
            {/* Play/Pause/Skip */}
            <div className="flex items-center gap-1.5">
              {canControlPlayback ? (
                <>
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    disabled={!currentState.videoId}
                    className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    {currentState.playbackState === 'playing' ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePlayNextInQueue}
                    disabled={!currentState.queue || currentState.queue.length === 0}
                    className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                    title="Next in Queue"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span>Syncing with Room Host</span>
                </div>
              )}
            </div>

            {/* Local Video Volume Slider (Independent of WebRTC voice chat) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute YouTube video' : 'Mute YouTube video'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-300" />}
              </button>
              <div className="w-16 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                  title="YouTube Player Volume"
                />
              </div>
              <span className="text-[10px] text-zinc-500 font-mono w-6 text-right">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Queue & Add Video Tab */}
      {activeTab === 'queue' && (
        <div className="p-3 space-y-3 max-h-72 overflow-y-auto">
          {/* Add Video Form */}
          {canAddVideos ? (
            <form onSubmit={handleAddVideo} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste YouTube video or Shorts link..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!urlInput.trim() || isLoadingVideo}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  {isLoadingVideo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>

              {urlError && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-none" />
                  <span>{urlError}</span>
                </p>
              )}
            </form>
          ) : (
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-zinc-500 flex-none" />
              <span>Only the room owner and co-admins can add videos to the playlist.</span>
            </div>
          )}

          {/* Currently Playing Card */}
          {currentState.videoId && (
            <div className="p-2 rounded-xl bg-zinc-900/80 border border-red-500/30 flex items-center gap-2.5">
              <img
                src={currentState.thumbnail || getYouTubeThumbnailUrl(currentState.videoId)}
                alt={currentState.title}
                className="w-12 h-9 rounded-lg object-cover bg-black flex-none"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider block">
                  Now Playing
                </span>
                <p className="text-xs font-semibold text-white truncate">
                  {currentState.title || 'YouTube Video'}
                </p>
              </div>
            </div>
          )}

          {/* Queue List */}
          <div>
            <h6 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Up Next ({currentState.queue?.length || 0})</span>
              {canControlPlayback && (currentState.queue?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={handlePlayNextInQueue}
                  className="text-red-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <SkipForward className="w-2.5 h-2.5" />
                  <span>Play Next</span>
                </button>
              )}
            </h6>

            {(!currentState.queue || currentState.queue.length === 0) ? (
              <p className="text-xs text-zinc-500 py-3 text-center italic">
                Queue is empty. Add videos to keep the party going!
              </p>
            ) : (
              <div className="space-y-1.5">
                {currentState.queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-2 hover:bg-zinc-900 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-zinc-500 w-4 text-center">
                        {idx + 1}
                      </span>
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-10 h-7 rounded object-cover bg-black flex-none"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate leading-tight">
                          {item.title}
                        </p>
                        <p className="text-[9px] text-zinc-500 truncate">
                          Added by {item.addedBy}
                        </p>
                      </div>
                    </div>

                    {(canControlPlayback || item.addedByUid === currentUser?.uid) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab (Owner / Admin Only) */}
      {activeTab === 'settings' && (isOwner || isSuperAdmin) && (
        <div className="p-3 space-y-3">
          <h5 className="text-xs font-bold text-white mb-2">Watch Together Permissions</h5>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-white block">Allow Visitors to Suggest Videos</span>
                <span className="text-[10px] text-zinc-400">Let any room member add YouTube videos to the queue</span>
              </div>
              <input
                type="checkbox"
                checked={currentState.allowVisitorSuggest}
                onChange={(e) => {
                  onUpdateYouTubeState({
                    ...currentState,
                    allowVisitorSuggest: e.target.checked,
                  });
                }}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-white block">Allow Co-Admins to Control Playback</span>
                <span className="text-[10px] text-zinc-400">Permit co-admins to play, pause, seek, and skip videos</span>
              </div>
              <input
                type="checkbox"
                checked={currentState.allowCoAdminControl}
                onChange={(e) => {
                  onUpdateYouTubeState({
                    ...currentState,
                    allowCoAdminControl: e.target.checked,
                  });
                }}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

    </div>
  );
};
