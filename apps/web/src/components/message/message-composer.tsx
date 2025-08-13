'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { XIcon, PaperPlaneRightIcon } from '@repo/ui/icons';
import { Button } from '@repo/ui/components';

import { apiClient, API_QUERY_KEYS } from '@/lib/api';

interface MessageComposerProps {
  onClose: () => void;
  recipientUsername?: string;
}

export function MessageComposer({ onClose, recipientUsername }: MessageComposerProps) {
  const [username, setUsername] = useState(recipientUsername || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: (payload: { content: string; recipientUsername: string }) =>
      apiClient.messages.sendMessage({ query: {}, payload }),
    onSuccess: () => {
      // Invalidate and refetch conversations list to show new conversation
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATIONS] });
      queryClient.refetchQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.CONVERSATIONS] });
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.UNREAD_COUNT] });
      queryClient.refetchQueries({ queryKey: [API_QUERY_KEYS.MESSAGES.UNREAD_COUNT] });
      
      // Navigate to the conversation
      router.push(`/messages/${recipientUsername || username}`);
      onClose();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to send message');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetUsername = recipientUsername || username.trim();
    
    if (!targetUsername || !message.trim()) {
      setError('Please enter both username and message');
      return;
    }

    setIsSubmitting(true);
    setError('');

    sendMessageMutation.mutate({
      content: message.trim(),
      recipientUsername: targetUsername.toLowerCase().replace('@', ''),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* To Field - only show if no recipient is pre-selected */}
          {!recipientUsername && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                To (Explorer Pro member)
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g., @explorer123)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(170,108,70)] focus:border-transparent"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Only Explorer Pro members can receive messages
              </p>
            </div>
          )}

          {/* Show recipient info when pre-selected */}
          {recipientUsername && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border">
                <div className="w-8 h-8 bg-[rgb(170,108,70)]/10 rounded-full flex items-center justify-center">
                  <span className="text-[rgb(170,108,70)] font-medium text-sm">
                    {recipientUsername.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-900 font-medium">@{recipientUsername}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[rgb(170,108,70)]/10 text-[rgb(170,108,70)]">
                  Explorer Pro
                </span>
              </div>
            </div>
          )}

          {/* Message Field */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={4}
              maxLength={5000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(170,108,70)] focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-end mt-1">
              <span className={`text-xs ${message.length > 4500 ? 'text-red-500' : 'text-gray-500'}`}>
                {message.length}/5000
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!recipientUsername && !username.trim()) || !message.trim()}
              className="bg-[rgb(170,108,70)] hover:bg-[rgb(170,108,70)]/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <PaperPlaneRightIcon className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}