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
}

export interface CommentItem {
  id: string;
  uid: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
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
}

export interface Story {
  id: string;
  username: string;
  avatar: string;
  mediaUrl: string;
  caption?: string;
  timestamp: string;
  hasSeen?: boolean;
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
}

export interface RoomMessage {
  id: string;
  uid: string;
  username: string;
  avatar?: string;
  text: string;
  createdAt: number;
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
}
