import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

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

interface RevenueSeriesPoint {
  label: string;
  amount: number;
  sessions: number;
}

interface UsageBreakdown {
  type: string;
  credits: number;
  percent: number;
}

/** Paystack amounts in DB are stored in minor units (cents). */
function toDollars(minor: number) {
  return (Number(minor) || 0) / 100;
}

function formatMoney(dollars: number) {
  return dollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function AdminDashboardPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'sessions' | 'clients' | 'revenue' | 'appointments' | 'transactions'>('overview');
  const [metrics, setMetrics] = useState<MetricData>({
    activeClients: 0,
    paidSessions: 0,
    freeSessions: 0,
    totalRevenue: 0,
    trend: 0
  });

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    totalRevenue: 0,
    avgSessionDuration: '0 min',
    conversionRate: 0,
    userGrowth: 0,
    revenueGrowth: 0,
  });

  const [sessions, setSessions] = useState<SessionData[]>([]);

  const [users, setUsers] = useState<UserData[]>([]);

  const [revenueTimeframe, setRevenueTimeframe] = useState<'day' | 'month' | 'year'>('month');
  const [revenueSeries, setRevenueSeries] = useState<RevenueSeriesPoint[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<{
    usageByType: UsageBreakdown[];
    topEarningDays: Array<{ day: string; amount: number }>;
  }>({ usageByType: [], topEarningDays: [] });
  const [revenueStats, setRevenueStats] = useState({
    periodRevenue: 0,
    avgPerSession: 0,
    revenueGrowth: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const [callHistory, setCallHistory] = useState<CallHistoryData[]>([]);
  const [callHistoryLoading, setCallHistoryLoading] = useState(false);

  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'purchase' | 'usage' | 'refund'>('all');

  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    checkAdminAuth();
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchOverviewAnalytics();
      void fetchCallHistory();
    }
  }, [user, timeRange]);

  useEffect(() => {
    if (activeView === 'appointments') fetchAppointments();
    if (activeView === 'sessions') fetchCallHistory();
    if (activeView === 'transactions') fetchTransactions();
    if (activeView === 'clients') fetchUsers();
    if (activeView === 'revenue') fetchRevenueAnalytics();
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'revenue') fetchRevenueAnalytics();
  }, [revenueTimeframe, timeRange]);

  useEffect(() => {
    const mappedSessions: SessionData[] = callHistory.slice(0, 20).map((c) => ({
      id: c.id,
      time: formatTimeAgo(c.started_at || c.created_at),
      clientId: (c as CallHistoryData).user_email || c.user_id?.slice(0, 8) || 'N/A',
      type: 'Call',
      duration: formatDuration(c.duration_seconds || 0),
      status:
        c.status?.toLowerCase() === 'completed'
          ? 'Completed'
          : c.status?.toLowerCase() === 'active' || c.status?.toLowerCase() === 'in-progress'
            ? 'Active'
            : 'Scheduled',
    }));
    setSessions(mappedSessions);
  }, [callHistory]);

  const fetchOverviewAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { overview } = await apiFetch<{
        overview: {
          totalUsers: number;
          newUsers: number;
          activeUsers: number;
          totalRevenue: number;
          revenueGrowth: number;
          totalSessions: number;
          paidSessions: number;
          freeSessions: number;
          avgSessionDurationSeconds: number;
        };
      }>(`/api/admin/analytics/overview?range=${timeRange}`);

      setMetrics({
        activeClients: overview.activeUsers,
        paidSessions: overview.paidSessions,
        freeSessions: overview.freeSessions,
        totalRevenue: overview.totalRevenue,
        trend: overview.revenueGrowth,
      });

      const avgMins = Math.floor(overview.avgSessionDurationSeconds / 60);
      setAnalytics({
        totalUsers: overview.totalUsers,
        activeUsers: overview.activeUsers,
        totalSessions: overview.totalSessions,
        totalRevenue: overview.totalRevenue,
        avgSessionDuration: avgMins > 0 ? `${avgMins} min` : '0 min',
        conversionRate: overview.totalUsers
          ? Math.round((overview.activeUsers / overview.totalUsers) * 100)
          : 0,
        userGrowth: overview.newUsers,
        revenueGrowth: overview.revenueGrowth,
      });
    } catch (error) {
      console.error('Error fetching overview analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchRevenueAnalytics = async () => {
    setRevenueLoading(true);
    try {
      const data = await apiFetch<{
        series: RevenueSeriesPoint[];
        breakdown: { usageByType: UsageBreakdown[]; topEarningDays: Array<{ day: string; amount: number }> };
        periodRevenue: number;
        totalRevenue: number;
        revenueGrowth: number;
        avgPerSession: number;
      }>(`/api/admin/analytics/revenue?groupBy=${revenueTimeframe}&range=${timeRange}`);

      setRevenueSeries(data.series || []);
      setRevenueBreakdown({
        usageByType: data.breakdown?.usageByType || [],
        topEarningDays: data.breakdown?.topEarningDays || [],
      });
      setRevenueStats({
        periodRevenue: data.periodRevenue ?? 0,
        avgPerSession: data.avgPerSession ?? 0,
        revenueGrowth: data.revenueGrowth ?? 0,
      });
      setMetrics((prev) => ({
        ...prev,
        totalRevenue: data.totalRevenue ?? prev.totalRevenue,
        trend: data.revenueGrowth ?? prev.trend,
      }));
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      setRevenueSeries([]);
    } finally {
      setRevenueLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { users: list } = await apiFetch<{ users: UserData[] }>('/api/admin/users?limit=200');
      setUsers(list);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const checkAdminAuth = async () => {
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin-login');
      return;
    }

    if (!user) {
      localStorage.removeItem('admin_session');
      navigate('/admin-login');
      return;
    }

    try {
      await apiFetch('/api/admin/check');
    } catch {
      localStorage.removeItem('admin_session');
      navigate('/admin-login');
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/admin-login');
  };

  const fetchAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const data = await apiFetch<{ appointments: AppointmentData[] }>('/api/admin/appointments');
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await apiFetch('/api/admin/appointments/status', {
        method: 'POST',
        body: JSON.stringify({ appointmentId, status: newStatus }),
      });
      fetchAppointments();
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

  const getCurrentRevenueData = () => revenueSeries;

  const getMaxAmount = () => {
    const data = getCurrentRevenueData();
    if (!data.length) return 1;
    return Math.max(...data.map((item) => item.amount), 1);
  };

  const fetchCallHistory = async () => {
    setCallHistoryLoading(true);
    try {
      const { data } = await apiFetch<{ data: CallHistoryData[] }>(
        '/api/admin/call-history?limit=100',
      );
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
      const { data } = await apiFetch<{ data: TransactionData[] }>(
        '/api/admin/transactions?limit=200',
      );
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
    const purchases = transactions.filter((t) => t.type?.toLowerCase() === 'purchase');
    const totalPurchases = purchases.reduce((sum, t) => sum + toDollars(t.amount), 0);
    const totalCredits = purchases.reduce((sum, t) => sum + (t.credits || 0), 0);
    const totalUsage = transactions
      .filter((t) => t.type?.toLowerCase() === 'usage' || t.type?.toLowerCase() === 'deduction')
      .reduce((sum, t) => sum + Math.abs(t.credits || 0), 0);
    const totalRefunds = transactions
      .filter((t) => t.type?.toLowerCase() === 'refund')
      .reduce((sum, t) => sum + toDollars(t.amount), 0);
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
          <div className="flex flex-wrap gap-2 mt-4">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${
                  timeRange === range ? 'bg-[#0096FF] text-white' : 'bg-white text-[#6B6B6B] hover:bg-[#E6F5FF]'
                }`}
              >
                {range === 'all' ? 'All time' : range.toUpperCase()}
              </button>
            ))}
          </div>
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
            Store
          </Link>
        </div>

        {/* Overview View */}
        {activeView === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-12">
              {[
                { label: 'Registered Users', value: analytics.totalUsers, icon: 'ri-user-fill' },
                { label: 'Active Users', value: analytics.activeUsers, icon: 'ri-user-star-fill' },
                { label: 'New Signups', value: analytics.userGrowth, icon: 'ri-user-add-fill' },
                {
                  label: 'Revenue',
                  value: `$${formatMoney(metrics.totalRevenue)}`,
                  icon: 'ri-money-dollar-circle-fill',
                  trend: metrics.trend,
                },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center">
                      <i className={`${card.icon} text-2xl text-[#0096FF]`}></i>
                    </div>
                    {card.trend !== undefined && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          card.trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {card.trend >= 0 ? '+' : ''}
                        {card.trend}%
                      </span>
                    )}
                  </div>
                  {analyticsLoading ? (
                    <div className="h-10 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <p className="text-3xl font-bold text-[#2A2A2A]">{card.value}</p>
                  )}
                  <p className="text-sm text-[#6B6B6B] mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <p className="text-2xl font-bold text-[#0096FF]">{metrics.paidSessions}</p>
                <p className="text-sm text-[#6B6B6B]">Completed call sessions</p>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <p className="text-2xl font-bold text-[#0096FF]">{analytics.totalSessions}</p>
                <p className="text-sm text-[#6B6B6B]">Total call sessions</p>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <p className="text-2xl font-bold text-[#0096FF]">{analytics.avgSessionDuration}</p>
                <p className="text-sm text-[#6B6B6B]">Avg. call duration</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
              <h2 className="text-2xl font-bold text-[#2A2A2A] mb-6">Recent Sessions</h2>
              {sessions.length === 0 ? (
                <p className="text-[#6B6B6B] text-center py-8">No sessions yet. Activity appears here when users make calls.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-4 bg-[#FAFAFA] rounded-xl"
                    >
                      <div>
                        <p className="font-semibold text-[#2A2A2A]">{session.clientId}</p>
                        <p className="text-xs text-[#6B6B6B]">{session.time}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                      <span className="text-sm text-[#6B6B6B]">{session.duration}</span>
                    </div>
                  ))}
                </div>
              )}
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
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                  ${formatMoney(revenueStats.periodRevenue)}
                </p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Revenue in period</p>
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
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                  ${formatMoney(revenueStats.avgPerSession)}
                </p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Avg. revenue per completed session</p>
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

              <div className="space-y-4">
                {revenueLoading ? (
                  <div className="py-12 text-center text-[#6B6B6B]">
                    <i className="ri-loader-4-line animate-spin text-3xl text-[#0096FF]"></i>
                  </div>
                ) : getCurrentRevenueData().length === 0 ? (
                  <p className="text-center py-8 text-[#6B6B6B]">No revenue data for this period yet.</p>
                ) : (
                getCurrentRevenueData().map((item, index) => {
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
                }))}
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
                    ${formatMoney(
                      getCurrentRevenueData().length
                        ? getCurrentRevenueData().reduce((sum, item) => sum + item.amount, 0) /
                            getCurrentRevenueData().length
                        : 0,
                    )}
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
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-6 md:mb-8">Credits used by service</h2>
                <div className="space-y-6">
                  {revenueBreakdown.usageByType.length === 0 ? (
                    <p className="text-[#6B6B6B]">No usage recorded in this period.</p>
                  ) : (
                    revenueBreakdown.usageByType.map((item) => (
                      <div key={item.type}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-[#2A2A2A]">{item.type}</span>
                          <span className="font-bold text-[#0096FF]">{item.credits} credits</span>
                        </div>
                        <div className="w-full bg-[#F5F5F5] rounded-full h-3">
                          <div
                            className="bg-[#0096FF] h-3 rounded-full"
                            style={{ width: `${item.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-6 md:mb-8">Top earning days (purchases)</h2>
                <div className="space-y-4">
                  {revenueBreakdown.topEarningDays.length === 0 ? (
                    <p className="text-[#6B6B6B]">No purchases in this period.</p>
                  ) : (
                    revenueBreakdown.topEarningDays.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-[#FAFAFA] rounded-2xl">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-[#0096FF] text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-[#2A2A2A]">{item.day}</span>
                        </div>
                        <span className="font-bold text-[#0096FF]">${formatMoney(item.amount)}</span>
                      </div>
                    ))
                  )}
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
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A]">Registered users</h2>
              <button
                type="button"
                onClick={fetchUsers}
                disabled={usersLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#0096FF] text-white rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                <i className={`ri-refresh-line ${usersLoading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>
            {usersLoading ? (
              <div className="flex justify-center py-12">
                <i className="ri-loader-4-line animate-spin text-4xl text-[#0096FF]"></i>
              </div>
            ) : users.length === 0 ? (
              <p className="text-center py-12 text-[#6B6B6B]">No verified users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#E5E5E5]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Credits</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Sessions</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Spent</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Joined</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA]">
                        <td className="py-3 px-4">
                          <p className="font-medium text-[#2A2A2A]">{u.name}</p>
                          <p className="text-xs text-[#6B6B6B]">{u.email}</p>
                        </td>
                        <td className="py-3 px-4 text-sm">{u.credits}</td>
                        <td className="py-3 px-4 text-sm">{u.totalSessions}</td>
                        <td className="py-3 px-4 text-sm">${formatMoney(u.totalSpent)}</td>
                        <td className="py-3 px-4 text-sm text-[#6B6B6B]">{formatDate(u.joinDate)}</td>
                        <td className="py-3 px-4 text-sm text-[#6B6B6B]">{formatTimeAgo(u.lastActive)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                              {transaction.type?.toLowerCase() === 'purchase'
                                ? `$${formatMoney(toDollars(transaction.amount))}`
                                : transaction.amount
                                  ? String(transaction.amount)
                                  : '-'}
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
