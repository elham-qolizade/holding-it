import { PersonalState, Lang } from '@/types';

export const DEFAULT_STATE: PersonalState = {
  day: null,
  trips: [],
  bestHold: 0,
  holdingSince: null,
  waterLog: [],
  waterGoal: 2000,
  poopLog: [],
  remedies: [],
  lastPoopAt: null,
  constipationDays: 0,
  battleStart: null,
};

export function loadPersonalState(): PersonalState {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  let state = { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem('holdingit');
    if (raw) {
      state = { ...state, ...JSON.parse(raw) };
    }
  } catch {}

  if (!Array.isArray(state.trips)) state.trips = [];
  if (typeof state.bestHold !== 'number') state.bestHold = 0;
  if (!Array.isArray(state.waterLog)) state.waterLog = [];
  if (![1500, 2000, 2500, 3000].includes(state.waterGoal)) state.waterGoal = 2000;
  if (!Array.isArray(state.poopLog)) state.poopLog = [];
  if (!Array.isArray(state.remedies)) state.remedies = [];
  if (typeof state.lastPoopAt !== 'number') state.lastPoopAt = null;
  if (typeof state.constipationDays !== 'number') state.constipationDays = 0;
  if (typeof state.battleStart !== 'number') state.battleStart = null;

  if (
    !Number.isFinite(state.holdingSince) ||
    (state.holdingSince !== null && (state.holdingSince <= 0 || state.holdingSince > Date.now()))
  ) {
    state.holdingSince = null;
  }

  // Check daily reset
  const today = new Date().toDateString();
  if (state.day !== today) {
    if (state.lastPoopAt) {
      state.constipationDays = Math.max(
        0,
        Math.floor((Date.now() - state.lastPoopAt) / (24 * 3600 * 1000))
      );
    }
    state = {
      ...state,
      day: today,
      trips: [],
      bestHold: 0,
      waterLog: [],
      poopLog: [],
      remedies: [],
      battleStart: null,
    };
    savePersonalState(state);
  }

  return state;
}

export function savePersonalState(state: PersonalState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('holdingit', JSON.stringify(state));
  } catch {}
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-session';
  try {
    let session = localStorage.getItem('holdingit-session');
    if (!session) {
      session =
        crypto.randomUUID?.() ??
        '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
          (
            Number(c) ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
          ).toString(16)
        );
      localStorage.setItem('holdingit-session', session);
    }
    return session;
  } catch {
    return 'fallback-session';
  }
}

export function getMyIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('holdingit-ids') || '[]');
  } catch {
    return [];
  }
}

export function saveMyIds(ids: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('holdingit-ids', JSON.stringify(ids.slice(-30)));
  } catch {}
}

export function getStoredLang(): Lang {
  if (typeof window === 'undefined') return 'fa';
  try {
    const l = localStorage.getItem('holdingit-lang');
    if (l === 'en' || l === 'fa') return l;
  } catch {}
  return 'fa';
}

export function setStoredLang(lang: Lang): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('holdingit-lang', lang);
  } catch {}
}
