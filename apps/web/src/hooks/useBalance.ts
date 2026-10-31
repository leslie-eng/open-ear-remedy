import { useCallback, useEffect, useState } from 'react';
import { CREDITS_PER_CHAT_MESSAGE, callSecondsAvailable } from '@openear/shared/pricing';
import { apiFetch } from '../lib/api';

export interface PassBalance {
  startsAt: string;
  expiresAt: string;
  callSecondsLeft: number;
  aiMessagesPerDay: number;
  aiMessagesLeftToday: number;
}

export interface Balance {
  credits: number;
  pass: PassBalance | null;
  queuedPass: { startsAt: string; expiresAt: string } | null;
  free_credits_available?: boolean;
}

const EMPTY: Balance = { credits: 0, pass: null, queuedPass: null };

/** What the signed-in user can spend: credits plus any Monthly Pass allowance. */
export function useBalance(enabled: boolean) {
  const [balance, setBalance] = useState<Balance>(EMPTY);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setBalance(await apiFetch<Balance>('/api/user/credits'));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { balance, setBalance, loading, refresh };
}

/** A message can be sent from today's pass allowance or with credits. */
export function canSendChatMessage(balance: Balance): boolean {
  return (balance.pass?.aiMessagesLeftToday ?? 0) > 0 || balance.credits >= CREDITS_PER_CHAT_MESSAGE;
}

/** Longest call the balance pays for (pass time + credits, capped at 60 minutes). */
export function callSecondsFor(balance: Balance): number {
  return callSecondsAvailable({ credits: balance.credits, passSecondsLeft: balance.pass?.callSecondsLeft ?? 0 });
}
