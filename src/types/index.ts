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
  isPrivate?: boolean;
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
  createdAt?: number | any;
  expiresAt?: number;
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
  displayName?: string;
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

export type RoomRole = 'super_admin' | 'owner' | 'co_admin' | 'visitor';

export interface SpeakingRequest {
  uid: string;
  username: string;
  displayName: string;
  avatar?: string;
  requestedAt: number;
}

export interface VoiceRoomSeat {
  seatNumber: number; // 1 to 10
  user: RoomParticipant | null;
  isLocked: boolean;
  isMuted?: boolean;
}

export interface YouTubeQueueItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration?: string;
  addedBy: string;
  addedByUid: string;
  addedAt: number;
}

export interface RoomYouTubeState {
  videoId: string;
  title: string;
  thumbnail: string;
  playbackState: 'playing' | 'paused' | 'stopped';
  positionSeconds: number;
  updatedAt: number; // server timestamp
  queue: YouTubeQueueItem[];
  allowVisitorSuggest: boolean;
  allowCoAdminControl: boolean;
}

export interface VoiceRoom {
  id: string;
  title: string;
  topic: string;
  hostUid: string;
  hostUsername: string;
  hostDisplayName: string;
  hostAvatar?: string;
  description?: string;
  announcement?: string;
  speakers: RoomParticipant[];
  listeners: RoomParticipant[];
  seats?: VoiceRoomSeat[];
  speakingRequests?: SpeakingRequest[];
  coAdmins?: string[]; // Array of UIDs
  roles?: { [uid: string]: RoomRole };
  youtubeState?: RoomYouTubeState;
  tags: string[];
  roomType?: string;
  roomTheme?: string;
  seatCount?: number;
  ambientVibe?: 'none' | 'lofi' | 'rain' | 'cafe' | 'synth';
  isLive: boolean;
  createdAt: number;
  expiresAt?: number;
  activeSpeakerUid?: string;
  slotLikes?: { [slotIndex: number]: number };
  pkBattle?: PKBattle;
  activeGame?: InteractiveGame;
}

export interface DirectMessageItem {
  id: string;
  sender: string;
  senderId?: string;
  receiverId?: string;
  text: string;
  image?: string;
  voiceDuration?: string;
  time: string;
  isMe: boolean;
  reaction?: string;
  read?: boolean;
  seenBy?: string[]; // Array of user UIDs who opened/saw the message
  createdAt?: number;
}

export interface DirectMessageContact {
  id: string; // Real database UID
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  unreadCount?: number;
  online: boolean;
  category?: 'primary' | 'general';
}
