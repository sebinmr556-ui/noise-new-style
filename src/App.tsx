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
import { AppUser, Post, Story, NavTab, CommentItem, VoiceRoom, RoomParticipant, PublicUserProfile } from './types';
import { UserProfileModal } from './components/UserProfileModal';
import { syncUserToDatabase, getRegisteredUserById, toggleFollowInDatabase } from './utils/userSearch';
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
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
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
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [selectedDetailPost, setSelectedDetailPost] = useState<Post | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [directTargetUsername, setDirectTargetUsername] = useState<string | null>(null);
  const [directTargetUser, setDirectTargetUser] = useState<PublicUserProfile | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isTopLoading, setIsTopLoading] = useState(false);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);

  const [coinsBalance, setCoinsBalance] = useState<number>(150);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

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
      slotLikes: { 0
