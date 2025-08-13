'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { UserRole } from '@repo/types';
import { ArrowLeftIcon, PaperPlaneRightIcon, ChatCircleTextIcon, CheckIcon, ChecksIcon } from '@repo/ui/icons';
import { Button } from '@repo/ui/components';

import { apiClient, API_QUERY_KEYS } from '@/lib/api';
import { useSession } from '@/hooks';
import { dateformat } from '@/lib/date-format';
import { ROUTER } from '@/router';

interface ConversationViewProps {
  recipientUsername: string;
}

export function ConversationView({ recipientUsername }: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const session = useSession();
  
  const queryClient = useQueryClient();

  const { data: messages, isLoading, error } = useQuery({
    queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATION, recipientUsername],
    queryFn: () => apiClient.messages.getConversation({ query: { username: recipientUsername } }).then(({ data }) => data),
    refetchInterval: 3000, // Refresh every 3 seconds for near real-time updates
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      apiClient.messages.sendMessage({ query: {}, payload: { content, recipientUsername } }),
    onSuccess: () => {
      setNewMessage('');
      setIsSubmitting(false);
      // Invalidate and refetch queries to refresh the conversation
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATION, recipientUsername] });
      queryClient.refetchQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATION, recipientUsername] });
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATIONS] });
      queryClient.refetchQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATIONS] });
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.UNREAD_COUNT] });
      queryClient.refetchQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.UNREAD_COUNT] });
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiClient.messages.markMessageRead({ query: { messageId } }),
    onSuccess: (data, messageId) => {
      console.log('Message marked as read:', messageId);
      // Immediately refetch all related queries
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.UNREAD_COUNT] });
      queryClient.refetchQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.UNREAD_COUNT] });
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATIONS] });
      queryClient.refetchQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATIONS] });
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATION, recipientUsername] });
      queryClient.refetchQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATION, recipientUsername] });
    },
    onError: (error, messageId) => {
      console.error('Failed to mark message as read:', messageId, error);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    if (!messages || !session.logged || !Array.isArray(messages) || messages.length === 0) return;

    const unreadMessages = messages.filter(
      msg => !msg.isRead && msg.recipient.username === session.username
    );

    if (unreadMessages.length > 0) {
      console.log('Marking messages as read:', unreadMessages.map(m => m.id));
      unreadMessages.forEach(msg => {
        markAsReadMutation.mutate(msg.id);
      });
    }
  }, [messages, session.username]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    sendMessageMutation.mutate(newMessage.trim());
  };

  const formatMessageTime = (date: Date) => {
    const messageDate = dateformat(date);
    const now = dateformat();
    
    if (messageDate.isSame(now, 'day')) {
      return messageDate.format('h:mm A');
    } else if (messageDate.isSame(now.subtract(1, 'day'), 'day')) {
      return `Yesterday ${messageDate.format('h:mm A')}`;
    } else {
      return messageDate.format('MMM D, h:mm A');
    }
  };

  const isMyMessage = (senderId: number, senderUsername: string) => senderUsername === session.username;


  // Show access denied for non-creators
  if (!session.logged || session.role !== UserRole.CREATOR) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
          <ChatCircleTextIcon className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Explorer Pro Required</h3>
        <p className="text-gray-600 mb-6">
          Private messaging is exclusively available to Explorer Pro members.
        </p>
        <Button asChild className="bg-[rgb(170,108,70)] hover:bg-[rgb(170,108,70)]/90">
          <a href="/upgrade">Upgrade to Explorer Pro</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 bottom-[70px] lg:bottom-0 lg:left-16 flex flex-col bg-gray-50 z-10">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link href="/messages">
            <Button variant="ghost" size="sm" className="p-1">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
          
          <Link href={ROUTER.USERS.DETAIL(recipientUsername)} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            {/* Get recipient info from messages */}
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border overflow-hidden">
              {messages && Array.isArray(messages) && messages.length > 0 ? (
                messages[0].recipient.username === recipientUsername ? (
                  messages[0].recipient.picture ? (
                    <Image
                      src={messages[0].recipient.picture}
                      alt={messages[0].recipient.name || recipientUsername}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-medium text-sm">
                      {recipientUsername.charAt(0).toUpperCase()}
                    </span>
                  )
                ) : messages[0].sender.picture ? (
                  <Image
                    src={messages[0].sender.picture}
                    alt={messages[0].sender.name || recipientUsername}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 font-medium text-sm">
                    {recipientUsername.charAt(0).toUpperCase()}
                  </span>
                )
              ) : (
                <span className="text-gray-600 font-medium text-sm">
                  {recipientUsername.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{recipientUsername}</h1>
            </div>
          </Link>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(170,108,70)]"></div>
                </div>
              ) : !messages || !Array.isArray(messages) || messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <ChatCircleTextIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
                  <p className="text-gray-600">
                    Send your first message to {recipientUsername}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${isMyMessage(message.senderId, message.sender.username) ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          isMyMessage(message.senderId, message.sender.username)
                            ? 'bg-[rgb(170,108,70)] text-white rounded-br-md'
                            : 'bg-gray-300 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div className={`flex items-center justify-between mt-2 text-xs ${
                          isMyMessage(message.senderId, message.sender.username) ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {isMyMessage(message.senderId, message.sender.username) && (
                            <span className="ml-2">
                              {message.isRead ? (
                                <ChecksIcon className="w-4 h-4" />
                              ) : (
                                <CheckIcon className="w-4 h-4" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
        </div>

        {/* Message Input - Fixed at bottom */}
        <div className="bg-gray-50/80 backdrop-blur-sm border-t border-gray-200 p-4 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${recipientUsername}...`}
              rows={1}
              maxLength={5000}
              className="flex-1 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[rgb(170,108,70)] resize-none bg-gray-50 h-10"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newMessage.trim()}
              className="bg-[rgb(170,108,70)] hover:bg-[rgb(170,108,70)]/90 text-white px-3 rounded-full disabled:bg-gray-300 h-10 flex items-center justify-center transition-colors"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PaperPlaneRightIcon className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}