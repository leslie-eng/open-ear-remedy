import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

export default function AdminLoginPage() {
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email.trim().toLowerCase(), password);
      await apiFetch('/api/admin/check');
      navigate('/admin-dashboard');
    } catch (err: unknown) {
      signOut();
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(
        msg.includes('Admin') || msg.includes('403')
          ? 'Access denied. Admin privileges required.'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold text-[#0096FF]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Open Ear
            </h1>
          </Link>
          <p className="text-lg text-[#6B6B6B] mt-2">Admin Portal</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          <div className="mb-8">
            <div className="w-16 h-16 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-shield-user-fill text-3xl text-[#0096FF]"></i>
            </div>
            <h2 className="text-2xl font-bold text-[#2A2A2A] text-center">Admin Login</h2>
            <p className="text-[#6B6B6B] text-center mt-2">Enter your credentials to access the dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <i className="ri-error-warning-fill text-red-500 text-xl mt-0.5"></i>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#2A2A2A] mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#F5F5F5] border-2 border-transparent rounded-xl focus:border-[#0096FF] outline-none text-sm"
                placeholder="admin@openear.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2A2A2A] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#F5F5F5] border-2 border-transparent rounded-xl focus:border-[#0096FF] outline-none text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#0096FF] text-white rounded-xl font-semibold hover:bg-[#0077CC] disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E5E5E5] text-center">
            <Link to="/" className="text-sm text-[#0096FF] hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
