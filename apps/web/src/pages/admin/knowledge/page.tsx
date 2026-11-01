import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../../components/feature/Navbar';
import { apiFetch, apiPostForm, type AdminEbook } from '../../../lib/api';

interface Source {
  id: string;
  title: string;
  author: string | null;
  licence: string;
  approvedBy: string | null;
  approvedAt: string | null;
  enabled: boolean;
  productId: string | null;
  fileName: string | null;
  passageCount: number;
  /** Indexed with a different embedding model than the one now configured; it is not searched. */
  needsReindex: boolean;
  createdAt: string;
  usesLast30Days: number;
}

type Notice = { type: 'success' | 'error'; text: string } | null;

const inputClass = 'w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none';
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/**
 * Admin: the books and documents the AI Companion may draw on. A source is only used once a
 * qualified professional has approved it AND it is switched on.
 */
export default function KnowledgeAdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [ebooks, setEbooks] = useState<AdminEbook[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  // Inline two-step actions: which source is being approved / about to be removed.
  const [approving, setApproving] = useState<string | null>(null);
  const [approver, setApprover] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [k, e] = await Promise.all([
      apiFetch<{ sources: Source[] }>('/api/admin/knowledge'),
      apiFetch<{ ebooks: AdminEbook[] }>('/api/admin/ebooks'),
    ]);
    setSources(k.sources);
    setEbooks(e.ebooks.filter((b) => b.file_url));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await apiFetch('/api/admin/check');
      } catch {
        if (!cancelled) navigate('/admin-login', { replace: true });
        return;
      }
      await load();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, load]);

  /** Runs an admin action, then reloads the list and reports the outcome. */
  const act = async (action: () => Promise<unknown>, success: string, failure: string) => {
    setNotice(null);
    setBusy(true);
    try {
      await action();
      await load();
      setNotice({ type: 'success', text: success });
      return true;
    } catch (err) {
      setNotice({ type: 'error', text: errorText(err, failure) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const ok = await act(
      () => apiPostForm('/api/admin/knowledge', new FormData(form)),
      'Added. It stays off until a professional approves it.',
      'Could not add that file.',
    );
    if (ok) form.reset();
  };

  const addEbook = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const ok = await act(
      () =>
        apiFetch('/api/admin/knowledge/from-ebook', {
          method: 'POST',
          body: JSON.stringify({ productId: data.get('productId'), licence: data.get('licence') }),
        }),
      'Ebook added. It stays off until a professional approves it.',
      'Could not add that ebook.',
    );
    if (ok) form.reset();
  };

  const approve = async (e: FormEvent, source: Source) => {
    e.preventDefault();
    const approvedBy = approver.trim();
    if (!approvedBy) return;
    const ok = await act(
      () => apiFetch(`/api/admin/knowledge/${source.id}/approve`, { method: 'POST', body: JSON.stringify({ approvedBy }) }),
      `Approved by ${approvedBy}. Switch it on when ready.`,
      'Could not approve.',
    );
    if (ok) {
      setApproving(null);
      setApprover('');
    }
  };

  const setEnabled = (source: Source, enabled: boolean) =>
    void act(
      () => apiFetch(`/api/admin/knowledge/${source.id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
      enabled ? `"${source.title}" is now used by the AI Companion.` : `"${source.title}" is switched off.`,
      'Could not update.',
    );

  const remove = (source: Source) => {
    setRemoving(null);
    void act(() => apiFetch(`/api/admin/knowledge/${source.id}`, { method: 'DELETE' }), `Removed "${source.title}".`, 'Could not remove.');
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      <main className="pt-24 md:pt-28 px-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-[#2A2A2A]">Knowledge sources</h1>
            <Link to="/admin-dashboard" className="text-[#0096FF] font-medium hover:underline">
              Back to dashboard
            </Link>
          </div>
          <p className="text-[#6B6B6B]">
            Books and documents the AI Companion may draw on. Add only material we have the right to use, record its
            licence, and have a qualified mental-health professional approve it before switching it on. Scanned books
            (pictures of pages) cannot be read.
          </p>

          {notice && (
            <p
              role="status"
              className={`px-4 py-3 rounded-xl text-sm ${
                notice.type === 'error' ? 'bg-[#FFE6E6] border border-[#FF4444] text-[#C62828]' : 'bg-green-50 border border-green-300 text-green-800'
              }`}
            >
              {notice.text}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <form onSubmit={uploadFile} className="bg-white rounded-3xl shadow-lg p-6 space-y-3">
              <h2 className="text-xl font-bold text-[#2A2A2A]">Upload a file</h2>
              <input name="file" type="file" accept=".pdf,.epub,.txt" required aria-label="File (PDF, EPUB or text)" className="block w-full text-sm" />
              <input name="title" required maxLength={200} placeholder="Title" aria-label="Title" className={inputClass} />
              <input name="author" maxLength={200} placeholder="Author (optional)" aria-label="Author" className={inputClass} />
              <input name="licence" required maxLength={500} placeholder="Licence or permission, e.g. CC BY 4.0" aria-label="Licence" className={inputClass} />
              <button type="submit" disabled={busy} className="px-6 py-3 bg-[#0096FF] text-white rounded-xl font-semibold hover:bg-[#0077CC] disabled:opacity-50 cursor-pointer">
                {busy ? 'Working…' : 'Add file'}
              </button>
            </form>

            <form onSubmit={addEbook} className="bg-white rounded-3xl shadow-lg p-6 space-y-3">
              <h2 className="text-xl font-bold text-[#2A2A2A]">Add a library ebook</h2>
              {ebooks.length === 0 ? (
                <p className="text-[#6B6B6B]">No ebooks with files yet.</p>
              ) : (
                <>
                  <select name="productId" required aria-label="Ebook" className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Choose an ebook
                    </option>
                    {ebooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                  <input name="licence" required maxLength={500} defaultValue="Open Ear's own publication" aria-label="Licence" className={inputClass} />
                  <button type="submit" disabled={busy} className="px-6 py-3 bg-[#0096FF] text-white rounded-xl font-semibold hover:bg-[#0077CC] disabled:opacity-50 cursor-pointer">
                    {busy ? 'Working…' : 'Add ebook'}
                  </button>
                </>
              )}
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6 overflow-x-auto">
            <h2 className="text-xl font-bold text-[#2A2A2A] mb-4">Sources</h2>
            {sources.length === 0 ? (
              <p className="text-[#6B6B6B]">No sources yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[#6B6B6B]">
                    <th className="py-2 pr-4 font-medium">Source</th>
                    <th className="py-2 pr-4 font-medium">Licence</th>
                    <th className="py-2 pr-4 font-medium">Approved by</th>
                    <th className="py-2 pr-4 font-medium">Used (30 days)</th>
                    <th className="py-2 font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 align-top">
                      <td className="py-3 pr-4">
                        <span className="block font-medium text-[#2A2A2A]">{s.title}</span>
                        <span className="text-[#6B6B6B]">
                          {[s.author, `${s.passageCount} passages`, s.enabled ? 'On' : 'Off'].filter(Boolean).join(' · ')}
                        </span>
                        {s.needsReindex && (
                          <span className="block text-[#C62828]">Not searched: indexed with an older model. Remove it and add it again.</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">{s.licence}</td>
                      <td className="py-3 pr-4">{s.approvedBy ?? <span className="text-[#C62828]">Not yet</span>}</td>
                      <td className="py-3 pr-4">{s.usesLast30Days}</td>
                      <td className="py-3 text-right whitespace-nowrap space-x-2">
                        {!s.approvedBy && approving === s.id && (
                          <form onSubmit={(e) => void approve(e, s)} className="inline-flex gap-2 mb-2">
                            <input
                              autoFocus
                              required
                              maxLength={200}
                              value={approver}
                              onChange={(e) => setApprover(e.target.value)}
                              placeholder="Name and qualification"
                              aria-label={`Professional approving ${s.title}`}
                              className="px-3 py-2 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none"
                            />
                            <button type="submit" disabled={busy} className="px-3 py-2 rounded-xl bg-[#0096FF] text-white font-medium hover:bg-[#0077CC] cursor-pointer">
                              Confirm
                            </button>
                          </form>
                        )}
                        {!s.approvedBy && approving !== s.id && (
                          <button onClick={() => setApproving(s.id)} disabled={busy} className="px-3 py-2 rounded-xl border-2 border-[#0096FF] text-[#0096FF] font-medium hover:bg-[#E6F5FF] cursor-pointer">
                            Approve
                          </button>
                        )}
                        {s.approvedBy && (
                          <button onClick={() => setEnabled(s, !s.enabled)} disabled={busy} className="px-3 py-2 rounded-xl border-2 border-[#0096FF] text-[#0096FF] font-medium hover:bg-[#E6F5FF] cursor-pointer">
                            {s.enabled ? 'Switch off' : 'Switch on'}
                          </button>
                        )}
                        {removing === s.id ? (
                          <button onClick={() => remove(s)} disabled={busy} className="px-3 py-2 rounded-xl bg-[#C62828] text-white font-medium hover:bg-[#A51F1F] cursor-pointer">
                            Confirm remove
                          </button>
                        ) : (
                          <button onClick={() => setRemoving(s.id)} disabled={busy} className="px-3 py-2 rounded-xl border-2 border-[#C62828] text-[#C62828] font-medium hover:bg-[#FFE6E6] cursor-pointer">
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
