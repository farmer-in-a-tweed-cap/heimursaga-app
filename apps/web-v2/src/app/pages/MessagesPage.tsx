'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Send, Trash2, Search, MessageSquare, User, Clock, MoreVertical, ArrowLeft, X, Lock, Loader2, BellOff, EyeOff, AlertCircle, Ban, CheckCircle } from 'lucide-react';
import { ProRoute } from '@/app/components/ProRoute';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { useRouter, usePathname } from 'next/navigation';
import { messageApi, searchApi, Conversation as ApiConversation, Message as ApiMessage, SearchUser } from '@/app/services/api';

type MessageFilter = 'all' | 'unread';

// Helper to format relative time
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${diffWeeks}w ago`;
}

// Helper to format full timestamp
function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ` at ${timeStr}`;
}

// Compose Modal Component
function ComposeModal({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (recipientUsername: string, content: string) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search for Explorer Pro users as user types
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await searchApi.search(searchQuery.trim());
        // Filter to only show Explorer Pro users (role === 'creator')
        const proUsers = response.data.users.filter(u => u.role === 'creator');
        setSearchResults(proUsers);
      } catch {
        console.error('Search failed');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery(user.username);
    setShowResults(false);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
  };

  const handleSend = async () => {
    const username = selectedUser?.username || searchQuery.trim();
    if (!username || !content.trim()) return;

    try {
      setIsSending(true);
      setError(null);
      await onSend(username, content.trim());
    } catch {
      setError('Failed to send message. Make sure the user is an Explorer Pro member.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] max-w-2xl w-full">
        <div className="bg-[#ac6d46] text-white px-6 py-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
          <span className="font-bold text-xl">NEW MESSAGE</span>
          <button onClick={onClose} disabled={isSending}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="relative">
            <label className="block text-sm font-medium mb-2 dark:text-[#e5e5e5]">TO (EXPLORER PRO)</label>
            {selectedUser ? (
              <div className="flex items-center gap-3 px-4 py-2 border-2 border-[#ac6d46] bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                {selectedUser.picture ? (
                  <Image src={selectedUser.picture} alt="" className="w-8 h-8 object-cover" width={32} height={32} />
                ) : (
                  <div className="w-8 h-8 bg-[#ac6d46] text-white flex items-center justify-center font-bold text-sm uppercase">
                    {selectedUser.username[0]}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-bold text-sm dark:text-[#e5e5e5]">{selectedUser.username}</div>
                  <div className="text-xs text-[#ac6d46]">EXPLORER PRO</div>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="p-1 hover:bg-[#e5e5e5] dark:hover:bg-[#3a3a3a] transition-colors"
                  disabled={isSending}
                >
                  <X className="w-4 h-4 text-[#616161]" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for Explorer Pro members..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    className="w-full px-4 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none"
                    disabled={isSending}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#616161]" />
                    </div>
                  )}
                </div>
                {/* Search Results Dropdown */}
                {showResults && searchQuery.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] max-h-48 overflow-y-auto z-10">
                    {searchResults.length === 0 && !isSearching ? (
                      <div className="p-4 text-sm text-[#616161] dark:text-[#b5bcc4] text-center">
                        No Explorer Pro members found
                      </div>
                    ) : (
                      searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors text-left border-b border-[#b5bcc4] dark:border-[#616161] last:border-b-0"
                        >
                          {user.picture ? (
                            <Image src={user.picture} alt="" className="w-8 h-8 object-cover" width={32} height={32} />
                          ) : (
                            <div className="w-8 h-8 bg-[#ac6d46] text-white flex items-center justify-center font-bold text-sm uppercase">
                              {user.username[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm dark:text-[#e5e5e5]">{user.username}</div>
                            <div className="text-xs text-[#ac6d46]">EXPLORER PRO</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-[#e5e5e5]">MESSAGE</label>
            <textarea
              rows={8}
              placeholder="Write your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none resize-none"
              disabled={isSending}
            />
          </div>
          <div className="flex items-center justify-end">
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isSending}
                className="px-6 py-2 border-2 border-[#202020] dark:border-[#616161] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] dark:text-[#e5e5e5] transition-all active:scale-[0.98]"
              >
                CANCEL
              </button>
              <button
                onClick={handleSend}
                disabled={(!selectedUser && !searchQuery.trim()) || !content.trim() || isSending}
                className={`px-6 py-2 font-bold transition-all flex items-center gap-2 ${
                  (selectedUser || searchQuery.trim()) && content.trim() && !isSending
                    ? 'bg-[#ac6d46] text-white hover:bg-[#8a5738] active:scale-[0.98]'
                    : 'bg-[#b5bcc4] text-white cursor-not-allowed'
                }`}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    SENDING...
                  </>
                ) : (
                  'SEND MESSAGE'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const { isPro, isLoading: isProLoading } = useProFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedFilter, setSelectedFilter] = useState<MessageFilter>('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const [messageContent, setMessageContent] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  // API state
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      setError(null);
      const data = await messageApi.getConversations();
      setConversations(data);
    } catch {
      setError('Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (username: string) => {
    try {
      setIsLoadingMessages(true);
      setError(null);
      const data = await messageApi.getConversation(username);
      setMessages(data);

      // Mark unread messages as read
      const unreadMessages = data.filter(
        (m) => !m.isRead && m.sender.username === username
      );
      for (const msg of unreadMessages) {
        try {
          await messageApi.markAsRead(msg.id);
        } catch {
          // Silently fail on mark as read
        }
      }

      // Update conversation unread count locally and notify Header
      if (unreadMessages.length > 0) {
        setConversations((prev) =>
          prev.map((c) =>
            c.recipientUsername === username
              ? { ...c, unreadCount: 0 }
              : c
          )
        );
        // Dispatch event to update Header badge
        window.dispatchEvent(new CustomEvent('messages-read'));
      }
    } catch {
      setError('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Load conversations on mount (only if user is Pro)
  useEffect(() => {
    if (!isAuthenticated || !user || !isPro || isProLoading) return;

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoadingConversations(true);
        setError(null);
        const data = await messageApi.getConversations();
        if (!cancelled) {
          setConversations(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load conversations');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConversations(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, isPro, isProLoading]);

  // Load messages when conversation is selected (only if user is Pro)
  useEffect(() => {
    if (!isPro || isProLoading) {
      setMessages([]);
      return;
    }
    if (!selectedConversation || !isAuthenticated) return;

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoadingMessages(true);
        setError(null);
        const data = await messageApi.getConversation(selectedConversation);
        if (!cancelled) {
          setMessages(data);

          // Mark unread messages as read
          const unreadMessages = data.filter(
            (m) => !m.isRead && m.sender.username === selectedConversation
          );
          for (const msg of unreadMessages) {
            try {
              await messageApi.markAsRead(msg.id);
            } catch {
              // Silently fail on mark as read
            }
          }

          // Update conversation unread count locally and notify Header
          if (unreadMessages.length > 0) {
            setConversations((prev) =>
              prev.map((c) =>
                c.recipientUsername === selectedConversation
                  ? { ...c, unreadCount: 0 }
                  : c
              )
            );
            // Dispatch event to update Header badge
            window.dispatchEvent(new CustomEvent('messages-read'));
          }
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load messages');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedConversation, isAuthenticated, isPro, isProLoading]);

  // Filter conversations based on selected filter and search
  const filteredConversations = conversations.filter((conv) => {
    // Apply filter
    if (selectedFilter === 'unread' && conv.unreadCount === 0) return false;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.recipientUsername.toLowerCase().includes(query) ||
        (conv.recipientName?.toLowerCase().includes(query) ?? false) ||
        conv.lastMessage.content.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const selectedConvData = conversations.find(
    (c) => c.recipientUsername === selectedConversation
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageContent.trim() || isSending) return;

    try {
      setIsSending(true);
      await messageApi.send({
        content: messageContent.trim(),
        recipientUsername: selectedConversation,
      });

      // Optimistically add the message to the UI
      const newMessage: ApiMessage = {
        id: `temp-${Date.now()}`,
        content: messageContent.trim(),
        senderId: user?.id || 0,
        recipientId: 0,
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: {
          username: user?.username || '',
          name: undefined,
          picture: user?.picture,
        },
        recipient: {
          username: selectedConversation,
          name: selectedConvData?.recipientName,
          picture: selectedConvData?.recipientPicture,
        },
      };
      setMessages((prev) => [...prev, newMessage]);

      // Update conversation last message
      setConversations((prev) =>
        prev.map((c) =>
          c.recipientUsername === selectedConversation
            ? {
                ...c,
                lastMessage: {
                  content: messageContent.trim(),
                  createdAt: new Date().toISOString(),
                  isFromMe: true,
                },
              }
            : c
        )
      );

      setMessageContent('');

      // Refresh to get the real message ID
      await fetchMessages(selectedConversation);
    } catch {
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Authentication gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] text-white">
            <div className="flex items-center gap-3">
              <Lock size={24} strokeWidth={2} />
              <h2 className="text-lg font-bold">AUTHENTICATION REQUIRED</h2>
            </div>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              You must be logged in to access messages. Please log in to view and send messages.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/auth?from=' + pathname)}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
              >
                LOG IN / REGISTER
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProRoute
      pageName="Messages & Conversations"
      pageDescription="Communicate directly with other Explorer Pro members through the platform's built-in messaging system."
    >
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-[#b5bcc4] dark:border-[#616161]">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-[#ac6d46]" />
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold dark:text-[#e5e5e5]">MESSAGES</h1>
                    {totalUnread > 0 && (
                      <span className="px-3 py-1 bg-[#ac6d46] text-white text-xs font-bold font-mono rounded-full">
                        {totalUnread} UNREAD
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Direct messaging with Explorer Pro members · Pro-to-Pro communication only
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCompose(true)}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                NEW MESSAGE
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] h-[700px] flex flex-col">
              {/* Search & Filters */}
              <div className="p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm"
                  />
                  <button className="px-3 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]">
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`flex-1 py-2 font-bold transition-all ${
                      selectedFilter === 'all'
                        ? 'bg-[#ac6d46] text-white'
                        : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]'
                    }`}
                  >
                    ALL
                  </button>
                  <button
                    onClick={() => setSelectedFilter('unread')}
                    className={`flex-1 py-2 font-bold transition-all ${
                      selectedFilter === 'unread'
                        ? 'bg-[#ac6d46] text-white'
                        : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]'
                    }`}
                  >
                    UNREAD
                  </button>
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#616161]" />
                  </div>
                ) : error && !conversations.length ? (
                  <div className="p-6 text-center text-sm text-[#616161] dark:text-[#b5bcc4]">
                    {error}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#616161] dark:text-[#b5bcc4]">
                    {conversations.length === 0 ? 'No conversations yet' : 'No conversations found'}
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.recipientUsername}
                      onClick={() => setSelectedConversation(conv.recipientUsername)}
                      className={`w-full p-4 border-b-2 border-[#b5bcc4] dark:border-[#616161] text-left hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all ${
                        selectedConversation === conv.recipientUsername ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {conv.recipientPicture ? (
                            <Image
                              src={conv.recipientPicture}
                              alt={conv.recipientUsername}
                              className="w-10 h-10 object-cover"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-[#ac6d46] text-white flex items-center justify-center font-bold uppercase">
                              {conv.recipientUsername[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm dark:text-[#e5e5e5]">
                              {conv.recipientUsername}
                            </div>
                            {conv.recipientName && (
                              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                                {conv.recipientName}
                              </div>
                            )}
                          </div>
                        </div>
                        {conv.unreadCount > 0 && (
                          <div className="px-2 py-1 bg-[#ac6d46] text-white text-xs font-bold">
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] line-clamp-2 mb-1">
                        {conv.lastMessage.isFromMe && <span className="text-[#ac6d46]">You: </span>}
                        {conv.lastMessage.content}
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(conv.lastMessage.createdAt)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Message Thread / Empty State */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] h-[700px] flex flex-col">
              {selectedConversation && selectedConvData ? (
                <>
                  {/* Thread Header */}
                  <div className="p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedConversation(null)}
                        className="lg:hidden p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      {selectedConvData.recipientPicture ? (
                        <Image
                          src={selectedConvData.recipientPicture}
                          alt={selectedConvData.recipientUsername}
                          className="w-10 h-10 object-cover"
                          width={40}
                          height={40}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#ac6d46] text-white flex items-center justify-center font-bold uppercase">
                          {selectedConvData.recipientUsername[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold dark:text-[#e5e5e5]">{selectedConvData.recipientUsername}</div>
                        {selectedConvData.recipientName && (
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">{selectedConvData.recipientName}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          onClick={() => setShowOptions(!showOptions)}
                          className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                        >
                          <MoreVertical className="w-5 h-5 text-[#616161]" />
                        </button>

                        {/* Dropdown Menu */}
                        {showOptions && (
                          <>
                            {/* Backdrop */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowOptions(false)}
                            />
                            {/* Menu */}
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] z-20">
                              <div className="bg-[#616161] text-white px-3 py-2 border-b-2 border-[#202020] dark:border-[#616161]">
                                <div className="font-bold text-xs">CONVERSATION OPTIONS</div>
                              </div>
                              <div className="py-1">
                                <button className="w-full px-4 py-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] flex items-center gap-3 text-left border-b border-[#b5bcc4] dark:border-[#616161]">
                                  <User className="w-4 h-4 text-[#ac6d46]" />
                                  <div>
                                    <div className="text-sm font-bold dark:text-[#e5e5e5]">View Profile</div>
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">See explorer details and journals</div>
                                  </div>
                                </button>
                                <button className="w-full px-4 py-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] flex items-center gap-3 text-left border-b border-[#b5bcc4] dark:border-[#616161]">
                                  <BellOff className="w-4 h-4 text-[#616161] dark:text-[#b5bcc4]" />
                                  <div>
                                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Mute Notifications</div>
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Stop alerts for this conversation</div>
                                  </div>
                                </button>
                                <button className="w-full px-4 py-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] flex items-center gap-3 text-left border-b border-[#b5bcc4] dark:border-[#616161]">
                                  <EyeOff className="w-4 h-4 text-[#616161] dark:text-[#b5bcc4]" />
                                  <div>
                                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Mark as Unread</div>
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Mark entire conversation unread</div>
                                  </div>
                                </button>
                                <button className="w-full px-4 py-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] flex items-center gap-3 text-left border-b border-[#b5bcc4] dark:border-[#616161]">
                                  <AlertCircle className="w-4 h-4 text-[#616161] dark:text-[#b5bcc4]" />
                                  <div>
                                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Report Conversation</div>
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Report spam or inappropriate content</div>
                                  </div>
                                </button>
                                <button className="w-full px-4 py-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] flex items-center gap-3 text-left border-b border-[#b5bcc4] dark:border-[#616161]">
                                  <Ban className="w-4 h-4 text-[#616161] dark:text-[#b5bcc4]" />
                                  <div>
                                    <div className="text-sm font-bold dark:text-[#e5e5e5]">Block User</div>
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Prevent future messages from this user</div>
                                  </div>
                                </button>
                                <button className="w-full px-4 py-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] flex items-center gap-3 text-left">
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                  <div>
                                    <div className="text-sm font-bold text-red-600">Delete Conversation</div>
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Permanently remove all messages</div>
                                  </div>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-[#616161]" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-sm text-[#616161] dark:text-[#b5bcc4]">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwnMessage = message.sender.username === user?.username;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                              <div
                                className={`p-4 ${
                                  isOwnMessage
                                    ? 'bg-[#ac6d46] text-white'
                                    : 'bg-[#f5f5f5] dark:bg-[#2a2a2a] dark:text-[#e5e5e5]'
                                }`}
                              >
                                <div className="text-sm">{message.content}</div>
                              </div>
                              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 px-1">
                                {formatTimestamp(message.createdAt)}
                                {isOwnMessage && message.isRead && (
                                  <CheckCircle className="w-3 h-3 inline ml-2 text-[#ac6d46]" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t-2 border-[#202020] dark:border-[#616161]">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && messageContent.trim()) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="flex-1 px-4 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none"
                        disabled={isSending}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageContent.trim() || isSending}
                        className={`px-6 py-2 font-bold transition-all flex items-center gap-2 ${
                          messageContent.trim() && !isSending
                            ? 'bg-[#ac6d46] text-white hover:bg-[#8a5738] active:scale-[0.98]'
                            : 'bg-[#b5bcc4] text-white cursor-not-allowed'
                        }`}
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'SEND'
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty State */
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-[#b5bcc4] mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">SELECT A CONVERSATION</h3>
                    <p className="text-sm text-[#616161] dark:text-[#b5bcc4] max-w-md">
                      Choose a conversation from the list to view messages or start a new conversation with another Explorer Pro member.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compose Modal */}
        {showCompose && (
          <ComposeModal
            onClose={() => setShowCompose(false)}
            onSend={async (recipientUsername: string, content: string) => {
              await messageApi.send({ recipientUsername, content });
              // Refresh conversations and select the new one
              await fetchConversations();
              setSelectedConversation(recipientUsername);
              setShowCompose(false);
            }}
          />
        )}
      </div>
    </ProRoute>
  );
}