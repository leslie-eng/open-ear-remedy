import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface NotesSettings {
  optedOut: boolean;
  noticeSeen: boolean;
}

/** The person's control over Listener notes: turn them off, or delete every note about them. */
export default function NotesSettingsCard() {
  const [settings, setSettings] = useState<NotesSettings | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<NotesSettings>('/api/notes/settings').then(setSettings, () => setMessage('Could not load your notes settings.'));
  }, []);

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(done);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const toggle = () =>
    run(async () => {
      const next = await apiFetch<NotesSettings>('/api/notes/settings', {
        method: 'PUT',
        body: JSON.stringify({ optedOut: !settings?.optedOut }),
      });
      setSettings(next);
    }, settings?.optedOut ? 'Notes are on again.' : 'Notes are off, and existing notes about you were deleted.');

  const remove = () => run(() => apiFetch('/api/notes', { method: 'DELETE' }), 'Every note about you has been deleted.');

  return (
    <div className="pt-6 border-t border-gray-100">
      <h3 className="text-lg font-semibold text-oe-ink mb-2">Listener notes</h3>
      <p className="text-sm text-oe-muted mb-4">
        After a call or text chat, a Listener may keep a brief private note so the next Listener doesn&apos;t ask you to
        repeat yourself. Only Listeners you talk to and Open Ear admins can read them, and they are deleted after 12
        months. You never need to keep them.
      </p>
      {settings && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => void toggle()}
            disabled={busy}
            aria-pressed={!settings.optedOut}
            className="px-6 py-3 rounded-xl text-sm font-semibold border-2 border-oe-primary text-oe-primary hover:bg-oe-primary-tint disabled:opacity-50 cursor-pointer"
          >
            {settings.optedOut ? 'Turn notes back on' : 'Turn notes off'}
          </button>
          {confirmDelete ? (
            <button
              onClick={() => void remove()}
              disabled={busy}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              Yes, delete all notes about me
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="px-6 py-3 rounded-xl text-sm font-semibold border-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
            >
              Delete notes about me
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-oe-ink">
          {message}
        </p>
      )}
    </div>
  );
}
