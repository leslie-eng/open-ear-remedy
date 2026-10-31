import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../../components/feature/Navbar';
import { apiFetch } from '../../../lib/api';

interface ListenerRow {
  userId: string;
  email: string;
  name: string | null;
  active: boolean;
  calls: number;
  minutes: number;
}

interface Report {
  callId: string;
  listenerId: string;
  callerId: string;
  callerEmail: string;
  reason: string;
  at: string;
}

/** Admin: add and (de)activate listeners, see minutes per listener this month, review reports. */
export default function ListenersAdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [listeners, setListeners] = useState<ListenerRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const [l, r] = await Promise.all([
      apiFetch<{ listeners: ListenerRow[] }>('/api/admin/listeners'),
      apiFetch<{ reports: Report[] }>('/api/admin/call-reports'),
    ]);
    setListeners(l.listeners);
    setReports(r.reports);
  }, []);

  // Admin guard: verify with the server before showing anything.
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

  const addListener = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await apiFetch('/api/admin/listeners', { method: 'POST', body: JSON.stringify({ email }) });
      setMessage({ type: 'success', text: `${email} can now take calls at /listener.` });
      setEmail('');
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not add listener.' });
    }
  };

  const setActive = async (row: ListenerRow, active: boolean) => {
    setMessage(null);
    try {
      await apiFetch(`/api/admin/listeners/${row.userId}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not update listener.' });
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      <main className="pt-24 md:pt-28 px-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-[#2A2A2A]">Listeners</h1>
            <Link to="/admin-dashboard" className="text-[#0096FF] font-medium hover:underline">
              Back to dashboard
            </Link>
          </div>

          <form onSubmit={addListener} className="bg-white rounded-3xl shadow-lg p-6">
            <label htmlFor="listener-email" className="block text-sm font-medium text-[#2A2A2A] mb-2">
              Add a listener by the email of their Open Ear account
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="listener-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="listener@example.com"
                className="flex-1 px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none"
              />
              <button type="submit" className="px-6 py-3 bg-[#0096FF] text-white rounded-xl font-semibold hover:bg-[#0077CC] cursor-pointer">
                Add listener
              </button>
            </div>
            {message && (
              <p role="status" className={`mt-3 text-sm ${message.type === 'error' ? 'text-[#C62828]' : 'text-green-700'}`}>
                {message.text}
              </p>
            )}
          </form>

          <div className="bg-white rounded-3xl shadow-lg p-6 overflow-x-auto">
            <h2 className="text-xl font-bold text-[#2A2A2A] mb-4">This month</h2>
            {listeners.length === 0 ? (
              <p className="text-[#6B6B6B]">No listeners yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[#6B6B6B]">
                    <th className="py-2 pr-4 font-medium">Listener</th>
                    <th className="py-2 pr-4 font-medium">Calls</th>
                    <th className="py-2 pr-4 font-medium">Minutes</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {listeners.map((row) => (
                    <tr key={row.userId} className="border-b border-gray-50">
                      <td className="py-3 pr-4">
                        <span className="block font-medium text-[#2A2A2A]">{row.name || row.email}</span>
                        {row.name && <span className="text-[#6B6B6B]">{row.email}</span>}
                      </td>
                      <td className="py-3 pr-4">{row.calls}</td>
                      <td className="py-3 pr-4">{row.minutes}</td>
                      <td className="py-3 pr-4">{row.active ? 'Active' : 'Deactivated'}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => void setActive(row, !row.active)}
                          className="px-4 py-2 rounded-xl border-2 border-[#0096FF] text-[#0096FF] font-medium hover:bg-[#E6F5FF] cursor-pointer"
                        >
                          {row.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-[#2A2A2A] mb-4">Reports from listeners</h2>
            {reports.length === 0 ? (
              <p className="text-[#6B6B6B]">No reports.</p>
            ) : (
              <ul className="space-y-3">
                {reports.map((r) => (
                  <li key={`${r.callId}-${r.at}`} className="p-4 bg-[#FAFAFA] rounded-2xl">
                    <p className="text-sm text-[#6B6B6B]">
                      {new Date(r.at).toLocaleString()} · caller {r.callerEmail}
                    </p>
                    <p className="text-[#2A2A2A] mt-1">{r.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
