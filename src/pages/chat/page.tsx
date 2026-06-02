import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useSEO, generateWebPageSchema } from '../../utils/seo';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const CREDITS_PER_MESSAGE = 5;

export default function ChatPage() {
  useSEO({
    title: 'AI Chat Support - 24/7 Emotional Support | Open Ear',
    description: 'Chat with our AI assistant anytime for emotional support. Available 24/7, private and confidential. 5 credits per message.',
    keywords: 'AI chat support, emotional support chat, mental health chatbot, 24/7 support, online counseling',
    canonical: '/chat',
    ogType: 'website',
    schema: generateWebPageSchema('AI Chat Support', '24/7 AI-powered emotional support chat', '/chat'),
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi there! I'm here to listen and support you. How are you feeling today?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const {
    user,
    signUp,
    signIn,
    resendOtp,
    forgotPassword: sendForgotPassword,
  } = useAuth();
  const [credits, setCredits] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [creditError, setCreditError] = useState('');
  const [lowCreditWarning, setLowCreditWarning] = useState<string | null>(null);
  const [aiError, setAiError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const suggestions = [
    "I'm feeling anxious today",
    "I need someone to talk to",
    "Help me process my thoughts",
    "I'm going through a tough time",
  ];

  useEffect(() => {
    if (user) {
      void fetchCredits();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCredits = async () => {
    try {
      const data = await apiFetch<{ credits: number }>('/api/user/credits');
      setCredits(data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const sendLowCreditNotification = async (currentCredits: number) => {
    if (currentCredits > 50) return;

    try {
      await apiFetch('/api/notifications/low-credit', {
        method: 'POST',
        body: JSON.stringify({ credits: currentCredits }),
      });
    } catch (error) {
      console.error('Error sending low credit notification:', error);
    }
  };

  const checkLowCreditWarning = (currentCredits: number) => {
    const messagesLeft = Math.floor(currentCredits / CREDITS_PER_MESSAGE);
    
    if (currentCredits <= 5) {
      setLowCreditWarning(`⚠️ Critical: Only ${currentCredits} credits left (${messagesLeft} message)! Buy more to continue.`);
    } else if (currentCredits <= 10) {
      setLowCreditWarning(`⚠️ Low credits: ${currentCredits} credits remaining (${messagesLeft} messages)`);
    } else if (currentCredits <= 15) {
      setLowCreditWarning(`Credits running low: ${currentCredits} credits (${messagesLeft} messages left)`);
    } else if (currentCredits <= 25) {
      setLowCreditWarning(`Reminder: ${currentCredits} credits remaining (${messagesLeft} messages)`);
      // Auto-dismiss reminder after 4 seconds
      setTimeout(() => setLowCreditWarning(null), 4000);
    } else {
      setLowCreditWarning(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateAIResponse = async (
    userMessage: string,
    conversationHistory: Message[],
  ): Promise<{ response: string; credits: number }> => {
    const historyForAPI = conversationHistory
      .slice(-10)
      .map((msg) => ({
        sender: msg.sender,
        content: msg.content,
      }));

    const data = await apiFetch<{ response: string; credits: number }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: userMessage,
        conversationHistory: historyForAPI,
      }),
    });

    return data;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Check if user has enough credits
    if (credits < CREDITS_PER_MESSAGE) {
      setCreditError(`Insufficient credits. You need ${CREDITS_PER_MESSAGE} credits per message.`);
      setTimeout(() => setCreditError(''), 5000);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInputMessage('');
    setShowSuggestions(false);
    setIsTyping(true);
    setAiError('');

    try {
      const { response: aiResponseText, credits: newCredits } = await generateAIResponse(
        userMsg.content,
        messages,
      );

      setCredits(newCredits);
      checkLowCreditWarning(newCredits);
      await sendLowCreditNotification(newCredits);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error: unknown) {
      setAiError(
        error instanceof Error ? error.message : 'Failed to get response. Please try again.',
      );
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      if (forgotPassword) {
        await sendForgotPassword(email);
        setAuthError('Password reset link sent! Check your email.');
        return;
      }

      if (isSignUp) {
        if (password.length < 6) {
          setAuthError('Password must be at least 6 characters');
          setIsAuthLoading(false);
          return;
        }

        const { needsVerification } = await signUp(email, password, name);
        if (needsVerification) {
          setVerificationSent(true);
        } else {
          setShowAuthModal(false);
          await fetchCredits();
        }
      } else {
        await signIn(email, password);
        setShowAuthModal(false);
        await fetchCredits();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      if (message.includes('verify') || message.includes('confirmed')) {
        setAuthError(
          'Please verify your email before signing in. Check your inbox for the verification link.',
        );
        return;
      }
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setAuthError('');

    try {
      await resendOtp(email);
      setAuthError('Verification email resent! Please check your inbox.');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Failed to resend verification');
    } finally {
      setResendingVerification(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF] flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-20 md:pt-24 px-4 md:px-6 pb-4 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0096FF]/10 rounded-full mb-3">
            <i className="ri-message-3-fill text-[#0096FF] text-sm"></i>
            <span className="text-xs font-medium text-[#0096FF]">AI Chat Support</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Chat with Our AI Assistant
          </h1>
          <p className="text-sm text-[#6B6B6B]">
            Available 24/7 • {CREDITS_PER_MESSAGE} credits per message
          </p>
          {user && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
              <i className="ri-copper-coin-fill text-[#0096FF]"></i>
              <span className="font-semibold text-[#2A2A2A]">{credits} Credits</span>
              <span className="text-xs text-[#6B6B6B]">({Math.floor(credits / CREDITS_PER_MESSAGE)} messages)</span>
            </div>
          )}
        </div>

        {/* Credit Error */}
        {creditError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <i className="ri-error-warning-fill text-red-500"></i>
            <p className="text-sm text-red-700">{creditError}</p>
            <button
              onClick={() => navigate('/pricing')}
              className="ml-auto px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-all cursor-pointer whitespace-nowrap"
            >
              Buy Credits
            </button>
          </div>
        )}

        {/* AI Error */}
        {aiError && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
            <i className="ri-error-warning-fill text-orange-500"></i>
            <p className="text-sm text-orange-700">{aiError}</p>
            <button
              onClick={() => setAiError('')}
              className="ml-auto w-6 h-6 flex items-center justify-center text-orange-400 hover:text-orange-600 cursor-pointer"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        )}

        {/* Low Credit Warning */}
        {lowCreditWarning && !creditError && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
            lowCreditWarning.includes('Critical')
              ? 'bg-red-50 border-2 border-red-300 animate-pulse'
              : lowCreditWarning.includes('Low')
              ? 'bg-orange-50 border-2 border-orange-300'
              : 'bg-yellow-50 border-2 border-yellow-300'
          }`}>
            <i className={`text-lg ${
              lowCreditWarning.includes('Critical')
                ? 'ri-error-warning-fill text-red-500'
                : lowCreditWarning.includes('Low')
                ? 'ri-alert-fill text-orange-500'
                : 'ri-information-fill text-yellow-600'
            }`}></i>
            <p className={`text-sm flex-1 ${
              lowCreditWarning.includes('Critical')
                ? 'text-red-700 font-medium'
                : lowCreditWarning.includes('Low')
                ? 'text-orange-700'
                : 'text-yellow-700'
            }`}>{lowCreditWarning}</p>
            <button
              onClick={() => navigate('/pricing')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                lowCreditWarning.includes('Critical')
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : lowCreditWarning.includes('Low')
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
            >
              Buy Credits
            </button>
            {!lowCreditWarning.includes('Critical') && (
              <button
                onClick={() => setLowCreditWarning(null)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            )}
          </div>
        )}

        {/* Chat Container */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#0096FF] to-[#0077CC] rounded-full flex items-center justify-center">
              <i className="ri-robot-fill text-white text-lg md:text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#2A2A2A] text-sm md:text-base">Open Ear Assistant</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-xs text-[#6B6B6B]">Online • {CREDITS_PER_MESSAGE} credits/msg</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/call')}
              className="px-3 md:px-4 py-2 bg-[#0096FF]/10 text-[#0096FF] rounded-full text-xs md:text-sm font-medium hover:bg-[#0096FF]/20 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              <i className="ri-phone-fill"></i>
              <span className="hidden sm:inline">Switch to Call</span>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  {message.sender === 'ai' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-[#0096FF] to-[#0077CC] rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-robot-fill text-white text-sm"></i>
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-[#0096FF] text-white rounded-br-md'
                        : 'bg-[#F5F5F5] text-[#2A2A2A] rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-white/70' : 'text-[#6B6B6B]'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#0096FF] to-[#0077CC] rounded-full flex items-center justify-center">
                    <i className="ri-robot-fill text-white text-sm"></i>
                  </div>
                  <div className="bg-[#F5F5F5] px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#0096FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-[#0096FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-[#0096FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && messages.length <= 1 && (
            <div className="px-4 md:px-6 pb-3">
              <p className="text-xs text-[#6B6B6B] mb-2">Suggested topics ({CREDITS_PER_MESSAGE} credits each):</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-[#E6F5FF] text-[#0096FF] rounded-full text-xs font-medium hover:bg-[#0096FF] hover:text-white transition-all cursor-pointer whitespace-nowrap"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={user ? `Type your message (${CREDITS_PER_MESSAGE} credits)...` : "Sign in to start chatting..."}
                  rows={1}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-[#F5F5F5] rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0096FF]/30 text-sm"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping || (user && credits < CREDITS_PER_MESSAGE)}
                className="w-11 h-11 bg-[#0096FF] text-white rounded-full flex items-center justify-center hover:bg-[#0077CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
              >
                <i className="ri-send-plane-fill text-lg"></i>
              </button>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-2 text-center">
              Press Enter to send • {CREDITS_PER_MESSAGE} credits per message
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <i className="ri-shield-check-fill text-xl text-[#0096FF] mb-1 block"></i>
            <p className="text-xs font-medium text-[#2A2A2A]">Private</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <i className="ri-time-fill text-xl text-[#0096FF] mb-1 block"></i>
            <p className="text-xs font-medium text-[#2A2A2A]">24/7</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <i className="ri-copper-coin-fill text-xl text-[#0096FF] mb-1 block"></i>
            <p className="text-xs font-medium text-[#2A2A2A]">{CREDITS_PER_MESSAGE} Credits/Msg</p>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-10 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Verification Sent State */}
            {verificationSent ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-mail-check-fill text-4xl text-green-600"></i>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-3">
                  Verify Your Email
                </h2>
                <p className="text-sm md:text-base text-[#6B6B6B] mb-2">
                  We've sent a verification link to:
                </p>
                <p className="text-sm md:text-base font-semibold text-[#0096FF] mb-6">
                  {email}
                </p>
                <div className="bg-[#E6F5FF] rounded-xl p-4 mb-6">
                  <p className="text-sm text-[#2A2A2A]">
                    <i className="ri-information-fill text-[#0096FF] mr-2"></i>
                    Click the link in your email to activate your account and start using Open Ear.
                  </p>
                </div>
                
                {authError && (
                  <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                    authError.includes('resent')
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-[#FFE6E6] border border-[#FF4444] text-[#FF4444]'
                  }`}>
                    {authError}
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="w-full px-6 py-3 bg-white border-2 border-[#0096FF] text-[#0096FF] rounded-xl font-semibold hover:bg-[#E6F5FF] transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    {resendingVerification ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="ri-loader-4-line animate-spin"></i>
                        Sending...
                      </span>
                    ) : (
                      <>
                        <i className="ri-refresh-line mr-2"></i>
                        Resend Verification Email
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setVerificationSent(false);
                      setIsSignUp(false);
                      setAuthError('');
                    }}
                    className="w-full px-6 py-3 bg-[#0096FF] text-white rounded-xl font-semibold hover:bg-[#0077CC] transition-all whitespace-nowrap cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
                
                <p className="text-xs text-[#6B6B6B] mt-6">
                  Didn't receive the email? Check your spam folder or try a different email address.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0096FF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${forgotPassword ? 'ri-lock-unlock-fill' : 'ri-user-fill'} text-3xl md:text-4xl text-[#0096FF]`}></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-2">
                    {forgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-sm md:text-base text-[#6B6B6B]">
                    {forgotPassword ? 'Enter your email to receive a reset link' : isSignUp ? 'Sign up to start chatting' : 'Sign in to continue'}
                  </p>
                </div>

                {!forgotPassword && (
                  <>
                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-[#E5E5E5]"></div>
                      <span className="text-xs text-[#6B6B6B]">Sign in with email</span>
                      <div className="flex-1 h-px bg-[#E5E5E5]"></div>
                    </div>
                  </>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  {isSignUp && !forgotPassword && (
                    <div>
                      <label className="block text-sm font-medium text-[#2A2A2A] mb-2">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  
                  {!forgotPassword && (
                    <div>
                      <label className="block text-sm font-medium text-[#2A2A2A] mb-2">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                        placeholder={isSignUp ? 'Min. 6 characters' : '••••••••'}
                        required
                      />
                    </div>
                  )}

                  {/* Forgot Password Link - Only show on sign in */}
                  {!isSignUp && !forgotPassword && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPassword(true);
                          setAuthError('');
                        }}
                        className="text-sm text-[#0096FF] font-medium hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {authError && (
                    <div className={`px-4 py-3 rounded-xl text-sm ${
                      authError.includes('Check your email') || authError.includes('reset link sent') || authError.includes('resent')
                        ? 'bg-[#E6F5FF] border border-[#0096FF] text-[#0096FF]'
                        : 'bg-[#FFE6E6] border border-[#FF4444] text-[#FF4444]'
                    }`}>
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full px-6 py-3 md:py-4 bg-[#0096FF] text-white rounded-xl text-base md:text-lg font-semibold hover:bg-[#0077CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                  >
                    {isAuthLoading 
                      ? 'Please wait...' 
                      : forgotPassword 
                      ? 'Send Reset Link' 
                      : isSignUp 
                      ? 'Create Account' 
                      : 'Sign In'}
                  </button>
                </form>

                <div className="mt-5 text-center space-y-2">
                  {forgotPassword ? (
                    <button
                      onClick={() => {
                        setForgotPassword(false);
                        setAuthError('');
                      }}
                      className="text-sm md:text-base text-[#0096FF] font-semibold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
                    >
                      <i className="ri-arrow-left-line"></i>
                      Back to Sign In
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setAuthError('');
                      }}
                      className="text-sm md:text-base text-[#0096FF] font-semibold hover:underline cursor-pointer"
                    >
                      {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                  )}
                </div>
              </>
            )}

            <button
              onClick={() => {
                setShowAuthModal(false);
                setForgotPassword(false);
                setVerificationSent(false);
                setAuthError('');
              }}
              className="absolute top-4 right-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-[#6B6B6B] hover:text-[#2A2A2A] transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl md:text-2xl"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
