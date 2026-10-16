import React, { useState, useEffect, useCallback } from 'react';
import { 
  auth, 
  db, 
  storage,
  isFirebaseConfigured, 
  onAuthStateChanged, 
  fbSignOut,
  collection, 
  addDoc, 
  getDoc,
  setDoc,
  arrayUnion,
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot
} from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AppUser, Post, Story, NavTab, CommentItem, VoiceRoom, RoomParticipant } from './types';
import { Header } from './components/Header';
import { StoriesBar } from './components/StoriesBar';
import { StoryViewerModal } from './components/StoryViewerModal';
import { PostCard } from './components/PostCard';
import { CommentsModal } from './components/CommentsModal';
import { UploadView } from './components/UploadView';
import { ExploreView } from './components/ExploreView';
import { ReelsView } from './components/ReelsView';
import { ProfileView } from './components/ProfileView';
import { BottomNav } from './components/BottomNav';
import { LoginModal } from './components/LoginModal';
import { DirectMessagesModal } from './components/DirectMessagesModal';
import { NotificationsModal } from './components/NotificationsModal';
import { PostDetailModal } from './components/PostDetailModal';
import { LiveVoiceRoomsBar } from './components/LiveVoiceRoomsBar';
import { VoiceRoomModal } from './components/VoiceRoomModal';
import { VoiceRoomMiniPlayer } from './components/VoiceRoomMiniPlayer';
import { CreateVoiceRoomModal } from './components/CreateVoiceRoomModal';
import { VoiceRoomsListModal } from './components/VoiceRoomsListModal';
import { TopLoadingBar } from './components/TopLoadingBar';
import { Loader2, Menu, Coins, Shield, HelpCircle, LogOut, X, Lock } from 'lucide-react';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('noise_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (
            typeof parsed.photoURL === 'string' &&
            (parsed.photoURL.includes('unsplash.com') || parsed.photoURL.includes('ui-avatars.com'))
          ) {
            parsed.photoURL = '';
          }
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const local = localStorage.getItem('noise_cached_posts');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => p && !p.id?.startsWith('post-1') && p.uid !== 'system-user-1');
        }
      }
    } catch {}
    return [];
  });

  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [selectedDetailPost, setSelectedDetailPost] = useState<Post | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isTopLoading, setIsTopLoading] = useState(false);

  // New States for Menu, Coins, and Private Account
  const [coinsBalance, setCoinsBalance] = useState<number>(150);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  // Voice Chatrooms State
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([]);
  const [activeVoiceRoom, setActiveVoiceRoom] = useState<VoiceRoom | null>(null);
  const [isVoiceRoomModalOpen, setIsVoiceRoomModalOpen] = useState(false);
  const [isCreateVoiceRoomOpen, setIsCreateVoiceRoomOpen] = useState(false);
  const [isVoiceRoomsListOpen, setIsVoiceRoomsListOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('noise_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('noise_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('noise_cached_posts', JSON.stringify(posts));
    } catch {}
  }, [posts]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let firestoreBlockedUsers: string[] = [];
        if (db) {
          try {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              if (Array.isArray(uData.blockedUsers)) {
                firestoreBlockedUsers = uData.blockedUsers;
              }
            }
          } catch (e) {
            console.debug('Error reading user profile:', e);
          }
        }

        setCurrentUser((prev) => ({
          uid: user.uid,
          displayName: user.displayName || prev?.displayName || 'User',
          username: (user.displayName || prev?.username || 'user')
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .slice(0, 15),
          email: user.email || prev?.email || undefined,
          photoURL: user.photoURL || (prev?.photoURL && !prev.photoURL.includes('unsplash.com') ? prev.photoURL : ''),
          followersCount: prev?.followersCount || 0,
          followingCount: prev?.followingCount || 0,
          blockedUsers: Array.from(new Set([...(prev?.blockedUsers || []), ...firestoreBlockedUsers])),
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setIsLoadingPosts(false);
      return;
    }

    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const firestorePosts: Post[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        firestorePosts.push({
          id: docSnap.id,
          uid: data.uid || 'anon',
          username: data.username || 'user',
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'User')}&background=000&color=fff`,
          image: data.image,
          caption: data.caption || '',
          location: data.location || '',
          filter: data.filter || '',
          likes: data.likes || 0,
          likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
          savedBy: Array.isArray(data.savedBy) ? data.savedBy : [],
          comments: Array.isArray(data.comments) ? data.comments : [],
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
        });
      });
      setPosts(firestorePosts);
      setIsLoadingPosts(false);
    });

    const storiesQuery = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const firestoreStories: Story[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        firestoreStories.push({
          id: docSnap.id,
          uid: data.uid || data.userId,
          userId: data.userId || data.uid,
          authorId: data.authorId || data.uid,
          username: data.username || 'user',
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'User')}&background=000&color=fff`,
          mediaUrl: data.mediaUrl,
          caption: data.caption || '',
          timestamp: 'Recent',
          hasSeen: false,
        });
      });
      setStories(firestoreStories);
    });

    const roomsQuery = query(collection(db, 'voice_rooms'), orderBy('createdAt', 'desc'));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      const firestoreRooms: VoiceRoom[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const isDummy =
          data.isDummy === true ||
          docId.startsWith('room-1') ||
          docId.startsWith('room-2') ||
          docId.startsWith('room-3') ||
          docId.startsWith('mock-') ||
          docId.startsWith('dummy-') ||
          data.hostUid === 'system' ||
          !data.hostUid;

        if (!isDummy) {
          firestoreRooms.push({
            id: docSnap.id,
            title: data.title || 'Live Voice Room',
            topic: data.topic || 'Casual Hangout',
            hostUid: data.hostUid,
            hostUsername: data.hostUsername || 'user',
            hostDisplayName: data.hostDisplayName || 'User',
            hostAvatar: data.hostAvatar || '',
            speakers: Array.isArray(data.speakers) ? data.speakers : [],
            listeners: Array.isArray(data.listeners) ? data.listeners : [],
            tags: Array.isArray(data.tags) ? data.tags : [],
            ambientVibe: data.ambientVibe || 'none',
            isLive: data.isLive !== false,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            slotLikes: data.slotLikes || {},
          });
        }
      });
      setVoiceRooms(firestoreRooms);
    });

    return () => {
      unsubscribePosts();
      unsubscribeStories();
      unsubscribeRooms();
    };
  }, []);

  const handleSignOut = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentUser(null);
    setActiveTab('home');
    setIsMenuOpen(false);
  };

  const handleLikeToggle = async (postId: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const liked = p.likedBy?.includes(currentUser.uid);
          const newLikedBy = liked
            ? p.likedBy.filter((id) => id !== currentUser.uid)
            : [...(p.likedBy || []), currentUser.uid];
          const newLikes = liked ? Math.max(0, p.likes - 1) : p.likes + 1;
          return { ...p, likes: newLikes, likedBy: newLikedBy };
        }
        return p;
      })
    );
  };

  const handleSaveToggle = (postId: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const saved = p.savedBy ? p.savedBy.includes(currentUser.uid) : false;
          const newSavedBy = saved
            ? p.savedBy.filter((id) => id !== currentUser.uid)
            : [...(p.savedBy || []), currentUser.uid];
          return { ...p, savedBy: newSavedBy };
        }
        return p;
      })
    );
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const newComment: CommentItem = {
      id: `comm-${Date.now()}`,
      uid: currentUser.uid,
      username: currentUser.username,
      avatar: currentUser.photoURL,
      text: text,
      createdAt: 'Just now',
    };
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const updatedComments = [...(p.comments || []), newComment];
          const updatedPost = { ...p, comments: updatedComments };
          if (activeCommentPost?.id === postId) setActiveCommentPost(updatedPost);
          return updatedPost;
        }
        return p;
      })
    );
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const updatedComments = (p.comments || []).filter((c) => c.id !== commentId);
          const updated = { ...p, comments: updatedComments };
          if (activeCommentPost?.id === postId) setActiveCommentPost(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const handleCreatePost = async (postData: {
    image: string;
    caption: string;
    location?: string;
    filter?: string;
    mediaType?: 'image' | 'video';
  }) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setIsTopLoading(true);
    let newPostId = `post-${Date.now()}`;
    const newPost: Post = {
      id: newPostId,
      uid: currentUser.uid,
      username: currentUser.displayName || currentUser.username,
      avatar: currentUser.photoURL,
      image: postData.image,
      caption: postData.caption,
      location: postData.location,
      filter: postData.filter,
      likes: 0,
      likedBy: [],
      savedBy: [],
      comments: [],
      createdAt: Date.now(),
      mediaType: postData.mediaType || 'image',
    };
    setPosts((prev) => [newPost, ...prev]);
    setIsTopLoading(false);
    setActiveTab('home');
  };

  const handleDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedDetailPost?.id === postId) setSelectedDetailPost(null);
  };

  const handleBlockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    setCurrentUser((prev) => prev ? { ...prev, blockedUsers: [...(prev.blockedUsers || []), targetUserId] } : null);
  };

  const handleUpdateProfile = (updates: { displayName: string; username: string; bio: string; website?: string }) => {
    if (!currentUser) return;
    setCurrentUser((prev) => prev ? { ...prev, ...updates } : null);
  };

  const handleUpdateAvatar = (dataUrl: string) => {
    if (!currentUser) return;
    setCurrentUser((prev) => prev ? { ...prev, photoURL: dataUrl } : null);
  };

  const handleRemoveAvatar = () => {
    if (!currentUser) return;
    setCurrentUser((prev) => prev ? { ...prev, photoURL: '' } : null);
  };

  const handleStorySeen = (storyId: string) => {
    setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, hasSeen: true } : s)));
  };

  const handleAddUserStory = () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsTopLoading(true);
      try {
        const base64DataUrl = await fileToBase64(file);
        const localStory: Story = {
          id: `story-${Date.now()}`,
          uid: currentUser.uid,
          userId: currentUser.uid,
          authorId: currentUser.uid,
          username: currentUser.username,
          avatar: currentUser.photoURL,
          mediaUrl: base64DataUrl,
          caption: 'My moment ✨',
          timestamp: 'Just now',
          hasSeen: false,
        };
        setStories((prev) => [localStory, ...prev]);
      } finally {
        setIsTopLoading(false);
      }
    };
    input.click();
  };

  const handleDeleteStory = async (storyId: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
    setActiveStoryIndex(null);
  };

  const handleCreateVoiceRoom = async (data: { title: string; topic: string; tags: string[]; ambientVibe: any }) => {
    if (!currentUser) return;
    const hostParticipant: RoomParticipant = {
      uid: currentUser.uid,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatar: currentUser.photoURL,
      isHost: true,
      isSpeaker: true,
      isMuted: false,
      isSpeaking: false,
      joinedAt: Date.now(),
    };
    const newRoom: VoiceRoom = {
      id: `room-${Date.now()}`,
      title: data.title,
      topic: data.topic,
      hostUid: currentUser.uid,
      hostUsername: currentUser.username,
      hostDisplayName: currentUser.displayName,
      hostAvatar: currentUser.photoURL,
      speakers: [hostParticipant],
      listeners: [],
      tags: data.tags,
      ambientVibe: data.ambientVibe,
      isLive: true,
      createdAt: Date.now(),
      slotLikes: {},
    };
    setVoiceRooms((prev) => [newRoom, ...prev]);
    setActiveVoiceRoom(newRoom);
    setIsVoiceRoomModalOpen(true);
  };

  const handleJoinVoiceRoom = (room: VoiceRoom) => {
    setActiveVoiceRoom(room);
    setIsVoiceRoomModalOpen(true);
  };

  const handleLeaveVoiceRoom = () => {
    setActiveVoiceRoom(null);
    setIsVoiceRoomModalOpen(false);
  };

  const handleDeleteVoiceRoom = async (roomId: string) => {
    setVoiceRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (activeVoiceRoom?.id === roomId) {
      setActiveVoiceRoom(null);
      setIsVoiceRoomModalOpen(false);
    }
  };

  const handleUpdateActiveRoom = (updated: VoiceRoom) => {
    setActiveVoiceRoom(updated);
    setVoiceRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleTabChange = (tab: NavTab) => {
    if (!currentUser && (tab === 'upload' || tab === 'profile')) {
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const blockedUids = currentUser?.blockedUsers || [];
  const visiblePosts = posts.filter((p) => !blockedUids.includes(p.uid));
  const visibleStories = stories.filter((s) => !blockedUids.includes(s.uid || s.userId || ''));
  const savedPosts = currentUser ? visiblePosts.filter((p) => p.savedBy?.includes(currentUser.uid)) : [];

  return (
    <div className="min-h-screen bg-black flex justify-center text-zinc-100 selection:bg-rose-500/30 selection:text-white">
      <TopLoadingBar isLoading={isTopLoading || isLoadingPosts} />

      <div className="w-full max-w-[470px] min-h-screen bg-zinc-950 relative pb-14 border-x border-zinc-800/80 shadow-2xl flex flex-col">
        
        {/* Custom Header with Coin & Hamburger Menu Integration */}
        <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              Noise
            </h1>
            {currentUser && (
              <button 
                onClick={() => setIsCoinModalOpen(true)}
                className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-xs font-bold text-amber-400 hover:bg-zinc-800 transition-all"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{coinsBalance}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsNotificationsOpen(true)} className="text-zinc-200 hover:text-white p-1">
              <span className="sr-only">Notifications</span>
              🔔
            </button>
            <button onClick={() => setIsDirectModalOpen(true)} className="text-zinc-200 hover:text-white p-1">
              <span className="sr-only">Messages</span>
              ✈️
            </button>
            {/* 3-Line Hamburger Menu Button */}
            <button onClick={() => setIsMenuOpen(true)} className="text-zinc-200 hover:text-white p-1">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="flex-1">
          {activeTab === 'home' && (
            <div>
              <StoriesBar
                stories={visibleStories}
                currentUser={currentUser}
                onOpenStory={(index) => setActiveStoryIndex(index)}
                onAddStory={handleAddUserStory}
              />

              <div className="divide-y-8 divide-black bg-black sm:bg-zinc-950 sm:divide-y-0 sm:p-2 sm:space-y-3">
                {isLoadingPosts ? (
                  <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                    <span className="text-xs">Connecting to Noise...</span>
                  </div>
                ) : visiblePosts.length === 0 ? (
                  <div className="text-center py-24 px-4 text-zinc-400">
                    <p className="text-base font-bold text-white">No posts yet</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Be the first to share a moment! Apply filters and post.
                    </p>
                    <button
                      onClick={() => handleTabChange('upload')}
                      className="mt-4 px-5 py-2.5 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                    >
                      Create First Post
                    </button>
                  </div>
                ) : (
                  visiblePosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onLikeToggle={handleLikeToggle}
                      onSaveToggle={handleSaveToggle}
                      onOpenComments={(p) => setActiveCommentPost(p)}
                      onQuickComment={handleAddComment}
                      onDeletePost={handleDeletePost}
                      onBlockUser={handleBlockUser}
                      onRequireLogin={() => setIsLoginModalOpen(true)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <ExploreView allPosts={visiblePosts} onSelectPost={(post) => setSelectedDetailPost(post)} />
          )}

          {activeTab === 'upload' && (
            <UploadView
              currentUser={currentUser}
              onPostCreated={handleCreatePost}
              onCancel={() => setActiveTab('home')}
              onRequireLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {activeTab === 'reels' && (
            <ReelsView onGoToUpload={() => handleTabChange('upload')} allPosts={visiblePosts} />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              posts={posts}
              savedPosts={savedPosts}
              onUpdateAvatar={handleUpdateAvatar}
              onRemoveAvatar={handleRemoveAvatar}
              onUpdateProfile={handleUpdateProfile}
              onSelectPost={(post) => setSelectedDetailPost(post)}
              onOpenUpload={() => setActiveTab('upload')}
              onRequireLogin={() => setIsLoginModalOpen(true)}
            />
          )}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} currentUser={currentUser} />

        {/* 3-Line Hamburger Menu Drawer / Modal */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="w-80 bg-zinc-900 h-full p-5 flex flex-col border-l border-zinc-800 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <h3 className="text-base font-bold text-white">Settings & Activity</h3>
                <button onClick={() => setIsMenuOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 py-4 space-y-4 overflow-y-auto">
                <button 
                  onClick={() => { setIsMenuOpen(false); setIsCoinModalOpen(true); }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-medium">Buy Coins</span>
                  </div>
                  <span className="text-xs bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">{coinsBalance} Coins</span>
                </button>

                <div className="p-3 rounded-xl bg-zinc-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-indigo-400" />
                      <div>
                        <p className="text-sm font-medium">Private Account</p>
                        <p className="text-[11px] text-zinc-400">Only followers see your posts</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isPrivateAccount} 
                      onChange={() => setIsPrivateAccount(!isPrivateAccount)}
                      className="accent-rose-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => { setIsMenuOpen(false); setActiveTab('profile'); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all text-left text-sm font-medium"
                >
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span>Profile Settings & Security</span>
                </button>

                <button 
                  onClick={() => { alert('Noise Support: support@noise.app'); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all text-left text-sm font-medium"
                >
                  <HelpCircle className="w-5 h-5 text-emerald-400" />
                  <span>Help & Support</span>
                </button>
              </div>

              {currentUser && (
                <div className="pt-4 border-t border-zinc-800">
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all text-sm font-bold"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coin Purchase Modal */}
        {isCoinModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Get More Coins</h3>
                </div>
                <button onClick={() => setIsCoinModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { setCoinsBalance(prev => prev + 100); setIsCoinModalOpen(false); alert('Successfully added 100 Coins!'); }}
                  className="p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-center transition-all"
                >
                  <p className="text-xl font-extrabold text-amber-400">100</p>
                  <p className="text-xs text-zinc-400 mt-1">$0.99</p>
                </button>
                <button 
                  onClick={() => { setCoinsBalance(prev => prev + 550); setIsCoinModalOpen(false); alert('Successfully added 550 Coins!'); }}
                  className="p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-center transition-all"
                >
                  <p className="text-xl font-extrabold text-amber-400">550</p>
                  <p className="text-xs text-zinc-400 mt-1">$4.99</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Other Modals */}
        {activeStoryIndex !== null && visibleStories[activeStoryIndex] && (
          <StoryViewerModal
            stories={visibleStories}
            initialIndex={activeStoryIndex}
            currentUser={currentUser}
            onClose={() => setActiveStoryIndex(null)}
            onStorySeen={handleStorySeen}
            onDeleteStory={handleDeleteStory}
          />
        )}

        {activeCommentPost && (
          <CommentsModal
            post={activeCommentPost}
            currentUser={currentUser}
            onClose={() => setActiveCommentPost(null)}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        )}

        {selectedDetailPost && (
          <PostDetailModal
            post={selectedDetailPost}
            currentUser={currentUser}
            onClose={() => setSelectedDetailPost(null)}
            onLikeToggle={handleLikeToggle}
            onSaveToggle={handleSaveToggle}
            onOpenComments={(p) => setActiveCommentPost(p)}
            onQuickComment={handleAddComment}
            onDeletePost={handleDeletePost}
            onBlockUser={handleBlockUser}
            onRequireLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        <DirectMessagesModal isOpen={isDirectModalOpen} onClose={() => setIsDirectModalOpen(false)} currentUser={currentUser} />
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={(user) => setCurrentUser(user)} />
      </div>
    </div>
  );
}
