import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminLoginPage() {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || !profile || profile.role !== 'admin') {
          await supabase.auth.signOut();
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }

        // Store admin session
        localStorage.setItem('admin_session', 'true');
        navigate('/admin-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold text-[#0096FF]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Open Ear
            </h1>
          </Link>
          <p className="text-lg text-[#6B6B6B] mt-2">Admin Portal</p>
        </div>

        {/* Login Card */}
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
              <label className="block text-sm font-semibold text-[#2A2A2A] mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                  <i className="ri-mail-fill text-[#6B6B6B]"></i>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F5F5F5] border-2 border-transparent rounded-xl focus:border-[#0096FF] focus:bg-white transition-all outline-none text-sm"
                  placeholder="admin@openear.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2A2A2A] mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                  <i className="ri-lock-fill text-[#6B6B6B]"></i>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F5F5F5] border-2 border-transparent rounded-xl focus:border-[#0096FF] focus:bg-white transition-all outline-none text-sm"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#0096FF] text-white rounded-xl font-semibold hover:bg-[#0077CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E5E5E5]">
            <Link to="/" className="text-sm text-[#0096FF] hover:underline flex items-center justify-center gap-2 cursor-pointer">
              <i className="ri-arrow-left-line"></i>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#6B6B6B] flex items-center justify-center gap-2">
            <i className="ri-lock-fill"></i>
            Secure admin access with encrypted authentication
          </p>
        </div>
      </div>
    </div>
  );
}
