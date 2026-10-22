/**
 * Navigation History Manager for Noise Web App
 * 
 * Provides robust step-by-step back navigation using HTML5 History API (pushState/popstate),
 * maintains history order, prevents duplicate entries and navigation loops,
 * supports direct page access/refresh with URL params, and synchronizes
 * browser native back button with in-app back buttons.
 */

import { NavTab } from '../types';

export interface AppNavState {
  tab: NavTab;
  detailPostId?: string | null;
  userProfileUsername?: string | null;
  userProfileUid?: string | null;
  isDirectOpen?: boolean;
  directContactId?: string | null;
  directContactUsername?: string | null;
  isNotificationsOpen?: boolean;
  storyIndex?: number | null;
  activeCommentPostId?: string | null;
  isVoiceRoomsListOpen?: boolean;
  isCreateVoiceRoomOpen?: boolean;
  voiceRoomId?: string | null;
  isMenuOpen?: boolean;
  isCoinModalOpen?: boolean;
  isLoginModalOpen?: boolean;
  stepIndex: number;
}

const VALID_TABS: NavTab[] = ['home', 'search', 'upload', 'reels', 'profile'];

/**
 * Parses current window.location.search to construct an AppNavState on direct access or refresh.
 */
export function parseUrlToNavState(fallbackTab: NavTab = 'home'): AppNavState {
  if (typeof window === 'undefined') {
    return { tab: fallbackTab, stepIndex: 0 };
  }

  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab') as NavTab | null;
  const tab: NavTab = (tabParam && VALID_TABS.includes(tabParam)) ? tabParam : fallbackTab;

  const detailPostId = params.get('post') || null;
  const userProfileUsername = params.get('user') || null;
  const userProfileUid = params.get('uid') || null;

  const dmParam = params.get('dm');
  const viewParam = params.get('view');

  const isDirectOpen = dmParam !== null || viewParam === 'messages';
  const directContactUsername = (dmParam && dmParam !== 'inbox') ? dmParam : null;

  const isNotificationsOpen = viewParam === 'notifications';
  const isVoiceRoomsListOpen = viewParam === 'voice-rooms';
  const isCreateVoiceRoomOpen = viewParam === 'create-room';
  const voiceRoomId = params.get('room') || null;

  const storyParam = params.get('story');
  const storyIndex = storyParam !== null && !isNaN(Number(storyParam)) ? Number(storyParam) : null;

  const activeCommentPostId = params.get('comments') || null;

  return {
    tab,
    detailPostId,
    userProfileUsername,
    userProfileUid,
    isDirectOpen,
    directContactUsername,
    isNotificationsOpen,
    storyIndex,
    activeCommentPostId,
    isVoiceRoomsListOpen,
    isCreateVoiceRoomOpen,
    voiceRoomId,
    stepIndex: window.history.state?.stepIndex ?? 0,
  };
}

/**
 * Formats an AppNavState into a URL query string without losing page context.
 */
export function navStateToUrl(state: AppNavState): string {
  const params = new URLSearchParams();

  // If a modal is open, preserve tab in URL
  if (state.tab !== 'home') {
    params.set('tab', state.tab);
  }

  if (state.detailPostId) {
    params.set('post', state.detailPostId);
  }

  if (state.userProfileUsername) {
    params.set('user', state.userProfileUsername);
    if (state.userProfileUid) {
      params.set('uid', state.userProfileUid);
    }
  }

  if (state.isDirectOpen) {
    if (state.directContactUsername) {
      params.set('dm', state.directContactUsername);
    } else if (state.directContactId) {
      params.set('dm', state.directContactId);
    } else {
      params.set('view', 'messages');
    }
  }

  if (state.isNotificationsOpen) {
    params.set('view', 'notifications');
  }

  if (state.storyIndex !== null && state.storyIndex !== undefined) {
    params.set('story', String(state.storyIndex));
  }

  if (state.voiceRoomId) {
    params.set('room', state.voiceRoomId);
  } else if (state.isVoiceRoomsListOpen) {
    params.set('view', 'voice-rooms');
  } else if (state.isCreateVoiceRoomOpen) {
    params.set('view', 'create-room');
  }

  if (state.activeCommentPostId) {
    params.set('comments', state.activeCommentPostId);
  }

  const query = params.toString();
  return query ? `${window.location.pathname}?${query}` : window.location.pathname;
}

/**
 * Checks if two AppNavStates are functionally equivalent to prevent redundant history pushes.
 */
export function areNavStatesEqual(a: AppNavState, b: AppNavState): boolean {
  return (
    a.tab === b.tab &&
    a.detailPostId === b.detailPostId &&
    a.userProfileUsername === b.userProfileUsername &&
    a.userProfileUid === b.userProfileUid &&
    !!a.isDirectOpen === !!b.isDirectOpen &&
    a.directContactId === b.directContactId &&
    a.directContactUsername === b.directContactUsername &&
    !!a.isNotificationsOpen === !!b.isNotificationsOpen &&
    a.storyIndex === b.storyIndex &&
    a.activeCommentPostId === b.activeCommentPostId &&
    !!a.isVoiceRoomsListOpen === !!b.isVoiceRoomsListOpen &&
    !!a.isCreateVoiceRoomOpen === !!b.isCreateVoiceRoomOpen &&
    a.voiceRoomId === b.voiceRoomId &&
    !!a.isMenuOpen === !!b.isMenuOpen &&
    !!a.isCoinModalOpen === !!b.isCoinModalOpen &&
    !!a.isLoginModalOpen === !!b.isLoginModalOpen
  );
}
