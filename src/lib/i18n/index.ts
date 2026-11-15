import { en } from './en';
import { fa } from './fa';
import { Lang } from '@/types';

export const dictionaries = { en, fa };

export const TITLE_AT = [0, 5, 15, 30, 45, 60]; // minutes at which each hold title unlocks
export const MIN = 60_000;

export const faDigits = (s: string | number): string =>
  String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

export const num = (n: string | number, l: Lang = 'fa'): string =>
  l === 'fa' ? faDigits(n) : String(n);

export const titleIndex = (ms: number): number => {
  const mins = ms / MIN;
  let idx = 0;
  for (let i = 0; i < TITLE_AT.length; i++) {
    if (mins >= TITLE_AT[i]) idx = i;
  }
  return idx;
};

export const fmtMin = (ms: number, l: Lang = 'fa'): string => {
  const m = Math.round(ms / MIN);
  return m < 60
    ? dictionaries[l].mins(num(m, l))
    : dictionaries[l].hours(num(Math.floor(m / 60), l), num(m % 60, l));
};

export const avgGap = (trips: number[]): number | null =>
  trips.length < 2 ? null : (trips[trips.length - 1] - trips[0]) / (trips.length - 1);

export const flagOf = (code: string | null | undefined): string =>
  code
    ? String.fromCodePoint(...code.toUpperCase().split('').map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '🌍';

export const ordinal = (n: number): string =>
  n +
  (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] ||
    ['th', 'st', 'nd', 'rd'][n % 100] ||
    'th');
