import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  isFirebaseConfigured, 
  onAuthStateChanged, 
  fbSignOut,
  collection, 
  addDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  query, 
  orderBy, 
  updateDoc,
  doc,
  onSnapshot,
  arrayUnion
} from './firebase';
import { 
  AppUser, 
  Post, 
  Story, 
  NavTab, 
  CommentItem, 
  VoiceRoom, 
  RoomParticipant, 
  PublicUserProfile,
  VoiceRoomSeat,
  RoomYouTubeState
} from './types';
import { 
  AppNavState, 
  parseUrlToNavState, 
  navStateToUrl, 
  areNavStatesEqual 
} from './utils/navigation';
import { UserProfileModal } from './components/UserProfileModal';
import { syncUserToDatabase, getRegisteredUserById, toggleFollowInDatabase } from './utils/userSearch';
import { StoriesBar } from './components/StoriesBar';
import { StoryViewerModal } from './components/StoryViewerModal';
import { StoryUploadModal } from './components/StoryUploadModal';
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
import { Loader2, Menu, Coins, Shield, HelpCircle, LogOut, X, Lock, Radio, MessageCircle, Heart, Crown } from 'lucide-react';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// 👑 Ee rand perkk maathram unlimited coin free access:
const UNLIMITED_COIN_USERS = ['sebin_mr', 'nora_____noraaa'];

