'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useState } from 'react';

interface ExpeditionNoteReply {
  id: string;
  noteId: string;
  authorId: string;
  authorName: string;
  authorPicture?: string;
  isExplorer: boolean;
  text: string;
  timestamp: string;
}

interface ExpeditionNote {
  id: string;
  text: string;
  timestamp: string;
  expeditionStatus: 'PLANNING' | 'ACTIVE' | 'COMPLETE';
  replies?: ExpeditionNoteReply[];
}

interface ExpeditionNotesProps {
  expeditionId: string;
  explorerId: string;
  explorerName: string;
  explorerPicture?: string;
  isOwner: boolean;
  isSponsoring: boolean;
  notes: ExpeditionNote[];
  noteCount?: number; // For locked state display when notes aren't accessible
  onPostNote?: (text: string) => Promise<void>;
  onPostReply?: (noteId: string, text: string) => Promise<void>;
}

export function ExpeditionNotes({
  expeditionId,
  explorerName,
  isOwner,
  isSponsoring,
  notes,
  noteCount,
  onPostNote,
  onPostReply,
}: ExpeditionNotesProps) {
  const { user, isAuthenticated } = useAuth();
  const [noteText, setNoteText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<{ used: number; max: number }>({ used: 0, max: 1 });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  // Check if user can post today
  const canPostToday = isOwner && dailyLimit.used < dailyLimit.max;
  const remainingPosts = dailyLimit.max - dailyLimit.used;

  const handlePostNote = async () => {
    if (!noteText.trim() || noteText.length > 280 || !canPostToday) return;

    setIsPosting(true);
    try {
      if (onPostNote) {
        await onPostNote(noteText);
      }
      setNoteText('');
      setShowNoteForm(false);
      setDailyLimit(prev => ({ ...prev, used: prev.used + 1 }));
    } catch (error) {
      console.error('Failed to post note:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostReply = async (noteId: string) => {
    if (!replyText.trim() || replyText.length > 280) return;

    setIsPostingReply(true);
    try {
      if (onPostReply) {
        await onPostReply(noteId, replyText);
      }
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setIsPostingReply(false);
    }
  };

  // Get badge color for expedition status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'bg-[#4676ac]';
      case 'ACTIVE': return 'bg-[#ac6d46]';
      case 'COMPLETE': return 'bg-[#616161]';
      default: return 'bg-[#b5bcc4]';
    }
  };

  // Non-sponsor view (locked state)
  if (!isSponsoring && !isOwner) {
    return (
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
        <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            <div>
              <h2 className="text-sm font-bold font-mono tracking-wide">EXPEDITION NOTES</h2>
              <div className="text-xs font-mono text-[#b5bcc4] mt-0.5">SPONSOR EXCLUSIVE CONTENT</div>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
          <div className="text-sm font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
            {noteCount ?? notes.length} {(noteCount ?? notes.length) === 1 ? 'NOTE' : 'NOTES'} LOGGED
          </div>
          <p className="text-xs text-[#b5bcc4] dark:text-[#616161] mb-6">
            Behind-the-scenes updates from {explorerName} during this expedition.
          </p>
          <Link
            href={isAuthenticated ? `/sponsor/${expeditionId}` : `/login?redirect=${encodeURIComponent(`/sponsor/${expeditionId}`)}`}
            className="inline-block px-6 py-3 bg-[#ac6d46] text-white font-bold font-mono text-sm border-2 border-[#202020] hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
          >
            SPONSOR TO UNLOCK
          </Link>
        </div>
      </div>
    );
  }

  // Sponsor/Owner view
  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
      {/* Header */}
      <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold font-mono tracking-wide">EXPEDITION NOTES</h2>
          <div className="text-xs font-mono text-white/70 mt-0.5">
            {notes.length} {notes.length === 1 ? 'NOTE' : 'NOTES'} LOGGED • SPONSOR EXCLUSIVE
          </div>
        </div>
        {isOwner && canPostToday && (
          <button
            onClick={() => setShowNoteForm(!showNoteForm)}
            className="px-4 py-2 bg-[#202020] hover:bg-[#3a3a3a] border-2 border-white/30 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-white text-xs font-bold font-mono"
          >
            {showNoteForm ? '✕ CANCEL' : '+ LOG NOTE'}
          </button>
        )}
        {isOwner && !canPostToday && (
          <div className="px-3 py-1 bg-[#202020]/30 text-xs font-mono">
            DAILY LIMIT REACHED
          </div>
        )}
      </div>

      {/* Note Form */}
      {showNoteForm && isOwner && (
        <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-2">
            LOGGING AS: <span className="text-[#ac6d46] font-bold">{user?.username?.toUpperCase() || explorerName.toUpperCase()}</span> • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </div>
          <textarea
            className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm mb-1 dark:bg-[#202020] dark:text-[#e5e5e5] font-mono"
            rows={3}
            placeholder="Share a quick update with your sponsors..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value.slice(0, 280))}
            maxLength={280}
          />
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-mono ${noteText.length > 250 ? 'text-red-500' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
              {noteText.length}/280
            </span>
            <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
              {remainingPosts} {remainingPosts === 1 ? 'NOTE' : 'NOTES'} REMAINING TODAY
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePostNote}
              disabled={isPosting || !noteText.trim()}
              className="px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] border-2 border-[#202020] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold font-mono disabled:opacity-50 disabled:active:scale-100"
            >
              {isPosting ? 'LOGGING...' : 'LOG NOTE'}
            </button>
            <button
              onClick={() => {
                setShowNoteForm(false);
                setNoteText('');
              }}
              className="px-4 py-2 border-2 border-[#616161] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs font-mono"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Notes List - Each note is its own card */}
      {notes.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-[#616161] dark:text-[#b5bcc4] font-mono text-sm mb-1">NO NOTES LOGGED YET</div>
          <div className="text-[#b5bcc4] dark:text-[#616161] text-xs">
            {isOwner
              ? 'Share your first update with your sponsors.'
              : `${explorerName} hasn't posted any notes yet.`
            }
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {notes.map((note, index) => (
            <div key={note.id} className="border-2 border-[#202020] dark:border-[#616161] border-l-4 border-l-[#ac6d46] bg-white dark:bg-[#1a1a1a]">
              {/* Note Card Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#f5f5f5] dark:bg-[#252525] border-b-2 border-[#202020] dark:border-[#616161]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-mono font-bold">
                    NOTE #{notes.length - index}
                  </span>
                  <span className={`px-1.5 py-0.5 text-xs font-mono font-bold text-white ${getStatusBadgeColor(note.expeditionStatus)}`}>
                    {note.expeditionStatus}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                  {new Date(note.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </span>
              </div>

              {/* Note Content */}
              <div className="px-3 py-3">
                <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">{note.text}</p>

                {/* Respond Button */}
                {isAuthenticated && (isSponsoring || isOwner) && (
                  <button
                    onClick={() => {
                      setReplyingTo(replyingTo === note.id ? null : note.id);
                      setReplyText('');
                    }}
                    className="mt-3 text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] font-mono font-bold transition-all"
                  >
                    {replyingTo === note.id ? '✕ CANCEL' : '↳ RESPOND'}
                  </button>
                )}

                {/* Inline Response Form */}
                {replyingTo === note.id && isAuthenticated && (
                  <div className="mt-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <textarea
                      className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs mb-1 dark:bg-[#202020] dark:text-[#e5e5e5] font-mono"
                      rows={2}
                      placeholder="Write your response..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value.slice(0, 280))}
                      maxLength={280}
                    />
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-mono ${replyText.length > 250 ? 'text-red-500' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                        {replyText.length}/280
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePostReply(note.id)}
                        disabled={isPostingReply || !replyText.trim()}
                        className="px-3 py-1.5 bg-[#ac6d46] text-white hover:bg-[#8a5738] border-2 border-[#202020] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-mono font-bold disabled:opacity-50 disabled:active:scale-100"
                      >
                        {isPostingReply ? 'LOGGING...' : 'LOG RESPONSE'}
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                        className="px-3 py-1.5 border-2 border-[#616161] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs font-mono"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Responses Section - Contained within the note card */}
              {note.replies && note.replies.length > 0 && (
                <div className="border-t-2 border-[#202020] dark:border-[#616161] px-3 py-3">
                  <div className="ml-8 pl-3 border-l-2 border-[#b5bcc4] dark:border-[#616161]">
                    <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] font-bold mb-2">
                      {note.replies.length} {note.replies.length === 1 ? 'RESPONSE' : 'RESPONSES'}
                    </div>
                    <div className="space-y-2">
                      {note.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2">
                          <Link href={`/journal/${reply.authorId}`} className="flex-shrink-0">
                            <div className={`w-6 h-6 border ${reply.isExplorer ? 'border-[#ac6d46]' : 'border-[#b5bcc4] dark:border-[#616161]'} overflow-hidden bg-[#616161] hover:border-[#4676ac] transition-colors`}>
                              <img
                                src={reply.authorPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.authorId}`}
                                alt={reply.authorName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </Link>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/journal/${reply.authorId}`} className="font-bold text-xs hover:text-[#ac6d46] dark:text-[#e5e5e5] font-mono">
                                {reply.authorId}
                              </Link>
                              {reply.isExplorer && (
                                <span className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-mono font-bold rounded-full">EXPLORER</span>
                              )}
                              <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                                {new Date(reply.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] mt-0.5 leading-relaxed">{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
