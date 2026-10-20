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
  getDocs,
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
import { AppUser, Post, Story, NavTab, CommentItem, VoiceRoom, RoomParticipant, PublicUserProfile } from './types';
import { UserProfileModal } from './components/UserProfileModal';
import { getAllDiscoverableUsers } from './data/usersData';
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
import { PullToRefresh } from './components/PullToRefresh';
import { Loader2, Menu, Coins, Shield, HelpCircle, LogOut, X, Lock, Radio, MessageCircle, Heart } from 'lucide-react';

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
  const [directTargetUsername, setDirectTargetUsername] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isTopLoading, setIsTopLoading] = useState(false);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);

  // New States for Menu, Coins, and Private Account
  const [coinsBalance, setCoinsBalance] = useState<number>(150);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  // Follow / Unfollow System & User ID Profile Modal
  const [followingList, setFollowingList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('noise_following_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['maya_beats', 'alex_codes'];
  });
  const [selectedUserProfile, setSelectedUserProfile] = useState<PublicUserProfile | null>(null);

const DEFAULT_ROOMS: VoiceRoom[] = [
  {
    id: 'room-lounge-1',
    title: 'Late Night Chill & Lofi ☕️',
    topic: 'Casual Hangout & Music',
    hostUid: 'host-maya',
    hostUsername: 'maya_beats',
    hostDisplayName: 'Maya Beats',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    speakers: [
      {
        uid: 'host-maya',
        username: 'maya_beats',
        displayName: 'Maya Beats',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        isHost: true,
        isSpeaker: true,
        isMuted: false,
        isSpeaking: true,
        joinedAt: Date.now() - 3600000,
        seatNumber: 0,
      },
      {
        uid: 'user-kai',
        username: 'kai_dj',
        displayName: 'Kai Music',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
        isSpeaker: true,
        isMuted: false,
        isSpeaking: false,
        joinedAt: Date.now() - 1800000,
        seatNumber: 1,
      }
    ],
    listeners: [
      {
        uid: 'user-sam',
        username: 'sam_travels',
        displayName: 'Sam R.',
        joinedAt: Date.now() - 900000,
      }
    ],
    tags: ['Music', 'Lofi', 'Chill'],
    ambientVibe: 'lofi',
    isLive: true,
    createdAt: Date.now() - 3600000,
    slotLikes: { 0: 24, 1: 18 },
  },
  {
    id: 'room-founders-2',
    title: 'Creators & Tech Talk 🚀',
    topic: 'App Design & Building in Public',
    hostUid: 'host-dev',
    hostUsername: 'alex_codes',
    hostDisplayName: 'Alex C.',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    speakers: [
      {
        uid: 'host-dev',
        username: 'alex_codes',
        displayName: 'Alex C.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        isHost: true,
        isSpeaker: true,
        isMuted: false,
        isSpeaking: false,
        joinedAt: Date.now() - 7200000,
        seatNumber: 0,
      }
    ],
    listeners: [],
    tags: ['Tech', 'Design', 'Startup'],
    ambientVibe: 'none',
    isLive: true,
    createdAt: Date.now() - 7200000,
    slotLikes: { 0: 42 },
  }
];

  // Voice Chatrooms State
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>(DEFAULT_ROOMS);
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
          const currentSaved = p.savedBy || [];
          const isSaved = currentSaved.includes(currentUser.uid);
          const newSavedBy = isSaved
            ? currentSaved.filter((id) => id !== currentUser.uid)
            : [...currentSaved, currentUser.uid];
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
      createdAt: new Date().toISOString(),
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

  const handleFollowToggle = (userOrId: PublicUserProfile | string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const targetKey = typeof userOrId === 'string'
      ? userOrId.toLowerCase()
      : (userOrId.username || userOrId.uid || userOrId.userId).toLowerCase();

    setFollowingList((prev) => {
      const isAlreadyFollowing = prev.some((f) => f.toLowerCase() === targetKey);
      const updated = isAlreadyFollowing
        ? prev.filter((f) => f.toLowerCase() !== targetKey)
        : [...prev, targetKey];

      try {
        localStorage.setItem('noise_following_list', JSON.stringify(updated));
      } catch {}

      setCurrentUser((u) => {
        if (!u) return null;
        const newCount = Math.max(0, (u.followingCount || 0) + (isAlreadyFollowing ? -1 : 1));
        const updatedUser = { ...u, followingCount: newCount, following: updated };
        try {
          localStorage.setItem('noise_current_user', JSON.stringify(updatedUser));
        } catch {}
        return updatedUser;
      });

      return updated;
    });
  };

  const handleOpenUserProfile = (usernameOrUser: string | PublicUserProfile, uid?: string, avatar?: string) => {
    if (typeof usernameOrUser === 'object' && usernameOrUser !== null) {
      setSelectedUserProfile(usernameOrUser);
      return;
    }
    const un = usernameOrUser;
    const allUsers = getAllDiscoverableUsers(posts);
    const found = allUsers.find(
      (u) =>
        u.username.toLowerCase() === un.toLowerCase() ||
        (uid && u.uid.toLowerCase() === uid.toLowerCase())
    );
    if (found) {
      setSelectedUserProfile(found);
    } else {
      setSelectedUserProfile({
        uid: uid || `usr_${un}`,
        userId: un.toLowerCase(),
        username: un,
        displayName: un,
        avatar: avatar || '',
        followersCount: 14,
        followingCount: 5,
        isVerified: false,
      });
    }
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

  const handleOpenChatroomFromStory = (targetUsername?: string) => {
    setActiveStoryIndex(null);
    if (targetUsername) {
      const match = voiceRooms.find(
        (r) =>
          r.isLive &&
          (r.hostUsername?.toLowerCase() === targetUsername.toLowerCase() ||
            r.speakers?.some((s) => s.username?.toLowerCase() === targetUsername.toLowerCase()))
      );
      if (match) {
        handleJoinVoiceRoom(match);
        return;
      }
    }

    if (voiceRooms.length > 0) {
      setIsVoiceRoomsListOpen(true);
    } else {
      if (!currentUser) {
        setIsLoginModalOpen(true);
        return;
      }
      setIsCreateVoiceRoomOpen(true);
    }
  };

  const handleTabChange = (tab: NavTab) => {
    if (!currentUser && (tab === 'upload' || tab === 'profile')) {
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefreshFeed = async () => {
    setIsRefreshingFeed(true);
    setIsTopLoading(true);
    try {
      if (isFirebaseConfigured && db) {
        const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(postsQuery);
        const firestorePosts: Post[] = [];
        snap.forEach((docSnap) => {
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
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    } catch (err) {
      console.debug('Refresh error:', err);
    } finally {
      setIsRefreshingFeed(false);
      setIsTopLoading(false);
    }
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

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Top Right Voice & Group Chatroom Icon */}
            <button
              onClick={() => {
                if (activeVoiceRoom) {
                  setIsVoiceRoomModalOpen(true);
                } else {
                  setIsVoiceRoomsListOpen(true);
                }
              }}
              className="relative p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-all group flex items-center active:scale-95"
              type="button"
              title="Chatrooms & Voice Rooms"
            >
              <Radio className="w-5 h-5 text-rose-500 animate-pulse group-hover:scale-110 transition-transform" />
              {voiceRooms.some((r) => r.isLive) && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-zinc-950"></span>
                </span>
              )}
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-all relative group active:scale-95"
              type="button"
              title="Notifications"
            >
              <Heart className="w-5 h-5 group-hover:text-rose-500 group-hover:scale-110 transition-all" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-zinc-950" />
            </button>

            {/* Direct Messages: Changed from flight icon to sleek message icon */}
            <button
              onClick={() => setIsDirectModalOpen(true)}
              className="relative p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-all group active:scale-95"
              type="button"
              title="Direct Messages & Inbox"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 group-hover:text-white transition-transform" />
              <span className="absolute top-1 right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-[9px] font-bold text-white ring-2 ring-zinc-950 shadow-sm animate-in zoom-in-75">
                2
              </span>
            </button>

            {/* 3-Line Hamburger Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-all active:scale-95"
              type="button"
              title="Menu & Settings"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1">
          {activeTab === 'home' && (
            <PullToRefresh onRefresh={handleRefreshFeed} isRefreshing={isRefreshingFeed}>
              <div>
                <StoriesBar
                  stories={visibleStories}
                  currentUser={currentUser}
                  onOpenStory={(index) => setActiveStoryIndex(index)}
                  onAddStory={handleAddUserStory}
                />

                {/* Live Voice Chatrooms Carousel */}
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
                        isFollowing={followingList.some(
                          (f) =>
                            f.toLowerCase() === post.username.toLowerCase() ||
                            (post.uid && f.toLowerCase() === post.uid.toLowerCase())
                        )}
                        onFollowToggle={handleFollowToggle}
                        onSelectUser={handleOpenUserProfile}
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
            </PullToRefresh>
          )}

          {activeTab === 'search' && (
            <ExploreView 
              allPosts={visiblePosts} 
              currentUser={currentUser}
              followingList={followingList}
              onFollowToggle={handleFollowToggle}
              onSelectPost={(post) => setSelectedDetailPost(post)} 
              onSelectUser={(user) => setSelectedUserProfile(user)}
              onRequireLogin={() => setIsLoginModalOpen(true)}
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
            <ReelsView onGoToUpload={() => handleTabChange('upload')} allPosts={visiblePosts} />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              posts={posts}
              savedPosts={savedPosts}
              followingList={followingList}
              onFollowToggle={handleFollowToggle}
              onSelectUser={(user) => setSelectedUserProfile(user)}
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
            onOpenDirectChat={() => setIsDirectModalOpen(true)}
            onOpenChatroom={handleOpenChatroomFromStory}
          />
        )}

        {/* Live Voice Chatroom Modals */}
        {activeVoiceRoom && isVoiceRoomModalOpen && (
          <VoiceRoomModal
            room={activeVoiceRoom}
            currentUser={currentUser}
            isOpen={isVoiceRoomModalOpen}
            onMinimize={() => setIsVoiceRoomModalOpen(false)}
            onLeaveRoom={handleLeaveVoiceRoom}
            onUpdateRoom={handleUpdateActiveRoom}
            onDeleteRoom={handleDeleteVoiceRoom}
            onRequireLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {isCreateVoiceRoomOpen && (
          <CreateVoiceRoomModal
            isOpen={isCreateVoiceRoomOpen}
            onClose={() => setIsCreateVoiceRoomOpen(false)}
            currentUser={currentUser}
            onCreateRoom={handleCreateVoiceRoom}
          />
        )}

        {isVoiceRoomsListOpen && (
          <VoiceRoomsListModal
            isOpen={isVoiceRoomsListOpen}
            rooms={voiceRooms}
            currentUser={currentUser}
            onClose={() => setIsVoiceRoomsListOpen(false)}
            onJoinRoom={handleJoinVoiceRoom}
            onOpenCreateRoom={() => {
              setIsVoiceRoomsListOpen(false);
              setIsCreateVoiceRoomOpen(true);
            }}
            onDeleteRoom={handleDeleteVoiceRoom}
          />
        )}

        {activeVoiceRoom && !isVoiceRoomModalOpen && (
          <VoiceRoomMiniPlayer
            room={activeVoiceRoom}
            currentUser={currentUser}
            onExpand={() => setIsVoiceRoomModalOpen(true)}
            onLeave={handleLeaveVoiceRoom}
            onUpdateRoom={handleUpdateActiveRoom}
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

        {selectedUserProfile && (
          <UserProfileModal
            user={selectedUserProfile}
            currentUser={currentUser}
            posts={posts}
            isFollowing={followingList.some(
              (f) =>
                f.toLowerCase() === selectedUserProfile.username.toLowerCase() ||
                f.toLowerCase() === selectedUserProfile.uid.toLowerCase() ||
                f.toLowerCase() === selectedUserProfile.userId.toLowerCase()
            )}
            onFollowToggle={handleFollowToggle}
            onOpenDirect={(targetUsername) => {
              setDirectTargetUsername(targetUsername);
              setIsDirectModalOpen(true);
            }}
            onBlockUser={handleBlockUser}
            onSelectPost={(post) => setSelectedDetailPost(post)}
            onClose={() => setSelectedUserProfile(null)}
            onRequireLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        <DirectMessagesModal 
          isOpen={isDirectModalOpen} 
          onClose={() => {
            setIsDirectModalOpen(false);
            setDirectTargetUsername(null);
          }} 
          currentUser={currentUser} 
          initialTargetUsername={directTargetUsername}
        />
        <NotificationsModal 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
          currentUser={currentUser}
          onSelectUser={(username) => {
            setIsNotificationsOpen(false);
            handleOpenUserProfile(username);
          }}
        />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={(user) => setCurrentUser(user)} />
      </div>
    </div>
  );
}
