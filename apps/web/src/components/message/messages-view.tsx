'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { UserRole } from '@repo/types';
import { ChatCircleTextIcon } from '@repo/ui/icons';
import { Button } from '@repo/ui/components';

import { apiClient, API_QUERY_KEYS } from '@/lib/api';
import { useSession } from '@/hooks';
import { ConversationList } from './conversation-list';

export function MessagesView() {
  const session = useSession();

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATIONS],
    queryFn: () => apiClient.messages.getConversations().then(({ data }) => data),
    refetchInterval: 5000, // Refresh every 5 seconds for faster updates
    enabled: session.logged && session.role === UserRole.CREATOR, // Only run if user is Explorer Pro
  });

  const { data: unreadCount } = useQuery({
    queryKey: [API_QUERY_KEYS.MESSAGES.UNREAD_COUNT],
    queryFn: () => apiClient.messages.getUnreadCount().then(({ data }) => data),
    refetchInterval: 15000, // Check for new messages every 15 seconds
  });


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
    <div className="w-full">
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="px-6 py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
              <p className="text-gray-600">
                Connect with fellow Explorer Pro members
                {unreadCount?.count ? (
                  <span className="text-[rgb(170,108,70)] font-medium"> • {unreadCount.count} unread</span>
                ) : ''}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !conversations || !Array.isArray(conversations) || conversations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <ChatCircleTextIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-600">
                    Visit another Explorer Pro member's profile and click the "Message" button to start a conversation.
                  </p>
                </div>
              ) : (
                <ConversationList conversations={conversations || []} />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}