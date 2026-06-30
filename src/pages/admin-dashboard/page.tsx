import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY
);

interface MetricData {
  activeClients: number;
  paidSessions: number;
  freeSessions: number;
  totalRevenue: number;
  trend: number;
}

interface SessionData {
  id: string;
  time: string;
  clientId: string;
  type: 'Call' | 'Chat';
  duration: string;
  status: 'Completed' | 'Active' | 'Scheduled';
}

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalRevenue: number;
  avgSessionDuration: string;
  conversionRate: number;
  userGrowth: number;
  revenueGrowth: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  credits: number;
  totalSessions: number;
  totalSpent: number;
  joinDate: string;
  lastActive: string;
}

interface AppointmentData {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
  status: string;
  created_at: string;
}

interface CallHistoryData {
  id: string;
  user_id: string;
  call_sid: string;
  duration_seconds: number;
  credits_used: number;
  status: string;
  started_at: string;
  ended_at: string;
  created_at: string;
  user_email?: string;
}

interface TransactionData {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  credits: number;
  description: string;
  status: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'sessions' | 'clients' | 'revenue' | 'appointments' | 'transactions'>('overview');
  const [metrics, setMetrics] = useState<MetricData>({
    activeClients: 247,
    paidSessions: 189,
    freeSessions: 58,
    totalRevenue: 18750,
    trend: 12.5
  });

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 1247,
    activeUsers: 892,
    totalSessions: 5634,
    totalRevenue: 87450,
    avgSessionDuration: '42 min',
    conversionRate: 68.5,
    userGrowth: 23.4,
    revenueGrowth: 31.2,
  });

  const [sessions, setSessions] = useState<SessionData[]>([
    { id: 'S-1001', userId: 'U-4521', userName: 'Sarah Johnson', type: 'Call', duration: '45 min', credits: 45, timestamp: '2 mins ago', status: 'Active' },
    { id: 'S-1002', userId: 'U-3892', userName: 'Michael Chen', type: 'Chat', duration: '32 min', credits: 32, timestamp: '15 mins ago', status: 'Completed' },
    { id: 'S-1003', userId: 'U-5673', userName: 'Emma Davis', type: 'Call', duration: '28 min', credits: 28, timestamp: '28 mins ago', status: 'Completed' },
    { id: 'S-1004', userId: 'U-2341', userName: 'James Wilson', type: 'Chat', duration: '51 min', credits: 51, timestamp: '1 hour ago', status: 'Completed' },
    { id: 'S-1005', userId: 'U-7823', userName: 'Olivia Brown', type: 'Call', duration: '38 min', credits: 38, timestamp: '2 hours ago', status: 'Completed' },
    { id: 'S-1006', userId: 'U-4512', userName: 'David Martinez', type: 'Chat', duration: '42 min', credits: 42, timestamp: '3 hours ago', status: 'Cancelled' },
  ]);

  const [users, setUsers] = useState<UserData[]>([
    { id: 'U-4521', name: 'Sarah Johnson', email: 'sarah.j@email.com', credits: 150, totalSessions: 24, totalSpent: 289, joinDate: '2024-01-15', lastActive: '2 mins ago' },
    { id: 'U-3892', name: 'Michael Chen', email: 'michael.c@email.com', credits: 85, totalSessions: 18, totalSpent: 245, joinDate: '2024-01-20', lastActive: '15 mins ago' },
    { id: 'U-5673', name: 'Emma Davis', email: 'emma.d@email.com', credits: 220, totalSessions: 31, totalSpent: 412, joinDate: '2024-01-08', lastActive: '28 mins ago' },
    { id: 'U-2341', name: 'James Wilson', email: 'james.w@email.com', credits: 45, totalSessions: 12, totalSpent: 178, joinDate: '2024-02-01', lastActive: '1 hour ago' },
    { id: 'U-7823', name: 'Olivia Brown', email: 'olivia.b@email.com', credits: 180, totalSessions: 27, totalSpent: 356, joinDate: '2024-01-12', lastActive: '2 hours ago' },
  ]);

  const [revenueTimeframe, setRevenueTimeframe] = useState<'day' | 'month' | 'year'>('month');

  const [revenueData] = useState([
    { date: 'Jan 1', amount: 2450, sessions: 45 },
    { date: 'Jan 5', amount: 3680, sessions: 62 },
    { date: 'Jan 10', amount: 3120, sessions: 58 },
    { date: 'Jan 15', amount: 4890, sessions: 78 },
    { date: 'Jan 20', amount: 4250, sessions: 71 },
    { date: 'Jan 25', amount: 5920, sessions: 89 },
    { date: 'Jan 30', amount: 6100, sessions: 95 },
  ]);

  const [revenueByDay] = useState([
    { label: 'Mon', amount: 2450, sessions: 45 },
    { label: 'Tue', amount: 2680, sessions: 52 },
    { label: 'Wed', amount: 3120, sessions: 58 },
    { label: 'Thu', amount: 2890, sessions: 54 },
    { label: 'Fri', amount: 3250, sessions: 61 },
    { label: 'Sat', amount: 2920, sessions: 55 },
    { label: 'Sun', amount: 2100, sessions: 39 },
  ]);

  const [revenueByMonth] = useState([
    { label: 'Jan', amount: 15450, sessions: 289 },
    { label: 'Feb', amount: 18680, sessions: 342 },
    { label: 'Mar', amount: 21120, sessions: 398 },
    { label: 'Apr', amount: 19890, sessions: 365 },
    { label: 'May', amount: 23250, sessions: 421 },
    { label: 'Jun', amount: 25920, sessions: 478 },
    { label: 'Jul', amount: 28100, sessions: 512 },
    { label: 'Aug', amount: 26450, sessions: 489 },
    { label: 'Sep', amount: 24680, sessions: 456 },
    { label: 'Oct', amount: 27120, sessions: 501 },
    { label: 'Nov', amount: 29890, sessions: 548 },
    { label: 'Dec', amount: 32250, sessions: 592 },
  ]);

  const [revenueByYear] = useState([
    { label: '2020', amount: 145000, sessions: 2689 },
    { label: '2021', amount: 198000, sessions: 3642 },
    { label: '2022', amount: 256000, sessions: 4721 },
    { label: '2023', amount: 298000, sessions: 5489 },
    { label: '2024', amount: 342000, sessions: 6298 },
  ]);

  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const [callHistory, setCallHistory] = useState<CallHistoryData[]>([]);
  const [callHistoryLoading, setCallHistoryLoading] = useState(false);

  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'purchase' | 'usage' | 'refund'>('all');

  const [recentSessions] = useState<SessionData[]>([
    { id: 'S-1001', time: '2 mins ago', clientId: 'C-4521', type: 'Call', duration: '45 min', status: 'Active' },
    { id: 'S-1002', time: '15 mins ago', clientId: 'C-3892', type: 'Chat', duration: '32 min', status: 'Completed' },
    { id: 'S-1003', time: '28 mins ago', clientId: 'C-5673', type: 'Call', duration: '28 min', status: 'Completed' },
    { id: 'S-1004', time: '1 hour ago', clientId: 'C-2341', type: 'Chat', duration: '51 min', status: 'Completed' },
    { id: 'S-1005', time: '2 hours ago', clientId: 'C-7823', type: 'Call', duration: '38 min', status: 'Completed' },
    { id: 'S-1006', time: '3 hours ago', clientId: 'C-4512', type: 'Chat', duration: '42 min', status: 'Completed' },
  ]);

  const [geoData] = useState([
    { country: 'United States', clients: 142, percentage: 57.5 },
    { country: 'United Kingdom', clients: 38, percentage: 15.4 },
    { country: 'Canada', clients: 29, percentage: 11.7 },
    { country: 'Australia', clients: 22, percentage: 8.9 },
    { country: 'Others', clients: 16, percentage: 6.5 },
  ]);

  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (activeView === 'appointments') {
      fetchAppointments();
    }
    if (activeView === 'sessions') {
      fetchCallHistory();
    }
    if (activeView === 'transactions') {
      fetchTransactions();
    }
  }, [activeView]);

  const checkAdminAuth = async () => {
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin-login');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      localStorage.removeItem('admin_session');
      navigate('/admin-login');
      return;
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      localStorage.removeItem('admin_session');
      navigate('/admin-login');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('admin_session');
    navigate('/admin-login');
  };

  const fetchAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/get-appointments`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/update-appointment-status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId,
            status: newStatus,
          }),
        }
      );

      if (response.ok) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Completed':
        return 'bg-blue-100 text-blue-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCurrentRevenueData = () => {
    switch (revenueTimeframe) {
      case 'day':
        return revenueByDay;
      case 'month':
        return revenueByMonth;
      case 'year':
        return revenueByYear;
      default:
        return revenueByMonth;
    }
  };

  const getMaxAmount = () => {
    const data = getCurrentRevenueData();
    return Math.max(...data.map(item => item.amount));
  };

  const fetchCallHistory = async () => {
    setCallHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCallHistory(data || []);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setCallHistoryLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} sec`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} sec`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCallStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'active':
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'purchase':
        return 'bg-green-100 text-green-700';
      case 'usage':
      case 'deduction':
        return 'bg-orange-100 text-orange-700';
      case 'refund':
        return 'bg-blue-100 text-blue-700';
      case 'bonus':
      case 'reward':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTransactionStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getFilteredTransactions = () => {
    if (transactionFilter === 'all') return transactions;
    return transactions.filter(t => t.type?.toLowerCase() === transactionFilter);
  };

  const getTransactionStats = () => {
    const totalPurchases = transactions.filter(t => t.type?.toLowerCase() === 'purchase').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalCredits = transactions.filter(t => t.type?.toLowerCase() === 'purchase').reduce((sum, t) => sum + (t.credits || 0), 0);
    const totalUsage = transactions.filter(t => t.type?.toLowerCase() === 'usage' || t.type?.toLowerCase() === 'deduction').reduce((sum, t) => sum + Math.abs(t.credits || 0), 0);
    const totalRefunds = transactions.filter(t => t.type?.toLowerCase() === 'refund').reduce((sum, t) => sum + (t.amount || 0), 0);
    return { totalPurchases, totalCredits, totalUsage, totalRefunds };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      {/* Admin Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-2xl md:text-3xl font-bold text-[#0096FF] hover:opacity-80 transition-opacity"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Open Ear
            </Link>

            <div className="flex items-center gap-6">
              <span className="text-sm md:text-base font-medium text-[#2A2A2A]">
                Admin Dashboard
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-full text-sm md:text-base font-semibold hover:bg-red-600 transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-logout-box-line"></i>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-8 md:py-12 pt-32">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2A2A2A] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Admin Dashboard
          </h1>
          <p className="text-base md:text-lg text-[#6B6B6B]">
            Monitor platform performance and manage operations
          </p>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex flex-wrap gap-3 md:gap-4 mb-8 md:mb-12">
          <button 
            onClick={() => setActiveView('overview')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeView === 'overview' 
                ? 'bg-[#0096FF] text-white' 
                : 'bg-white text-[#2A2A2A] hover:bg-[#E6F5FF]'
            }`}
          >
            <i className="ri-dashboard-line text-lg"></i>
            Overview
          </button>
          <button 
            onClick={() => setActiveView('appointments')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeView === 'appointments' 
                ? 'bg-[#0096FF] text-white' 
                : 'bg-white text-[#2A2A2A] hover:bg-[#E6F5FF]'
            }`}
          >
            <i className="ri-calendar-check-line text-lg"></i>
            Appointments
          </button>
          <button 
            onClick={() => setActiveView('sessions')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeView === 'sessions' 
                ? 'bg-[#0096FF] text-white' 
                : 'bg-white text-[#2A2A2A] hover:bg-[#E6F5FF]'
            }`}
          >
            <i className="ri-time-line text-lg"></i>
            Sessions
          </button>
          <button 
            onClick={() => setActiveView('transactions')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeView === 'transactions' 
                ? 'bg-[#0096FF] text-white' 
                : 'bg-white text-[#2A2A2A] hover:bg-[#E6F5FF]'
            }`}
          >
            <i className="ri-exchange-dollar-line text-lg"></i>
            Transactions
          </button>
          <button 
            onClick={() => setActiveView('clients')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeView === 'clients' 
                ? 'bg-[#0096FF] text-white' 
                : 'bg-white text-[#2A2A2A] hover:bg-[#E6F5FF]'
            }`}
          >
            <i className="ri-user-line text-lg"></i>
            Clients
          </button>
          <button 
            onClick={() => setActiveView('revenue')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeView === 'revenue' 
                ? 'bg-[#0096FF] text-white' 
                : 'bg-white text-[#2A2A2A] hover:bg-[#E6F5FF]'
            }`}
          >
            <i className="ri-line-chart-line text-lg"></i>
            Revenue
          </button>
          <Link 
            to="/admin/ebook-management"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer bg-white text-[#2A2A2A] hover:bg-[#E6F5FF]"
          >
            <i className="ri-book-line text-lg"></i>
            Ebook Store
          </Link>
        </div>

        {/* Overview View */}
        {activeView === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-12">
              {/* ... existing stats cards ... */}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
              {/* ... existing charts ... */}
            </div>

            {/* Recent Sessions */}
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
              {/* ... existing recent sessions ... */}
            </div>
          </>
        )}

        {/* Revenue View */}
        {activeView === 'revenue' && (
          <>
            {/* Revenue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center">
                    <i className="ri-money-dollar-circle-fill text-2xl md:text-3xl text-[#0096FF]"></i>
                  </div>
                  <span className="text-xs md:text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                    +{metrics.trend}%
                  </span>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                  ${metrics.totalRevenue.toLocaleString()}
                </p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Total Revenue</p>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center">
                    <i className="ri-calendar-check-fill text-2xl md:text-3xl text-[#0096FF]"></i>
                  </div>
                  <span className="text-xs md:text-sm font-medium text-[#0096FF] bg-[#0096FF]/10 px-3 py-1 rounded-full">
                    This Month
                  </span>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">$5,240</p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Monthly Revenue</p>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center">
                    <i className="ri-bar-chart-box-fill text-2xl md:text-3xl text-[#0096FF]"></i>
                  </div>
                  <span className="text-xs md:text-sm font-medium text-[#0096FF] bg-[#0096FF]/10 px-3 py-1 rounded-full">
                    Average
                  </span>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">$99</p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Per Session</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg mb-8 md:mb-12">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A]">Revenue Trend</h2>
                
                {/* Timeframe Toggle */}
                <div className="flex items-center gap-2 bg-[#F5F5F5] p-1.5 rounded-xl">
                  <button
                    onClick={() => setRevenueTimeframe('day')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      revenueTimeframe === 'day'
                        ? 'bg-[#0096FF] text-white'
                        : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setRevenueTimeframe('month')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      revenueTimeframe === 'month'
                        ? 'bg-[#0096FF] text-white'
                        : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setRevenueTimeframe('year')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      revenueTimeframe === 'year'
                        ? 'bg-[#0096FF] text-white'
                        : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="space-y-4">
                {getCurrentRevenueData().map((item, index) => {
                  const maxAmount = getMaxAmount();
                  const percentage = (item.amount / maxAmount) * 100;
                  
                  return (
                    <div key={index} className="group">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-sm font-semibold text-[#2A2A2A] w-16">{item.label}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[#6B6B6B]">{item.sessions} sessions</span>
                            <span className="text-sm font-bold text-[#0096FF]">
                              ${item.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="relative bg-[#F5F5F5] rounded-full h-10 overflow-hidden">
                            <div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0096FF] to-[#0077CC] rounded-full transition-all duration-700 ease-out group-hover:opacity-90"
                              style={{ width: `${percentage}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t-2 border-[#F5F5F5]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0096FF]">
                    ${getCurrentRevenueData().reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Total Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0096FF]">
                    {getCurrentRevenueData().reduce((sum, item) => sum + item.sessions, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Total Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0096FF]">
                    ${Math.round(getCurrentRevenueData().reduce((sum, item) => sum + item.amount, 0) / getCurrentRevenueData().length).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Average</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0096FF]">
                    ${Math.max(...getCurrentRevenueData().map(item => item.amount)).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Peak</p>
                </div>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-6 md:mb-8">Revenue by Type</h2>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#0096FF]/10 rounded-xl flex items-center justify-center">
                          <i className="ri-phone-fill text-lg text-[#0096FF]"></i>
                        </div>
                        <span className="font-semibold text-[#2A2A2A]">Voice Calls</span>
                      </div>
                      <span className="font-bold text-[#0096FF]">$11,250</span>
                    </div>
                    <div className="w-full bg-[#F5F5F5] rounded-full h-3">
                      <div className="bg-[#0096FF] h-3 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#0096FF]/10 rounded-xl flex items-center justify-center">
                          <i className="ri-message-3-fill text-lg text-[#0096FF]"></i>
                        </div>
                        <span className="font-semibold text-[#2A2A2A]">Chat Sessions</span>
                      </div>
                      <span className="font-bold text-[#0096FF]">$7,500</span>
                    </div>
                    <div className="w-full bg-[#F5F5F5] rounded-full h-3">
                      <div className="bg-[#0096FF] h-3 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-6 md:mb-8">Top Earning Days</h2>
                <div className="space-y-4">
                  {[
                    { day: 'Monday', amount: 2840, percentage: 95 },
                    { day: 'Wednesday', amount: 2650, percentage: 88 },
                    { day: 'Friday', amount: 2420, percentage: 81 },
                    { day: 'Thursday', amount: 2180, percentage: 73 },
                    { day: 'Tuesday', amount: 1950, percentage: 65 },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#FAFAFA] rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-[#0096FF] text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-[#2A2A2A]">{item.day}</span>
                      </div>
                      <span className="font-bold text-[#0096FF]">${item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sessions View */}
        {activeView === 'sessions' && (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A]">Call History</h2>
              <button
                onClick={fetchCallHistory}
                disabled={callHistoryLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#0096FF] text-white rounded-xl font-medium hover:bg-[#0077CC] transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <i className={`ri-refresh-line ${callHistoryLoading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>

            {callHistoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <i className="ri-loader-4-line animate-spin text-4xl text-[#0096FF]"></i>
              </div>
            ) : callHistory.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-phone-line text-6xl text-[#E5E5E5] mb-4 block"></i>
                <p className="text-lg text-[#6B6B6B]">No call history yet</p>
                <p className="text-sm text-[#9B9B9B] mt-2">Calls will appear here once users start making calls</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#E5E5E5]">
                      <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Call ID</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">User ID</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Time</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Duration</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Credits Used</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callHistory.map((call) => (
                      <tr key={call.id} className="border-b border-[#E5E5E5] hover:border-[#0096FF] transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                              <i className="ri-phone-fill text-[#0096FF]"></i>
                            </div>
                            <span className="text-sm font-medium text-[#2A2A2A] font-mono">
                              {call.call_sid ? call.call_sid.slice(-8) : call.id.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-[#6B6B6B] font-mono">
                          {call.user_id.slice(0, 8)}...
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-sm text-[#2A2A2A]">{formatTimeAgo(call.started_at || call.created_at)}</p>
                            <p className="text-xs text-[#9B9B9B]">
                              {new Date(call.started_at || call.created_at).toLocaleString()}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-semibold text-[#2A2A2A]">
                            {formatDuration(call.duration_seconds)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 bg-[#0096FF]/10 text-[#0096FF] rounded-full text-sm font-medium ${
                            call.credits_used > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            <i className="ri-coin-fill text-xs"></i>
                            {call.credits_used > 0 ? '+' : ''}{call.credits_used}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getCallStatusColor(call.status)}`}>
                            {call.status || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Call Stats Summary */}
            {callHistory.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t-2 border-[#F5F5F5]">
                <div className="text-center p-4 bg-[#FAFAFA] rounded-2xl">
                  <p className="text-2xl font-bold text-[#0096FF]">{callHistory.length}</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Total Calls</p>
                </div>
                <div className="text-center p-4 bg-[#FAFAFA] rounded-2xl">
                  <p className="text-2xl font-bold text-[#0096FF]">
                    {formatDuration(callHistory.reduce((sum, call) => sum + (call.duration_seconds || 0), 0))}
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Total Duration</p>
                </div>
                <div className="text-center p-4 bg-[#FAFAFA] rounded-2xl">
                  <p className="text-2xl font-bold text-[#0096FF]">
                    {callHistory.reduce((sum, call) => sum + (call.credits_used || 0), 0)}
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Credits Used</p>
                </div>
                <div className="text-center p-4 bg-[#FAFAFA] rounded-2xl">
                  <p className="text-2xl font-bold text-[#0096FF]">
                    {callHistory.filter(c => c.status?.toLowerCase() === 'completed').length}
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Completed</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Appointments View */}
        {activeView === 'appointments' && (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A]">Appointment Requests</h2>
              <button
                onClick={fetchAppointments}
                disabled={appointmentsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#0096FF] text-white rounded-xl font-medium hover:bg-[#0077CC] transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <i className={`ri-refresh-line ${appointmentsLoading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>

            {appointmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <i className="ri-loader-4-line animate-spin text-4xl text-[#0096FF]"></i>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-calendar-line text-6xl text-[#E5E5E5] mb-4 block"></i>
                <p className="text-lg text-[#6B6B6B]">No appointment requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="border-2 border-[#E5E5E5] rounded-2xl p-6 hover:border-[#0096FF] transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#0096FF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="ri-user-fill text-xl text-[#0096FF]"></i>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-[#2A2A2A] mb-1">{appointment.user_name}</h3>
                            <div className="space-y-1">
                              <p className="text-sm text-[#6B6B6B] flex items-center gap-2">
                                <i className="ri-mail-line"></i>
                                {appointment.user_email}
                              </p>
                              {appointment.user_phone && (
                                <p className="text-sm text-[#6B6B6B] flex items-center gap-2">
                                  <i className="ri-phone-line"></i>
                                  {appointment.user_phone}
                                </p>
                              )}
                              <p className="text-sm text-[#6B6B6B] flex items-center gap-2">
                                <i className="ri-calendar-line"></i>
                                {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                              </p>
                              {appointment.notes && (
                                <p className="text-sm text-[#6B6B6B] mt-2">
                                  <span className="font-medium">Notes:</span> {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                        
                        {appointment.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                              className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-all cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-check-line mr-1"></i>
                              Confirm
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                              className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-close-line mr-1"></i>
                              Cancel
                            </button>
                          </div>
                        )}

                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-check-double-line mr-1"></i>
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clients View */}
        {activeView === 'clients' && (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
            <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-6 md:mb-8">Client Distribution</h2>
            <div className="space-y-6">
              {geoData.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0096FF]/10 rounded-xl flex items-center justify-center">
                        <i className="ri-map-pin-fill text-lg text-[#0096FF]"></i>
                      </div>
                      <span className="font-semibold text-[#2A2A2A]">{item.country}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#0096FF] block">{item.clients}</span>
                      <span className="text-xs text-[#6B6B6B]">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#F5F5F5] rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-[#0096FF] to-[#0077CC] h-3 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions View */}
        {activeView === 'transactions' && (
          <>
            {/* Transaction Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-12">
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                    <i className="ri-add-circle-fill text-2xl md:text-3xl text-green-600"></i>
                  </div>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                  ${getTransactionStats().totalPurchases.toLocaleString()}
                </p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Total Purchases</p>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center">
                    <i className="ri-coin-fill text-2xl md:text-3xl text-[#0096FF]"></i>
                  </div>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                  {getTransactionStats().totalCredits.toLocaleString()}
                </p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Credits Purchased</p>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <i className="ri-subtract-fill text-2xl md:text-3xl text-orange-600"></i>
                  </div>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                  {getTransactionStats().totalUsage.toLocaleString()}
                </p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Credits Used</p>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                    <i className="ri-file-list-3-fill text-2xl md:text-3xl text-purple-600"></i>
                  </div>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                  {transactions.length}
                </p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Total Transactions</p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A]">Credit Transactions</h2>
                
                <div className="flex items-center gap-3">
                  {/* Filter Toggle */}
                  <div className="flex items-center gap-2 bg-[#F5F5F5] p-1.5 rounded-xl">
                    <button
                      onClick={() => setTransactionFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        transactionFilter === 'all'
                          ? 'bg-[#0096FF] text-white'
                          : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTransactionFilter('purchase')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        transactionFilter === 'purchase'
                          ? 'bg-[#0096FF] text-white'
                          : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                      }`}
                    >
                      Purchases
                    </button>
                    <button
                      onClick={() => setTransactionFilter('usage')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        transactionFilter === 'usage'
                          ? 'bg-[#0096FF] text-white'
                          : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                      }`}
                    >
                      Usage
                    </button>
                    <button
                      onClick={() => setTransactionFilter('refund')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        transactionFilter === 'refund'
                          ? 'bg-[#0096FF] text-white'
                          : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                      }`}
                    >
                      Refunds
                    </button>
                  </div>

                  <button
                    onClick={fetchTransactions}
                    disabled={transactionsLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0096FF] text-white rounded-xl font-medium hover:bg-[#0077CC] transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <i className={`ri-refresh-line ${transactionsLoading ? 'animate-spin' : ''}`}></i>
                    Refresh
                  </button>
                </div>
              </div>

              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <i className="ri-loader-4-line animate-spin text-4xl text-[#0096FF]"></i>
                </div>
              ) : getFilteredTransactions().length === 0 ? (
                <div className="text-center py-12">
                  <i className="ri-exchange-dollar-line text-6xl text-[#E5E5E5] mb-4 block"></i>
                  <p className="text-lg text-[#6B6B6B]">No transactions found</p>
                  <p className="text-sm text-[#9B9B9B] mt-2">
                    {transactionFilter !== 'all' 
                      ? `No ${transactionFilter} transactions yet` 
                      : 'Transactions will appear here once users make purchases'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[#E5E5E5]">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Transaction ID</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">User ID</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Type</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Amount</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Credits</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Description</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Status</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-[#6B6B6B]">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredTransactions().map((transaction) => (
                        <tr key={transaction.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                                <i className={`${
                                  transaction.type?.toLowerCase() === 'purchase' 
                                    ? 'ri-add-circle-fill text-green-600' 
                                    : transaction.type?.toLowerCase() === 'refund'
                                    ? 'ri-refund-2-fill text-blue-600'
                                    : 'ri-subtract-fill text-orange-600'
                                }`}></i>
                              </div>
                              <span className="text-sm font-medium text-[#2A2A2A] font-mono">
                                {transaction.id.slice(0, 8)}...
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-[#6B6B6B] font-mono">
                            {transaction.user_id.slice(0, 8)}...
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getTransactionTypeColor(transaction.type)}`}>
                              {transaction.type || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-sm font-bold ${
                              transaction.type?.toLowerCase() === 'purchase' 
                                ? 'text-green-600' 
                                : transaction.type?.toLowerCase() === 'refund'
                                ? 'text-blue-600'
                                : 'text-[#2A2A2A]'
                            }`}>
                              {transaction.amount ? `$${transaction.amount.toFixed(2)}` : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                              transaction.credits > 0 
                                ? 'bg-green-100 text-green-700' 
                                : transaction.credits < 0
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              <i className="ri-coin-fill text-xs"></i>
                              {transaction.credits > 0 ? '+' : ''}{transaction.credits}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-[#6B6B6B] max-w-[200px] truncate block">
                              {transaction.description || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getTransactionStatusColor(transaction.status)}`}>
                              {transaction.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="text-sm text-[#2A2A2A]">{formatTimeAgo(transaction.created_at)}</p>
                              <p className="text-xs text-[#9B9B9B]">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Transaction Summary */}
              {getFilteredTransactions().length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-[#F5F5F5]">
                  <p className="text-sm text-[#6B6B6B]">
                    Showing {getFilteredTransactions().length} of {transactions.length} transactions
                    {transactionFilter !== 'all' && ` (filtered by ${transactionFilter})`}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
