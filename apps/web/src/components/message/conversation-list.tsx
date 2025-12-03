'use client';

import Link from 'next/link';
import Image from 'next/image';
import { IConversationDetail } from '@repo/types';
import { CaretRightIcon } from '@repo/ui/icons';

import { dateformat } from '@/lib/date-format';

interface ConversationListProps {
  conversations: IConversationDetail[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  const formatMessagePreview = (content: string, maxLength: number = 60) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return dateformat(messageDate).format('MMM D');
  };

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <Link
          key={conversation.recipientUsername}
          href={`/messages/${conversation.recipientUsername}`}
          className="block"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow p-4">
            <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                {conversation.recipientPicture ? (
                  <Image
                    src={conversation.recipientPicture}
                    alt={conversation.recipientName || conversation.recipientUsername}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 dark:text-gray-300 font-medium text-lg">
                    {(conversation.recipientName || conversation.recipientUsername).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {conversation.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-[rgb(170,108,70)] text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                </div>
              )}
            </div>

            {/* Conversation Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium truncate ${conversation.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {conversation.recipientName || conversation.recipientUsername}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {formatTimeAgo(conversation.lastMessage.createdAt)}
                </span>
              </div>
              
              <div className="flex items-center text-sm">
                <span className={`truncate ${conversation.unreadCount > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                  {conversation.lastMessage.isFromMe && (
                    <span className="text-gray-500 dark:text-gray-400 mr-1">You:</span>
                  )}
                  {formatMessagePreview(conversation.lastMessage.content)}
                </span>
              </div>
            </div>

            {/* Arrow Icon */}
            <div className="flex-shrink-0">
              <CaretRightIcon className="w-5 h-5 text-gray-400" />
            </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}