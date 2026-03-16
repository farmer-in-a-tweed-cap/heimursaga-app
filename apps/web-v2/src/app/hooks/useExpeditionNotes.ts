import { useState, useEffect } from 'react';
import { expeditionApi, type ExpeditionNote } from '@/app/services/api';

export function useExpeditionNotes(
  expeditionId: string | undefined,
  isAuthenticated: boolean,
  isOwner: boolean,
  notesVisibility: 'public' | 'sponsor' = 'public',
) {
  const [expeditionNotes, setExpeditionNotes] = useState<ExpeditionNote[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [isSponsoring, setIsSponsoring] = useState(false);

  const isPublicNotes = notesVisibility === 'public';

  useEffect(() => {
    let cancelled = false;

    const fetchNotes = async () => {
      if (!expeditionId) return;

      // Always fetch note count (public)
      try {
        const countData = await expeditionApi.getNoteCount(expeditionId);
        if (!cancelled) {
          setNoteCount(countData.count);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching note count:', err);
        }
      }

      // Public notes: fetch for everyone (auth not required on API)
      // Sponsor-gated notes: only fetch if authenticated
      if (!isPublicNotes && !isAuthenticated) return;

      try {
        const notesData = await expeditionApi.getNotes(expeditionId);
        if (!cancelled) {
          setExpeditionNotes(notesData.notes);
          // If we got sponsor-gated notes, user has access (either owner or sponsor)
          if (!isPublicNotes && !isOwner) {
            setIsSponsoring(true);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          // 403 means user doesn't have access (not owner and not sponsor)
          if (err?.status === 403) {
            setIsSponsoring(false);
          } else {
            console.error('Error fetching notes:', err);
          }
        }
      }
    };

    fetchNotes();

    return () => {
      cancelled = true;
    };
  }, [expeditionId, isAuthenticated, isOwner, isPublicNotes]);

  const handlePostNote = async (text: string) => {
    if (!expeditionId) return;
    try {
      await expeditionApi.createNote(expeditionId, text);
      const notesData = await expeditionApi.getNotes(expeditionId);
      setExpeditionNotes(notesData.notes);
      setNoteCount(prev => prev + 1);
    } catch (err) {
      throw err;
    }
  };

  const handlePostReply = async (noteId: string, text: string) => {
    if (!expeditionId) return;
    try {
      await expeditionApi.createNoteReply(expeditionId, parseInt(noteId), text);
      const notesData = await expeditionApi.getNotes(expeditionId);
      setExpeditionNotes(notesData.notes);
    } catch (err) {
      throw err;
    }
  };

  const handleEditNote = async (noteId: string, text: string) => {
    if (!expeditionId) return;
    await expeditionApi.updateNote(expeditionId, parseInt(noteId), text);
    const notesData = await expeditionApi.getNotes(expeditionId);
    setExpeditionNotes(notesData.notes);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!expeditionId) return;
    await expeditionApi.deleteNote(expeditionId, parseInt(noteId));
    const notesData = await expeditionApi.getNotes(expeditionId);
    setExpeditionNotes(notesData.notes);
    setNoteCount(prev => prev - 1);
  };

  const handleEditReply = async (noteId: string, replyId: string, text: string) => {
    if (!expeditionId) return;
    await expeditionApi.updateReply(expeditionId, parseInt(noteId), parseInt(replyId), text);
    const notesData = await expeditionApi.getNotes(expeditionId);
    setExpeditionNotes(notesData.notes);
  };

  const handleDeleteReply = async (noteId: string, replyId: string) => {
    if (!expeditionId) return;
    await expeditionApi.deleteReply(expeditionId, parseInt(noteId), parseInt(replyId));
    const notesData = await expeditionApi.getNotes(expeditionId);
    setExpeditionNotes(notesData.notes);
  };

  return {
    expeditionNotes, noteCount, isSponsoring, isPublicNotes,
    handlePostNote, handlePostReply,
    handleEditNote, handleDeleteNote,
    handleEditReply, handleDeleteReply,
  };
}
