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
  Smile,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Sparkles,
  Volume2,
  VolumeX,
  Volume1,
  AlertCircle,
  Radio,
  Activity,
  Copy,
  Bell,
  BellOff,
  Maximize2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { AppUser } from '../types';
import { db, auth, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  where,
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { isVerifiedUser } from '../utils/admin';
import { 
  WebRTCVoiceManager, 
  WebRTCCallStatus, 
  CallSessionData, 
  getCallChannelId 
} from '../utils/webrtcVoice';
import { PublicUserProfile } from '../types';
import { 
  getSuggestedDatabaseUsers, 
  getRegisteredUserById, 
  searchRegisteredUsers,
  isValidFirebaseUid 
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
  senderId?: string;
  receiverId?: string;
  text: string;
  image?: string;
  voiceDuration?: string;
  time: string;
  isMe: boolean;
  reaction?: string;
  read?: boolean;
  seenBy?: string[]; // UIDs of users who have viewed this message
  status?: 'sending' | 'sent' | 'error';
  errorMessage?: string;
  createdAt?: number;
  clientTimestamp?: number;
}

interface ChatContact {
  id: string; // Real Firestore Auth UID (must satisfy isValidFirebaseUid)
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

// Purge legacy mock contacts and synthetic non-UID contacts from local storage
const sanitizeStoredContacts = (raw: string | null): ChatContact[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c: any) => 
      c && 
      typeof c.id === 'string' && 
      isValidFirebaseUid(c.id) &&
      !['u-alex', 'u-maya', 'u-kai', 'u-shoebell', 'shibina', 'sebin_mr'].includes(c.id) &&
      !['alex_creates', 'maya_beats', 'kai_dj', 'shoebell_shoe'].includes((c.username || '').toLowerCase())
    );
  } catch {
    return [];
  }
};

