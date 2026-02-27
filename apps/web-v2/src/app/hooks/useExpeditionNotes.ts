import { useState, useEffect } from 'react';
import { expeditionApi, type ExpeditionNote } from '@/app/services/api';

export function useExpeditionNotes(
  expeditionId: string | undefined,
  isAuthenticated: boolean,
  isOwner: boolean,
) {
  const [expeditionNotes, setExpeditionNotes] = useState<ExpeditionNote[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [isSponsoring, setIsSponsoring] = useState(false);

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

      // Only fetch full notes if authenticated (owner or sponsor will have access)
      if (!isAuthenticated) return;

      try {
        const notesData = await expeditionApi.getNotes(expeditionId);
        if (!cancelled) {
          setExpeditionNotes(notesData.notes);
          // If we got notes, user has access (either owner or sponsor)
          if (!isOwner) {
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
  }, [expeditionId, isAuthenticated, isOwner]);

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

  return { expeditionNotes, noteCount, isSponsoring, handlePostNote, handlePostReply };
}
