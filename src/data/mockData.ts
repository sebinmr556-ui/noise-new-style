import { Story, Post, Reel, VoiceRoom } from '../types';

// Demo samples removed per user request: data is loaded directly from Firebase Firestore
export const INITIAL_STORIES: Story[] = [];
export const INITIAL_POSTS: Post[] = [];
export const INITIAL_REELS: Reel[] = [];
export const EXPLORE_GRID_ITEMS: { id: string; image: string; tag: string; likes: string }[] = [];

export const INITIAL_VOICE_ROOMS: VoiceRoom[] = [
  {
    id: 'room-lofi-beats',
    title: 'Chill Lo-Fi Beats & Creator Lounge ☕',
    topic: 'Chill & Lo-Fi',
    hostUid: 'u-1',
    hostUsername: 'sophia',
    hostDisplayName: 'Sophia Laurent',
    hostAvatar: '',
    speakers: [
      {
        uid: 'u-1',
        username: 'sophia',
        displayName: 'Sophia Laurent',
        avatar: '',
        isHost: true,
        isSpeaker: true,
        isMuted: false,
        isSpeaking: true,
        joinedAt: Date.now() - 400000,
      },
      {
        uid: 'u-2',
        username: 'alex_architect',
        displayName: 'Alex Carter',
        avatar: '',
        isSpeaker: true,
        isMuted: false,
        isSpeaking: false,
        joinedAt: Date.now() - 240000,
      },
    ],
    listeners: [
      {
        uid: 'u-3',
        username: 'maria_wanderlust',
        displayName: 'Maria Vance',
        avatar: '',
        joinedAt: Date.now() - 150000,
      },
      {
        uid: 'u-4',
        username: 'liam',
        displayName: 'Liam Vance',
        avatar: '',
        joinedAt: Date.now() - 60000,
      },
    ],
    tags: ['lofi', 'beats', 'chill', 'aesthetic'],
    ambientVibe: 'lofi',
    isLive: true,
    createdAt: Date.now() - 420000,
  },
  {
    id: 'room-street-photo',
    title: 'Street Photography & Raw Edits 📸',
    topic: 'Photography & Art',
    hostUid: 'u-2',
    hostUsername: 'alex_architect',
    hostDisplayName: 'Alex Carter',
    hostAvatar: '',
    speakers: [
      {
        uid: 'u-2',
        username: 'alex_architect',
        displayName: 'Alex Carter',
        avatar: '',
        isHost: true,
        isSpeaker: true,
        isMuted: false,
        isSpeaking: true,
        joinedAt: Date.now() - 600000,
      },
    ],
    listeners: [
      {
        uid: 'u-5',
        username: 'elena_art',
        displayName: 'Elena Rostova',
        avatar: '',
        joinedAt: Date.now() - 180000,
      },
    ],
    tags: ['photography', 'raw', 'lightroom', 'visuals'],
    ambientVibe: 'cafe',
    isLive: true,
    createdAt: Date.now() - 600000,
  },
];