// Purge legacy mock messages and non-UID thread keys from client local storage
const sanitizeStoredThreads = (raw: string | null): Record<string, Message[]> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const sanitized: Record<string, Message[]> = {};
    for (const [key, msgList] of Object.entries(parsed)) {
      if (!isValidFirebaseUid(key)) continue;
      if (!Array.isArray(msgList)) continue;
      const realOnly = msgList.filter((m: any) => 
        m && typeof m.id === 'string' && !['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'].includes(m.id)
      );
      if (realOnly.length > 0) {
        sanitized[key] = realOnly;
      }
    }
    return sanitized;
  } catch {
    return {};
  }
};

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
        {contact.name.charAt(0)}
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
  const [contacts, setContacts] = useState<ChatContact[]>(() => {
    try {
      const saved = localStorage.getItem('noise_dm_contacts');
      return sanitizeStoredContacts(saved);
    } catch {}
    return [];
  });

  const [threads, setThreads] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('noise_dm_threads');
      return sanitizeStoredThreads(saved);
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

  // Enhancements for rich inbox experience
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isThreadMenuOpen, setIsThreadMenuOpen] = useState(false);
  const [isMutedThread, setIsMutedThread] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [showThreadSearch, setShowThreadSearch] = useState(false);

  // Error and validation state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dmsListenerError, setDmsListenerError] = useState<string | null>(null);

  // WebRTC Live Voice Chat state
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

  // Auto-scroll to bottom of messages
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

  // Real database suggested users for compose
  const [dbSuggestedUsers, setDbSuggestedUsers] = useState<PublicUserProfile[]>([]);

  useEffect(() => {
    if (isOpen) {
      getSuggestedDatabaseUsers(currentUser, 8)
        .then((users) => {
          setDbSuggestedUsers(users.filter(u => isValidFirebaseUid(u.uid)));
        })
        .catch((err) => {
          console.debug('Failed to fetch suggested database users:', err);
        });
    }
  }, [isOpen, currentUser]);

  // Real-Time Direct Messages Listener from Firestore
  // Scoped strictly to conversations where currentUser.uid is in participants
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser?.uid || !isValidFirebaseUid(currentUser.uid)) {
      return;
    }

    const dmsQuery = query(
      collection(db, 'direct_messages'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      dmsQuery,
      (snapshot) => {
        setDmsListenerError(null);
        const remoteThreads: Record<string, Message[]> = {};
        const contactUpdates = new Map<
          string,
          {
            peerId: string;
            lastMsg: string;
            time: string;
            timestamp: number;
            unread: boolean;
            peerName: string;
            peerUsername: string;
            peerAvatar: string;
          }
        >();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const senderId = String(data.senderId || '');
          const receiverId = String(data.receiverId || '');
          const participants: string[] = Array.isArray(data.participants) ? data.participants : [senderId, receiverId];

          const isSender = senderId === currentUser.uid;
          const isReceiver = receiverId === currentUser.uid;
          const isParticipant = participants.includes(currentUser.uid) || isSender || isReceiver;

          if (!isParticipant) return;

          // The conversation peer ID must always be the other user's real UID
          const peerId = isSender ? receiverId : senderId;
          if (!isValidFirebaseUid(peerId) || peerId === currentUser.uid) return;

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

          const seenBy: string[] = Array.isArray(data.seenBy)
            ? data.seenBy
            : (data.read ? [receiverId, senderId] : [senderId]);

          const msg: Message = {
            id: docSnap.id,
            sender: data.senderUsername || (isSender ? currentUser.username : peerUsername),
            senderId,
            receiverId,
            text: data.text || '',
            image: data.image || undefined,
            voiceDuration: data.voiceDuration || undefined,
            time: timeStr,
            isMe: isSender,
            reaction: data.reaction || undefined,
            read: data.read === true,
            seenBy,
            status: 'sent',
            createdAt: timestamp,
            clientTimestamp: typeof data.clientTimestamp === 'number' ? data.clientTimestamp : undefined,
          };

          if (!remoteThreads[peerId]) remoteThreads[peerId] = [];
          remoteThreads[peerId].push(msg);

          const previewText = data.text || (data.image ? '📷 Photo' : '🎙️ Voice note');
          const isSeenByMe = seenBy.includes(currentUser.uid);
          const isUnread = !isSender && !isSeenByMe && data.read !== true && selectedContact?.id !== peerId;

          const existingMeta = contactUpdates.get(peerId);
          if (!existingMeta || timestamp > existingMeta.timestamp) {
            contactUpdates.set(peerId, {
              peerId,
              lastMsg: previewText,
              time: timeStr,
              timestamp,
              unread: isUnread,
              peerName: peerDisplayName,
              peerUsername,
              peerAvatar,
            });
          }
        });

        // Merge messages into threads state without duplicates
        setThreads((prev) => {
          const merged = { ...prev };
          for (const [pid, list] of Object.entries(remoteThreads)) {
            const existingList = merged[pid] || [];
            const msgMap = new Map<string, Message>();

            // Preserve local sending/error messages that haven't landed on server yet
            existingList.forEach((m) => {
              if (m.status === 'sending' || m.status === 'error') {
                const isConfirmed = list.some(
                  (r) =>
                    (m.clientTimestamp && r.clientTimestamp === m.clientTimestamp) ||
                    (r.text === m.text && r.isMe === m.isMe && Math.abs((r.createdAt || 0) - (m.clientTimestamp || 0)) < 15000)
                );
                if (!isConfirmed) {
                  msgMap.set(m.id, m);
                }
              }
            });

            // Authoritative server messages
            list.forEach((m) => msgMap.set(m.id, m));

            merged[pid] = Array.from(msgMap.values()).sort((a, b) => {
              const timeA = a.createdAt || a.clientTimestamp || 0;
              const timeB = b.createdAt || b.clientTimestamp || 0;
              return timeA - timeB;
            });
          }
          return merged;
        });

        // Update contacts with real incoming conversation partners
        if (contactUpdates.size > 0) {
          setContacts((prevContacts) => {
            const updated = [...prevContacts];
            for (const [peerId, meta] of contactUpdates.entries()) {
              const idx = updated.findIndex((c) => c.id === peerId);
              if (idx >= 0) {
                updated[idx] = {
                  ...updated[idx],
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
        console.error('[DirectMessage] Scoped onSnapshot listener error:', error);
        setDmsListenerError(error.message || 'Permission denied or failed to load messages');
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, selectedContact?.id]);

  // Dedicated robust onSnapshot listener subscribing strictly to conversationId
  // generated by joining sorted user UIDs: [senderUid, targetUid].sort().join('_')
  useEffect(() => {
    if (!isOpen || !isFirebaseConfigured || !db || !selectedContact) {
      return;
    }

    const senderUid = auth?.currentUser?.uid || currentUser?.uid;
    const targetUid = selectedContact.id;

    if (!isValidFirebaseUid(senderUid) || !isValidFirebaseUid(targetUid) || senderUid === targetUid) {
      return;
    }

    const conversationId = [senderUid, targetUid].sort().join('_');

    console.log('[DirectMessage] Subscribing dedicated onSnapshot to conversationId:', conversationId);

    const convQuery = query(
      collection(db, 'direct_messages'),
      where('conversationId', '==', conversationId)
    );

    const unsubscribe = onSnapshot(
      convQuery,
      (snapshot) => {
        setDmsListenerError(null);
        const incomingList: Message[] = [];
        const unreadDocIds: string[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const sId = String(data.senderId || '');
          const rId = String(data.receiverId || '');
          const isMe = sId === senderUid;

          const timestamp = data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : (typeof data.clientTimestamp === 'number' ? data.clientTimestamp : Date.now());
          const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const seenBy: string[] = Array.isArray(data.seenBy)
            ? data.seenBy
            : (data.read ? [rId, sId] : [sId]);

          // Collect incoming unread messages to mark as seen
          if (!isMe && !seenBy.includes(senderUid)) {
            unreadDocIds.push(docSnap.id);
          }

          incomingList.push({
            id: docSnap.id,
            sender: data.senderUsername || (isMe ? (currentUser?.username || 'me') : selectedContact.username),
            senderId: sId,
            receiverId: rId,
            text: data.text || '',
            image: data.image || undefined,
            voiceDuration: data.voiceDuration || undefined,
            time: timeStr,
            isMe,
            reaction: data.reaction || undefined,
            read: data.read === true || seenBy.includes(targetUid),
            seenBy,
            status: 'sent',
            createdAt: timestamp,
            clientTimestamp: typeof data.clientTimestamp === 'number' ? data.clientTimestamp : undefined,
          });
        });

        // Mark incoming unread messages as seen in Firestore
        if (unreadDocIds.length > 0 && db) {
          const firestoreDb = db;
          unreadDocIds.forEach(async (docId) => {
            try {
              await updateDoc(doc(firestoreDb, 'direct_messages', docId), {
                read: true,
                seenBy: arrayUnion(senderUid),
              });
            } catch (err) {
              console.debug('Failed to update seenBy for message:', docId, err);
            }
          });
        }

        // Merge authoritative messages with local pending messages
        setThreads((prev) => {
          const existingList = prev[targetUid] || [];
          const msgMap = new Map<string, Message>();

          // Keep pending local messages (e.g. sending or error)
          existingList.forEach((m) => {
            if (m.status === 'sending' || m.status === 'error') {
              const isConfirmed = incomingList.some(
                (r) =>
                  (m.clientTimestamp && r.clientTimestamp === m.clientTimestamp) ||
                  (r.text === m.text && r.isMe === m.isMe && Math.abs((r.createdAt || 0) - (m.clientTimestamp || 0)) < 15000)
              );
              if (!isConfirmed) {
                msgMap.set(m.id, m);
              }
            }
          });

          // Server confirmed messages
          incomingList.forEach((m) => msgMap.set(m.id, m));

          const sorted = Array.from(msgMap.values()).sort((a, b) => {
            const timeA = a.createdAt || a.clientTimestamp || 0;
            const timeB = b.createdAt || b.clientTimestamp || 0;
            return timeA - timeB;
          });

          return {
            ...prev,
            [targetUid]: sorted,
          };
        });
      },
      (error) => {
        console.error('[DirectMessage] Error in conversationId onSnapshot:', error);
        setDmsListenerError(`Failed to sync conversation: ${error.message}`);
      }
    );

    return () => {
      console.log('[DirectMessage] Unsubscribing from conversationId:', conversationId);
      unsubscribe();
    };
  }, [isOpen, isFirebaseConfigured, selectedContact?.id, currentUser?.uid]);

  // Mark incoming messages as seen when conversation is open
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser || !selectedContact) return;
    const firestoreDb = db;

    const currentThread = threads[selectedContact.id] || [];
    const unseenIncomingDocs = currentThread.filter(
      (m) =>
        (!m.isMe || m.receiverId === currentUser.uid || (currentUser.username && m.receiverId?.toLowerCase() === currentUser.username.toLowerCase())) &&
        (!m.seenBy || !m.seenBy.includes(currentUser.uid)) &&
        !m.id.startsWith('msg-')
    );

    if (unseenIncomingDocs.length === 0) return;

    console.log('[DirectMessage] Marking messages as seen for contact:', selectedContact.id, 'Count:', unseenIncomingDocs.length);

    // Update local state immediately so UI updates without network delay
    setThreads((prev) => {
      const list = prev[selectedContact.id];
      if (!list) return prev;
      let changed = false;
      const updated = list.map((msg) => {
        if (!msg.isMe && (!msg.seenBy || !msg.seenBy.includes(currentUser.uid))) {
          changed = true;
          return {
            ...msg,
            seenBy: Array.from(new Set([...(msg.seenBy || []), currentUser.uid])),
            read: true,
          };
        }
        return msg;
      });
      return changed ? { ...prev, [selectedContact.id]: updated } : prev;
    });

    unseenIncomingDocs.forEach(async (m) => {
      try {
        await updateDoc(doc(firestoreDb, 'direct_messages', m.id), {
          seenBy: arrayUnion(currentUser.uid),
          read: true,
        });
      } catch (err) {
        console.debug('Failed to update seenBy for message:', m.id, err);
      }
    });
  }, [selectedContact?.id, threads[selectedContact?.id || '']?.length, currentUser?.uid]);

  const setupContactForTarget = (uid: string, name: string, username: string, avatar: string) => {
    if (!isValidFirebaseUid(uid)) return;
    if (currentUser?.uid && uid === currentUser.uid) return;

    const existing = contacts.find((c) => c.id === uid || (c.username && c.username.toLowerCase() === username.toLowerCase()));
    if (existing) {
      const updatedContact: ChatContact = {
        ...existing,
        id: uid,
        name: name || existing.name,
        avatar: avatar || existing.avatar,
      };
      setContacts((prev) => prev.map((c) => (c.id === uid || c.id === existing.id ? updatedContact : c)));
      setSelectedContact(updatedContact);
    } else {
      const newContact: ChatContact = {
        id: uid,
        name: name || username,
        username: username,
        avatar: avatar,
        lastMessage: 'Started new conversation',
        time: 'Just now',
        unread: false,
        online: true,
        category: 'primary',
      };
      setContacts((prev) => [newContact, ...prev.filter((c) => c.id !== uid)]);
      setSelectedContact(newContact);
    }
  };

  // Open initial target user or username if requested with real database ID
  useEffect(() => {
    if (!isOpen) return;

    if (initialTargetUser) {
      const cleanHandle = (initialTargetUser.username || '').toLowerCase().replace('@', '');
      const rawUid = initialTargetUser.uid;

      if (isValidFirebaseUid(rawUid)) {
        setupContactForTarget(
          rawUid,
          initialTargetUser.displayName || (cleanHandle ? cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1) : 'User'),
          cleanHandle || rawUid.slice(0, 8),
          initialTargetUser.avatar || ''
        );
      } else if (cleanHandle) {
        getRegisteredUserById(cleanHandle).then((resolved) => {
          if (resolved && isValidFirebaseUid(resolved.uid)) {
            setupContactForTarget(
              resolved.uid,
              resolved.displayName || cleanHandle,
              resolved.username || cleanHandle,
              resolved.avatar || ''
            );
          } else {
            setValidationError(`Could not resolve registered account for @${cleanHandle}.`);
          }
        });
      }
      return;
    }

    if (initialTargetUsername) {
      const cleanHandle = initialTargetUsername.toLowerCase().replace('@', '');
      getRegisteredUserById(cleanHandle).then((resolved) => {
        if (resolved && isValidFirebaseUid(resolved.uid)) {
          setupContactForTarget(
            resolved.uid,
            resolved.displayName || cleanHandle,
            resolved.username || cleanHandle,
            resolved.avatar || ''
          );
        } else {
          setValidationError(`Could not resolve registered account for @${cleanHandle}.`);
        }
      });
    }
  }, [initialTargetUsername, initialTargetUser, isOpen]);

  // Handle call timer for active connected calls
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      callTimerRef.current = setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
      return () => clearInterval(callTimerRef.current);
    }
  }, [activeCall?.status]);

  // Initialize and manage WebRTC voice chat manager
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
        const myHandle = (currentUser?.username || '').toLowerCase();
        const myUid = currentUser?.uid || '';
        const recHandle = (incoming.receiver.username || '').toLowerCase();
        const recUid = incoming.receiver.uid || '';

        if ((myHandle && recHandle === myHandle) || (myUid && recUid === myUid)) {
          setIncomingCall(incoming);
        }
      },
    });

    voiceManagerRef.current = manager;

    return () => {
      manager.destroy();
      voiceManagerRef.current = null;
    };
  }, [currentUser?.username, currentUser?.uid]);

  // Firestore real-time incoming call listener
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser) return;
    const myHandle = (currentUser.username || '').toLowerCase();

    try {
      const callsCol = collection(db, 'calls');
      const q = query(callsCol);
      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as CallSessionData;
            if (
              data.status === 'calling' &&
              data.receiver?.username?.toLowerCase() === myHandle &&
              Date.now() - (data.createdAt || 0) < 60000 &&
              (!activeCall || activeCall.status === 'ended')
            ) {
              setIncomingCall(data);
            } else if (
              incomingCall &&
              incomingCall.id === data.id &&
              (data.status === 'ended' || data.status === 'rejected')
            ) {
              setIncomingCall(null);
            }
          }
        });
      }, (e) => {
        console.debug('Calls snapshot note:', e);
      });

      return () => unsub();
    } catch (e) {
      console.debug('Firestore incoming listener note:', e);
    }
  }, [currentUser?.username, activeCall?.status, incomingCall?.id]);

  if (!isOpen) return null;

  const handleSelectContact = (contact: ChatContact) => {
    if (activeCall && activeCall.user.id !== contact.id) {
      handleEndCall();
    }
    setValidationError(null);
    setSelectedContact(contact);
    setShowThreadSearch(false);
    setThreadSearchQuery('');
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unread: false } : c))
    );
  };

  const handleSendMessage = async (textToSend?: string, attachedImage?: string, voiceDuration?: string, retryMsg?: Message) => {
    const text = textToSend !== undefined ? textToSend : inputText.trim();
    if (!text && !attachedImage && !voiceDuration) return;
    if (!selectedContact) return;

    setValidationError(null);

    // 1. Sender authentication validation (using auth.currentUser.uid)
    const senderUid = auth?.currentUser?.uid || currentUser?.uid;
    if (!senderUid || !isValidFirebaseUid(senderUid)) {
      setValidationError("You must be logged in with a valid account to send direct messages.");
      return;
    }

    // 2. Verified targetUid validation
    const targetUid = selectedContact.id;
    if (!targetUid || !isValidFirebaseUid(targetUid)) {
      setValidationError(`Recipient is not a valid registered user (invalid ID: ${targetUid}). Direct messages require a valid registered account.`);
      return;
    }

    if (targetUid === senderUid) {
      setValidationError("You cannot send a direct message to yourself.");
      return;
    }

    const targetUsername = selectedContact.username;
    const now = Date.now();
    const localMsgId = retryMsg?.id || `msg-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const conversationId = [senderUid, targetUid].sort().join('_');

    const newMsg: Message = {
      id: localMsgId,
      sender: currentUser?.username || 'me',
      senderId: senderUid,
      receiverId: targetUid,
      text: text,
      image: attachedImage,
      voiceDuration: voiceDuration,
      time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      read: false,
      seenBy: [senderUid],
      status: 'sending',
      clientTimestamp: now,
    };

    console.log('[DirectMessage] Sending message:', {
      senderId: senderUid,
      receiverId: targetUid,
      conversationId,
      textPreview: text ? text.slice(0, 30) : '[Media]',
    });

    setThreads((prev) => {
      const existing = prev[targetUid] || [];
      const updated = retryMsg
        ? existing.map((m) => (m.id === retryMsg.id ? newMsg : m))
        : [...existing, newMsg];
      return { ...prev, [targetUid]: updated };
    });

    setContacts((prev) =>
      prev.map((c) =>
        c.id === targetUid
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

    // Live Real-Time Firestore Direct Message Delivery
    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, 'direct_messages'), {
          conversationId,
          participants: [senderUid, targetUid],
          senderId: senderUid,
          senderUsername: currentUser?.username || 'user',
          senderDisplayName: currentUser?.displayName || currentUser?.username || 'user',
          senderAvatar: currentUser?.photoURL || '',
          receiverId: targetUid,
          receiverUsername: targetUsername,
          receiverDisplayName: selectedContact.name,
          receiverAvatar: selectedContact.avatar || '',
          text: text,
          image: attachedImage || '',
          voiceDuration: voiceDuration || '',
          reaction: '',
          read: false,
          seenBy: [senderUid],
          createdAt: serverTimestamp(),
          clientTimestamp: now,
        });

        console.log('[DirectMessage] Message delivered to Firestore with ID:', docRef.id);

        setThreads((prev) => {
          const list = prev[targetUid] || [];
          return {
            ...prev,
            [targetUid]: list.map((m) =>
              m.id === localMsgId ? { ...m, id: docRef.id, status: 'sent' } : m
            ),
          };
        });
      } catch (err: any) {
        console.error('[DirectMessage] Failed to write message to Firestore:', err);
        setThreads((prev) => {
          const list = prev[targetUid] || [];
          return {
            ...prev,
            [targetUid]: list.map((m) =>
              m.id === localMsgId
                ? { ...m, status: 'error', errorMessage: err.message || 'Failed to send' }
                : m
            ),
          };
        });
        setValidationError(`Failed to deliver message: ${err.message || 'Permission denied or network failure'}`);
      }
    }
  };

  // Image attachment
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

  // Simulated Voice Note recording
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

  // Voice playback simulation
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

  // Toggle emoji reaction on message
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!selectedContact) return;
    setThreads((prev) => ({
      ...prev,
      [selectedContact.id]: (prev[selectedContact.id] || []).map((m) =>
        m.id === msgId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m
      ),
    }));

    if (isFirebaseConfigured && db && !msgId.startsWith('msg-') && !msgId.startsWith('m')) {
      try {
        await updateDoc(doc(db, 'direct_messages', msgId), {
          reaction: emoji,
        });
      } catch (err) {
        console.debug('Reaction update error:', err);
      }
    }
  };

  // Delete/unsend message
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

    if (isFirebaseConfigured && db && !msgId.startsWith('msg-') && !msgId.startsWith('m')) {
      try {
        await deleteDoc(doc(db, 'direct_messages', msgId));
      } catch (err) {
        console.debug('Delete message error:', err);
      }
    }
  };

  // Copy message text
  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Clear thread history
  const handleClearThread = () => {
    if (!selectedContact) return;
    setThreads((prev) => ({ ...prev, [selectedContact.id]: [] }));
    setContacts((prev) =>
      prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: 'No messages', time: '' } : c))
    );
    setIsThreadMenuOpen(false);
  };

  // Start new chat with real database user ID
  const handleStartNewChat = async (e?: React.FormEvent, customHandle?: string) => {
    if (e) e.preventDefault();
    const handle = (customHandle || newChatInput).trim().replace(/^@/, '');
    if (!handle) return;

    setValidationError(null);

    const dbUser = await getRegisteredUserById(handle);
    if (!dbUser || !isValidFirebaseUid(dbUser.uid)) {
      setValidationError(`User "@${handle}" is not registered on Noise. Direct messages require a valid registered user.`);
      return;
    }

    if (currentUser?.uid && dbUser.uid === currentUser.uid) {
      setValidationError("You cannot direct message yourself.");
      return;
    }

    setupContactForTarget(
      dbUser.uid,
      dbUser.displayName || dbUser.username,
      dbUser.username,
      dbUser.avatar || ''
    );
    setIsComposing(false);
    setNewChatInput('');
  };

  // Real WebRTC Voice Call Functions
  const startCall = async (type: 'audio' | 'video' = 'audio') => {
    if (!selectedContact) return;
    setVoiceError(null);

    const caller = {
      uid: currentUser?.uid || 'guest-user',
      username: currentUser?.username || 'user',
      displayName: currentUser?.displayName || currentUser?.username || 'User',
      avatar: currentUser?.photoURL,
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

    const callerHandle = incomingCall.caller.username;
    let contact = contacts.find((c) => c.username.toLowerCase() === callerHandle.toLowerCase());
    if (!contact) {
      contact = {
        id: incomingCall.caller.uid || `u-${callerHandle}`,
        name: incomingCall.caller.displayName || callerHandle,
        username: callerHandle,
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
            {/* Header */}
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

                {/* Suggested registered user chips */}
                {dbSuggestedUsers.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] text-zinc-400 font-semibold mb-1.5 uppercase tracking-wider">Suggested from database:</p>
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

            {/* Inbox Filter Tabs: Primary / General */}
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

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-20 px-4 text-zinc-500 text-xs">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <Send className="w-5 h-5 -rotate-12" />
                  </div>
                  <p className="font-bold text-zinc-300 text-sm mb-1">No messages here</p>
                  <p>Send photos, voice notes, and private messages to friends.</p>
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
                      <div className="flex items-center gap-1 min-w-0">
                        {(() => {
                          const contactThread = threads[contact.id] || [];
                          const lastMsg = contactThread[contactThread.length - 1];
                          if (lastMsg && lastMsg.isMe) {
                            const recipientId = lastMsg.receiverId || contact.id;
                            const isSeen = Boolean(
                              (recipientId && Array.isArray(lastMsg.seenBy) && lastMsg.seenBy.includes(recipientId)) ||
                              (contact.id && Array.isArray(lastMsg.seenBy) && lastMsg.seenBy.includes(contact.id)) ||
                              lastMsg.read === true
                            );
                            return isSeen ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-400 flex-none stroke-[2.5]" />
                            ) : (
                              <Check className="w-3 h-3 text-zinc-400 flex-none stroke-[2]" />
                            );
                          }
                          return null;
                        })()}
                        <p className={`text-xs truncate ${contact.unread ? 'font-bold text-white' : 'text-zinc-400'}`}>
                          {contact.lastMessage}
                        </p>
                      </div>
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
            {/* Chat Thread Header */}
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

              {/* Action Buttons: Audio Call, Video Call, Search, Thread Menu, Close */}
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
                
                {/* 3-dots thread menu */}
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
                    <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95">
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
              <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2 animate-in fade-in">
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

            {/* Live WebRTC Voice Chat Banner inside Chat Room */}
            <div className="px-3.5 py-2 bg-gradient-to-r from-purple-950/40 via-zinc-900/90 to-indigo-950/40 border-b border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-none" />
                <span className="text-zinc-200 font-medium truncate text-[11px]">
                  Free Live WebRTC Voice Chat
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 font-mono">
                  Google STUN
                </span>
              </div>
              <button
                onClick={() => startCall('audio')}
                className="px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer flex-none shadow-xs"
                type="button"
                title="Start Voice Chat with this user"
              >
                <Phone className="w-3 h-3 text-emerald-400" />
                <span>Voice Call</span>
              </button>
            </div>

            {/* Validation or Sync Error Banner */}
            {(validationError || dmsListenerError) && (
              <div className="bg-rose-500/15 border-b border-rose-500/30 px-3.5 py-2 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-none" />
                  <span className="truncate">{validationError || dmsListenerError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    setDmsListenerError(null);
                  }}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950">
              {/* User Profile Info Card in Chat */}
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
                <p className="text-xs text-zinc-400 mt-0.5">@{selectedContact.username} • Instagram Direct</p>
                <p className="text-[10px] text-zinc-500 mt-1">End-to-end encrypted messaging</p>
              </div>

              {/* Message Bubbles */}
              {activeMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col group ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  <div className="relative max-w-[82%]">
                    {/* Attached Photo */}
                    {msg.image && (
                      <div 
                        onClick={() => setLightboxImage(msg.image || null)}
                        className="mb-1 rounded-2xl overflow-hidden border border-zinc-800 max-w-[240px] shadow-lg cursor-pointer hover:opacity-95 transition-opacity group/img relative"
                      >
                        <img src={msg.image} alt="Attachment" className="w-full h-auto object-cover" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      </div>
                    )}

                    {/* Voice Note Clip with Playback */}
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
                        <div className="flex items-center gap-1">
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-4 bg-white animate-pulse' : 'h-3 bg-white/80'}`} />
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-6 bg-white' : 'h-5 bg-white/90'}`} />
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-3 bg-white' : 'h-2 bg-white/60'}`} />
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-5 bg-white' : 'h-4 bg-white/80'}`} />
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-4 bg-white' : 'h-3 bg-white/60'}`} />
                        </div>
                        <span className="text-[10px] font-mono opacity-90">{msg.voiceDuration}</span>
                      </div>
                    )}

                    {/* Message Text Bubble */}
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

                    {/* Reaction Badge on Bubble */}
                    {msg.reaction && (
                      <div className="absolute -bottom-2 right-1 bg-zinc-900 border border-zinc-800 rounded-full px-1.5 py-0.5 text-xs shadow-md animate-in zoom-in-75">
                        {msg.reaction}
                      </div>
                    )}

                    {/* Hover Reaction & Actions Toolbar */}
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

                      {/* Copy message button */}
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

                      {/* Delete/unsend message button */}
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

                  {/* Timestamp & Read / Seen Receipt */}
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 px-1">
                    <span>{msg.time}</span>
                    {msg.isMe && (
                      (() => {
                        if (msg.status === 'sending') {
                          return (
                            <span className="inline-flex items-center gap-1 text-zinc-400 font-medium" title="Delivering to Firestore...">
                              <Loader2 className="w-3 h-3 animate-spin text-zinc-400 inline" />
                              <span>Sending...</span>
                            </span>
                          );
                        }
                        if (msg.status === 'error') {
                          return (
                            <button
                              type="button"
                              onClick={() => handleSendMessage(msg.text, msg.image, msg.voiceDuration, msg)}
                              className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer transition-colors"
                              title={msg.errorMessage || 'Delivery failed. Click to retry.'}
                            >
                              <RefreshCw className="w-3 h-3 text-rose-400 inline" />
                              <span>Failed • Retry</span>
                            </button>
                          );
                        }
                        const recipientId = msg.receiverId || selectedContact?.id || '';
                        const isSeenByRecipient = Boolean(
                          (recipientId && Array.isArray(msg.seenBy) && msg.seenBy.includes(recipientId)) ||
                          (selectedContact?.id && Array.isArray(msg.seenBy) && msg.seenBy.includes(selectedContact.id)) ||
                          msg.read === true
                        );
                        if (isSeenByRecipient) {
                          return (
                            <span 
                              className="inline-flex items-center gap-1 text-sky-400 font-semibold" 
                              title="Seen by recipient"
                            >
                              <span>Seen</span>
                              <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline stroke-[2.5]" />
                            </span>
                          );
                        }
                        return (
                          <span 
                            className="inline-flex items-center gap-1 text-zinc-400" 
                            title="Sent to recipient"
                          >
                            <span>Sent</span>
                            <Check className="w-3 h-3 text-zinc-400 inline stroke-[2]" />
                          </span>
                        );
                      })()
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs py-1 animate-in fade-in">
                  <div className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
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

            {/* Chat Input & Recording Bar */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex flex-col gap-2">
              {isRecordingAudio ? (
                /* Live Voice Note Recording Bar */
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
                /* Standard Message Input Form */
                <form 
                  onSubmit={(e) => { 
                    e.preventDefault(); 
                    handleSendMessage(); 
                  }} 
                  className="flex items-center gap-2"
                >
                  {/* Photo Attachment Button */}
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors flex-none"
                    title="Attach Photo"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageAttachment} className="hidden" />

                  {/* Mic Voice Note Button */}
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded-full transition-colors flex-none"
                    title="Record Voice Note"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${selectedContact.name}...`}
                    className="flex-1 bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 rounded-full px-4 py-2.5 border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors"
                  />

                  {/* Send or Heart Button */}
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

        {/* PHOTO LIGHTBOX MODAL */}
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

        {/* INCOMING WEBRTC VOICE CALL MODAL */}
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
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-ping" />
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
                    @{incomingCall.caller.username} • Free WebRTC P2P
                  </p>
                </div>
              </div>

              {/* Accept & Reject Buttons */}
              <div className="flex items-center gap-2 flex-none">
                <button
                  type="button"
                  onClick={handleRejectIncomingCall}
                  className="p-2.5 sm:p-3 bg-zinc-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-full border border-zinc-700/80 hover:border-rose-500/40 transition-all active:scale-95 shadow-md cursor-pointer"
                  title="Decline Call"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleAcceptIncomingCall}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer animate-pulse"
                  title="Accept Call"
                >
                  <Phone className="w-4 h-4" />
                  <span>Accept</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE WEBRTC VOICE CALL OVERLAY */}
        {activeCall && (
          <div className="absolute inset-0 z-50 bg-zinc-950/98 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 text-center animate-in zoom-in-95 duration-200 overflow-y-auto">
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>WebRTC Live Audio • Google STUN P2P</span>
              </div>
              <button 
                onClick={handleEndCall} 
                className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer" 
                type="button"
                title="Minimize or End"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Caller Profile & Visualizer */}
            <div className="space-y-4 my-auto py-4">
              <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                {/* Dynamic voice pulse rings reflecting remote speaker audio */}
                {activeCall.status === 'connected' && (
                  <>
                    <div 
                      className="absolute inset-0 rounded-full border-2 border-emerald-500/30 transition-transform duration-75"
                      style={{ transform: `scale(${1 + (remoteAudioLevel / 100) * 0.4})` }}
                    />
                    <div 
                      className="absolute inset-0 rounded-full border border-purple-500/40 transition-transform duration-100"
                      style={{ transform: `scale(${1 + (remoteAudioLevel / 100) * 0.6})` }}
                    />
                  </>
                )}

                <ContactAvatar 
                  contact={activeCall.user} 
                  size="xl" 
                  className={`ring-4 shadow-2xl transition-all ${
                    activeCall.status === 'connected'
                      ? 'ring-emerald-500/60 shadow-emerald-500/20'
                      : 'ring-purple-500/40 animate-pulse shadow-purple-500/20'
                  }`} 
                />

                {/* Local Mic Status Badge */}
                <div 
                  className={`absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-zinc-950 shadow-md ${
                    isMuted ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                  title={isMuted ? 'Microphone Muted' : 'Microphone Live'}
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

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono">
                {activeCall.status === 'connected' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400 font-bold">
                      Connected • {formatCallTime(activeCall.duration)}
                    </span>
                  </>
                ) : activeCall.status === 'calling' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                    <span className="text-purple-300">Calling... Waiting for answer</span>
                  </>
                ) : activeCall.status === 'ringing' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-purple-300">Ringing...</span>
                  </>
                ) : activeCall.status === 'connecting' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-300">Connecting P2P Audio...</span>
                  </>
                ) : activeCall.status === 'rejected' ? (
                  <span className="text-rose-400 font-bold">Call Declined</span>
                ) : activeCall.status === 'ended' ? (
                  <span className="text-zinc-400">Call Ended</span>
                ) : (
                  <span className="text-rose-400">Connection Failed</span>
                )}
              </div>

              {/* Two-Way Audio Waveform Level Meters */}
              <div className="max-w-xs mx-auto grid grid-cols-2 gap-3 pt-2 text-left">
                {/* Local Mic Volume Meter */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Mic className="w-3 h-3 text-zinc-400" />
                      <span>You (Mic)</span>
                    </span>
                    <span className={`text-[10px] font-bold ${isMuted ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isMuted ? 'Muted' : `${localAudioLevel}%`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-75 rounded-full ${
                        isMuted ? 'bg-rose-500/50 w-0' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${isMuted ? 0 : localAudioLevel}%` }}
                    />
                  </div>
                </div>

                {/* Remote Speaker Volume Meter */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-zinc-400" />
                      <span>{activeCall.user.name.split(' ')[0]}</span>
                    </span>
                    <span className="text-[10px] font-bold text-purple-400">
                      {activeCall.status === 'connected' ? `${remoteAudioLevel}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-75 rounded-full"
                      style={{ width: `${activeCall.status === 'connected' ? remoteAudioLevel : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Error Alert Box if any */}
              {voiceError && (
                <div className="max-w-xs mx-auto p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2 text-left animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-none mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-200">{voiceError}</p>
                    <p className="text-[11px] text-rose-400/80">
                      Check your browser address bar permissions to ensure microphone access is granted for this site.
                    </p>
                    <button
                      type="button"
                      onClick={() => startCall('audio')}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] mt-1 transition-colors cursor-pointer"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Call Controls Bar */}
            <div className="space-y-4 pt-2 pb-2">
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                {/* Mute Microphone Button */}
                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={handleToggleMute} 
                    className={`p-3.5 sm:p-4 rounded-full transition-all active:scale-95 cursor-pointer shadow-lg ${
                      isMuted 
                        ? 'bg-rose-600/90 hover:bg-rose-500 text-white ring-2 ring-rose-500/50' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`} 
                    type="button"
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {isMuted ? 'Unmute' : 'Mute'}
                  </span>
                </div>

                {/* End Call Button */}
                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={handleEndCall} 
                    className="p-4 sm:p-5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer" 
                    type="button"
                    title="End Call"
                  >
                    <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                  <span className="text-[10px] text-zinc-400 font-medium">End Call</span>
                </div>

                {/* Speaker Volume Toggle / Slider */}
                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={handleToggleSpeaker} 
                    className={`p-3.5 sm:p-4 rounded-full transition-all active:scale-95 cursor-pointer shadow-lg ${
                      isSpeakerMuted 
                        ? 'bg-amber-600/90 text-white ring-2 ring-amber-500/50' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`} 
                    type="button"
                    title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
                  >
                    {isSpeakerMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {isSpeakerMuted ? 'Muted' : 'Speaker'}
                  </span>
                </div>
              </div>

              {/* Volume Slider Bar */}
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
                  title="Speaker volume"
                />
                <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
              </div>

              <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                🔒 Free peer-to-peer WebRTC audio encrypted end-to-end. Public Google STUN servers handle NAT traversal with zero paid dependencies.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
