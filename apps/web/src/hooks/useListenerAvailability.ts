import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const POLL_MS = 60_000;

/** Whether a listener is free right now (real presence), or null if unknown. Polls once a minute. */
export function useListenerAvailability(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      apiFetch<{ listenersAvailable: boolean }>('/api/public/availability')
        .then((r) => !cancelled && setAvailable(r.listenersAvailable))
        .catch(() => !cancelled && setAvailable(null));
    void check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return available;
}
