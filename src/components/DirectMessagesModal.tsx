import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Search, 
  Image as ImageIcon, 
  Heart, 
  Phone, 
  Video, 
  Info, 
  ArrowLeft, 
  Plus, 
  Check, 
  CheckCheck, 
  Smile, 
  PhoneOff, 
  Mic, 
  MicOff,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { AppUser } from '../types';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  image?: string;
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
}

const INITIAL_CONTACTS: ChatContact[] = [
  {
    id: 'u-1',
    name: 'Sophia Laurent',
    username: 'sophia',
    avatar: '',
    lastMessage: 'Loved your latest sunset shot! 🌅',
    time: '4m',
    unread: true,
    online: true,
  },
  {
    id: 'u-2',
    name: 'Alex Carter',
    username: 'alex_architect',
    avatar: '',
    lastMessage: 'Check out the new architectural rendering I posted',
    time: '28m',
    unread: false,
    online: true,
  },
  {
    id: 'u-3',
    name: 'Maria Vance',
    username: 'maria_wanderlust',
    avatar: '',
    lastMessage: 'Are we catching up at the gallery this Friday? 🎨',
    time: '2h',
    unread: true,
    online: false,
  },
  {
    id: 'u-4',
    name: 'Liam Vance',
    username: 'liam',
    avatar: '',
    lastMessage: 'The new camera filter presets look super crisp',
    time: '1d',
    unread: false,
    online: true,
  },
  {
    id: 'u-5',
    name: 'Elena Rostova',
    username: 'elena_art',
    avatar: '',
    lastMessage: 'Shared a reel with you',
    time: '2d',
    unread: false,
    online: false,
  },
];

const INITIAL_THREADS: Record<string, Message[]> = {
  'u-1': [
    { id: 'm-1', sender: 'sophia', text: 'Hey! Loved your recent post on Noise ✨', time: '2:14 PM', isMe: false },
    { id: 'm-2', sender: 'me', text: 'Thank you! Used the new Warm Sunset filter adjustment!', time: '2:16 PM', isMe: true },
    { id: 'm-3', sender: 'sophia', text: 'Loved your latest sunset shot! 🌅', time: '2:20 PM', isMe: false, reaction: '❤️' },
  ],
  'u-2': [
    { id: 'm-4', sender: 'alex_architect', text: 'Hey there! Any feedback on the brutalist series?', time: 'Yesterday', isMe: false },
    { id: 'm-5', sender: 'me', text: 'The symmetry is unbelievable.', time: 'Yesterday', isMe: true },
  ],
};

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😍', '👏'];

