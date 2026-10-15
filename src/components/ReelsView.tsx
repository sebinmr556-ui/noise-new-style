import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Volume2, VolumeX, Music, Disc3, Film } from 'lucide-react';
import { Reel, Post } from '../types';

interface ReelsViewProps {
  onGoToUpload?: () => void;
  allPosts?: Post[];
}

export const ReelsView: React.FC<ReelsViewProps> = ({ onGoToUpload, allPosts }) => {
  const [reels, setReels] = useState<Reel[]>(() => {
    if (!allPosts) return [];
    return allPosts
      .filter((p) => p.mediaType === 'video' || p.image?.startsWith('data:video/') || p.image?.includes('.mp4') || p.image?.includes('.webm') || p.caption?.includes('🎥'))
      .map((p) => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        videoUrl: p.image,
        posterUrl: '',
        caption: p.caption || 'Video Reel',
        musicTitle: 'Original Audio • ' + p.username,
        likes: p.likes || 0,
        commentsCount: p.comments?.length || 0,
      }));
  });
  const [isMuted, setIsMuted] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const toggleLike = (reelId: string) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const isLiked = !r.isLiked;
          return {
            ...r,
            isLiked,
            likes: isLiked ? r.likes + 1 : r.likes - 1,
          };
        }
        return r;
      })
    );
  };

  const toggleFollow = (username: string) => {
    setFollowingMap((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  if (reels.length === 0) {
    return (
      <div className="bg-black min-h-[calc(100vh-110px)] flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
          <Film className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">No Reels Shared Yet</h3>
        <p className="text-xs text-neutral-400 max-w-xs mb-6">
          Be the first creator to share reels and short videos on Noise!
        </p>
        {onGoToUpload && (
          <button
            onClick={onGoToUpload}
            className="px-5 py-2.5 bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-bold rounded-xl transition-all"
            type="button"
          >
            Create Post
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-black min-h-[calc(100vh-110px)] pb-20 select-none">
      <div className="space-y-4 max-w-[430px] mx-auto pt-2">
        {reels.map((reel) => {
          const isFollowing = followingMap[reel.username];
          return (
            <div
              key={reel.id}
              className="relative aspect-[9/16] max-h-[82vh] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between"
            >
              {/* Media Video or High Quality Poster */}
              <div className="absolute inset-0 z-0">
                <video
                  src={reel.videoUrl}
                  poster={reel.posterUrl}
                  loop
                  autoPlay
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />
              </div>

              {/* Top Bar with Reels Tag and Sound Toggle */}
              <div className="relative z-10 p-4 flex items-center justify-between text-white">
                <span className="text-base font-bold drop-shadow-md">Reels</span>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors"
                  type="button"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Bottom Details & Floating Actions */}
              <div className="relative z-10 p-4 flex items-end justify-between">
                <div className="space-y-2.5 max-w-[75%] text-white">
                  <div className="flex items-center gap-2">
                    <img
                      src={reel.avatar}
                      alt={reel.username}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white/60"
                    />
                    <span className="text-xs font-bold drop-shadow-sm">{reel.username}</span>
                    <button
                      onClick={() => toggleFollow(reel.username)}
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                        isFollowing
                          ? 'bg-transparent border-white/40 text-white/80'
                          : 'bg-white text-black border-white'
                      }`}
                      type="button"
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>

                  <p className="text-xs text-white/95 line-clamp-2 drop-shadow-md leading-relaxed">
                    {reel.caption}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-white/80 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full w-fit">
                    <Music className="w-3 h-3 flex-none" />
                    <span className="truncate max-w-[170px]">{reel.musicTitle}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 text-white">
                  <button
                    onClick={() => toggleLike(reel.id)}
                    className="flex flex-col items-center gap-1 active:scale-75 transition-transform"
                    type="button"
                  >
                    <div
                      className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                        reel.isLiked ? 'bg-red-500/20 text-[#ff3040]' : 'bg-black/40 text-white'
                      }`}
                    >
                      <Heart className={`w-6 h-6 ${reel.isLiked ? 'fill-[#ff3040]' : ''}`} />
                    </div>
                    <span className="text-[11px] font-bold drop-shadow-sm">
                      {reel.likes}
                    </span>
                  </button>

                  <button
                    className="flex flex-col items-center gap-1 active:scale-75 transition-transform"
                    type="button"
                  >
                    <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
                      <MessageCircle className="w-6 h-6 -rotate-4" />
                    </div>
                    <span className="text-[11px] font-bold drop-shadow-sm">
                      {reel.commentsCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: reel.caption, url: window.location.href }).catch(() => {});
                      }
                    }}
                    className="flex flex-col items-center gap-1 active:scale-75 transition-transform"
                    type="button"
                  >
                    <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
                      <Send className="w-6 h-6 -rotate-12" />
                    </div>
                    <span className="text-[10px] font-medium drop-shadow-sm">Share</span>
                  </button>

                  <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-white/80 p-1 flex items-center justify-center animate-spin">
                    <Disc3 className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
