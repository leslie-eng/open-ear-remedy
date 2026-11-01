import { useCallback, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

interface NotesSettings {
  optedOut: boolean;
  noticeSeen: boolean;
}

/**
 * Before a person's first Conversation with a Listener, they are told Listeners may keep brief
 * private notes, and can say no. `gate(start)` runs `start` straight away once the notice has
 * been seen; otherwise it opens the notice and runs `start` after they choose.
 */
export function useNotesNoticeGate() {
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const gate = useCallback(async (start: () => void) => {
    try {
      const s = await apiFetch<NotesSettings>('/api/notes/settings');
      if (s.noticeSeen) return start();
    } catch {
      // If the check fails, show the notice rather than skip it.
    }
    pending.current = start;
    setOpen(true);
  }, []);

  const choose = useCallback(async (allowNotes: boolean) => {
    setOpen(false);
    try {
      await apiFetch('/api/notes/settings', {
        method: 'PUT',
        body: JSON.stringify({ noticeSeen: true, ...(allowNotes ? {} : { optedOut: true }) }),
      });
    } catch {
      // Not fatal: the conversation can go ahead; the notice will show again next time.
    }
    pending.current?.();
    pending.current = null;
  }, []);

  const cancel = useCallback(() => {
    setOpen(false);
    pending.current = null;
  }, []);

  return { gate, noticeOpen: open, choose, cancel };
}
