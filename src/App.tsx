import React, { useState, useEffect, useCallback } from 'react';
import { updateProfile } from 'firebase/auth';
import { setDoc, getDoc } from 'firebase/firestore'; // പുതിയതായി ചേർത്തത് (Database-ൽ സേവ് ചെയ്യാൻ)
import { 
  auth, 
  db, 
  isFirebaseConfigured, 
  onAuthStateChanged, 
  fbSignOut,
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot
} from './firebase';
import { AppUser, Post, Story, NavTab, CommentItem, VoiceRoom, RoomParticipant } from './types';
import { INITIAL_VOICE_ROOMS } from './data/mockData';
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
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    return (localStorage.getItem('noise_active_tab') as NavTab) || 'home';
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('noise_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
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
          return parsed.filter((p: any) => p && !p.id?.startsWith('post-1') && !p.id?.startsWith('post-2') && !p.id?.startsWith('post-3') && p.uid !== 'system-user-1');
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
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(() => {
    return sessionStorage.getItem('noise_dm_open') === 'true';
  });

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>(INITIAL_VOICE_ROOMS);
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

  // എവിടെ ലോഗിൻ ചെയ്താലും ഡാറ്റാബേസിൽ നിന്ന് നേരിട്ട് ഫോട്ടോ എടുക്കുന്നു
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. പെട്ടെന്ന് ആപ്പ് ലോഡ് ആവാൻ ബേസിക് വിവരങ്ങൾ കൊടുക്കുന്നു
        setCurrentUser((prev) => ({
          uid: user.uid,
          displayName: user.displayName || prev?.displayName || 'User',
          username: prev?.username || (user.displayName || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 15),
          photoURL: prev?.photoURL || user.photoURL || '',
          followersCount: prev?.followersCount || 0,
          followingCount: prev?.followingCount || 0,
        }));

        // 2. ഡാറ്റാബേസിൽ നിന്നും (Firestore) പെർമനെൻ്റ് ആയ ഡിപി എടുക്കുന്നു
        if (db) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().photoURL) {
              setCurrentUser((prev) => prev ? { ...prev, photoURL: userDoc.data().photoURL } : null);
            }
          } catch (e) {
            console.warn("Could not fetch DP from Database", e);
          }
        }
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
    const unsubscribePosts = onSnapshot(
      postsQuery,
      (snapshot) => {
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
      },
      (error) => {
        setIsLoadingPosts(false);
      }
    );

    const storiesQuery = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribeStories = onSnapshot(
      storiesQuery,
      (snapshot) => {
        const firestoreStories: Story[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreStories.push({
            id: docSnap.id,
            username: data.username || 'user',
            avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'User')}&background=000&color=fff`,
            mediaUrl: data.mediaUrl,
            caption: data.caption || '',
            timestamp: 'Recent',
            hasSeen: false,
          });
        });
        setStories(firestoreStories);
      },
      () => {}
    );

    const roomsQuery = query(collection(db, 'voice_rooms'), orderBy('createdAt', 'desc'));
    const unsubscribeRooms = onSnapshot(
      roomsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const firestoreRooms: VoiceRoom[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            firestoreRooms.push({
              id: docSnap.id,
              title: data.title || 'Live Voice Room',
              topic: data.topic || 'Casual Hangout',
              hostUid: data.hostUid || '',
              hostUsername: data.hostUsername || 'user',
              hostDisplayName: data.hostDisplayName || 'User',
              hostAvatar: data.hostAvatar || '',
              speakers: Array.isArray(data.speakers) ? data.speakers : [],
              listeners: Array.isArray(data.listeners) ? data.listeners : [],
              tags: Array.isArray(data.tags) ? data.tags : [],
              ambientVibe: data.ambientVibe || 'none',
              isLive: data.isLive !== false,
              createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            });
          });
          setVoiceRooms((prev) => {
            const merged = [...firestoreRooms];
            prev.forEach((p) => {
              if (!merged.some((m) => m.id === p.id)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
      },
      () => {}
    );

    return () => {
      unsubscribePosts();
      unsubscribeStories();
      unsubscribeRooms();
    };
  }, []);

  const handleSignOut = async () => {
    if (isFirebaseConfigured && auth) {
      try { await fbSignOut(auth); } catch (e) { }
    }
    setCurrentUser(null);
    handleTabChange('home');
  };

  const toggleDirectModal = (isOpen: boolean) => {
    setIsDirectModalOpen(isOpen);
    sessionStorage.setItem('noise_dm_open', isOpen ? 'true' : 'false');
  };

  const handleLikeToggle = async (postId: string) => {
    if (!currentUser) return setIsLoginModalOpen(true);
    setPosts((prev) => prev.map((p) => {
      if (p.id === postId) {
        const liked = p.likedBy?.includes(currentUser.uid);
        const newLikedBy = liked ? p.likedBy.filter((id) => id !== currentUser.uid) : [...(p.likedBy || []), currentUser.uid];
        const newLikes = liked ? Math.max(0, p.likes - 1) : p.likes + 1;
        if (isFirebaseConfigured && db) {
          try { updateDoc(doc(db, 'posts', p.id), { likes: newLikes, likedBy: newLikedBy }).catch(() => {}); } catch {}
        }
        return { ...p, likes: newLikes, likedBy: newLikedBy };
      }
      return p;
    }));
  };

  const handleSaveToggle = (postId: string) => {
    if (!currentUser) return setIsLoginModalOpen(true);
    setPosts((prev) => prev.map((p) => {
      if (p.id === postId) {
        const saved = p.savedBy?.includes(currentUser.uid) || false;
        const newSavedBy = saved ? (p.savedBy || []).filter((id) => id !== currentUser.uid) : [...(p.savedBy || []), currentUser.uid];
        if (isFirebaseConfigured && db) {
          try { updateDoc(doc(db, 'posts', p.id), { savedBy: newSavedBy }).catch(() => {}); } catch {}
        }
        return { ...p, savedBy: newSavedBy };
      }
      return p;
    }));
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUser) return setIsLoginModalOpen(true);
    const newComment: CommentItem = {
      id: `comm-${Date.now()}`,
      uid: currentUser.uid,
      username: currentUser.username,
      avatar: currentUser.photoURL,
      text: text,
      createdAt: 'Just now',
    };
    setPosts((prev) => prev.map((p) => {
      if (p.id === postId) {
        const updatedComments = [...(p.comments || []), newComment];
        const updatedPost = { ...p, comments: updatedComments };
        if (activeCommentPost?.id === postId) setActiveCommentPost(updatedPost);
        if (isFirebaseConfigured && db) {
          try { updateDoc(doc(db, 'posts', p.id), { comments: updatedComments }).catch(() => {}); } catch {}
        }
        return updatedPost;
      }
      return p;
    }));
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setPosts((prev) => prev.map((p) => {
      if (p.id === postId) {
        const updatedComments = (p.comments || []).filter((c) => c.id !== commentId);
        const updated = { ...p, comments: updatedComments };
        if (activeCommentPost?.id === postId) setActiveCommentPost(updated);
        if (isFirebaseConfigured && db) {
          try { updateDoc(doc(db, 'posts', p.id), { comments: updatedComments }).catch(() => {}); } catch {}
        }
        return updated;
      }
      return p;
    }));
  };

  const handleCreatePost = async (postData: { image: string; caption: string; location?: string; filter?: string; }) => {
    if (!currentUser) return setIsLoginModalOpen(true);
    let newPostId = `post-${Date.now()}`;
    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, 'posts'), {
          username: currentUser.displayName || currentUser.username,
          avatar: currentUser.photoURL,
          image: postData.image,
          caption: postData.caption,
          location: postData.location || '',
          filter: postData.filter || 'normal',
          createdAt: serverTimestamp(),
          uid: currentUser.uid,
          likes: 0,
          likedBy: [],
          savedBy: [],
          comments: [],
        });
        newPostId = docRef.id;
      } catch (err) {}
    }
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
    };
    setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPostId)]);
    handleTabChange('home');
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (isFirebaseConfigured && db) {
      try { await deleteDoc(doc(db, 'posts', postId)); } catch (e) {}
    }
  };

  const handleUpdateProfile = async (updates: { displayName: string; username: string; bio: string; website?: string; }) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);

    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: updates.displayName });
      } catch (e) {}
    }
  };

  // ഡിപി നേരിട്ട് ഫയർബേസ് ഡാറ്റാബേസിൽ (users collection) സേവ് ചെയ്യുന്നു!
  const handleUpdateAvatar = async (dataUrl: string) => {
    if (!currentUser) return;
    
    // ഫോട്ടോ ആപ്പിൽ മാറ്റുന്നു
    setCurrentUser((prev) => (prev ? { ...prev, photoURL: dataUrl } : null));

    if (isFirebaseConfigured && db) {
      try {
        // ഫയർബേസ് ഡാറ്റാബേസിലേക്ക് (Firestore) പുതിയ ഫോട്ടോ സേവ് ചെയ്യുന്നു
        await setDoc(doc(db, 'users', currentUser.uid), { photoURL: dataUrl }, { merge: true });
      } catch (e) {
        console.warn('Database save error:', e);
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser) return;
    setCurrentUser((prev) => (prev ? { ...prev, photoURL: '' } : null));

    if (isFirebaseConfigured && db) {
      try {
        // ഡാറ്റാബേസിൽ നിന്നും ഫോട്ടോ കളയുന്നു
        await setDoc(doc(db, 'users', currentUser.uid), { photoURL: '' }, { merge: true });
      } catch (e) {}
    }
  };

  const handleStorySeen = (storyId: string) => {
    setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, hasSeen: true } : s)));
  };

  const handleAddUserStory = () => {
    if (!currentUser) return setIsLoginModalOpen(true);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = ev.target?.result as string;
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; } } 
          else { if (h > MAX) { w = Math.round((h * MAX) / h); h = MAX; } }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const mediaUrl = canvas.toDataURL('image/jpeg', 0.85);
            if (isFirebaseConfigured && db) {
              try {
                await addDoc(collection(db, 'stories'), {
                  uid: currentUser.uid,
                  username: currentUser.username,
                  avatar: currentUser.photoURL,
                  mediaUrl: mediaUrl,
                  caption: 'My moment ✨',
                  createdAt: serverTimestamp(),
                });
              } catch (err) {}
            }
          }
        };
        img.src = raw;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCreateVoiceRoom = async (data: { title: string; topic: string; tags: string[]; ambientVibe: 'none' | 'lofi' | 'rain' | 'cafe' | 'synth'; }) => {
    if (!currentUser) return setIsLoginModalOpen(true);
    const hostParticipant: RoomParticipant = {
      uid: currentUser.uid, username: currentUser.username, displayName: currentUser.displayName,
      avatar: currentUser.photoURL, isHost: true, isSpeaker: true, isMuted: false, isSpeaking: false, joinedAt: Date.now(),
    };
    const newRoom: VoiceRoom = {
      id: `room-${Date.now()}`, title: data.title, topic: data.topic, hostUid: currentUser.uid,
      hostUsername: currentUser.username, hostDisplayName: currentUser.displayName, hostAvatar: currentUser.photoURL,
      speakers: [hostParticipant], listeners: [], tags: data.tags, ambientVibe: data.ambientVibe, isLive: true, createdAt: Date.now(),
    };
    setVoiceRooms((prev) => [newRoom, ...prev]);
    setActiveVoiceRoom(newRoom);
    setIsVoiceRoomModalOpen(true);
    if (isFirebaseConfigured && db) {
      try { await addDoc(collection(db, 'voice_rooms'), { ...newRoom, createdAt: serverTimestamp(), }); } catch (err) {}
    }
  };

  const handleJoinVoiceRoom = (room: VoiceRoom) => {
    const userParticipant: RoomParticipant = currentUser
      ? { uid: currentUser.uid, username: currentUser.username, displayName: currentUser.displayName, avatar: currentUser.photoURL, isHost: currentUser.uid === room.hostUid, isSpeaker: currentUser.uid === room.hostUid, isMuted: false, isSpeaking: false, joinedAt: Date.now(), }
      : { uid: `guest-${Date.now()}`, username: `listener_${Math.floor(100 + Math.random() * 900)}`, displayName: 'Guest Listener', avatar: '', isSpeaker: false, joinedAt: Date.now(), };
    const inSpeakers = room.speakers.some((s) => s.uid === userParticipant.uid);
    const inListeners = room.listeners.some((l) => l.uid === userParticipant.uid);
    let updatedRoom = room;
    if (!inSpeakers && !inListeners) {
      if (userParticipant.isSpeaker) updatedRoom = { ...room, speakers: [...room.speakers, userParticipant] };
      else updatedRoom = { ...room, listeners: [...room.listeners, userParticipant] };
    }
    setActiveVoiceRoom(updatedRoom);
    setIsVoiceRoomModalOpen(true);
    setVoiceRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
  };

  const handleLeaveVoiceRoom = () => {
    if (activeVoiceRoom && currentUser) {
      const updatedRoom: VoiceRoom = {
        ...activeVoiceRoom,
        speakers: activeVoiceRoom.speakers.filter((s) => s.uid !== currentUser.uid),
        listeners: activeVoiceRoom.listeners.filter((l) => l.uid !== currentUser.uid),
      };
      setVoiceRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    }
    setActiveVoiceRoom(null);
    setIsVoiceRoomModalOpen(false);
  };

  const handleUpdateActiveRoom = (updated: VoiceRoom) => {
    setActiveVoiceRoom(updated);
    setVoiceRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleTabChange = (tab: NavTab) => {
    if (!currentUser && (tab === 'upload' || tab === 'profile')) return setIsLoginModalOpen(true);
    setActiveTab(tab);
    localStorage.setItem('noise_active_tab', tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const savedPosts = currentUser ? posts.filter((p) => p.savedBy?.includes(currentUser.uid)) : [];

  return (
    <div className="min-h-screen bg-black flex justify-center text-zinc-100 selection:bg-rose-500/30 selection:text-white">
      <div className="w-full max-w-[470px] min-h-screen bg-zinc-950 relative pb-14 border-x border-zinc-800/80 shadow-2xl flex flex-col">
        <Header 
          currentUser={currentUser} 
          onOpenLogin={() => setIsLoginModalOpen(true)} 
          onSignOut={handleSignOut} 
          onOpenDirect={() => toggleDirectModal(true)} 
          onOpenNotifications={() => setIsNotificationsOpen(true)} 
          onOpenVoiceRooms={() => setIsVoiceRoomsListOpen(true)} 
        />

        <main className="flex-1">
          {activeTab === 'home' && (
            <div>
              <StoriesBar stories={stories} currentUser={currentUser} onOpenStory={(index) => setActiveStoryIndex(index)} onAddStory={handleAddUserStory} />
              <LiveVoiceRoomsBar rooms={voiceRooms} currentUser={currentUser} onOpenCreateRoom={() => { if (!currentUser) return setIsLoginModalOpen(true); setIsCreateVoiceRoomOpen(true); }} onJoinRoom={handleJoinVoiceRoom} onOpenAllRooms={() => setIsVoiceRoomsListOpen(true)} />
              <div className="divide-y-8 divide-black bg-black sm:bg-zinc-950 sm:divide-y-0 sm:p-2 sm:space-y-3">
                {isLoadingPosts ? (
                  <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                    <span className="text-xs">Connecting to Noise...</span>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-24 px-4 text-zinc-400">
                    <p className="text-base font-bold text-white">No posts yet</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">Be the first to share a moment! Apply filters like grayscale, sepia, or brightness and post.</p>
                    <button onClick={() => handleTabChange('upload')} className="mt-4 px-5 py-2.5 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg transition-all">Create First Post</button>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard key={post.id} post={post} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onOpenComments={(p) => setActiveCommentPost(p)} onQuickComment={handleAddComment} onDeletePost={handleDeletePost} onRequireLogin={() => setIsLoginModalOpen(true)} />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'search' && <ExploreView allPosts={posts} onSelectPost={(post) => setSelectedDetailPost(post)} />}
          {activeTab === 'upload' && <UploadView currentUser={currentUser} onPostCreated={handleCreatePost} onCancel={() => handleTabChange('home')} onRequireLogin={() => setIsLoginModalOpen(true)} />}
          {activeTab === 'reels' && <ReelsView onGoToUpload={() => handleTabChange('upload')} />}
          {activeTab === 'profile' && <ProfileView currentUser={currentUser} posts={posts} savedPosts={savedPosts} onUpdateAvatar={handleUpdateAvatar} onRemoveAvatar={handleRemoveAvatar} onUpdateProfile={handleUpdateProfile} onSelectPost={(post) => setSelectedDetailPost(post)} onOpenUpload={() => handleTabChange('upload')} onRequireLogin={() => setIsLoginModalOpen(true)} />}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} currentUser={currentUser} />

        {activeStoryIndex !== null && stories[activeStoryIndex] && <StoryViewerModal stories={stories} initialIndex={activeStoryIndex} onClose={() => setActiveStoryIndex(null)} onStorySeen={handleStorySeen} />}
        {activeCommentPost && <CommentsModal post={activeCommentPost} currentUser={currentUser} onClose={() => setActiveCommentPost(null)} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} />}
        {selectedDetailPost && <PostDetailModal post={selectedDetailPost} currentUser={currentUser} onClose={() => setSelectedDetailPost(null)} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onOpenComments={(p) => setActiveCommentPost(p)} onQuickComment={handleAddComment} onDeletePost={handleDeletePost} onRequireLogin={() => setIsLoginModalOpen(true)} />}
        
        <DirectMessagesModal isOpen={isDirectModalOpen} onClose={() => toggleDirectModal(false)} currentUser={currentUser} />
        
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={(user) => setCurrentUser(user)} />

        {activeVoiceRoom && !isVoiceRoomModalOpen && <VoiceRoomMiniPlayer room={activeVoiceRoom} currentUser={currentUser} onExpand={() => setIsVoiceRoomModalOpen(true)} onLeave={handleLeaveVoiceRoom} onUpdateRoom={handleUpdateActiveRoom} />}
        {activeVoiceRoom && <VoiceRoomModal room={activeVoiceRoom} currentUser={currentUser} isOpen={isVoiceRoomModalOpen} onMinimize={() => setIsVoiceRoomModalOpen(false)} onLeaveRoom={handleLeaveVoiceRoom} onUpdateRoom={handleUpdateActiveRoom} onRequireLogin={() => setIsLoginModalOpen(true)} />}
        <CreateVoiceRoomModal isOpen={isCreateVoiceRoomOpen} onClose={() => setIsCreateVoiceRoomOpen(false)} currentUser={currentUser} onCreateRoom={handleCreateVoiceRoom} />
        <VoiceRoomsListModal isOpen={isVoiceRoomsListOpen} onClose={() => setIsVoiceRoomsListOpen(false)} rooms={voiceRooms} currentUser={currentUser} onJoinRoom={handleJoinVoiceRoom} onOpenCreateRoom={() => { if (!currentUser) return setIsLoginModalOpen(true); setIsCreateVoiceRoomOpen(true); }} />
      </div>
    </div>
  );
}
