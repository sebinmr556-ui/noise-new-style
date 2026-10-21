import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Search, 
  Image as ImageIcon, 
  Heart, 
  Phone, 
  Video, 
  ArrowLeft, 
  Plus, 
  Mic, 
  MicOff,
  PhoneOff,
  Check,
  CheckCheck,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Volume2,
  VolumeX,
  Volume1,
  AlertCircle,
  Radio,
  Copy,
  Bell,
  BellOff,
  Maximize2
} from 'lucide-react';
import { AppUser, PublicUserProfile } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { isVerifiedUser } from '../utils/admin';
import { 
  WebRTCVoiceManager, 
  WebRTCCallStatus, 
  CallSessionData, 
  getCallChannelId 
} from '../utils/webrtcVoice';
import { 
  getSuggestedDatabaseUsers, 
  getRegisteredUserById 
} from '../utils/userSearch';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  initialTargetUsername?: string | null;
  initialTargetUser?: PublicUserProfile | { uid: string; username: string; displayName?: string; avatar?: string } | null;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  image?: string;
  voiceDuration?: string;
  time: string;
  isMe: boolean;
  reaction?: string;
}

interface ChatContact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  online: boolean;
  category?: 'primary' | 'general';
}

const ContactAvatar: React.FC<{ contact: ChatContact; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  contact,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-2xl',
  };

  const hasPhoto = Boolean(
    contact.avatar &&
    !contact.avatar.includes('ui-avatars.com')
  );

  if (hasPhoto) {
    return (
      <div className="relative inline-block">
        <img
          src={contact.avatar}
          alt={contact.name}
          className={`${sizeClasses[size]} rounded-full object-cover border border-[#3a1af2]/40 ${className}`}
        />
        {contact.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 shadow-sm" />
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-rose-500 via-purple-600 to-indigo-600 border border-[#3a1af2]/40 flex items-center justify-center font-bold text-white uppercase select-none shadow-md ${className}`}
      >
        {contact.name ? contact.name.charAt(0) : '?'}
      </div>
      {contact.online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 shadow-sm" />
      )}
    </div>
  );
};

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTargetUsername,
  initialTargetUser,
}) => {
  // Pure database states (no dummy records)
  const [contacts, setContacts] = useState<ChatContact[]>(() => {
    try {
      const saved = localStorage.getItem('noise_dm_contacts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [threads, setThreads] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('noise_dm_threads');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [inboxTab, setInboxTab] = useState<'primary' | 'general'>('primary');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [newChatInput, setNewChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordSeconds, setAudioRecordSeconds] = useState(0);

  // Rich inbox interactions
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isThreadMenuOpen, setIsThreadMenuOpen] = useState(false);
  const [isMutedThread, setIsMutedThread] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [showThreadSearch, setShowThreadSearch] = useState(false);

  // WebRTC Call state
  const [activeCall, setActiveCall] = useState<{
    type: 'audio' | 'video';
    user: ChatContact;
    status: WebRTCCallStatus;
    duration: number;
    channelId: string;
  } | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSessionData | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerVolume, setSpeakerVolume] = useState(1);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const voiceManagerRef = useRef<WebRTCVoiceManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, selectedContact, isTyping]);

  // Persist contacts and threads to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('noise_dm_contacts', JSON.stringify(contacts));
      localStorage.setItem('noise_dm_threads', JSON.stringify(threads));
    } catch {}
  }, [contacts, threads]);

  // Suggested users strictly from Firestore database
  const [dbSuggestedUsers, setDbSuggestedUsers] = useState<PublicUserProfile[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      getSuggestedDatabaseUsers(currentUser, 8)
        .then((users) => {
          setDbSuggestedUsers(users || []);
        })
        .catch((err) => {
          console.debug('Failed to fetch suggested database users:', err);
        });
    }
  }, [isOpen, currentUser]);

  // Real-Time Direct Messages Listener from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser?.uid) return;

    // Filter directly from server to fetch only conversations involving current user
    const dmsQuery = query(
      collection(db, 'direct_messages'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      dmsQuery,
      (snapshot) => {
        const remoteThreads: Record<string, Message[]> = {};
        const contactUpdates = new Map<
          string,
          {
            lastMsg: string;
            time: string;
            timestamp: number;
            unread: boolean;
            peerUid: string;
            peerName: string;
            peerUsername: string;
            peerAvatar: string;
          }
        >();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const senderId = String(data.senderId || '');
          const receiverId = String(data.receiverId || '');

          const isSender = senderId === currentUser.uid;
          const peerId = isSender ? receiverId : senderId;

          if (!peerId || peerId === currentUser.uid) return;

          const peerUsername = isSender
            ? data.receiverUsername || 'user'
            : data.senderUsername || 'user';
          const peerDisplayName = isSender
            ? data.receiverDisplayName || peerUsername
            : data.senderDisplayName || peerUsername;
          const peerAvatar = isSender
            ? data.receiverAvatar || ''
            : data.senderAvatar || '';

          const timestamp = data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : (typeof data.clientTimestamp === 'number' ? data.clientTimestamp : Date.now());
          const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const msg: Message = {
            id: docSnap.id,
            sender: data.senderUsername || (isSender ? currentUser.username : peerUsername),
            text: data.text || '',
            image: data.image || undefined,
            voiceDuration: data.voiceDuration || undefined,
            time: timeStr,
            isMe: isSender,
            reaction: data.reaction || undefined,
          };

          if (!remoteThreads[peerId]) remoteThreads[peerId] = [];
          remoteThreads[peerId].push(msg);

          const previewText = data.text || (data.image ? '📷 Photo' : '🎙️ Voice note');
          const isUnread = !isSender && data.read !== true && selectedContact?.id !== peerId;

          const existingMeta = contactUpdates.get(peerId);
          if (!existingMeta || timestamp > existingMeta.timestamp) {
            contactUpdates.set(peerId, {
              lastMsg: previewText,
              time: timeStr,
              timestamp,
              unread: isUnread,
              peerUid: peerId,
              peerName: peerDisplayName,
              peerUsername,
              peerAvatar,
            });
          }
        });

        // Update threads
        setThreads(remoteThreads);

        // Update contacts with real conversation partners
        if (contactUpdates.size > 0) {
          setContacts((prevContacts) => {
            const updated = [...prevContacts];
            for (const [peerId, meta] of contactUpdates.entries()) {
              const idx = updated.findIndex((c) => c.id === peerId);
              if (idx >= 0) {
                updated[idx] = {
                  ...updated[idx],
                  id: peerId,
                  name: meta.peerName || updated[idx].name,
                  username: meta.peerUsername || updated[idx].username,
                  avatar: meta.peerAvatar || updated[idx].avatar,
                  lastMessage: meta.lastMsg,
                  time: meta.time,
                  unread: meta.unread,
                };
              } else {
                updated.unshift({
                  id: peerId,
                  name: meta.peerName || meta.peerUsername,
                  username: meta.peerUsername,
                  avatar: meta.peerAvatar,
                  lastMessage: meta.lastMsg,
                  time: meta.time,
                  unread: meta.unread,
                  online: true,
                  category: 'primary',
                });
              }
            }
            return updated;
          });
        }
      },
      (error) => {
        console.error('Real-time direct messages listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, selectedContact?.id]);

  // Handle opening directly to a specific target user
  useEffect(() => {
    if (!isOpen) return;

    if (initialTargetUser) {
      const targetId = initialTargetUser.uid;
      const cleanHandle = (initialTargetUser.username || '').toLowerCase().replace('@', '');
      const existing = contacts.find((c) => c.id === targetId || (cleanHandle && c.username.toLowerCase() === cleanHandle));

      if (existing) {
        setSelectedContact(existing);
      } else {
        const newContact: ChatContact = {
          id: targetId,
          name: initialTargetUser.displayName || (cleanHandle ? cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1) : 'User'),
          username: cleanHandle || targetId.slice(0, 8),
          avatar: initialTargetUser.avatar || '',
          lastMessage: 'Started new conversation',
          time: 'Just now',
          unread: false,
          online: true,
          category: 'primary',
        };
        setContacts((prev) => [newContact, ...prev]);
        setSelectedContact(newContact);
      }
      return;
    }

    if (initialTargetUsername) {
      const cleanHandle = initialTargetUsername.toLowerCase().replace('@', '');
      const existing = contacts.find((c) => c.username.toLowerCase() === cleanHandle || c.id === cleanHandle);
      if (existing) {
        setSelectedContact(existing);
      } else {
        getRegisteredUserById(cleanHandle).then((dbUser) => {
          if (!dbUser) return;
          const targetId = dbUser.uid;
          const newContact: ChatContact = {
            id: targetId,
            name: dbUser.displayName || cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1),
            username: dbUser.username || cleanHandle,
            avatar: dbUser.avatar || '',
            lastMessage: 'Started new conversation',
            time: 'Just now',
            unread: false,
            online: true,
            category: 'primary',
          };
          setContacts((prev) => [newContact, ...prev]);
          setSelectedContact(newContact);
        });
      }
    }
  }, [initialTargetUsername, initialTargetUser, isOpen]);

  // Call timer management
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      callTimerRef.current = setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
      return () => clearInterval(callTimerRef.current);
    }
  }, [activeCall?.status]);

  // WebRTC voice manager initialization
  useEffect(() => {
    const manager = new WebRTCVoiceManager({
      onStatusChange: (newStatus) => {
        setActiveCall((prev) => {
          if (!prev) return null;
          if (newStatus === 'ended' || newStatus === 'rejected') {
            setTimeout(() => {
              setActiveCall((curr) => (curr?.status === newStatus ? null : curr));
            }, 1500);
          }
          return { ...prev, status: newStatus };
        });
      },
      onError: (err) => {
        setVoiceError(err);
      },
      onLocalAudioLevel: (lvl) => {
        setLocalAudioLevel(lvl);
      },
      onRemoteAudioLevel: (lvl) => {
        setRemoteAudioLevel(lvl);
      },
      onIncomingCall: (incoming) => {
        const myUid = currentUser?.uid || '';
        const recUid = incoming.receiver.uid || '';
        if (myUid && recUid === myUid) {
          setIncomingCall(incoming);
        }
      },
    });

    voiceManagerRef.current = manager;

    return () => {
      manager.destroy();
      voiceManagerRef.current = null;
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [currentUser?.uid]);

  if (!isOpen) return null;

  const handleSelectContact = (contact: ChatContact) => {
    if (activeCall && activeCall.user.id !== contact.id) {
      handleEndCall();
    }
    setSelectedContact(contact);
    setShowThreadSearch(false);
    setThreadSearchQuery('');
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unread: false } : c))
    );
  };

  const handleSendMessage = async (textToSend?: string, attachedImage?: string, voiceDuration?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText.trim();
    if (!text && !attachedImage && !voiceDuration) return;
    if (!selectedContact || !currentUser) return;

    const targetContactId = selectedContact.id;
    const targetUsername = selectedContact.username;

    const localMsgId = `msg-${Date.now()}`;
    const newMsg: Message = {
      id: localMsgId,
      sender: currentUser.username || 'me',
      text: text,
      image: attachedImage,
      voiceDuration: voiceDuration,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setThreads((prev) => ({
      ...prev,
      [targetContactId]: [...(prev[targetContactId] || []), newMsg],
    }));

    setContacts((prev) =>
      prev.map((c) =>
        c.id === targetContactId
          ? {
              ...c,
              lastMessage: text || (attachedImage ? '📷 Photo' : '🎙️ Voice note'),
              time: 'Just now',
            }
          : c
      )
    );

    if (textToSend === undefined) {
      setInputText('');
    }

    // Direct Firestore Database Delivery
    if (isFirebaseConfigured && db) {
      try {
        const convId = [currentUser.uid, targetContactId].sort().join('_');
        await addDoc(collection(db, 'direct_messages'), {
          conversationId: convId,
          participants: [currentUser.uid, targetContactId],
          senderId: currentUser.uid,
          senderUsername: currentUser.username,
          senderDisplayName: currentUser.displayName || currentUser.username,
          senderAvatar: currentUser.photoURL || '',
          receiverId: targetContactId,
          receiverUsername: targetUsername,
          receiverDisplayName: selectedContact.name,
          receiverAvatar: selectedContact.avatar || '',
          text: text,
          image: attachedImage || '',
          voiceDuration: voiceDuration || '',
          reaction: '',
          read: false,
          createdAt: serverTimestamp(),
          clientTimestamp: Date.now(),
        });
      } catch (err) {
        console.error('Direct message Firestore save error:', err);
      }
    }
  };

  const handleImageAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      handleSendMessage('', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const startVoiceRecording = () => {
    setIsRecordingAudio(true);
    setAudioRecordSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setAudioRecordSeconds((s) => s + 1);
    }, 1000);
  };

  const stopVoiceRecording = (send: boolean) => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecordingAudio(false);
    if (send && audioRecordSeconds > 0) {
      const durationStr = `0:${audioRecordSeconds < 10 ? '0' : ''}${audioRecordSeconds}`;
      handleSendMessage('', undefined, durationStr);
    }
    setAudioRecordSeconds(0);
  };

  const handleToggleVoicePlayback = (msgId: string) => {
    if (playingVoiceId === msgId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(msgId);
      setTimeout(() => {
        setPlayingVoiceId((curr) => (curr === msgId ? null : curr));
      }, 4000);
    }
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!selectedContact) return;
    setThreads((prev) => ({
      ...prev,
      [selectedContact.id]: (prev[selectedContact.id] || []).map((m) =>
        m.id === msgId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m
      ),
    }));

    if (isFirebaseConfigured && db && !msgId.startsWith('msg-')) {
      try {
        await updateDoc(doc(db, 'direct_messages', msgId), {
          reaction: emoji,
        });
      } catch (err) {
        console.debug('Reaction update error:', err);
      }
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedContact) return;
    setThreads((prev) => {
      const updated = (prev[selectedContact.id] || []).filter((m) => m.id !== msgId);
      const lastMsg = updated[updated.length - 1];
      setContacts((prevC) =>
        prevC.map((c) =>
          c.id === selectedContact.id
            ? {
                ...c,
                lastMessage: lastMsg ? lastMsg.text || (lastMsg.image ? '📷 Photo' : '🎙️ Voice note') : 'No messages',
                time: lastMsg ? lastMsg.time : '',
              }
            : c
        )
      );
      return { ...prev, [selectedContact.id]: updated };
    });

    if (isFirebaseConfigured && db && !msgId.startsWith('msg-')) {
      try {
        await deleteDoc(doc(db, 'direct_messages', msgId));
      } catch (err) {
        console.debug('Delete message error:', err);
      }
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearThread = () => {
    if (!selectedContact) return;
    setThreads((prev) => ({ ...prev, [selectedContact.id]: [] }));
    setContacts((prev) =>
      prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: 'No messages', time: '' } : c))
    );
    setIsThreadMenuOpen(false);
  };

  // Start new chat with real database registered user
  const handleStartNewChat = async (e?: React.FormEvent, customHandle?: string) => {
    if (e) e.preventDefault();
    const handle = (customHandle || newChatInput).trim().replace(/^@/, '');
    if (!handle) return;

    const existing = contacts.find((c) => c.username.toLowerCase() === handle.toLowerCase() || c.id === handle);
    if (existing) {
      handleSelectContact(existing);
      setIsComposing(false);
      setNewChatInput('');
      return;
    }

    const dbUser = await getRegisteredUserById(handle);
    if (!dbUser || !dbUser.uid) {
      alert(`User @${handle} was not found in the database.`);
      return;
    }

    const newContact: ChatContact = {
      id: dbUser.uid,
      name: dbUser.displayName || handle.charAt(0).toUpperCase() + handle.slice(1),
      username: dbUser.username || handle.toLowerCase(),
      avatar: dbUser.avatar || '',
      lastMessage: 'Started new conversation',
      time: 'Just now',
      unread: false,
      online: true,
      category: 'primary',
    };

    setContacts((prev) => [newContact, ...prev]);
    setSelectedContact(newContact);
    setIsComposing(false);
    setNewChatInput('');
  };

  // WebRTC Voice Call logic
  const startCall = async (type: 'audio' | 'video' = 'audio') => {
    if (!selectedContact || !currentUser) return;
    setVoiceError(null);

    const caller = {
      uid: currentUser.uid,
      username: currentUser.username || 'user',
      displayName: currentUser.displayName || currentUser.username || 'User',
      avatar: currentUser.photoURL,
    };

    const receiver = {
      uid: selectedContact.id,
      username: selectedContact.username,
      displayName: selectedContact.name,
      avatar: selectedContact.avatar,
    };

    const channelId = getCallChannelId(caller.username, receiver.username);

    setActiveCall({
      type,
      user: selectedContact,
      status: 'calling',
      duration: 0,
      channelId,
    });
    setIsMuted(false);

    try {
      if (voiceManagerRef.current) {
        await voiceManagerRef.current.startCall(caller, receiver);
      }
    } catch (err: any) {
      console.warn('Call start error:', err);
      setVoiceError(err.message || 'Microphone error or connection failed.');
    }
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    setVoiceError(null);

    const callerUid = incomingCall.caller.uid;
    let contact = contacts.find((c) => c.id === callerUid);
    if (!contact) {
      contact = {
        id: callerUid,
        name: incomingCall.caller.displayName || incomingCall.caller.username,
        username: incomingCall.caller.username,
        avatar: incomingCall.caller.avatar || '',
        lastMessage: 'Voice Call',
        time: 'Just now',
        unread: false,
        online: true,
        category: 'primary',
      };
      setContacts((prev) => [contact!, ...prev]);
    }
    setSelectedContact(contact);

    setActiveCall({
      type: 'audio',
      user: contact,
      status: 'connecting',
      duration: 0,
      channelId: incomingCall.channelId,
    });

    const callToAccept = incomingCall;
    setIncomingCall(null);

    try {
      if (voiceManagerRef.current) {
        await voiceManagerRef.current.acceptCall(callToAccept);
      }
    } catch (err: any) {
      console.warn('Accept call error:', err);
      setVoiceError(err.message || 'Failed to connect voice call.');
    }
  };

  const handleRejectIncomingCall = async () => {
    if (!incomingCall) return;
    if (voiceManagerRef.current) {
      await voiceManagerRef.current.rejectCall(incomingCall);
    }
    setIncomingCall(null);
  };

  const handleEndCall = async () => {
    if (voiceManagerRef.current) {
      await voiceManagerRef.current.endCall();
    }
    setActiveCall(null);
    setVoiceError(null);
    setLocalAudioLevel(0);
    setRemoteAudioLevel(0);
  };

  const handleToggleMute = () => {
    if (voiceManagerRef.current) {
      const muted = voiceManagerRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleToggleSpeaker = () => {
    if (voiceManagerRef.current) {
      if (isSpeakerMuted) {
        voiceManagerRef.current.setVolume(speakerVolume || 1);
        setIsSpeakerMuted(false);
      } else {
        voiceManagerRef.current.setVolume(0);
        setIsSpeakerMuted(true);
      }
    }
  };

  const handleSpeakerVolumeChange = (vol: number) => {
    setSpeakerVolume(vol);
    setIsSpeakerMuted(vol === 0);
    voiceManagerRef.current?.setVolume(vol);
  };

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCloseModal = () => {
    if (activeCall) {
      handleEndCall();
    }
    onClose();
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = c.category ? c.category === inboxTab : true;
    return matchesSearch && (searchQuery.trim() ? true : matchesTab);
  });

  const rawMessages = selectedContact ? threads[selectedContact.id] || [] : [];
  const activeMessages = threadSearchQuery.trim()
    ? rawMessages.filter((m) => m.text?.toLowerCase().includes(threadSearchQuery.toLowerCase()))
    : rawMessages;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-end">
      <div className="w-full sm:max-w-md h-full bg-zinc-950 text-zinc-100 border-l border-zinc-800/80 shadow-2xl flex flex-col animate-drawer-in select-none">
        
        {/* INBOX LIST VIEW */}
        {!selectedContact && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-brand text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500">
                  Noise Direct
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                  @{currentUser?.username || 'me'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsComposing(!isComposing)}
                  className={`p-2 rounded-xl transition-all ${
                    isComposing 
                      ? 'bg-rose-500/20 text-rose-400' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                  }`}
                  title="New Message"
                  type="button"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors"
                  type="button"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Compose New Message Input & Suggested Users */}
            {isComposing && (
              <div className="p-3 bg-zinc-900/95 border-b border-zinc-800 space-y-2.5 animate-in fade-in duration-150">
                <form onSubmit={handleStartNewChat} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChatInput}
                    onChange={(e) => setNewChatInput(e.target.value)}
                    placeholder="Type @username to start chat..."
                    autoFocus
                    className="flex-1 bg-zinc-950 text-xs text-zinc-100 placeholder-zinc-500 px-3.5 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={!newChatInput.trim()}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 disabled:opacity-40 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Chat
                  </button>
                </form>

                {/* Suggested registered users strictly from Firestore */}
                {dbSuggestedUsers.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] text-zinc-400 font-semibold mb-1.5 uppercase tracking-wider">Suggested users:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dbSuggestedUsers.map((u) => (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() => handleStartNewChat(undefined, u.username)}
                          className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 px-2.5 py-1 rounded-full text-xs text-zinc-300 transition-all active:scale-95 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>@{u.username}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Bar */}
            <div className="p-3 border-b border-zinc-900">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search direct messages..."
                  className="w-full text-xs pl-9 pr-3.5 py-2 bg-zinc-900 text-zinc-200 placeholder-zinc-500 rounded-xl border border-zinc-800/80 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-zinc-900 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInboxTab('primary')}
                className={`flex-1 py-2.5 text-center transition-colors relative ${
                  inboxTab === 'primary' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Primary
                {inboxTab === 'primary' && (
                  <span className="absolute bottom-0 inset-x-8 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setInboxTab('general')}
                className={`flex-1 py-2.5 text-center transition-colors relative ${
                  inboxTab === 'general' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                General
                {inboxTab === 'general' && (
                  <span className="absolute bottom-0 inset-x-8 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Real Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-20 px-4 text-zinc-500 text-xs">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <Send className="w-5 h-5 -rotate-12" />
                  </div>
                  <p className="font-bold text-zinc-300 text-sm mb-1">No messages yet</p>
                  <p>Click the + icon above to search for a user and start a conversation.</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="p-3.5 hover:bg-zinc-900/70 flex items-center gap-3.5 cursor-pointer transition-colors group"
                  >
                    <div className="flex-none">
                      <ContactAvatar contact={contact} size="md" className="ring-1 ring-zinc-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-100 truncate">{contact.name}</p>
                          {isVerifiedUser(contact) && (
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] flex-none">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono flex-none ml-2">{contact.time}</span>
                      </div>
                      <p className={`text-xs truncate ${contact.unread ? 'font-bold text-white' : 'text-zinc-400'}`}>
                        {contact.lastMessage}
                      </p>
                    </div>
                    {contact.unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 flex-none shadow-xs" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CHAT THREAD VIEW */}
        {selectedContact && (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/90 backdrop-blur-md relative">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Back to Inbox"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <ContactAvatar contact={selectedContact} size="sm" className="ring-1 ring-zinc-700" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-bold text-white truncate leading-tight">{selectedContact.name}</h4>
                    {isVerifiedUser(selectedContact) && (
                      <span className="w-3 h-3 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] flex-none">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {selectedContact.online ? (
                      <span className="text-emerald-400 font-medium">Active now</span>
                    ) : (
                      `@${selectedContact.username}`
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-none">
                <button
                  onClick={() => startCall('audio')}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setIsThreadMenuOpen(!isThreadMenuOpen)}
                    className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                    type="button"
                    title="Conversation Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isThreadMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-30">
                      <button
                        onClick={() => {
                          setShowThreadSearch(!showThreadSearch);
                          setIsThreadMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Search className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Search in chat</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsMutedThread(!isMutedThread);
                          setIsThreadMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        {isMutedThread ? <Bell className="w-3.5 h-3.5 text-zinc-400" /> : <BellOff className="w-3.5 h-3.5 text-zinc-400" />}
                        <span>{isMutedThread ? 'Unmute chat' : 'Mute chat'}</span>
                      </button>
                      <button
                        onClick={handleClearThread}
                        className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 border-t border-zinc-800"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Clear conversation</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCloseModal}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Thread Search Bar */}
            {showThreadSearch && (
              <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={threadSearchQuery}
                  onChange={(e) => setThreadSearchQuery(e.target.value)}
                  placeholder="Filter messages in this chat..."
                  autoFocus
                  className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
                {threadSearchQuery && (
                  <button onClick={() => setThreadSearchQuery('')} className="text-zinc-400 hover:text-white text-xs">
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950">
              <div className="text-center py-5 border-b border-zinc-900 mb-3">
                <div className="flex justify-center mb-2">
                  <ContactAvatar contact={selectedContact} size="lg" className="ring-2 ring-[#3a1af2]/50 shadow-xl" />
                </div>
                <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1">
                  {selectedContact.name}
                  {isVerifiedUser(selectedContact) && (
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">
                      ✓
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">@{selectedContact.username}</p>
              </div>

              {activeMessages.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No messages yet. Send a greeting to start chatting!
                </div>
              ) : (
                activeMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col group ${msg.isMe ? 'items-end' : 'items-start'}`}>
                    <div className="relative max-w-[82%]">
                      {msg.image && (
                        <div 
                          onClick={() => setLightboxImage(msg.image || null)}
                          className="mb-1 rounded-2xl overflow-hidden border border-zinc-800 max-w-[240px] shadow-lg cursor-pointer hover:opacity-95 transition-opacity relative group/img"
                        >
                          <img src={msg.image} alt="Attachment" className="w-full h-auto object-cover" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        </div>
                      )}

                      {msg.voiceDuration && (
                        <div className={`px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-md ${
                          msg.isMe 
                            ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white rounded-br-xs' 
                            : 'bg-zinc-900 border border-zinc-800 text-white rounded-bl-xs'
                        }`}>
                          <button
                            type="button"
                            onClick={() => handleToggleVoicePlayback(msg.id)}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all active:scale-90"
                            title={playingVoiceId === msg.id ? "Pause Voice Clip" : "Play Voice Clip"}
                          >
                            {playingVoiceId === msg.id ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>
                          <span className="text-[10px] font-mono opacity-90">{msg.voiceDuration}</span>
                        </div>
                      )}

                      {msg.text && (
                        <div 
                          onDoubleClick={() => handleToggleReaction(msg.id, '❤️')}
                          className={`px-4 py-2.5 text-xs leading-relaxed transition-all cursor-pointer ${
                            msg.isMe 
                              ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white rounded-2xl rounded-br-xs shadow-md' 
                              : 'bg-zinc-900 text-zinc-100 rounded-2xl rounded-bl-xs border border-zinc-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      )}

                      {msg.reaction && (
                        <div className="absolute -bottom-2 right-1 bg-zinc-900 border border-zinc-800 rounded-full px-1.5 py-0.5 text-xs shadow-md">
                          {msg.reaction}
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className="absolute -top-7 right-0 hidden group-hover:flex items-center gap-1 bg-zinc-900/95 border border-zinc-800 rounded-full px-2 py-0.5 shadow-xl z-10 backdrop-blur-sm">
                        {['❤️', '🔥', '😂', '👏', '😍'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="hover:scale-130 transition-transform text-xs"
                          >
                            {emoji}
                          </button>
                        ))}

                        {msg.text && (
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            className="hover:scale-120 transition-transform text-zinc-400 hover:text-white p-0.5"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}

                        {msg.isMe && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="hover:scale-120 transition-transform text-zinc-400 hover:text-rose-400 p-0.5"
                            title="Unsend Message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-zinc-500 mt-1 px-1">
                      <span>{msg.time}</span>
                      {msg.isMe && <CheckCheck className="w-3 h-3 text-sky-400 inline" />}
                    </div>
                  </div>
                ))
              )}

              {isTyping && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs py-1">
                  <span className="text-[10px] text-zinc-500">{selectedContact.name} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Reaction Shortcuts */}
            <div className="px-3 py-1 bg-zinc-950 border-t border-zinc-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-zinc-500 pl-1 font-semibold flex-none">Quick:</span>
              {['🔥', '❤️', '😂', '😍', '🙌', '👏', '✨', '💯'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendMessage(emoji)}
                  className="px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-xs hover:scale-120 transition-all flex-none border border-zinc-800/60"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex flex-col gap-2">
              {isRecordingAudio ? (
                <div className="flex items-center justify-between p-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 px-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-mono font-bold">
                      Recording: 0:{audioRecordSeconds < 10 ? '0' : ''}{audioRecordSeconds}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(false)}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(true)}
                      className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
                    >
                      Send Note
                    </button>
                  </div>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => { 
                    e.preventDefault(); 
                    handleSendMessage(); 
                  }} 
                  className="flex items-center gap-2"
                >
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors flex-none"
                    title="Attach Photo"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageAttachment} className="hidden" />

                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded-full transition-colors flex-none"
                    title="Record Voice Note"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${selectedContact.name}...`}
                    className="flex-1 bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 rounded-full px-4 py-2.5 border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors"
                  />

                  {inputText.trim() ? (
                    <button 
                      type="submit" 
                      className="p-2.5 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full hover:opacity-90 active:scale-95 transition-all flex-none shadow-md shadow-rose-500/20"
                    >
                      <Send className="w-4 h-4 -rotate-12" />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => handleSendMessage('❤️')} 
                      className="p-2 text-zinc-400 hover:text-[#ff3040] hover:scale-120 transition-all flex-none"
                      title="Send Heart"
                    >
                      <Heart className="w-5 h-5 fill-[#ff3040] text-[#ff3040]" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        {/* PHOTO LIGHTBOX */}
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="relative max-w-lg max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
              <img src={lightboxImage} alt="Enlarged" className="rounded-2xl max-h-[80vh] w-auto object-contain shadow-2xl border border-white/10" />
            </div>
          </div>
        )}

        {/* INCOMING WEBRTC CALL */}
        {incomingCall && (
          <div className="absolute inset-x-3 top-3 z-60 bg-zinc-900/95 border border-purple-500/50 shadow-2xl rounded-2xl p-3.5 sm:p-4 backdrop-blur-xl animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-none">
                  {incomingCall.caller.avatar ? (
                    <img
                      src={incomingCall.caller.avatar}
                      alt={incomingCall.caller.displayName}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-500 shadow-md"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base ring-2 ring-purple-500 shadow-md">
                      {incomingCall.caller.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                      Incoming Voice Call
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {incomingCall.caller.displayName || incomingCall.caller.username}
                  </h4>
                  <p className="text-[10px] text-zinc-400 truncate">
                    @{incomingCall.caller.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-none">
                <button
                  type="button"
                  onClick={handleRejectIncomingCall}
                  className="p-2.5 sm:p-3 bg-zinc-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-full border border-zinc-700/80 transition-all active:scale-95"
                  title="Decline Call"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleAcceptIncomingCall}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 animate-pulse"
                  title="Accept Call"
                >
                  <Phone className="w-4 h-4" />
                  <span>Accept</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE WEBRTC VOICE CALL */}
        {activeCall && (
          <div className="absolute inset-0 z-50 bg-zinc-950/98 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 text-center overflow-y-auto">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>WebRTC Audio</span>
              </div>
              <button 
                onClick={handleEndCall} 
                className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-900 transition-colors" 
                type="button"
                title="End Call"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-auto py-4">
              <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                <ContactAvatar 
                  contact={activeCall.user} 
                  size="xl" 
                  className={`ring-4 shadow-2xl transition-all ${
                    activeCall.status === 'connected'
                      ? 'ring-emerald-500/60 shadow-emerald-500/20'
                      : 'ring-purple-500/40 animate-pulse shadow-purple-500/20'
                  }`} 
                />
                <div 
                  className={`absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-zinc-950 shadow-md ${
                    isMuted ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center justify-center gap-1.5">
                  <span>{activeCall.user.name}</span>
                  {isVerifiedUser(activeCall.user) && (
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">✓</span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">@{activeCall.user.username}</p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono">
                {activeCall.status === 'connected' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400 font-bold">
                      Connected • {formatCallTime(activeCall.duration)}
                    </span>
                  </>
                ) : activeCall.status === 'calling' ? (
                  <span className="text-purple-300">Calling...</span>
                ) : activeCall.status === 'connecting' ? (
                  <span className="text-amber-300">Connecting...</span>
                ) : (
                  <span className="text-rose-400">Call Ended</span>
                )}
              </div>

              {voiceError && (
                <div className="max-w-xs mx-auto p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-none mt-0.5" />
                  <p>{voiceError}</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-4 pt-2 pb-2">
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={handleToggleMute} 
                    className={`p-3.5 sm:p-4 rounded-full transition-all active:scale-95 ${
                      isMuted 
                        ? 'bg-rose-600/90 text-white' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`} 
                    type="button"
                  >
                    {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                  <span className="text-[10px] text-zinc-400 font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={handleEndCall} 
                    className="p-4 sm:p-5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl hover:scale-105 active:scale-95 transition-all" 
                    type="button"
                  >
                    <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                  <span className="text-[10px] text-zinc-400 font-medium">End</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={handleToggleSpeaker} 
                    className={`p-3.5 sm:p-4 rounded-full transition-all active:scale-95 ${
                      isSpeakerMuted 
                        ? 'bg-amber-600/90 text-white' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`} 
                    type="button"
                  >
                    {isSpeakerMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                  <span className="text-[10px] text-zinc-400 font-medium">{isSpeakerMuted ? 'Muted' : 'Speaker'}</span>
                </div>
              </div>

              <div className="max-w-[200px] mx-auto flex items-center gap-2">
                <Volume1 className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isSpeakerMuted ? 0 : speakerVolume}
                  onChange={(e) => handleSpeakerVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
