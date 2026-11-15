export type Lang = 'fa' | 'en';

export type EventType = 'hold' | 'go';
export type EventKind = 'pee' | 'poop';

export interface FeedItem {
  id: number;
  type: EventType;
  kind: EventKind;
  held_mins: number | null;
  nth: number | null;
  country: string | null;
  name: string | null;
}

export interface WorldStats {
  inToilet: number | null;
  holding: number | null;
  todayTotal: number | null;
}

export interface NewsPerson {
  country?: string | null;
  name?: string | null;
  mins?: number;
  n?: number;
}

export interface NewsData {
  record?: { mins: number; country?: string | null; name?: string | null };
  holding?: { mins: number; country?: string | null; name?: string | null };
  busiest?: { n: number; country?: string | null; name?: string | null };
  country?: { country: string; n: number };
  today?: number;
}

export interface WaterEntry {
  ml: number;
  at: number;
}

export type PoopResult = 'smooth' | 'struggle' | 'liquid' | 'failed';

export interface PoopLogEntry {
  at: number;
  result: PoopResult;
  durationMins: number;
}

export type RemedyKey =
  | 'water'
  | 'olive'
  | 'flixweed'
  | 'figs'
  | 'squat'
  | 'kiwi'
  | 'walk'
  | 'coffee';

export interface PersonalState {
  day: string | null;
  trips: number[];
  bestHold: number;
  holdingSince: number | null;
  name?: string;
  remind?: boolean;
  remindOn?: number;
  nudgedFor?: number;
  waterLog: WaterEntry[];
  waterGoal: number;
  poopLog: PoopLogEntry[];
  remedies: string[];
  lastPoopAt: number | null;
  constipationDays: number;
  battleStart: number | null;
}

export type ToiletType = 'iranian' | 'western' | 'both' | 'unknown';
export type ToiletFee = 'free' | 'paid' | 'unknown';
export type ToiletCondition = 'usable' | 'clean' | 'dirty' | 'closed' | 'paid';

export interface SosPlace {
  kind: 'toilet' | 'worship' | 'fuel' | 'hospital' | 'clinic';
  name: string;
  pos: [number, number];
  dist: number;
  tags: {
    fee?: 'yes' | 'no' | string;
    wheelchair?: string;
    toiletType?: ToiletType;
    opening_hours?: string;
    religion?: string;
  };
  community?: {
    id: number;
    confirms: number;
    lastStatus: ToiletCondition | null;
    lastReportedAt: string | null;
  };
}

export interface CertificateRuling {
  stamp: string;
  verdict: string;
}
