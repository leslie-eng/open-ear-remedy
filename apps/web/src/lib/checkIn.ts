/*
 * The Check-in: five optional questions that point someone to the kind of support that fits.
 * Answers never leave the browser (localStorage only); nothing here talks to the API.
 */

export type CheckInStep = 'mood' | 'weight' | 'duration' | 'support' | 'goal';

export interface CheckInOption {
  id: string;
  title: string;
  body: string;
  icon: string; // Remix Icon class
}

export interface CheckInQuestion {
  step: CheckInStep;
  label: string; // short name in the step tracker
  title: string;
  intro: string;
  multiple: boolean;
  options: CheckInOption[];
}

export const CHECK_IN_QUESTIONS: CheckInQuestion[] = [
  {
    step: 'mood',
    label: 'Mood',
    title: 'How are you feeling right now?',
    intro: 'Pick whatever rings true today. There are no right or wrong answers, and no one is grading you.',
    multiple: false,
    options: [
      { id: 'lonely', title: 'Lonely', body: 'Isolated, unseen, or carrying things by yourself.', icon: 'ri-cloudy-line' },
      { id: 'stressed', title: 'Stressed', body: 'Pressured, overwhelmed, or racing inside.', icon: 'ri-windy-line' },
      { id: 'low', title: 'Low', body: 'Heavy, drained, flat, or out of energy.', icon: 'ri-drizzle-line' },
      { id: 'angry', title: 'Angry', body: 'Frustrated, resentful, irritated, or bottled up.', icon: 'ri-sun-cloudy-line' },
      { id: 'numb', title: 'Numb', body: 'Detached, running on empty, feeling disconnected.', icon: 'ri-leaf-line' },
      { id: 'unsure', title: 'Not sure', body: 'Hard to put into words right now. That is okay too.', icon: 'ri-question-line' },
    ],
  },
  {
    step: 'weight',
    label: 'Weight',
    title: 'What’s been weighing on you most?',
    intro: 'Select all that apply. No need to explain or justify any of them.',
    multiple: true,
    options: [
      { id: 'relationships', title: 'Relationships & drift', body: 'Partner, dating, divorce, or growing distant from close friends.', icon: 'ri-heart-2-line' },
      { id: 'work', title: 'Work, burnout & money', body: 'Exhaustion, financial stress, feeling trapped or constantly behind.', icon: 'ri-flashlight-line' },
      { id: 'family', title: 'Family responsibilities', body: 'Expectations at home and the pressure to hold everything together.', icon: 'ri-parent-line' },
      { id: 'loneliness', title: 'Loneliness & isolation', body: 'Feeling disconnected even in a crowded room. No one to be fully real with.', icon: 'ri-user-unfollow-line' },
      { id: 'health', title: 'Physical health & energy', body: 'Sleep issues, tiredness, body changes, or health worries.', icon: 'ri-pulse-line' },
      { id: 'unnamed', title: 'Something hard to name', body: 'A general fog, restlessness, or weight you can’t easily put into a box.', icon: 'ri-compass-3-line' },
    ],
  },
  {
    step: 'duration',
    label: 'Duration',
    title: 'How long has it felt this way?',
    intro: 'Time can warp when you’re carrying things alone. Pick the closest estimate.',
    multiple: false,
    options: [
      { id: 'days', title: 'Just a few days', body: 'A sudden spike, bad news, or a rough patch this week.', icon: 'ri-flashlight-line' },
      { id: 'weeks', title: 'A few weeks or months', body: 'Slowly creeping up, or something unresolved that keeps dragging on.', icon: 'ri-contrast-drop-2-line' },
      { id: 'long', title: 'A long time, months or years', body: 'It’s become background noise. You’ve got used to pushing through.', icon: 'ri-landscape-line' },
    ],
  },
  {
    step: 'support',
    label: 'Support',
    title: 'Is there anyone you can talk to about this?',
    intro: 'Many people keep the heavy stuff to themselves. Whatever your answer, you’re welcome here.',
    multiple: false,
    options: [
      { id: 'burden', title: 'Yes, but I don’t want to burden them', body: 'They have their own problems, or you worry it would change how they see you.', icon: 'ri-scales-3-line' },
      { id: 'surface', title: 'Sort of, but not for the deep stuff', body: 'You talk about everyday things, but when it gets heavy the conversation moves on.', icon: 'ri-chat-3-line' },
      { id: 'alone', title: 'Not really, I’m on my own with this', body: 'There isn’t anyone safe to open up to right now. That’s why Open Ear is here.', icon: 'ri-user-line' },
    ],
  },
  {
    step: 'goal',
    label: 'Goals',
    title: 'What would help you most right now?',
    intro: 'Tell us what kind of presence feels best today. There is no wrong answer.',
    multiple: false,
    options: [
      { id: 'listen', title: 'Just someone to listen', body: 'No advice, no fixing, no pep talks. A person hearing you out with patience.', icon: 'ri-chat-heart-line' },
      { id: 'untangle', title: 'Help untangling my thoughts', body: 'Things feel jumbled. Someone to ask gentle questions so it starts making sense.', icon: 'ri-git-merge-line' },
      { id: 'steps', title: 'A sounding board for next steps', body: 'Talk it through and find one realistic thing you could do tomorrow.', icon: 'ri-footprint-line' },
      { id: 'quiet', title: 'A quiet moment to catch my breath', body: 'Low pressure and gentle pacing, or a quiet text exchange.', icon: 'ri-cup-line' },
    ],
  },
];

