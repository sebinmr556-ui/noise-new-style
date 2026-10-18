export interface AppUser {
  uid: string;
  displayName: string;
  username: string;
  email?: string;
  photoURL: string;
  bio?: string;
  website?: string;
  followersCount: number;
  followingCount: number;
  blockedUsers?: string[];
  following?: string[]; // Array of followed user IDs or usernames
  isVerified?: boolean;
}

export interface PublicUserProfile {
  uid: string;
  userId: string; // Explicit public User ID (e.g. noise_id or uid)
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  website?: string;
  followersCount: number;
  followingCount: number;
  isVerified?: boolean;
}

export interface CommentItem {
  id: string;
  uid: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
  isVerified?: boolean;
}

export interface Post {
  id: string;
  uid: string;
  username: string;
  avatar: string;
  image: string;
  caption: string;
  location?: string;
  filter?: string;
  likes: number;
  likedBy: string[]; // array of uids
  savedBy?: string[]; // array of uids
  comments: CommentItem[];
  createdAt: number | any; // timestamp
  isLocalOnly?: boolean;
  mediaType?: 'image' | 'video';
  isVerified?: boolean;
}

export interface Story {
  id: string;
  uid?: string;
  userId?: string;
  authorId?: string;
  username: string;
  avatar: string;
  mediaUrl: string;
  caption?: string;
  timestamp: string;
  hasSeen?: boolean;
  mediaType?: 'image' | 'video';
  isVerified?: boolean;
  mentionTag?: string;
  sharedReel?: {
    id: string;
    username: string;
    caption?: string;
    videoUrl?: string;
  };
}

export interface Reel {
  id: string;
  username: string;
  avatar: string;
  videoUrl: string;
  posterUrl: string;
  caption: string;
  musicTitle: string;
  likes: number;
  commentsCount: number;
  isLiked?: boolean;
}

export type NavTab = 'home' | 'search' | 'upload' | 'reels' | 'profile';

export interface RoomParticipant {
  uid: string;
  username: string;
  displayName: string;
  avatar?: string;
  isHost?: boolean;
  isSpeaker?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  hasRaisedHand?: boolean;
  joinedAt: number;
  seatNumber?: number;
  likesReceived?: number;
}

export interface RoomMessage {
  id: string;
  uid: string;
  username: string;
  avatar?: string;
  text: string;
  createdAt: number;
}

export interface PKBattle {
  isActive: boolean;
  teamRed: {
    uid: string;
    username: string;
    displayName: string;
    avatar?: string;
    score: number;
  };
  teamBlue: {
    uid: string;
    username: string;
    displayName: string;
    avatar?: string;
    score: number;
  };
  timeLeft: number; // in seconds
  duration: number; // default 60s
  winner?: 'red' | 'blue' | 'draw' | null;
}

export interface InteractiveGame {
  type: 'wheel' | 'dice' | 'truthOrDare' | 'coinFlip';
  isOpen: boolean;
  result?: any;
}

export interface VoiceRoom {
  id: string;
  title: string;
  topic: string;
  hostUid: string;
  hostUsername: string;
  hostDisplayName: string;
  hostAvatar?: string;
  speakers: RoomParticipant[];
  listeners: RoomParticipant[];
  tags: string[];
  ambientVibe?: 'none' | 'lofi' | 'rain' | 'cafe' | 'synth';
  isLive: boolean;
  createdAt: number;
  activeSpeakerUid?: string;
  slotLikes?: { [slotIndex: number]: number };
  pkBattle?: PKBattle;
  activeGame?: InteractiveGame;
}