const ContactAvatar: React.FC<{ contact: ChatContact; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  contact,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-13 h-13 text-sm',
    lg: 'w-18 h-18 text-xl',
    xl: 'w-24 h-24 text-2xl',
  };

  const hasPhoto = Boolean(
    contact.avatar &&
    !contact.avatar.includes('unsplash.com') &&
    !contact.avatar.includes('ui-avatars.com')
  );

  if (hasPhoto) {
    return (
      <img
        src={contact.avatar}
        alt={contact.name}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-rose-500/20 via-purple-600/30 to-indigo-600/30 border border-zinc-700/80 flex items-center justify-center font-bold text-white uppercase select-none shadow-xs ${className}`}
    >
      {contact.name.charAt(0)}
    </div>
  );
};

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [contacts, setContacts] = useState<ChatContact[]>(INITIAL_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<Record<string, Message[]>>(INITIAL_THREADS);
  const [inputText, setInputText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [newChatInput, setNewChatInput] = useState('');

  // Simulated Call state
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; user: ChatContact; status: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of active chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, selectedContact]);

  if (!isOpen) return null;

  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContact(contact);
    // Mark as read
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unread: false } : c))
    );
  };

  const handleSendMessage = (textToSend?: string, attachedImage?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText.trim();
    if (!text && !attachedImage) return;
    if (!selectedContact) return;

    const contactId = selectedContact.id;
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: currentUser?.username || 'me',
      text: text,
      image: attachedImage,
      time: 'Just now',
      isMe: true,
    };

    setThreads((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] || []), newMsg],
    }));

    // Update last message in contacts list
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? {
              ...c,
              lastMessage: attachedImage ? '📷 Photo' : text,
              time: 'Just now',
            }
          : c
      )
    );

    if (textToSend === undefined) {
      setInputText('');
    }

    // Realistic context-aware simulated auto-reply
    setTimeout(() => {
      const replies = [
        "That looks amazing! ✨",
        "Totally agree! Let's collaborate on Noise soon 🚀",
        "Love that perspective! 🙌",
        "Just saw this, thanks for reaching out!",
        "Awesome! Keep creating 🔥"
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      const replyMsg: Message = {
        id: `reply-${Date.now()}`,
        sender: selectedContact.username,
        text: randomReply,
        time: 'Just now',
        isMe: false,
      };

      setThreads((prev) => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), replyMsg],
      }));

      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? {
                ...c,
                lastMessage: randomReply,
                time: 'Just now',
              }
            : c
        )
      );
    }, 1200);
  };

  const handleImageAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > h) {
          if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        } else {
          if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          handleSendMessage('', dataUrl);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleReactToMessage = (messageId: string, emoji: string) => {
    if (!selectedContact) return;
    setThreads((prev) => {
      const currentList = prev[selectedContact.id] || [];
      return {
        ...prev,
        [selectedContact.id]: currentList.map((m) =>
          m.id === messageId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m
        ),
      };
    });
  };

  const handleStartNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = newChatInput.trim().replace(/^@/, '');
    if (!handle) return;

    const existing = contacts.find(
      (c) => c.username.toLowerCase() === handle.toLowerCase()
    );

    if (existing) {
      handleSelectContact(existing);
      setIsComposing(false);
      setNewChatInput('');
      return;
    }

    // Create new contact
    const newContact: ChatContact = {
      id: `u-${Date.now()}`,
      name: handle.charAt(0).toUpperCase() + handle.slice(1),
      username: handle.toLowerCase(),
      avatar: '',
      lastMessage: 'Started new conversation',
      time: 'Just now',
      unread: false,
      online: true,
    };

    setContacts((prev) => [newContact, ...prev]);
    setSelectedContact(newContact);
    setIsComposing(false);
    setNewChatInput('');
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    if (!selectedContact) return;
    setActiveCall({ type, user: selectedContact, status: 'Calling...' });
    setTimeout(() => {
      setActiveCall((prev) => prev ? { ...prev, status: 'Connected • 00:01' } : null);
    }, 2000);
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMessages = selectedContact ? threads[selectedContact.id] || [] : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end">
      {/* Side-Drawer Container */}
      <div className="w-full sm:max-w-md h-full bg-zinc-950 text-zinc-100 border-l border-zinc-800/80 shadow-2xl flex flex-col animate-drawer-in select-none">
        
        {/* ================= VIEW 1: CONTACTS LIST ================= */}
        {!selectedContact && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-brand text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500">
                  Noise Direct
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                  @{currentUser?.username || 'me'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsComposing(!isComposing)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors"
                  title="New Message"
                  type="button"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors"
                  type="button"
                  title="Close Direct"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Compose New Message Drawer if opened */}
            {isComposing && (
              <form onSubmit={handleStartNewChat} className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
                <input
                  type="text"
                  value={newChatInput}
                  onChange={(e) => setNewChatInput(e.target.value)}
                  placeholder="Enter @username to message..."
                  autoFocus
                  className="flex-1 bg-zinc-950 text-xs text-zinc-100 placeholder-zinc-500 px-3.5 py-2.5 rounded-xl border border-zinc-700/80 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={!newChatInput.trim()}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 disabled:opacity-40 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Chat
                </button>
              </form>
            )}

            {/* Active Now Avatars Tray */}
            <div className="px-3.5 py-3 border-b border-zinc-900 overflow-x-auto no-scrollbar">
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-2">
                Active Creators
              </p>
              <div className="flex items-center gap-3">
                {contacts.filter((c) => c.online).map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="flex flex-col items-center flex-none cursor-pointer group"
                  >
                    <div className="relative">
                      <div className="w-13 h-13 rounded-full p-[1.5px] ig-story-gradient group-hover:scale-105 transition-transform flex items-center justify-center">
                        <ContactAvatar contact={contact} size="md" className="p-[1.5px] bg-zinc-950" />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                    </div>
                    <span className="text-[11px] text-zinc-300 font-medium mt-1 w-14 text-center truncate">
                      {contact.username}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-zinc-900">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-zinc-900/90 text-zinc-200 placeholder-zinc-500 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Recent Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-16 px-4 text-zinc-500 text-xs">
                  No conversations found for "{searchQuery}".
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="p-3.5 hover:bg-zinc-900/80 flex items-center gap-3.5 cursor-pointer transition-colors group"
                  >
                    <div className="relative flex-none">
                      <ContactAvatar contact={contact} size="md" className="ring-1 ring-zinc-800" />
                      {contact.online && (
                        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-xs truncate ${contact.unread ? 'font-bold text-white' : 'font-semibold text-zinc-200'}`}>
                          {contact.name}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-mono flex-none ml-2">
                          {contact.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${contact.unread ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                          {contact.lastMessage}
                        </p>
                        {contact.unread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-none" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 2: ACTIVE CHAT THREAD ================= */}
        {selectedContact && (
          <div className="flex flex-col h-full">
            {/* Active Chat Header */}
            <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  title="Back to conversations"
                  type="button"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative flex-none">
                  <ContactAvatar contact={selectedContact} size="sm" className="ring-1 ring-zinc-700" />
                  {selectedContact.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-tight">
                    {selectedContact.name}
                  </h4>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {selectedContact.online ? (
                      <span className="text-emerald-400">Active now</span>
                    ) : (
                      `@${selectedContact.username}`
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Phone, Video, Close */}
              <div className="flex items-center gap-1 flex-none">
                <button
                  onClick={() => handleStartCall('audio')}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  title="Audio call"
                  type="button"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStartCall('video')}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  title="Video call"
                  type="button"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950">
              {/* Contact Profile Intro */}
              <div className="text-center py-4 border-b border-zinc-900 mb-2">
                <div className="flex justify-center mb-2">
                  <ContactAvatar contact={selectedContact} size="lg" className="ring-2 ring-zinc-800" />
                </div>
                <h3 className="text-sm font-bold text-white">{selectedContact.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">@{selectedContact.username} • Noise Messenger</p>
                <span className="inline-block mt-2 text-[10px] text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-full">
                  End-to-End Encrypted Simulation
                </span>
              </div>

              {/* Messages list */}
              {activeMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col group ${msg.isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="relative max-w-[80%]">
                    {/* Optional Image Attachment */}
                    {msg.image && (
                      <div className="mb-1 rounded-2xl overflow-hidden border border-zinc-800 max-w-[220px]">
                        <img src={msg.image} alt="Attachment" className="w-full h-auto object-cover" />
                      </div>
                    )}

                    {/* Text Bubble */}
                    {msg.text && (
                      <div
                        className={`px-4 py-2.5 text-xs leading-relaxed ${
                          msg.isMe
                            ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white rounded-2xl rounded-br-xs shadow-md shadow-purple-950/40'
                            : 'bg-zinc-900 text-zinc-100 rounded-2xl rounded-bl-xs border border-zinc-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    )}

                    {/* Reaction Badge if any */}
                    {msg.reaction && (
                      <div
                        className={`absolute -bottom-2 text-xs bg-zinc-900 border border-zinc-800 rounded-full px-1.5 py-0.5 shadow-md ${
                          msg.isMe ? 'right-2' : 'left-2'
                        }`}
                      >
                        {msg.reaction}
                      </div>
                    )}

                    {/* Quick Reactions Hover Bar */}
                    <div
                      className={`absolute -top-7 hidden group-hover:flex items-center gap-1 bg-zinc-900/95 border border-zinc-800 rounded-full px-2 py-1 shadow-lg z-20 ${
                        msg.isMe ? 'right-0' : 'left-0'
                      }`}
                    >
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReactToMessage(msg.id, emoji)}
                          className="text-xs hover:scale-130 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <span className="text-[9px] text-zinc-500 mt-1 px-1">
                    {msg.time} {msg.isMe ? '• Seen' : ''}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer Bar */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex flex-col gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Photo attachment button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors flex-none"
                  title="Attach Photo"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageAttachment}
                  className="hidden"
                />

                {/* Text Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${selectedContact.name}...`}
                  className="flex-1 bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 rounded-full px-4 py-2.5 border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors"
                />

                {/* Instant Send or Big Heart button */}
                {inputText.trim() ? (
                  <button
                    type="submit"
                    className="p-2.5 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full hover:opacity-90 active:scale-95 transition-all flex-none"
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
            </div>
          </div>
        )}

        {/* ================= SIMULATED CALL POPUP DIALOG ================= */}
        {activeCall && (
          <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-between p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-full flex justify-end">
              <button
                onClick={() => setActiveCall(null)}
                className="text-zinc-400 hover:text-white p-2"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative mx-auto w-24 h-24 flex justify-center">
                <ContactAvatar contact={activeCall.user} size="xl" className="ring-4 ring-rose-500/40" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center text-white text-[10px]">
                  {activeCall.type === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{activeCall.user.name}</h3>
              <p className="text-xs text-rose-400 font-mono tracking-wide">{activeCall.status}</p>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-colors ${
                  isMuted ? 'bg-zinc-800 text-rose-400' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
                type="button"
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={() => setActiveCall(null)}
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-xl transition-all hover:scale-105"
                type="button"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
