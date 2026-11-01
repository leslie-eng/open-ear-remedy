import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useSEO, generateWebPageSchema } from '../../utils/seo';
import TypingIndicator from '../../components/ui/TypingIndicator';
import CrisisLink from '../../components/ui/CrisisLink';
import { CREDITS_PER_CHAT_MESSAGE } from '@openear/shared/pricing';
import { canSendChatMessage, type Balance } from '../../hooks/useBalance';

const PER_MESSAGE = `${CREDITS_PER_CHAT_MESSAGE} credit${CREDITS_PER_CHAT_MESSAGE === 1 ? '' : 's'}`;

const inputClass =
  'mt-2 w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30';

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
    title: 'AI Companion | Open Ear',
    description: `Chat with the Open Ear AI Companion any time to sort through your thoughts. It is not a person, and messages are never saved. ${PER_MESSAGE} a message.`,
    keywords: 'AI companion, emotional support chat, someone to talk to, feeling low',
    canonical: '/chat',
    ogType: 'website',
    schema: generateWebPageSchema('AI Companion', 'Chat with the Open Ear AI Companion at your own pace', '/chat'),
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi, I'm the Open Ear AI Companion. I'm here to listen. How are you feeling today?",
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
      setLowCreditWarning(`Critical: only ${currentCredits} credits left (${messagesLeft} messages). Top up to keep chatting.`);
    } else if (currentCredits <= 10) {
      setLowCreditWarning(`Low credits: ${currentCredits} credits left (${messagesLeft} messages)`);
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

  const warningTone = lowCreditWarning?.includes('Critical')
    ? 'bg-oe-crisis-tint text-oe-crisis'
    : lowCreditWarning?.includes('Low')
      ? 'bg-oe-accent-tint text-oe-accent'
      : 'bg-oe-surface text-oe-ink';

  const authMessageIsGood =
    authError.includes('Check your email') || authError.includes('reset link sent') || authError.includes('resent');

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
          <i className="ri-sparkling-line" aria-hidden="true" /> AI Companion
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Chat at your own pace.</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          The AI Companion is a computer program, not a person. It can help you sort through your thoughts, any time of day.
          {' '}{PER_MESSAGE} a message. Nothing you type is saved.
        </p>
        <CrisisLink className="mt-3" />

        {user && (
          <p className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-full bg-oe-surface px-4 py-2 text-sm">
            <i className="ri-copper-coin-line text-oe-primary" aria-hidden="true" />
            <span className="font-semibold">{credits} credits</span>
            <span className="text-oe-muted">
              {balance.pass
                ? `+ ${balance.pass.aiMessagesLeftToday} Monthly Pass messages left today`
                : `${Math.floor(credits / CREDITS_PER_CHAT_MESSAGE)} messages`}
            </span>
          </p>
        )}

        {creditError && (
          <div role="alert" className="mt-6 flex items-center gap-3 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
            <i className="ri-error-warning-line" aria-hidden="true" />
            <p className="flex-1">{creditError}</p>
            <button
              onClick={() => navigate('/pricing')}
              className="shrink-0 cursor-pointer rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-oe-ink"
            >
              Get credits
            </button>
          </div>
        )}

        {aiError && (
          <div role="alert" className="mt-6 flex items-center gap-3 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
            <i className="ri-error-warning-line" aria-hidden="true" />
            <p className="flex-1">{aiError}</p>
            <button
              onClick={() => setAiError('')}
              aria-label="Dismiss"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/60"
            >
              <i className="ri-close-line" aria-hidden="true" />
            </button>
          </div>
        )}

        {lowCreditWarning && !creditError && (
          <div role="status" className={`mt-6 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm ${warningTone}`}>
            <i className="ri-copper-coin-line" aria-hidden="true" />
            <p className="flex-1">{lowCreditWarning}</p>
            <button
              onClick={() => navigate('/pricing')}
              className="shrink-0 cursor-pointer rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-oe-ink"
            >
              Get credits
            </button>
            {!lowCreditWarning.includes('Critical') && (
              <button
                onClick={() => setLowCreditWarning(null)}
                aria-label="Dismiss"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/60"
              >
                <i className="ri-close-line" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <section className="mt-8 flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-3xl border border-oe-line bg-white">
          <div className="flex items-center gap-3 border-b border-oe-line px-5 py-4">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-accent-tint text-oe-accent">
              <i className="ri-sparkling-line" />
            </span>
            <div className="flex-1">
              <h2 className="font-sans text-base font-semibold">AI Companion</h2>
              <p className="text-xs text-oe-muted">Not a person · {PER_MESSAGE} a message</p>
            </div>
            <button
              onClick={() => navigate('/call')}
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-oe-primary-tint px-4 py-2 text-sm font-medium text-oe-primary-deep hover:bg-oe-primary-soft"
            >
              <i className="ri-user-heart-line" aria-hidden="true" />
              <span className="hidden sm:inline">Talk to a Listener</span>
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-oe-surface-low/40 p-5" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[75%] ${
                    message.sender === 'user' ? 'rounded-br-md bg-oe-primary text-white' : 'rounded-bl-md bg-oe-surface text-oe-ink'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  {message.crisisHelp && (
                    <div role="alert" className="mt-3 rounded-xl bg-oe-crisis-tint px-3 py-2 text-sm">
                      <p className="mb-1 text-oe-ink">If you are in danger or thinking of ending your life, please reach a person now.</p>
                      <CrisisLink />
                    </div>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <p className="mt-2 text-xs text-oe-muted">
                      Drawing on: {message.sources.map((s) => (s.author ? `${s.title} (${s.author})` : s.title)).join('; ')}
                    </p>
                  )}
                  <p className={`mt-1 text-xs ${message.sender === 'user' ? 'text-white/70' : 'text-oe-muted'}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-oe-surface px-4 py-3">
                  <TypingIndicator label="The AI Companion is typing" className="text-oe-primary" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showSuggestions && messages.length <= 1 && (
            <div className="border-t border-oe-line px-5 pt-3">
              <p className="mb-2 text-xs text-oe-muted">Not sure where to start? ({PER_MESSAGE} each)</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="cursor-pointer whitespace-nowrap rounded-full bg-oe-primary-tint px-3 py-1.5 text-xs font-medium text-oe-primary-deep hover:bg-oe-primary-soft"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 md:p-4">
            <div className="flex items-end gap-2">
              <label htmlFor="ai-chat-draft" className="sr-only">
                Message
              </label>
              <textarea
                id="ai-chat-draft"
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={user ? 'Type a message' : 'Sign in to start chatting'}
                rows={1}
                maxLength={500}
                className="flex-1 resize-none rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 text-sm focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping || (user && !canSendChatMessage(balance))}
                aria-label="Send"
                className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-oe-primary text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="ri-send-plane-line text-lg" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-oe-muted">Press Enter to send · {PER_MESSAGE} a message</p>
          </div>
        </section>

        <p className="mt-6 text-center text-sm text-oe-muted">
          Want a real person?{' '}
          <Link to="/call" className="font-medium text-oe-primary hover:underline">
            Call a Listener
          </Link>{' '}
          or{' '}
          <Link to="/listener-chat" className="font-medium text-oe-primary hover:underline">
            text one
          </Link>
          .
        </p>
      </main>
      <SiteFooter />

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-oe-ink/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-auth-title"
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-oe-line bg-white p-6 shadow-oe-md md:p-8"
          >
            {verificationSent ? (
              <div className="text-center">
                <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
                  <i className="ri-mail-check-line" />
                </span>
                <h2 id="chat-auth-title" className="mt-4 text-2xl font-bold">
                  Check your email.
                </h2>
                <p className="mt-2 text-sm text-oe-muted">We sent a verification code to</p>
                <p className="text-sm font-semibold">{email}</p>
                <p className="mt-5 rounded-2xl bg-oe-surface-low p-4 text-sm text-oe-muted">
                  Sign in with your email and password, and you&rsquo;ll be asked for the code.
                </p>

                {authError && (
                  <p
                    role={authError.includes('resent') ? 'status' : 'alert'}
                    className={`mt-4 rounded-2xl px-5 py-3 text-sm ${
                      authError.includes('resent') ? 'bg-oe-primary-tint text-oe-ink' : 'bg-oe-crisis-tint text-oe-crisis'
                    }`}
                  >
                    {authError}
                  </p>
                )}

                <div className="mt-6 space-y-3">
                  <Link
                    to="/signin"
                    state={{ returnTo: '/chat' }}
                    className="oe-btn flex w-full items-center justify-center rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
                  >
                    Enter my code
                  </Link>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-surface px-6 py-3 font-medium text-oe-ink disabled:opacity-50"
                  >
                    {resendingVerification ? (
                      <>
                        <i className="ri-loader-4-line animate-spin" aria-hidden="true" /> Sending…
                      </>
                    ) : (
                      <>
                        <i className="ri-refresh-line" aria-hidden="true" /> Send a new code
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setVerificationSent(false);
                      setIsSignUp(false);
                      setAuthError('');
                    }}
                    className="w-full cursor-pointer rounded-full border border-oe-line bg-white px-6 py-3 font-medium text-oe-ink"
                  >
                    Back to sign in
                  </button>
                </div>

                <p className="mt-5 text-xs text-oe-muted">Didn&rsquo;t get it? Check your spam folder or try another email.</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
                    <i className={forgotPassword ? 'ri-key-2-line' : 'ri-user-line'} />
                  </span>
                  <h2 id="chat-auth-title" className="mt-4 text-2xl font-bold">
                    {forgotPassword ? 'Reset your password' : isSignUp ? 'Create an account' : 'Welcome back.'}
                  </h2>
                  <p className="mt-2 text-sm text-oe-muted">
                    {forgotPassword
                      ? 'Enter your email and we’ll send you a reset link.'
                      : isSignUp
                        ? 'Sign up to chat with the AI Companion.'
                        : 'Sign in to keep chatting.'}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="mt-6 space-y-4">
                  {isSignUp && !forgotPassword && (
                    <div>
                      <label htmlFor="chat-auth-name" className="block text-sm font-medium">
                        Your name
                      </label>
                      <input
                        id="chat-auth-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="chat-auth-email" className="block text-sm font-medium">
                      Email
                    </label>
                    <input
                      id="chat-auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  {!forgotPassword && (
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="chat-auth-password" className="block text-sm font-medium">
                          Password
                        </label>
                        {!isSignUp && (
                          <button
                            type="button"
                            onClick={() => {
                              setForgotPassword(true);
                              setAuthError('');
                            }}
                            className="cursor-pointer text-sm font-medium text-oe-primary hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <input
                        id="chat-auth-password"
                        type="password"
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                        placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                        required
                      />
                    </div>
                  )}

                  {authError && (
                    <p
                      role={authMessageIsGood ? 'status' : 'alert'}
                      className={`rounded-2xl px-5 py-3 text-sm ${
                        authMessageIsGood ? 'bg-oe-primary-tint text-oe-ink' : 'bg-oe-crisis-tint text-oe-crisis'
                      }`}
                    >
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="oe-btn w-full cursor-pointer rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAuthLoading ? 'Please wait…' : forgotPassword ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in'}
                  </button>
                </form>

                <div className="mt-5 rounded-2xl bg-oe-surface-low p-4 text-center text-sm">
                  {forgotPassword ? (
                    <button
                      onClick={() => {
                        setForgotPassword(false);
                        setAuthError('');
                      }}
                      className="mx-auto inline-flex cursor-pointer items-center gap-1 font-semibold text-oe-primary hover:underline"
                    >
                      <i className="ri-arrow-left-line" aria-hidden="true" /> Back to sign in
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setAuthError('');
                      }}
                      className="cursor-pointer font-semibold text-oe-primary hover:underline"
                    >
                      {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
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
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-oe-muted hover:bg-oe-surface hover:text-oe-ink"
            >
              <i className="ri-close-line text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