export default function App() {
  const initialNav = useRef<AppNavState>(parseUrlToNavState()).current;

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      if (initialNav.tab && ['home', 'search', 'upload', 'reels', 'profile'].includes(initialNav.tab)) {
        return initialNav.tab;
      }
      const savedTab = sessionStorage.getItem('noise_active_tab') as NavTab | null;
      if (savedTab && ['home', 'search', 'upload', 'reels', 'profile'].includes(savedTab)) {
        return savedTab;
      }
    } catch {}
    return 'home';
  });

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
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(initialNav.storyIndex !== undefined ? initialNav.storyIndex : null);
  const [isStoryUploadOpen, setIsStoryUploadOpen] = useState(false);
  const [storyInitialFile, setStoryInitialFile] = useState<File | null>(null);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [selectedDetailPost, setSelectedDetailPost] = useState<Post | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(!!initialNav.isDirectOpen);
  const [directTargetUsername, setDirectTargetUsername] = useState<string | null>(initialNav.directContactUsername || null);
  const [directTargetUser, setDirectTargetUser] = useState<PublicUserProfile | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(!!initialNav.isNotificationsOpen);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isTopLoading, setIsTopLoading] = useState(false);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);

  const [coinsBalance, setCoinsBalance] = useState<number>(() => {
    try {
      const savedCoins = localStorage.getItem('noise_coins_balance');
      return savedCoins ? parseInt(savedCoins, 10) : 150;
    } catch {
      return 150;
    }
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  const currentHandle = (currentUser?.username || '').toLowerCase().replace('@', '');
  const isVipUnlimitedUser = UNLIMITED_COIN_USERS.includes(currentHandle);

  const [followingList, setFollowingList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('noise_following_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['maya_beats', 'alex_codes'];
  });
  const [selectedUserProfile, setSelectedUserProfile] = useState<PublicUserProfile | null>(null);

  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([]);
  const [activeVoiceRoom, setActiveVoiceRoom] = useState<VoiceRoom | null>(null);
  const [isVoiceRoomModalOpen, setIsVoiceRoomModalOpen] = useState(false);
  const [isCreateVoiceRoomOpen, setIsCreateVoiceRoomOpen] = useState(!!initialNav.isCreateVoiceRoomOpen);
  const [isVoiceRoomsListOpen, setIsVoiceRoomsListOpen] = useState(!!initialNav.isVoiceRoomsListOpen);

  const navStateRef = useRef<AppNavState>(initialNav);
  const isPoppingRef = useRef(false);
  const stepCountRef = useRef(0);

  const pushNav = (updates: Partial<AppNavState>, replace: boolean = false) => {
    if (isPoppingRef.current) return;
    const current = navStateRef.current;
    const next: AppNavState = {
      ...current,
      ...updates,
      stepIndex: replace ? current.stepIndex : current.stepIndex + 1,
    };
    if (!replace && areNavStatesEqual(current, next)) {
      return;
    }
    navStateRef.current = next;
    const url = navStateToUrl(next);
    if (replace) {
      window.history.replaceState(next, '', url);
    } else {
      window.history.pushState(next, '', url);
      stepCountRef.current++;
    }
  };

  const hasAnyModalOpen = () => {
    return (
      selectedDetailPost !== null ||
      selectedUserProfile !== null ||
      isDirectModalOpen ||
      isNotificationsOpen ||
      activeStoryIndex !== null ||
      activeCommentPost !== null ||
      isVoiceRoomsListOpen ||
      isCreateVoiceRoomOpen ||
      isVoiceRoomModalOpen ||
      isMenuOpen ||
      isCoinModalOpen ||
      isLoginModalOpen
    );
  };

  // 🎯 STEP-BY-STEP BACK HANDLER (Home -> Chatroom List -> Chatroom -> Chatroom List -> Home)
  const handleBack = () => {
    if (isCoinModalOpen) {
      setIsCoinModalOpen(false);
      pushNav({ isCoinModalOpen: false }, true);
    } else if (isMenuOpen) {
      setIsMenuOpen(false);
      pushNav({ isMenuOpen: false }, true);
    } else if (isLoginModalOpen) {
      setIsLoginModalOpen(false);
      pushNav({ isLoginModalOpen: false }, true);
    } else if (activeCommentPost) {
      setActiveCommentPost(null);
      pushNav({ activeCommentPostId: null }, true);
    } else if (selectedDetailPost) {
      setSelectedDetailPost(null);
      pushNav({ detailPostId: null }, true);
    } else if (selectedUserProfile) {
      setSelectedUserProfile(null);
      pushNav({ userProfileUsername: null, userProfileUid: null }, true);
    } else if (isDirectModalOpen) {
      setIsDirectModalOpen(false);
      setDirectTargetUsername(null);
      setDirectTargetUser(null);
      pushNav({ isDirectOpen: false, directContactId: null, directContactUsername: null }, true);
    } else if (isNotificationsOpen) {
      setIsNotificationsOpen(false);
      pushNav({ isNotificationsOpen: false }, true);
    } else if (isStoryUploadOpen) {
      setIsStoryUploadOpen(false);
      setStoryInitialFile(null);
    } else if (activeStoryIndex !== null) {
      setActiveStoryIndex(null);
      pushNav({ storyIndex: null }, true);
    } 
    // 🔥 1. Chatroom ninnu back adichaal Chatroom List-lekku maathram povaan:
    else if (isVoiceRoomModalOpen) {
      setIsVoiceRoomModalOpen(false);
      setIsVoiceRoomsListOpen(true);
      pushNav({ voiceRoomId: null, isVoiceRoomsListOpen: true });
    } 
    // 🔥 2. Chatroom List ninnu back adichaal Home-lekku povaan:
    else if (isVoiceRoomsListOpen) {
      setIsVoiceRoomsListOpen(false);
      pushNav({ isVoiceRoomsListOpen: false }, true);
    } else if (isCreateVoiceRoomOpen) {
      setIsCreateVoiceRoomOpen(false);
      setIsVoiceRoomsListOpen(true);
      pushNav({ isCreateVoiceRoomOpen: false, isVoiceRoomsListOpen: true });
    } else if (activeTab !== 'home') {
      handleTabChange('home');
    } else if (stepCountRef.current > 0 || (window.history.state && typeof window.history.state.stepIndex === 'number' && window.history.state.stepIndex > 0)) {
      window.history.back();
    }
  };

  const handlePurchaseCoins = async (coinsToAdd: number, price: number) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    if (isVipUnlimitedUser) {
      const updatedBalance = coinsBalance + coinsToAdd;
      setCoinsBalance(updatedBalance);
      localStorage.setItem('noise_coins_balance', updatedBalance.toString());

      if (isFirebaseConfigured && db) {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            coins: updatedBalance,
          });
        } catch (e) {
          console.debug('VIP coins Firestore update error:', e);
        }
      }

      alert(`👑 VIP Auto-Approved! ${coinsToAdd.toLocaleString()} Coins added to @${currentHandle}. New Balance: ${updatedBalance.toLocaleString()}`);
      return;
    }

    alert(`💳 Checkout Gateway: To add ${coinsToAdd.toLocaleString()} Coins, please complete payment of $${price.toFixed(2)}. Direct unlimited grant is restricted to VIP accounts.`);
  };

  const handleOpenDetailPost = (post: Post) => {
    setSelectedDetailPost(post);
    pushNav({ detailPostId: post.id });
  };

  const handleOpenComments = (post: Post) => {
    setActiveCommentPost(post);
    pushNav({ activeCommentPostId: post.id });
  };

  const handleOpenStory = (index: number) => {
    setActiveStoryIndex(index);
    pushNav({ storyIndex: index });
  };

  const handleOpenVoiceRoomsList = () => {
    setIsVoiceRoomsListOpen(true);
    pushNav({ isVoiceRoomsListOpen: true });
  };

  const handleOpenCreateVoiceRoom = () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      pushNav({ isLoginModalOpen: true });
      return;
    }
    setIsCreateVoiceRoomOpen(true);
    pushNav({ isCreateVoiceRoomOpen: true });
  };

  const handleOpenCoinModal = () => {
    setIsCoinModalOpen(true);
    pushNav({ isCoinModalOpen: true });
  };

  const handleOpenMenu = () => {
    setIsMenuOpen(true);
    pushNav({ isMenuOpen: true });
  };

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true);
    pushNav({ isNotificationsOpen: true });
  };

  useEffect(() => {
    const currentInit = parseUrlToNavState(activeTab);
    window.history.replaceState(currentInit, '', navStateToUrl(currentInit));

    const onPopState = (e: PopStateEvent) => {
      isPoppingRef.current = true;
      const state: AppNavState = e.state || parseUrlToNavState(activeTab);
      navStateRef.current = state;

      if (state.tab && ['home', 'search', 'upload', 'reels', 'profile'].includes(state.tab)) {
        setActiveTab(state.tab);
        try {
          sessionStorage.setItem('noise_active_tab', state.tab);
        } catch {}
      }

      if (state.detailPostId) {
        const found = posts.find((p) => p.id === state.detailPostId);
        if (found) setSelectedDetailPost(found);
      } else {
        setSelectedDetailPost(null);
      }

      if (state.userProfileUsername || state.userProfileUid) {
        handleOpenUserProfile(
          state.userProfileUsername || state.userProfileUid || '',
          state.userProfileUid || undefined
        );
      } else {
        setSelectedUserProfile(null);
      }

      if (state.isDirectOpen) {
        setIsDirectModalOpen(true);
        if (state.directContactUsername) {
          setDirectTargetUsername(state.directContactUsername);
        }
      } else {
        setIsDirectModalOpen(false);
        setDirectTargetUsername(null);
        setDirectTargetUser(null);
      }

      setIsNotificationsOpen(!!state.isNotificationsOpen);
      setActiveStoryIndex(state.storyIndex !== undefined ? state.storyIndex : null);

      if (state.activeCommentPostId) {
        const found = posts.find((p) => p.id === state.activeCommentPostId);
        if (found) setActiveCommentPost(found);
      } else {
        setActiveCommentPost(null);
      }

      // Step-by-step restoration of voice rooms
      if (state.voiceRoomId) {
        const found = voiceRooms.find((r) => r.id === state.voiceRoomId);
        if (found) {
          setActiveVoiceRoom(found);
          setIsVoiceRoomModalOpen(true);
          setIsVoiceRoomsListOpen(false);
        }
      } else if (state.isVoiceRoomsListOpen) {
        setIsVoiceRoomModalOpen(false);
        setIsVoiceRoomsListOpen(true);
      } else {
        setIsVoiceRoomModalOpen(false);
        setIsVoiceRoomsListOpen(false);
      }

      setIsCreateVoiceRoomOpen(!!state.isCreateVoiceRoomOpen);
      setIsMenuOpen(!!state.isMenuOpen);
      setIsCoinModalOpen(!!state.isCoinModalOpen);
      setIsLoginModalOpen(!!state.isLoginModalOpen);

      setTimeout(() => {
        isPoppingRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [posts, voiceRooms, activeTab]);

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

  // Auth Listener with permanent Firestore profile sync (Name/Username persist)
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let blockedUsers: string[] = [];
        let displayName = user.displayName || 'Noise Creator';
        let username = (user.displayName || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 15);
        let photoURL = user.photoURL || '';
        let bio = 'Digital Creator ✨\nNoise App Official 🚀';
        let website = '';
        let followersCount = 0;
        let followingCount = 0;
        let coins = 150;

        if (db) {
          try {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              if (data.displayName) displayName = data.displayName;
              if (data.username) username = data.username;
              if (data.photoURL || data.avatar) photoURL = data.photoURL || data.avatar;
              if (data.bio) bio = data.bio;
              if (data.website) website = data.website;
              if (typeof data.followersCount === 'number') followersCount = data.followersCount;
              if (typeof data.followingCount === 'number') followingCount = data.followingCount;
              if (Array.isArray(data.blockedUsers)) blockedUsers = data.blockedUsers;
              if (typeof data.coins === 'number') coins = data.coins;
            } else {
              await syncUserToDatabase({
                uid: user.uid,
                username,
                displayName,
                photoURL,
                bio,
                website,
                followersCount: 0,
                followingCount: 0,
                blockedUsers: []
              });
            }
          } catch (e) {
            console.debug('Error reading or syncing user profile:', e);
          }
        }

        const appUser: AppUser = {
          uid: user.uid,
          displayName,
          username,
          email: user.email || undefined,
          photoURL,
          bio,
          website,
          followersCount,
          followingCount,
          blockedUsers: Array.from(new Set([...blockedUsers]))
        };
        setCurrentUser(appUser);
        setCoinsBalance(coins);
        try {
          localStorage.setItem('noise_current_user', JSON.stringify(appUser));
          localStorage.setItem('noise_coins_balance', coins.toString());
        } catch {}
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setIsLoadingPosts(false);
      return;
    }
    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), (snapshot) => {
      const loaded: Post[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loaded.push({
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
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now(),
        });
      });
      setPosts(loaded);
      setIsLoadingPosts(false);
    });

    const unsubStories = onSnapshot(query(collection(db, 'stories'), orderBy('createdAt', 'desc')), (snapshot) => {
      const loaded: Story[] = [];
      const now = Date.now();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : now);
        const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : (createdAt + 24 * 60 * 60 * 1000);

        // Genuine 24-hour expiration: skip expired stories
        if (now >= expiresAt) {
          return;
        }

        const isVideo = data.mediaType === 'video' ||
          data.mediaUrl?.startsWith('data:video') ||
          data.mediaUrl?.includes('.mp4') ||
          data.mediaUrl?.includes('.webm') ||
          data.mediaUrl?.includes('.mov');

        loaded.push({
          id: docSnap.id,
          uid: data.uid || data.userId,
          userId: data.userId || data.uid,
          authorId: data.authorId || data.uid,
          username: data.username || 'user',
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'User')}&background=000&color=fff`,
          mediaUrl: data.mediaUrl,
          mediaType: isVideo ? 'video' : 'image',
          caption: data.caption || '',
          timestamp: 'Recent',
          hasSeen: false,
          createdAt,
          expiresAt,
        } as any);
      });
      setStories(loaded);
    });

    const unsubRooms = onSnapshot(collection(db, 'voice_rooms'), (snapshot) => {
      const loaded: VoiceRoom[] = [];
      const now = Date.now();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        if (
          data.isDummy === true ||
          id.startsWith('mock-') ||
          id.startsWith('dummy-') ||
          data.hostUid === 'system' ||
          !data.hostUid
        ) {
          return;
        }

        const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : now);
        const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : (createdAt + 24 * 60 * 60 * 1000);

        // Auto-delete / filter out expired or inactive rooms
        if (now >= expiresAt || data.isLive === false) {
          fetch(`/api/chatrooms/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
          return;
        }

        loaded.push({
          id: docSnap.id,
          title: data.title || 'Live Voice Room',
          topic: data.topic || 'Casual Hangout',
          description: data.description || '',
          announcement: data.announcement || '',
          hostUid: data.hostUid,
          hostUsername: data.hostUsername || 'user',
          hostDisplayName: data.hostDisplayName || 'User',
          hostAvatar: data.hostAvatar || '',
          speakers: Array.isArray(data.speakers) ? data.speakers : [],
          listeners: Array.isArray(data.listeners) ? data.listeners : [],
          seats: Array.isArray(data.seats) ? data.seats : undefined,
          speakingRequests: Array.isArray(data.speakingRequests) ? data.speakingRequests : [],
          coAdmins: Array.isArray(data.coAdmins) ? data.coAdmins : [],
          roles: data.roles || { [data.hostUid]: 'owner' },
          youtubeState: data.youtubeState,
          roomType: data.roomType || 'vip_lounge',
          roomTheme: data.roomTheme || 'luxury',
          seatCount: data.seatCount || 10,
          tags: Array.isArray(data.tags) ? data.tags : [],
          ambientVibe: data.ambientVibe || 'none',
          isLive: data.isLive !== false,
          createdAt,
          expiresAt,
          slotLikes: data.slotLikes || {},
          pkBattle: data.pkBattle,
          activeGame: data.activeGame,
        });
      });

      loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setVoiceRooms(loaded);

      // Security and Consistency: Prevent deleted rooms and IDs from remaining open in UI
      setActiveVoiceRoom((curr) => {
        if (!curr) return null;
        const fresh = loaded.find((r) => r.id === curr.id);
        if (!fresh) {
          setIsVoiceRoomModalOpen(false);
          setIsVoiceRoomsListOpen(true);
          pushNav({ voiceRoomId: null, isVoiceRoomsListOpen: true });
          return null;
        }
        return fresh;
      });
    });

    return () => {
      unsubPosts();
      unsubStories();
      unsubRooms();
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
    handleTabChange('home');
    setIsMenuOpen(false);
  };

  const handleLikeToggle = async (postId: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const myUid = auth?.currentUser?.uid || currentUser.uid;
    let targetPost: Post | undefined;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = p.likedBy?.includes(myUid);
        const likedBy = isLiked
          ? p.likedBy.filter(uid => uid !== myUid)
          : [...(p.likedBy || []), myUid];
        const likes = isLiked ? Math.max(0, p.likes - 1) : p.likes + 1;
        targetPost = { ...p, likes, likedBy };
        return targetPost;
      }
      return p;
    }));

    if (isFirebaseConfigured && db && targetPost && !postId.startsWith('post-')) {
      try {
        await updateDoc(doc(db, 'posts', postId), {
          likes: targetPost.likes,
          likedBy: targetPost.likedBy,
        });
      } catch (e) {
        console.debug('Error syncing like to Firestore:', e);
      }
    }
  };

  const handleSaveToggle = async (postId: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const myUid = auth?.currentUser?.uid || currentUser.uid;
    let targetPost: Post | undefined;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const savedBy = p.savedBy || [];
        const isSaved = savedBy.includes(myUid);
        const newSavedBy = isSaved
          ? savedBy.filter(uid => uid !== myUid)
          : [...savedBy, myUid];
        targetPost = { ...p, savedBy: newSavedBy };
        return targetPost;
      }
      return p;
    }));

    if (isFirebaseConfigured && db && targetPost && !postId.startsWith('post-')) {
      try {
        await updateDoc(doc(db, 'posts', postId), {
          savedBy: targetPost.savedBy,
        });
      } catch (e) {
        console.debug('Error syncing savedBy to Firestore:', e);
      }
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const myUid = auth?.currentUser?.uid || currentUser.uid;
    const newComment: CommentItem = {
      id: `comm-${Date.now()}`,
      uid: myUid,
      username: currentUser.username,
      avatar: currentUser.photoURL,
      text,
      createdAt: new Date().toISOString()
    };
    let updatedComments: CommentItem[] = [];

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const comments = [...(p.comments || []), newComment];
        updatedComments = comments;
        const updated = { ...p, comments };
        if (activeCommentPost?.id === postId) setActiveCommentPost(updated);
        return updated;
      }
      return p;
    }));

    if (isFirebaseConfigured && db && !postId.startsWith('post-')) {
      try {
        await updateDoc(doc(db, 'posts', postId), {
          comments: updatedComments,
        });
      } catch (e) {
        console.debug('Error syncing comment to Firestore:', e);
      }
    }
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const comments = (p.comments || []).filter(c => c.id !== commentId);
        const updated = { ...p, comments };
        if (activeCommentPost?.id === postId) setActiveCommentPost(updated);
        return updated;
      }
      return p;
    }));
  };

  const handleCreatePost = async (newPostData: { image: string; caption: string; location?: string; filter?: string; mediaType?: 'image' | 'video' }) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const senderUid = auth?.currentUser?.uid || currentUser.uid;
    setIsTopLoading(true);

    const localId = `post-${Date.now()}`;
    const post: Post = {
      id: localId,
      uid: senderUid,
      username: currentUser.displayName || currentUser.username,
      avatar: currentUser.photoURL,
      image: newPostData.image,
      caption: newPostData.caption,
      location: newPostData.location,
      filter: newPostData.filter,
      likes: 0,
      likedBy: [],
      savedBy: [],
      comments: [],
      createdAt: Date.now(),
      mediaType: newPostData.mediaType || 'image',
    };
    setPosts(prev => [post, ...prev]);

    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, 'posts'), {
          uid: senderUid,
          username: currentUser.displayName || currentUser.username,
          avatar: currentUser.photoURL || '',
          image: newPostData.image,
          caption: newPostData.caption || '',
          location: newPostData.location || '',
          filter: newPostData.filter || '',
          mediaType: newPostData.mediaType || 'image',
          likes: 0,
          likedBy: [],
          savedBy: [],
          comments: [],
          createdAt: serverTimestamp(),
        });
        setPosts(prev => prev.map(p => p.id === localId ? { ...p, id: docRef.id } : p));
      } catch (err) {
        console.error('Failed to save post to Firestore:', err);
      }
    }

    setIsTopLoading(false);
    handleTabChange('home');
  };

  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (selectedDetailPost?.id === postId) setSelectedDetailPost(null);

    if (isFirebaseConfigured && db && !postId.startsWith('post-')) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
      } catch (e) {
        console.debug('Error deleting post from Firestore:', e);
      }
    }
  };

  const handleBlockUser = async (userUid: string) => {
    if (!currentUser) return;
    const isBlocked = (currentUser.blockedUsers || []).includes(userUid);
    const updated = isBlocked
      ? (currentUser.blockedUsers || []).filter(u => u !== userUid)
      : Array.from(new Set([...(currentUser.blockedUsers || []), userUid]));

    setCurrentUser(prev => prev ? { ...prev, blockedUsers: updated } : null);
    if (!isBlocked) {
      setFollowingList(prev => {
        const next = prev.filter(f => f.toLowerCase() !== userUid.toLowerCase());
        try {
          localStorage.setItem('noise_following_list', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    if (db && currentUser.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { blockedUsers: updated });
      } catch (e) {
        console.debug('Failed to sync blockedUsers to firestore', e);
      }
    }
  };

  const handleOpenDirect = (target?: string | PublicUserProfile, targetUid?: string) => {
    if (typeof target === 'object' && target) {
      setDirectTargetUser(target);
      setDirectTargetUsername(target.username);
      pushNav({ isDirectOpen: true, directContactUsername: target.username, directContactId: target.uid });
    } else if (typeof target === 'string') {
      setDirectTargetUsername(target);
      setDirectTargetUser(targetUid ? {
        uid: targetUid,
        userId: targetUid,
        username: target,
        displayName: target,
        avatar: '',
        followersCount: 0,
        followingCount: 0,
      } : null);
      pushNav({ isDirectOpen: true, directContactUsername: target, directContactId: targetUid });
    } else {
      setDirectTargetUsername(null);
      setDirectTargetUser(null);
      pushNav({ isDirectOpen: true, directContactUsername: null, directContactId: null });
    }
    setIsDirectModalOpen(true);
  };

  // 🔥 DIRECT FIRESTORE UPDATE FOR USERNAME AND NAME
  const handleUpdateProfile = async (updates: Partial<AppUser>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    try {
      localStorage.setItem('noise_current_user', JSON.stringify(updated));
    } catch {}

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.debug('Error updating profile in firestore:', e);
      }
    }

    await syncUserToDatabase({ uid: currentUser.uid, username: currentUser.username, ...updates });
  };

  const handleUpdateAvatar = async (avatarUrl: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, photoURL: avatarUrl };
    setCurrentUser(updated);
    try {
      localStorage.setItem('noise_current_user', JSON.stringify(updated));
    } catch {}
    await syncUserToDatabase({ uid: currentUser.uid, username: currentUser.username, photoURL: avatarUrl, avatar: avatarUrl });
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser) return;
    const updated = { ...currentUser, photoURL: '' };
    setCurrentUser(updated);
    try {
      localStorage.setItem('noise_current_user', JSON.stringify(updated));
    } catch {}
    await syncUserToDatabase({ uid: currentUser.uid, username: currentUser.username, photoURL: '', avatar: '' });
  };

  const handleFollowToggle = async (userOrUid: string | { uid?: string; userId?: string; username: string }) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const targetKey = typeof userOrUid === 'string' ? userOrUid : (userOrUid.uid || userOrUid.userId || userOrUid.username);
    const isFollowing = followingList.some(item => item.toLowerCase() === targetKey.toLowerCase());
    const nextFollowing = isFollowing
      ? followingList.filter(item => item.toLowerCase() !== targetKey.toLowerCase())
      : [...followingList, targetKey];

    setFollowingList(nextFollowing);
    try {
      localStorage.setItem('noise_following_list', JSON.stringify(nextFollowing));
    } catch {}

    setCurrentUser(prev => {
      if (!prev) return null;
      const count = Math.max(0, (prev.followingCount || 0) + (isFollowing ? -1 : 1));
      const updated = { ...prev, followingCount: count, following: nextFollowing };
      try {
        localStorage.setItem('noise_current_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await toggleFollowInDatabase(currentUser.uid, targetKey, !isFollowing);
    } catch (e) {
      console.debug('Follow database sync warning:', e);
    }
  };

  const handleOpenUserProfile = async (userOrUsername: string | PublicUserProfile, userUid?: string, avatarUrl?: string) => {
    if (typeof userOrUsername === 'object' && userOrUsername) {
      setSelectedUserProfile(userOrUsername);
      pushNav({
        userProfileUsername: userOrUsername.username,
        userProfileUid: userOrUsername.uid,
      });
      return;
    }
    const username = userOrUsername;
    const searchId = userUid || username;
    try {
      const regUser = await getRegisteredUserById(searchId);
      if (regUser) {
        setSelectedUserProfile(regUser);
        pushNav({
          userProfileUsername: regUser.username,
          userProfileUid: regUser.uid,
        });
        return;
      }
    } catch (e) {
      console.debug('Error looking up profile by ID:', e);
    }

    const matchedPost = posts.find(p => (userUid && p.uid === userUid) || p.username.toLowerCase() === username.toLowerCase());
    const fallbackProfile: PublicUserProfile = {
      uid: matchedPost?.uid || userUid || username,
      userId: matchedPost?.uid || userUid || username,
      username: matchedPost?.username || username,
      displayName: matchedPost?.username || username,
      avatar: matchedPost?.avatar || avatarUrl || '',
      followersCount: 1,
      followingCount: 0,
      isVerified: !!matchedPost?.isVerified,
    };
    setSelectedUserProfile(fallbackProfile);
    pushNav({
      userProfileUsername: fallbackProfile.username,
      userProfileUid: fallbackProfile.uid,
    });
  };

  const handleStorySeen = (storyId: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, hasSeen: true } : s));
  };

  const handleAddUserStory = () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,video/mp4,video/webm,video/quicktime,video/x-m4v';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setStoryInitialFile(file);
        setIsStoryUploadOpen(true);
      }
    };
    input.click();
  };

  const handleDeleteStory = async (storyId: string) => {
    setStories(prev => prev.filter(s => s.id !== storyId));
    setActiveStoryIndex(null);

    if (isFirebaseConfigured && db && !storyId.startsWith('story-')) {
      try {
        await deleteDoc(doc(db, 'stories', storyId));
      } catch (e) {
        console.debug('Error deleting story from Firestore:', e);
      }
    }
  };

  const handleCreateVoiceRoom = async (roomData: { 
    title: string; 
    topic: string; 
    tags: string[]; 
    roomType?: string;
    roomTheme?: string;
    seatCount?: number;
    ambientVibe: any;
  }) => {
    if (!currentUser) return;
    const now = Date.now();
    // Configure intentional 24-hour expiration policy for chat rooms
    const expiresAt = now + 24 * 60 * 60 * 1000;
    const roomId = `room-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const hostParticipant: RoomParticipant = {
      uid: currentUser.uid,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatar: currentUser.photoURL,
      isHost: true,
      isSpeaker: true,
      isMuted: false,
      isSpeaking: false,
      joinedAt: now,
      seatNumber: 1,
    };

    // 10 real social voice seats: Seat 1 is owner/host, Seats 2-10 are open seats
    const initialSeats: VoiceRoomSeat[] = [
      { seatNumber: 1, isLocked: false, user: hostParticipant },
      ...Array.from({ length: 9 }, (_, i) => ({
        seatNumber: i + 2,
        isLocked: false,
        user: null,
      }))
    ];

    const initialYouTubeState: RoomYouTubeState = {
      videoId: '',
      title: '',
      thumbnail: '',
      playbackState: 'stopped',
      positionSeconds: 0,
      updatedAt: now,
      queue: [],
      allowVisitorSuggest: true,
      allowCoAdminControl: true,
    };

    const newRoom: VoiceRoom = {
      id: roomId,
      title: roomData.title,
      topic: roomData.topic,
      description: `Welcome to ${roomData.title}! Connect your voice, listen to friends, and watch YouTube together.`,
      announcement: `Welcome to our social room! Tap any open seat to request speaking or tap YouTube above to watch videos together.`,
      hostUid: currentUser.uid,
      hostUsername: currentUser.username,
      hostDisplayName: currentUser.displayName,
      hostAvatar: currentUser.photoURL,
      speakers: [hostParticipant],
      listeners: [],
      seats: initialSeats,
      speakingRequests: [],
      coAdmins: [],
      roles: { [currentUser.uid]: 'owner' },
      youtubeState: initialYouTubeState,
      roomType: roomData.roomType || 'vip_lounge',
      roomTheme: roomData.roomTheme || 'luxury',
      seatCount: 10,
      tags: roomData.tags,
      ambientVibe: roomData.ambientVibe,
      isLive: true,
      createdAt: now,
      expiresAt: expiresAt,
      slotLikes: {},
    };

    // Database Enforcement: Save to Firestore with explicit expiration rule
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'voice_rooms', roomId), {
          id: roomId,
          title: roomData.title,
          topic: roomData.topic,
          description: newRoom.description,
          announcement: newRoom.announcement,
          hostUid: currentUser.uid,
          hostUsername: currentUser.username,
          hostDisplayName: currentUser.displayName,
          hostAvatar: currentUser.photoURL || '',
          speakers: [hostParticipant],
          listeners: [],
          seats: initialSeats,
          speakingRequests: [],
          coAdmins: [],
          roles: { [currentUser.uid]: 'owner' },
          youtubeState: initialYouTubeState,
          roomType: roomData.roomType || 'vip_lounge',
          roomTheme: roomData.roomTheme || 'luxury',
          seatCount: 10,
          tags: roomData.tags,
          ambientVibe: roomData.ambientVibe,
          isLive: true,
          createdAt: now,
          expiresAt: expiresAt,
          slotLikes: {},
        });
      } catch (err) {
        console.error('Failed to save voice room to Firestore:', err);
      }
    }

    setVoiceRooms(prev => [newRoom, ...prev.filter(r => r.id !== roomId)]);
    setActiveVoiceRoom(newRoom);
    setIsVoiceRoomModalOpen(true);
    setIsVoiceRoomsListOpen(false);
    pushNav({ voiceRoomId: newRoom.id, isVoiceRoomsListOpen: false });
  };

  // Chatroom List-ൽ നിന്ന് റൂമിൽ കയറുമ്പോൾ:
  const handleJoinVoiceRoom = (room: VoiceRoom) => {
    setIsVoiceRoomsListOpen(false);
    setActiveVoiceRoom(room);
    setIsVoiceRoomModalOpen(true);
    pushNav({ isVoiceRoomsListOpen: false, voiceRoomId: room.id });

    // Sync user presence to listeners if not already a speaker
    if (currentUser && db && isFirebaseConfigured) {
      const isAlreadySpeaker = (room.speakers || []).some(s => s.uid === currentUser.uid);
      const isAlreadyListener = (room.listeners || []).some(l => l.uid === currentUser.uid);
      if (!isAlreadySpeaker && !isAlreadyListener) {
        const listenerItem: RoomParticipant = {
          uid: currentUser.uid,
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatar: currentUser.photoURL,
          isHost: false,
          isSpeaker: false,
          isMuted: true,
          isSpeaking: false,
          joinedAt: Date.now(),
        };
        updateDoc(doc(db, 'voice_rooms', room.id), {
          listeners: arrayUnion(listenerItem)
        }).catch(() => {});
      }
    }
  };

  const handleLeaveVoiceRoom = () => {
    if (activeVoiceRoom && currentUser && db && isFirebaseConfigured) {
      // Remove from listeners if currently in listeners
      const currentListeners = activeVoiceRoom.listeners || [];
      const updatedListeners = currentListeners.filter(l => l.uid !== currentUser.uid);
      if (updatedListeners.length !== currentListeners.length) {
        updateDoc(doc(db, 'voice_rooms', activeVoiceRoom.id), {
          listeners: updatedListeners
        }).catch(() => {});
      }
    }

    setActiveVoiceRoom(null);
    setIsVoiceRoomModalOpen(false);
    setIsVoiceRoomsListOpen(true);
    pushNav({ voiceRoomId: null, isVoiceRoomsListOpen: true });
  };

  const handleDeleteVoiceRoom = async (roomId: string) => {
    setVoiceRooms(prev => prev.filter(r => r.id !== roomId));
    if (activeVoiceRoom?.id === roomId) {
      setActiveVoiceRoom(null);
      setIsVoiceRoomModalOpen(false);
      setIsVoiceRoomsListOpen(true);
      pushNav({ voiceRoomId: null, isVoiceRoomsListOpen: true });
    }

    // Backend deletion + Firestore cascading cleanup of messages and temporary IDs
    try {
      fetch(`/api/chatrooms/${encodeURIComponent(roomId)}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    if (isFirebaseConfigured && db) {
      try {
        const msgCol = collection(db, 'voice_rooms', roomId, 'messages');
        const snaps = await getDocs(msgCol);
        for (const m of snaps.docs) {
          await deleteDoc(doc(db, 'voice_rooms', roomId, 'messages', m.id));
        }
        await deleteDoc(doc(db, 'voice_rooms', roomId));
      } catch (e) {
        console.debug('Error deleting voice room from Firestore:', e);
      }
    }
  };

  const handleUpdateVoiceRoom = async (updatedRoom: VoiceRoom) => {
    setActiveVoiceRoom(updatedRoom);
    setVoiceRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));

    if (isFirebaseConfigured && db && updatedRoom.id) {
      try {
        await updateDoc(doc(db, 'voice_rooms', updatedRoom.id), {
          speakers: updatedRoom.speakers,
          listeners: updatedRoom.listeners,
          isLive: updatedRoom.isLive,
          slotLikes: updatedRoom.slotLikes || {},
          ...(updatedRoom.pkBattle ? { pkBattle: updatedRoom.pkBattle } : {}),
          ...(updatedRoom.activeGame ? { activeGame: updatedRoom.activeGame } : {}),
        });
      } catch (e) {
        console.debug('Error syncing voice room update:', e);
      }
    }
  };

  const handleOpenVoiceChatroomFromStory = (targetHostUsername?: string) => {
    setActiveStoryIndex(null);
    if (targetHostUsername) {
      const match = voiceRooms.find(r => r.isLive && (
        r.hostUsername?.toLowerCase() === targetHostUsername.toLowerCase() ||
        r.speakers?.some(s => s.username?.toLowerCase() === targetHostUsername.toLowerCase())
      ));
      if (match) {
        handleJoinVoiceRoom(match);
        return;
      }
    }
    if (voiceRooms.length > 0) {
      handleOpenVoiceRoomsList();
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
      pushNav({ isLoginModalOpen: true });
      return;
    }

    if (activeTab === tab && !hasAnyModalOpen()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSelectedDetailPost(null);
    setSelectedUserProfile(null);
    setIsDirectModalOpen(false);
    setIsNotificationsOpen(false);
    setActiveStoryIndex(null);
    setActiveCommentPost(null);
    setIsVoiceRoomsListOpen(false);
    setIsCreateVoiceRoomOpen(false);
    setIsVoiceRoomModalOpen(false);
    setIsMenuOpen(false);
    setIsCoinModalOpen(false);
    setIsLoginModalOpen(false);

    setActiveTab(tab);
    try {
      sessionStorage.setItem('noise_active_tab', tab);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });

    pushNav({
      tab,
      detailPostId: null,
      userProfileUsername: null,
      userProfileUid: null,
      isDirectOpen: false,
      directContactUsername: null,
      directContactId: null,
      isNotificationsOpen: false,
      storyIndex: null,
      activeCommentPostId: null,
      isVoiceRoomsListOpen: false,
      isCreateVoiceRoomOpen: false,
      voiceRoomId: null,
      isMenuOpen: false,
      isCoinModalOpen: false,
      isLoginModalOpen: false,
    });
  };

  const handleRefreshFeed = async () => {
    setIsRefreshingFeed(true);
    setIsTopLoading(true);
    try {
      if (isFirebaseConfigured && db) {
        const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
        const loaded: Post[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          loaded.push({
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
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now()
          });
        });
        setPosts(loaded);
      } else {
        await new Promise(r => setTimeout(r, 700));
      }
    } catch (e) {
      console.debug('Refresh error:', e);
    } finally {
      setIsRefreshingFeed(false);
      setIsTopLoading(false);
    }
  };

  const blockedUids = currentUser?.blockedUsers || [];
  const visiblePosts = posts.filter(p => !blockedUids.includes(p.uid));
  const visibleStories = stories.filter(s => !blockedUids.includes(s.uid || s.userId || ''));
  const savedPostsList = currentUser ? visiblePosts.filter(p => p.savedBy?.includes(currentUser.uid)) : [];

  return (
    <div className="min-h-screen bg-black flex justify-center text-zinc-100 selection:bg-rose-500/30 selection:text-white">
      <TopLoadingBar isLoading={isTopLoading || isLoadingPosts} />

      <div className="w-full max-w-[470px] min-h-screen bg-zinc-950 relative pb-14 border-x border-zinc-800/80 shadow-2xl flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              Noise
            </h1>
            {currentUser && (
              <button
                onClick={handleOpenCoinModal}
                className={`flex items-center gap-1 border px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  isVipUnlimitedUser 
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                    : 'bg-zinc-900 border-zinc-800 text-amber-400 hover:bg-zinc-800'
                }`}
              >
                {isVipUnlimitedUser ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : <Coins className="w-3.5 h-3.5" />}
                <span>{coinsBalance.toLocaleString()}</span>
                {isVipUnlimitedUser && <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-black">VIP</span>}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => {
                if (activeVoiceRoom) {
                  setIsVoiceRoomModalOpen(true);
                  setIsVoiceRoomsListOpen(false);
                  pushNav({ voiceRoomId: activeVoiceRoom.id, isVoiceRoomsListOpen: false });
                } else {
                  handleOpenVoiceRoomsList();
                }
              }}
              className="relative p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-all group flex items-center active:scale-95 cursor-pointer"
              type="button"
              title="Chatrooms & Voice Rooms"
            >
              <Radio className="w-5 h-5 text-rose-500 animate-pulse group-hover:scale-110 transition-transform" />
              {voiceRooms.some(r => r.isLive) && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-zinc-950" />
                </span>
              )}
            </button>

            <button
              onClick={handleOpenNotifications}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-all relative group active:scale-95 cursor-pointer"
              type="button"
              title="Notifications"
            >
              <Heart className="w-5 h-5 group-hover:text-rose-500 group-hover:scale-110 transition-all" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-zinc-950" />
            </button>

            <button
              onClick={() => handleOpenDirect()}
              className="relative p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-all group active:scale-95 cursor-pointer"
              type="button"
              title="Direct Messages & Inbox"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 group-hover:text-white transition-transform" />
            </button>

            <button
              onClick={handleOpenMenu}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-all cursor-pointer"
              type="button"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Tabs */}
        <main className="flex-1">
          {activeTab === 'home' && (
            <PullToRefresh onRefresh={handleRefreshFeed} isRefreshing={isRefreshingFeed}>
              <div>
                <StoriesBar
                  stories={visibleStories}
                  currentUser={currentUser}
                  onOpenStory={(idx) => handleOpenStory(idx)}
                  onAddStory={handleAddUserStory}
                />

                <LiveVoiceRoomsBar
                  rooms={voiceRooms}
                  currentUser={currentUser}
                  onOpenCreateRoom={handleOpenCreateVoiceRoom}
                  onJoinRoom={handleJoinVoiceRoom}
                  onOpenAllRooms={handleOpenVoiceRoomsList}
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
                        className="mt-4 px-5 py-2.5 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
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
                          f => f.toLowerCase() === post.username.toLowerCase() || (post.uid && f.toLowerCase() === post.uid.toLowerCase())
                        )}
                        onFollowToggle={handleFollowToggle}
                        onSelectUser={handleOpenUserProfile}
                        onLikeToggle={handleLikeToggle}
                        onSaveToggle={handleSaveToggle}
                        onOpenComments={(p) => handleOpenComments(p)}
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
              onSelectPost={(p) => handleOpenDetailPost(p)}
              onSelectUser={(u) => handleOpenUserProfile(u)}
              onOpenDirect={handleOpenDirect}
              onRequireLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {activeTab === 'upload' && (
            <UploadView
              currentUser={currentUser}
              onPostCreated={handleCreatePost}
              onCancel={handleBack}
              onRequireLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {activeTab === 'reels' && (
            <ReelsView
              onGoToUpload={() => handleTabChange('upload')}
              allPosts={visiblePosts}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              posts={posts}
              savedPosts={savedPostsList}
              followingList={followingList}
              onFollowToggle={handleFollowToggle}
              onSelectUser={(u) => handleOpenUserProfile(u)}
              onUpdateAvatar={handleUpdateAvatar}
              onRemoveAvatar={handleRemoveAvatar}
              onUpdateProfile={handleUpdateProfile}
              onSelectPost={(p) => handleOpenDetailPost(p)}
              onOpenUpload={() => handleTabChange('upload')}
              onRequireLogin={() => setIsLoginModalOpen(true)}
            />
          )}
        </main>

        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentUser={currentUser}
        />

        {/* Side Menu Drawer */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="w-80 bg-zinc-900 h-full p-5 flex flex-col border-l border-zinc-800 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <h3 className="text-base font-bold text-white">Settings & Activity</h3>
                <button
                  onClick={handleBack}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 py-4 space-y-4 overflow-y-auto">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsCoinModalOpen(true);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left cursor-pointer ${
                    isVipUnlimitedUser
                      ? 'bg-amber-500/15 border border-amber-400/40 hover:bg-amber-500/25'
                      : 'bg-zinc-800/50 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isVipUnlimitedUser ? <Crown className="w-5 h-5 text-amber-400" /> : <Coins className="w-5 h-5 text-amber-400" />}
                    <span className="text-sm font-medium">{isVipUnlimitedUser ? 'VIP Unlimited Vault' : 'Buy Coins'}</span>
                  </div>
                  <span className="text-xs bg-amber-400/10 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                    {coinsBalance.toLocaleString()} Coins
                  </span>
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
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleTabChange('profile');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all text-left text-sm font-medium cursor-pointer"
                >
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span>Profile Settings & Security</span>
                </button>

                <button
                  onClick={() => {
                    alert('Noise Support: support@noise.app');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all text-left text-sm font-medium cursor-pointer"
                >
                  <HelpCircle className="w-5 h-5 text-emerald-400" />
                  <span>Help & Support</span>
                </button>
              </div>

              {currentUser && (
                <div className="pt-4 border-t border-zinc-800">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all text-sm font-bold cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🌟 COIN PURCHASE MODAL */}
        {isCoinModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-zinc-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 animate-in zoom-in-95 duration-200 text-white shadow-2xl">
              
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  {isVipUnlimitedUser ? (
                    <Crown className="w-5 h-5 text-amber-400 animate-bounce" />
                  ) : (
                    <Coins className="w-5 h-5 text-amber-400" />
                  )}
                  <h3 className="text-base font-black uppercase tracking-wider text-amber-300">
                    {isVipUnlimitedUser ? 'VIP Unlimited Vault' : 'Coin Store'}
                  </h3>
                </div>
                <button
                  onClick={handleBack}
                  className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold block">Account ID</span>
                  <span className="text-xs font-bold text-zinc-200">@{currentHandle || 'guest'}</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  isVipUnlimitedUser 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-md' 
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {isVipUnlimitedUser ? '👑 Unlimited VIP' : 'Standard User'}
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto py-1">
                {[
                  { coins: 1000, price: 0.99, tag: 'Starter' },
                  { coins: 5000, price: 4.99, tag: 'Popular' },
                  { coins: 20000, price: 14.99, tag: 'Super VIP' },
                  { coins: 100000, price: 49.99, tag: 'Hyper King' },
                ].map((pack) => (
                  <div
                    key={pack.coins}
                    className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between hover:border-amber-400/40 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-amber-300">🪙 {pack.coins.toLocaleString()}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-400 font-bold">
                          {pack.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {isVipUnlimitedUser ? 'VIP Free Refill' : `Price: $${pack.price.toFixed(2)}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePurchaseCoins(pack.coins, pack.price)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md cursor-pointer ${
                        isVipUnlimitedUser
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black hover:brightness-110 shadow-amber-500/20'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                      }`}
                    >
                      {isVipUnlimitedUser ? 'Claim Free' : `$${pack.price}`}
                    </button>
                  </div>
                ))}
              </div>

              <div className="text-center pt-1 border-t border-zinc-800/80 text-[10px] text-zinc-500">
                Current Coins Balance: <span className="text-amber-400 font-bold">{coinsBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Modals & Overlays */}
        {activeStoryIndex !== null && visibleStories[activeStoryIndex] && (
          <StoryViewerModal
            stories={visibleStories}
            initialIndex={activeStoryIndex}
            currentUser={currentUser}
            onClose={handleBack}
            onStorySeen={handleStorySeen}
            onDeleteStory={handleDeleteStory}
            onOpenDirectChat={() => handleOpenDirect()}
            onOpenChatroom={handleOpenVoiceChatroomFromStory}
          />
        )}

        <StoryUploadModal
          isOpen={isStoryUploadOpen}
          initialFile={storyInitialFile}
          onClose={() => {
            setIsStoryUploadOpen(false);
            setStoryInitialFile(null);
          }}
          currentUser={currentUser}
          onRequireLogin={() => setIsLoginModalOpen(true)}
          onStoryPublished={(newStory) => {
            setStories((prev) => [newStory, ...prev.filter((s) => s.id !== newStory.id)]);
          }}
        />

        {activeVoiceRoom && (
          <VoiceRoomModal
            room={activeVoiceRoom}
            currentUser={currentUser}
            isOpen={isVoiceRoomModalOpen}
            onMinimize={() => {
              // 🎯 Chatroom minimised/back: Go back to chatroom list modal
              setIsVoiceRoomModalOpen(false);
              setIsVoiceRoomsListOpen(true);
              pushNav({ voiceRoomId: null, isVoiceRoomsListOpen: true });
            }}
            onLeaveRoom={() => {
              handleLeaveVoiceRoom();
            }}
            onUpdateRoom={handleUpdateVoiceRoom}
            onDeleteRoom={handleDeleteVoiceRoom}
            onRequireLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {isCreateVoiceRoomOpen && (
          <CreateVoiceRoomModal
            isOpen={isCreateVoiceRoomOpen}
            onClose={handleBack}
            currentUser={currentUser}
            onCreateRoom={handleCreateVoiceRoom}
          />
        )}

        {isVoiceRoomsListOpen && (
          <VoiceRoomsListModal
            isOpen={isVoiceRoomsListOpen}
            rooms={voiceRooms}
            currentUser={currentUser}
            onClose={handleBack}
            onJoinRoom={handleJoinVoiceRoom}
            onOpenCreateRoom={() => {
              setIsVoiceRoomsListOpen(false);
              handleOpenCreateVoiceRoom();
            }}
            onDeleteRoom={handleDeleteVoiceRoom}
          />
        )}

        {activeVoiceRoom && !isVoiceRoomModalOpen && (
          <VoiceRoomMiniPlayer
            room={activeVoiceRoom}
            currentUser={currentUser}
            onExpand={() => {
              setIsVoiceRoomModalOpen(true);
              setIsVoiceRoomsListOpen(false);
              pushNav({ voiceRoomId: activeVoiceRoom.id, isVoiceRoomsListOpen: false });
            }}
            onLeave={() => {
              handleLeaveVoiceRoom();
            }}
            onUpdateRoom={handleUpdateVoiceRoom}
          />
        )}

        {activeCommentPost && (
          <CommentsModal
            post={activeCommentPost}
            currentUser={currentUser}
            onClose={handleBack}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        )}

        {selectedDetailPost && (
          <PostDetailModal
            post={selectedDetailPost}
            currentUser={currentUser}
            onClose={handleBack}
            onLikeToggle={handleLikeToggle}
            onSaveToggle={handleSaveToggle}
            onOpenComments={(p) => handleOpenComments(p)}
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
              f => f.toLowerCase() === selectedUserProfile.username.toLowerCase() ||
                   f.toLowerCase() === selectedUserProfile.uid.toLowerCase() ||
                   f.toLowerCase() === selectedUserProfile.userId.toLowerCase()
            )}
            onFollowToggle={handleFollowToggle}
            onOpenDirect={(target, uid) => {
              handleOpenDirect(target, uid);
              setSelectedUserProfile(null);
            }}
            onBlockUser={handleBlockUser}
            onSelectPost={(p) => handleOpenDetailPost(p)}
            onClose={handleBack}
            onRequireLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        <DirectMessagesModal
          isOpen={isDirectModalOpen}
          onClose={handleBack}
          onBack={handleBack}
          currentUser={currentUser}
          initialTargetUsername={directTargetUsername}
          initialTargetUser={directTargetUser}
        />

        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={handleBack}
          currentUser={currentUser}
          onSelectUser={(u) => {
            handleBack();
            setTimeout(() => handleOpenUserProfile(u), 60);
          }}
        />

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={handleBack}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            handleBack();
          }}
        />
      </div>
    </div>
  );
}