/** Answers keyed by step. An empty array means "I'd rather not say" or not answered yet. */
export type CheckInAnswers = Partial<Record<CheckInStep, string[]>>;

export type SupportOption = 'talk' | 'text' | 'book';

const STORAGE_KEY = 'openear.checkIn';

export function loadCheckIn(): CheckInAnswers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CheckInAnswers) : {};
  } catch {
    return {};
  }
}

export function saveCheckIn(answers: CheckInAnswers): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    // Private browsing or full storage: the check-in still works, it just isn't kept.
  }
}

export function clearCheckIn(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const first = (answers: CheckInAnswers, step: CheckInStep) => answers[step]?.[0];

/** Which way of talking to mark "Recommended for you". */
export function recommend(answers: CheckInAnswers): SupportOption {
  // Someone who wants quiet, or feels numb, may find typing easier than speaking.
  if (first(answers, 'goal') === 'quiet' || first(answers, 'mood') === 'numb') return 'text';
  return 'talk';
}

const MOOD_PHRASES: Record<string, string> = {
  lonely: 'feeling isolated',
  stressed: 'under a lot of pressure',
  low: 'feeling low and drained',
  angry: 'carrying a lot of frustration',
  numb: 'feeling numb and disconnected',
  unsure: 'carrying something that’s hard to name',
};

const DURATION_PHRASES: Record<string, string> = {
  days: 'over the last few days',
  weeks: 'for a few weeks',
  long: 'for a long time',
};

const GOAL_PHRASES: Record<string, string> = {
  listen: 'could use someone to just listen',
  untangle: 'could use some help untangling your thoughts',
  steps: 'could use a sounding board',
  quiet: 'could use a quiet moment to breathe',
};

/** One warm sentence reflecting the answers back. Skipped questions are simply left out. */
export function reflection(answers: CheckInAnswers): string {
  const mood = MOOD_PHRASES[first(answers, 'mood') ?? ''] ?? 'carrying a lot';
  const duration = DURATION_PHRASES[first(answers, 'duration') ?? ''];
  const goal = GOAL_PHRASES[first(answers, 'goal') ?? ''] ?? 'could use someone to listen';
  return `Sounds like you’ve been ${mood}${duration ? ` ${duration}` : ''} and ${goal}. That takes courage to admit.`;
}
