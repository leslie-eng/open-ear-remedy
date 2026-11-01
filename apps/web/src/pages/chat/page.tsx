import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useSEO, generateWebPageSchema } from '../../utils/seo';
import TypingIndicator from '../../components/ui/TypingIndicator';
import CrisisLink from '../../components/ui/CrisisLink';
import { CREDITS_PER_CHAT_MESSAGE } from '@openear/shared/pricing';
import { canSendChatMessage, type Balance } from '../../hooks/useBalance';

const PER_MESSAGE = `${CREDITS_PER_CHAT_MESSAGE} credit${CREDITS_PER_CHAT_MESSAGE === 1 ? '' : 's'}`;

interface Source {
  title: string;
  author: string | null;
}

interface ChatReply {
  response: string;
  balance: Balance;
  /** Approved knowledge sources the reply drew on. */
  sources: Source[];
  /** The message mentioned suicide or self-harm: always show Crisis Help. */
  crisisHelp: boolean;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  sources?: Source[];
  crisisHelp?: boolean;
}

export default function ChatPage() {
  useSEO({
    title: 'AI Chat Support - 24/7 Emotional Support | Open Ear',
    description: `Chat with our AI assistant anytime for emotional support. Available 24/7, private and confidential. ${PER_MESSAGE} per message.`,
    keywords: 'AI chat support, emotional support chat, 24/7 support, someone to talk to, feeling low',
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
  const [balance, setBalance] = useState<Balance>({ credits: 0, pass: null, queuedPass: null });
  const credits = balance.credits;
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
      setBalance(await apiFetch<Balance>('/api/user/credits'));
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
    const messagesLeft = Math.floor(currentCredits / CREDITS_PER_CHAT_MESSAGE);
    
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
  ): Promise<ChatReply> => {
    const historyForAPI = conversationHistory
      .slice(-10)
      .map((msg) => ({
        sender: msg.sender,
        content: msg.content,
      }));

    const data = await apiFetch<ChatReply>('/api/chat', {
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

    // Today's Monthly Pass allowance is used first, then credits.
    if (!canSendChatMessage(balance)) {
      setCreditError(`You have no messages left. Top up credits (${PER_MESSAGE} per message) or get a Monthly Pass.`);
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
      const { response: aiResponseText, balance: newBalance, sources, crisisHelp } = await generateAIResponse(
        userMsg.content,
        messages,
      );

      setBalance(newBalance);
      // Low-credit warnings only matter once the pass allowance for today is used up.
      if (!newBalance.pass?.aiMessagesLeftToday) {
        checkLowCreditWarning(newBalance.credits);
        await sendLowCreditNotification(newBalance.credits);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
        sources,
        crisisHelp,
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
    <div className="min-h-screen bg-oe-bg flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-20 md:pt-24 px-4 md:px-6 pb-4 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-oe-primary/10 rounded-full mb-3">
            <i className="ri-message-3-fill text-oe-primary text-sm"></i>
            <span className="text-xs font-medium text-oe-primary">AI Chat Support</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-oe-ink mb-2">
            Chat with Our AI Assistant
          </h1>
          <p className="text-sm text-oe-muted">
            Available 24/7 • {PER_MESSAGE} per message
          </p>
          {user && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
              <i className="ri-copper-coin-fill text-oe-primary"></i>
              <span className="font-semibold text-oe-ink">{credits} Credits</span>
              <span className="text-xs text-oe-muted">
                {balance.pass
                  ? `(+ ${balance.pass.aiMessagesLeftToday} Monthly Pass messages left today)`
                  : `(${Math.floor(credits / CREDITS_PER_CHAT_MESSAGE)} messages)`}
              </span>
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
            <div className="w-10 h-10 md:w-12 md:h-12 bg-oe-primary rounded-full flex items-center justify-center">
              <i className="ri-robot-fill text-white text-lg md:text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-oe-ink text-sm md:text-base">Open Ear Assistant</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-forest-500 rounded-full"></span>
                <span className="text-xs text-oe-muted">Online • {PER_MESSAGE}/msg</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/call')}
              className="px-3 md:px-4 py-2 bg-oe-primary/10 text-oe-primary rounded-full text-xs md:text-sm font-medium hover:bg-oe-primary/20 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
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
                    <div className="w-8 h-8 bg-oe-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-robot-fill text-white text-sm"></i>
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-oe-primary text-white rounded-br-md'
                        : 'bg-oe-surface text-oe-ink rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    {message.crisisHelp && (
                      <div role="alert" className="mt-3 rounded-xl border border-oe-crisis bg-white px-3 py-2 text-sm">
                        <p className="text-oe-ink mb-1">If you are in danger or thinking of ending your life, please reach a person now.</p>
                        <CrisisLink />
                      </div>
                    )}
                    {message.sources && message.sources.length > 0 && (
                      <p className="text-xs mt-2 text-oe-muted">
                        Drawing on: {message.sources.map((s) => (s.author ? `${s.title} (${s.author})` : s.title)).join('; ')}
                      </p>
                    )}
                    <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-white/70' : 'text-oe-muted'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 bg-oe-primary rounded-full flex items-center justify-center">
                    <i className="ri-robot-fill text-white text-sm"></i>
                  </div>
                  <div className="bg-oe-surface px-4 py-3 rounded-2xl rounded-bl-md">
                    <TypingIndicator label="Open Ear is typing" className="text-oe-primary" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && messages.length <= 1 && (
            <div className="px-4 md:px-6 pb-3">
              <p className="text-xs text-oe-muted mb-2">Suggested topics ({PER_MESSAGE} each):</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-oe-primary-tint text-oe-primary rounded-full text-xs font-medium hover:bg-oe-primary hover:text-white transition-all cursor-pointer whitespace-nowrap"
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
                  placeholder={user ? `Type your message (${PER_MESSAGE})...` : "Sign in to start chatting..."}
                  rows={1}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-oe-surface rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-oe-primary/30 text-sm"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping || (user && !canSendChatMessage(balance))}
                className="w-11 h-11 bg-oe-primary text-white rounded-full flex items-center justify-center hover:bg-oe-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
              >
                <i className="ri-send-plane-fill text-lg"></i>
              </button>
            </div>
            <p className="text-xs text-oe-muted mt-2 text-center">
              Press Enter to send • {PER_MESSAGE} per message
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <i className="ri-shield-check-fill text-xl text-oe-primary mb-1 block"></i>
            <p className="text-xs font-medium text-oe-ink">Private</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <i className="ri-time-fill text-xl text-oe-primary mb-1 block"></i>
            <p className="text-xs font-medium text-oe-ink">24/7</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <i className="ri-copper-coin-fill text-xl text-oe-primary mb-1 block"></i>
            <p className="text-xs font-medium text-oe-ink">{CREDITS_PER_CHAT_MESSAGE} Credits/Msg</p>
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
                <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-mail-check-fill text-4xl text-forest-600"></i>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-oe-ink mb-3">
                  Verify Your Email
                </h2>
                <p className="text-sm md:text-base text-oe-muted mb-2">
                  We've sent a verification link to:
                </p>
                <p className="text-sm md:text-base font-semibold text-oe-primary mb-6">
                  {email}
                </p>
                <div className="bg-oe-primary-tint rounded-xl p-4 mb-6">
                  <p className="text-sm text-oe-ink">
                    <i className="ri-information-fill text-oe-primary mr-2"></i>
                    Click the link in your email to activate your account and start using Open Ear.
                  </p>
                </div>
                
                {authError && (
                  <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                    authError.includes('resent')
                      ? 'bg-forest-50 border border-forest-200 text-forest-700'
                      : 'bg-oe-crisis-tint border border-oe-crisis text-oe-crisis'
                  }`}>
                    {authError}
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="w-full px-6 py-3 bg-white border-2 border-oe-primary text-oe-primary rounded-xl font-semibold hover:bg-oe-primary-tint transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
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
                    className="w-full px-6 py-3 bg-oe-primary text-white rounded-xl font-semibold hover:bg-oe-primary-hover transition-all whitespace-nowrap cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
                
                <p className="text-xs text-oe-muted mt-6">
                  Didn't receive the email? Check your spam folder or try a different email address.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-oe-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${forgotPassword ? 'ri-lock-unlock-fill' : 'ri-user-fill'} text-3xl md:text-4xl text-oe-primary`}></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-oe-ink mb-2">
                    {forgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-sm md:text-base text-oe-muted">
                    {forgotPassword ? 'Enter your email to receive a reset link' : isSignUp ? 'Sign up to start chatting' : 'Sign in to continue'}
                  </p>
                </div>

                {!forgotPassword && (
                  <>
                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-oe-line"></div>
                      <span className="text-xs text-oe-muted">Sign in with email</span>
                      <div className="flex-1 h-px bg-oe-line"></div>
                    </div>
                  </>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  {isSignUp && !forgotPassword && (
                    <div>
                      <label className="block text-sm font-medium text-oe-ink mb-2">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-oe-ink mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  
                  {!forgotPassword && (
                    <div>
                      <label className="block text-sm font-medium text-oe-ink mb-2">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
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
                        className="text-sm text-oe-primary font-medium hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {authError && (
                    <div className={`px-4 py-3 rounded-xl text-sm ${
                      authError.includes('Check your email') || authError.includes('reset link sent') || authError.includes('resent')
                        ? 'bg-oe-primary-tint border border-oe-primary text-oe-primary'
                        : 'bg-oe-crisis-tint border border-oe-crisis text-oe-crisis'
                    }`}>
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full px-6 py-3 md:py-4 bg-oe-primary text-white rounded-xl text-base md:text-lg font-semibold hover:bg-oe-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
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
                      className="text-sm md:text-base text-oe-primary font-semibold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
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
                      className="text-sm md:text-base text-oe-primary font-semibold hover:underline cursor-pointer"
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
              className="absolute top-4 right-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-oe-muted hover:text-oe-ink transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl md:text-2xl"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
