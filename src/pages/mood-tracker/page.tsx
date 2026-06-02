
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

interface MoodLog {
  id: string;
  mood: string;
  mood_score: number;
  note: string | null;
  created_at: string;
}

const moods = [
  { name: 'Great', score: 5, emoji: '😄', color: 'bg-emerald-500', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
  { name: 'Good', score: 4, emoji: '🙂', color: 'bg-teal-500', lightColor: 'bg-teal-50', textColor: 'text-teal-600' },
  { name: 'Okay', score: 3, emoji: '😐', color: 'bg-amber-500', lightColor: 'bg-amber-50', textColor: 'text-amber-600' },
  { name: 'Low', score: 2, emoji: '😔', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-600' },
  { name: 'Struggling', score: 1, emoji: '😢', color: 'bg-rose-500', lightColor: 'bg-rose-50', textColor: 'text-rose-600' },
];

export default function MoodTrackerPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMood, setSelectedMood] = useState<typeof moods[0] | null>(null);
  const [note, setNote] = useState('');
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'insights'>('log');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/signin');
      return;
    }
    void (async () => {
      await fetchMoodLogs();
      setIsLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const fetchMoodLogs = async () => {
    try {
      const { data } = await apiFetch<{ data: MoodLog[] }>('/api/user/mood-logs?limit=30');
      setMoodLogs(data || []);
    } catch {
      setMoodLogs([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood || !user) return;

    setIsSubmitting(true);

    try {
      await apiFetch('/api/user/mood-logs', {
        method: 'POST',
        body: JSON.stringify({
          mood: selectedMood.name,
          mood_score: selectedMood.score,
          note: note.trim() || null,
        }),
      });
      setShowSuccess(true);
      setSelectedMood(null);
      setNote('');
      await fetchMoodLogs();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      // submission failed
    }
    setIsSubmitting(false);
  };

  const getMoodByScore = (score: number) => moods.find(m => m.score === score) || moods[2];

  const getAverageMood = () => {
    if (moodLogs.length === 0) return null;
    const avg = moodLogs.reduce((sum, log) => sum + log.mood_score, 0) / moodLogs.length;
    return avg.toFixed(1);
  };

  const getMoodTrend = () => {
    if (moodLogs.length < 2) return 'neutral';
    const recent = moodLogs.slice(0, 7);
    const older = moodLogs.slice(7, 14);
    if (older.length === 0) return 'neutral';
    
    const recentAvg = recent.reduce((sum, log) => sum + log.mood_score, 0) / recent.length;
    const olderAvg = older.reduce((sum, log) => sum + log.mood_score, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.3) return 'up';
    if (recentAvg < olderAvg - 0.3) return 'down';
    return 'neutral';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getLast7DaysData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayLogs = moodLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === date.toDateString();
      });
      const avgScore = dayLogs.length > 0 
        ? dayLogs.reduce((sum, log) => sum + log.mood_score, 0) / dayLogs.length 
        : null;
      days.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        score: avgScore,
        count: dayLogs.length
      });
    }
    return days;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE]">
      <Navbar />
      
      <div className="pt-28 pb-16 px-4 md:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Mood Tracker
          </h1>
          <p className="text-gray-600">Track how you're feeling and discover patterns over time</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 flex items-center justify-center bg-emerald-500 rounded-full">
              <i className="ri-check-line text-white text-xl"></i>
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Mood logged!</p>
              <p className="text-sm text-emerald-600">Keep tracking to see your patterns</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white/60 p-1.5 rounded-full w-fit mx-auto">
          {[
            { id: 'log', label: 'Log Mood', icon: 'ri-add-circle-line' },
            { id: 'history', label: 'History', icon: 'ri-history-line' },
            { id: 'insights', label: 'Insights', icon: 'ri-line-chart-line' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#0096FF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-white/80'
              }`}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Log Mood Tab */}
        {activeTab === 'log' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6 text-center">How are you feeling right now?</h2>
            
            {/* Mood Selection */}
            <div className="grid grid-cols-5 gap-3 md:gap-4 mb-8">
              {moods.map((mood) => (
                <button
                  key={mood.name}
                  onClick={() => setSelectedMood(mood)}
                  className={`flex flex-col items-center p-3 md:p-4 rounded-xl transition-all cursor-pointer ${
                    selectedMood?.name === mood.name
                      ? `${mood.lightColor} ring-2 ring-offset-2 ring-${mood.color.replace('bg-', '')}`
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-3xl md:text-4xl mb-2">{mood.emoji}</span>
                  <span className={`text-xs md:text-sm font-medium ${selectedMood?.name === mood.name ? mood.textColor : 'text-gray-600'}`}>
                    {mood.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Note Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="What's on your mind? What happened today?"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0096FF] focus:border-transparent resize-none text-sm"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{note.length}/500</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedMood || isSubmitting}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all cursor-pointer whitespace-nowrap ${
                selectedMood && !isSubmitting
                  ? 'bg-[#0096FF] hover:bg-[#0077CC] shadow-lg shadow-[#0096FF]/30'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                'Log My Mood'
              )}
            </button>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">Recent Mood Logs</h2>
            
            {moodLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
                  <i className="ri-emotion-line text-3xl text-gray-400"></i>
                </div>
                <p className="text-gray-500 mb-4">No mood logs yet</p>
                <button
                  onClick={() => setActiveTab('log')}
                  className="px-6 py-2 bg-[#0096FF] text-white rounded-full text-sm font-medium hover:bg-[#0077CC] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Log Your First Mood
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {moodLogs.map((log) => {
                  const mood = getMoodByScore(log.mood_score);
                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-xl ${mood.lightColor} border border-${mood.color.replace('bg-', '')}/20`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{mood.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-semibold ${mood.textColor}`}>{log.mood}</span>
                            <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                          </div>
                          {log.note && (
                            <p className="text-sm text-gray-600 line-clamp-2">{log.note}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-lg p-5 text-center">
                <p className="text-xs text-gray-500 mb-1">Total Logs</p>
                <p className="text-2xl font-bold text-[#2A2A2A]">{moodLogs.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-5 text-center">
                <p className="text-xs text-gray-500 mb-1">Average Mood</p>
                <p className="text-2xl font-bold text-[#0096FF]">{getAverageMood() || '-'}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-5 text-center">
                <p className="text-xs text-gray-500 mb-1">Trend</p>
                <div className="flex items-center justify-center gap-1">
                  {getMoodTrend() === 'up' && (
                    <>
                      <i className="ri-arrow-up-line text-emerald-500 text-xl"></i>
                      <span className="text-emerald-500 font-semibold">Up</span>
                    </>
                  )}
                  {getMoodTrend() === 'down' && (
                    <>
                      <i className="ri-arrow-down-line text-rose-500 text-xl"></i>
                      <span className="text-rose-500 font-semibold">Down</span>
                    </>
                  )}
                  {getMoodTrend() === 'neutral' && (
                    <>
                      <i className="ri-subtract-line text-gray-400 text-xl"></i>
                      <span className="text-gray-500 font-semibold">Stable</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-[#2A2A2A] mb-6">Last 7 Days</h3>
              <div className="flex items-end justify-between gap-2 h-40">
                {getLast7DaysData().map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-end h-28">
                      {day.score !== null ? (
                        <div
                          className={`w-full max-w-[40px] rounded-t-lg ${getMoodByScore(Math.round(day.score)).color} transition-all`}
                          style={{ height: `${(day.score / 5) * 100}%` }}
                        >
                          <div className="text-center -mt-6">
                            <span className="text-lg">{getMoodByScore(Math.round(day.score)).emoji}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-[40px] h-2 bg-gray-200 rounded-t-lg"></div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mood Distribution */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-[#2A2A2A] mb-4">Mood Distribution</h3>
              <div className="space-y-3">
                {moods.map((mood) => {
                  const count = moodLogs.filter(log => log.mood_score === mood.score).length;
                  const percentage = moodLogs.length > 0 ? (count / moodLogs.length) * 100 : 0;
                  return (
                    <div key={mood.name} className="flex items-center gap-3">
                      <span className="text-xl w-8">{mood.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{mood.name}</span>
                          <span className="text-xs text-gray-500">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${mood.color} rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {moodLogs.length < 5 && (
              <div className="bg-[#0096FF]/10 rounded-xl p-5 text-center">
                <i className="ri-lightbulb-line text-[#0096FF] text-2xl mb-2"></i>
                <p className="text-sm text-[#0096FF]">
                  Log more moods to unlock detailed insights and patterns!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
