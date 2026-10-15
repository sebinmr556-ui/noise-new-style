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
import { TopLoadingBar } from './components/TopLoadingBar';
import { Loader2 } from 'lucide-react';

// ഫയലുകളെ Base64 ആക്കി മാറ്റുന്നതിനുള്ള ഫങ്ഷൻ
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
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isTopLoading, setIsTopLoading] = useState(false);

  // Voice Chatrooms State (filtered to only user-created rooms)
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

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser((prev) => ({
          uid: user.uid,
          displayName: user.displayName || prev?.displayName || 'User',
          username: (user.displayName || prev?.username || 'user')
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .slice(0, 15),
          photoURL:
            user.photoURL ||
            (prev?.photoURL && !prev.photoURL.includes('unsplash.com') && !prev.photoURL.includes('ui-avatars.com')
              ? prev.photoURL
              : ''),
          followersCount: prev?.followersCount || 0,
          followingCount: prev?.followingCount || 0,
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
        console.warn('Firestore posts listener warning:', error);
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
      },
      (error) => {
        console.warn('Firestore stories listener warning:', error);
      }
    );

    const roomsQuery = query(collection(db, 'voice_rooms'), orderBy('createdAt', 'desc'));
    const unsubscribeRooms = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const firestoreRooms: VoiceRoom[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;

          // Filter out dummy/mock chat rooms in Firestore fetch logic
          const isDummy =
            data.isDummy === true ||
            docId.startsWith('room-1') ||
            docId.startsWith('room-2') ||
            docId.startsWith('room-3') ||
            docId.startsWith('room-lofi') ||
            docId.startsWith('room-street') ||
            docId.startsWith('mock-') ||
            docId.startsWith('dummy-') ||
            data.hostUid === 'system' ||
            data.hostUid === 'system-user-1' ||
            data.hostUid === 'mock-user-1' ||
            data.hostUid === 'u-1' ||
            data.hostUid === 'u-2' ||
            !data.hostUid ||
            data.title?.toLowerCase().includes('dummy') ||
            data.title?.toLowerCase().includes('mock test') ||
            data.topic?.toLowerCase().includes('dummy');

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

        // Set strictly user-created rooms
        setVoiceRooms(firestoreRooms);
      },
      (error) => {
        console.debug('Firestore voice rooms notice:', error);
      }
    );

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
          const updated = {
            ...p,
            likes: newLikes,
            likedBy: newLikedBy,
          };

          if (isFirebaseConfigured && db) {
            try {
              const postRef = doc(db, 'posts', p.id);
              updateDoc(postRef, {
                likes: newLikes,
                likedBy: newLikedBy,
              }).catch((e) => console.warn('Like update error:', e));
            } catch {}
          }

          return updated;
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
          const currentSavedList = p.savedBy || [];
          const newSavedBy = saved
            ? currentSavedList.filter((id) => id !== currentUser.uid)
            : [...currentSavedList, currentUser.uid];
          const updated = {
            ...p,
            savedBy: newSavedBy,
          };

          if (isFirebaseConfigured && db) {
            try {
              const postRef = doc(db, 'posts', p.id);
              updateDoc(postRef, {
                savedBy: newSavedBy,
              }).catch((e) => console.warn('Save update error:', e));
            } catch {}
          }

          return updated;
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

          if (activeCommentPost?.id === postId) {
            setActiveCommentPost(updatedPost);
          }

          if (isFirebaseConfigured && db) {
            try {
              const postRef = doc(db, 'posts', p.id);
              updateDoc(postRef, {
                comments: updatedComments,
              }).catch((e) => console.warn('Comment update error:', e));
            } catch {}
          }

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
          if (activeCommentPost?.id === postId) {
            setActiveCommentPost(updated);
          }
          if (isFirebaseConfigured && db) {
            try {
              const postRef = doc(db, 'posts', p.id);
              updateDoc(postRef, { comments: updatedComments }).catch(() => {});
            } catch {}
          }
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
    const detectedMediaType = postData.mediaType || (postData.image?.startsWith('data:video/') ? 'video' : 'image');

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
          mediaType: detectedMediaType,
        });
        newPostId = docRef.id;
      } catch (err) {
        console.warn('Firestore write warning:', err);
      }
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
      mediaType: detectedMediaType,
    };

    setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPostId)]);
    setIsTopLoading(false);
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setPosts((prev) => prev.filter((p) => p.id !== postId));

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleUpdateProfile = (updates: {
    displayName: string;
    username: string;
    bio: string;
    website?: string;
  }) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      ...updates,
    };
    setCurrentUser(updated);
  };

  const handleUpdateAvatar = (dataUrl: string) => {
    if (!currentUser) return;
    setCurrentUser((prev) => (prev ? { ...prev, photoURL: dataUrl } : null));
  };

  const handleRemoveAvatar = () => {
    if (!currentUser) return;
    setCurrentUser((prev) => (prev ? { ...prev, photoURL: '' } : null));
  };

  const handleStorySeen = (storyId: string) => {
    setStories((prev) => {
      const target = prev.find((s) => s.id === storyId);
      if (target?.hasSeen) return prev;
      return prev.map((s) => (s.id === storyId ? { ...s, hasSeen: true } : s));
    });
  };

  // Video/Image story upload with top progress bar
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

      // Check file size (Firestore document limit)
      if (file.size > 2097152) { // 2MB alert
        setIsTopLoading(false);
        alert('File size is too large for fast Firestore story sync. Please select a clip or photo under 2MB.');
        return;
      }

      const isVideo = file.type.startsWith('video/');

      try {
        const base64DataUrl = await fileToBase64(file);

        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, 'stories'), {
            uid: currentUser.uid,
            userId: currentUser.uid,
            authorId: currentUser.uid,
            username: currentUser.username,
            avatar: currentUser.photoURL,
            mediaUrl: base64DataUrl,
            caption: isVideo ? 'My video moment 🎥' : 'My moment ✨',
            mediaType: isVideo ? 'video' : 'image',
            createdAt: serverTimestamp(),
          });
        } else {
          // Local fallback
          const localStory: Story = {
            id: `story-${Date.now()}`,
            uid: currentUser.uid,
            userId: currentUser.uid,
            authorId: currentUser.uid,
            username: currentUser.username,
            avatar: currentUser.photoURL,
            mediaUrl: base64DataUrl,
            caption: isVideo ? 'My video moment 🎥' : 'My moment ✨',
            mediaType: isVideo ? 'video' : 'image',
            timestamp: 'Just now',
            hasSeen: false,
          };
          setStories((prev) => [localStory, ...prev]);
        }
      } catch (err) {
        console.error('Story upload error:', err);
        alert('Upload failed. Please try a smaller video or photo clip.');
      } finally {
        setIsTopLoading(false);
      }
    };
    input.click();
  };

  const handleDeleteStory = async (storyId: string) => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'stories', storyId));
        setStories((prev) => prev.filter((s) => s.id !== storyId));
        setActiveStoryIndex(null);
      } catch (err) {
        console.error('സ്റ്റോറി ഡിലീറ്റ് ചെയ്യുന്നതിൽ പിഴവ്:', err);
      }
    }
  };

  const handleCreateVoiceRoom = async (data: {
    title: string;
    topic: string;
    tags: string[];
    ambientVibe: 'none' | 'lofi' | 'rain' | 'cafe' | 'synth';
  }) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

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

    setIsTopLoading(true);
    setVoiceRooms((prev) => [newRoom, ...prev]);
    setActiveVoiceRoom(newRoom);
    setIsVoiceRoomModalOpen(true);
    setTimeout(() => setIsTopLoading(false), 400);

    if (isFirebaseConfigured && db) {
      try {
        await addDoc(collection(db, 'voice_rooms'), {
          ...newRoom,
          isDummy: false,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore create room error:', err);
      }
    }
  };

  const handleJoinVoiceRoom = (room: VoiceRoom) => {
    setIsTopLoading(true);
    const userParticipant: RoomParticipant = currentUser
      ? {
          uid: currentUser.uid,
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatar: currentUser.photoURL,
          isHost: currentUser.uid === room.hostUid,
          isSpeaker: currentUser.uid === room.hostUid,
          isMuted: false,
          isSpeaking: false,
          joinedAt: Date.now(),
        }
      : {
          uid: `guest-${Date.now()}`,
          username: `listener_${Math.floor(100 + Math.random() * 900)}`,
          displayName: 'Guest Listener',
          avatar: '',
          isSpeaker: false,
          joinedAt: Date.now(),
        };

    const inSpeakers = room.speakers.some((s) => s.uid === userParticipant.uid);
    const inListeners = room.listeners.some((l) => l.uid === userParticipant.uid);

    let updatedRoom = room;
    if (!inSpeakers && !inListeners) {
      if (userParticipant.isSpeaker) {
        updatedRoom = { ...room, speakers: [...room.speakers, userParticipant] };
      } else {
        updatedRoom = { ...room, listeners: [...room.listeners, userParticipant] };
      }
    }

    setActiveVoiceRoom(updatedRoom);
    setIsVoiceRoomModalOpen(true);
    setVoiceRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    setTimeout(() => setIsTopLoading(false), 300);
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

    if (isFirebaseConfigured && db && updated.id) {
      try {
        const roomRef = doc(db, 'voice_rooms', updated.id);
        updateDoc(roomRef, {
          slotLikes: updated.slotLikes || {},
          speakers: updated.speakers || [],
          listeners: updated.listeners || [],
        }).catch(() => {});
      } catch {}
    }
  };

  const handleTabChange = (tab: NavTab) => {
    if (!currentUser && (tab === 'upload' || tab === 'profile')) {
      setIsLoginModalOpen(true);
      return;
    }
    setIsTopLoading(true);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setIsTopLoading(false), 350);
  };

  const savedPosts = currentUser
    ? posts.filter((p) => p.savedBy?.includes(currentUser.uid))
    : [];

  return (
    <div className="min-h-screen bg-black flex justify-center text-zinc-100 selection:bg-rose-500/30 selection:text-white">
      {/* Animated Top Loading Progress Bar */}
      <TopLoadingBar isLoading={isTopLoading || isLoadingPosts} />

      <div className="w-full max-w-[470px] min-h-screen bg-zinc-950 relative pb-14 border-x border-zinc-800/80 shadow-2xl flex flex-col">
        <Header
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onSignOut={handleSignOut}
          onOpenDirect={() => setIsDirectModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenVoiceRooms={() => setIsVoiceRoomsListOpen(true)}
        />

        <main className="flex-1">
          {activeTab === 'home' && (
            <div>
              <StoriesBar
                stories={stories}
                currentUser={currentUser}
                onOpenStory={(index) => setActiveStoryIndex(index)}
                onAddStory={handleAddUserStory}
              />

              <LiveVoiceRoomsBar
                rooms={voiceRooms}
                currentUser={currentUser}
                onOpenCreateRoom={() => {
                  if (!currentUser) {
                    setIsLoginModalOpen(true);
                    return;
                  }
                  setIsCreateVoiceRoomOpen(true);
                }}
                onJoinRoom={handleJoinVoiceRoom}
                onOpenAllRooms={() => setIsVoiceRoomsListOpen(true)}
              />

              <div className="divide-y-8 divide-black bg-black sm:bg-zinc-950 sm:divide-y-0 sm:p-2 sm:space-y-3">
                {isLoadingPosts ? (
                  <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                    <span className="text-xs">Connecting to Noise...</span>
                  </div>
                ) : posts.length === 0 ? (
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
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onLikeToggle={handleLikeToggle}
                      onSaveToggle={handleSaveToggle}
                      onOpenComments={(p) => setActiveCommentPost(p)}
                      onQuickComment={handleAddComment}
                      onDeletePost={handleDeletePost}
                      onRequireLogin={() => setIsLoginModalOpen(true)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <ExploreView
              allPosts={posts}
              onSelectPost={(post) => setSelectedDetailPost(post)}
            />
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
            <ReelsView onGoToUpload={() => handleTabChange('upload')} allPosts={posts} />
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

        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentUser={currentUser}
        />

        {activeStoryIndex !== null && stories[activeStoryIndex] && (
          <StoryViewerModal
            stories={stories}
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
            onRequireLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        <DirectMessagesModal
          isOpen={isDirectModalOpen}
          onClose={() => setIsDirectModalOpen(false)}
          currentUser={currentUser}
        />

        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
        />

        {activeVoiceRoom && !isVoiceRoomModalOpen && (
          <VoiceRoomMiniPlayer
            room={activeVoiceRoom}
            currentUser={currentUser}
            onExpand={() => setIsVoiceRoomModalOpen(true)}
            onLeave={handleLeaveVoiceRoom}
            onUpdateRoom={handleUpdateActiveRoom}
          />
        )}

        {activeVoiceRoom && (
          <VoiceRoomModal
            room={activeVoiceRoom}
            currentUser={currentUser}
            isOpen={isVoiceRoomModalOpen}
            onMinimize={() => setIsVoiceRoomModalOpen(false)}
            onLeaveRoom={handleLeaveVoiceRoom}
            onUpdateRoom={handleUpdateActiveRoom}
            onRequireLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        <CreateVoiceRoomModal
          isOpen={isCreateVoiceRoomOpen}
          onClose={() => setIsCreateVoiceRoomOpen(false)}
          currentUser={currentUser}
          onCreateRoom={handleCreateVoiceRoom}
        />

        <VoiceRoomsListModal
          isOpen={isVoiceRoomsListOpen}
          onClose={() => setIsVoiceRoomsListOpen(false)}
          rooms={voiceRooms}
          currentUser={currentUser}
          onJoinRoom={handleJoinVoiceRoom}
          onOpenCreateRoom={() => {
            if (!currentUser) {
              setIsLoginModalOpen(true);
              return;
            }
            setIsCreateVoiceRoomOpen(true);
          }}
        />
      </div>
    </div>
  );
}
