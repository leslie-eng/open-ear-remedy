import { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID as CLIENT_ID } from '../../lib/googleIdentity';

/** Google Identity Services, loaded from Google on demand. */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup' }) => void;
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptLoad: Promise<void> | null = null;

function loadScript(): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptLoad = null;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(s);
  });
  return scriptLoad;
}

/**
 * Google's own "Sign in with Google" button. Calls `onCredential` with the ID token Google
 * signed; the API checks it. Renders nothing when VITE_GOOGLE_CLIENT_ID is not set.
 */
export default function GoogleSignInButton({
  onCredential,
  onError,
  text = 'continue_with',
}: {
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}) {
  const container = useRef<HTMLDivElement>(null);
  // Keep the latest callbacks without re-rendering Google's button.
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          ux_mode: 'popup',
          callback: ({ credential }) => handlers.current.onCredential(credential),
        });
        window.google.accounts.id.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width: container.current.offsetWidth || 320,
        });
      })
      .catch((err: Error) => handlers.current.onError?.(err.message));
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  return <div ref={container} className="flex w-full justify-center" />;
}
