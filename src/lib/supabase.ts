import { FeedItem, NewsData } from '@/types';

const API = 'https://qpaastiurmstbmzcjcvo.supabase.co/rest/v1/rpc/';
const API_KEY = 'sb_publishable_rGOhLBbGZ7ET96mKtJKfGQ_U_wiXuTB';

export async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API + fn, {
    method: 'POST',
    headers: {
      apikey: API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (res.ok) {
    return res.status === 204 ? (null as T) : res.json();
  }

  const body = await res.json().catch(() => ({}));
  throw new Error(body.message || `${fn}: ${res.status}`);
}

export interface PulseResponse {
  in_toilet: number;
  holding: number;
  today: number;
  feed: FeedItem[];
}

export async function fetchPulse(): Promise<PulseResponse> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/pulse');
      if (res.ok) {
        return (await res.json()) as PulseResponse;
      }
    } catch {}
  }
  return rpc<PulseResponse>('pulse');
}

export async function logEvent(params: {
  p_session: string;
  p_type: 'hold' | 'go';
  p_held_mins?: number;
  p_name?: string | null;
  p_kind?: 'pee' | 'poop';
}): Promise<number> {
  return rpc<number>('log_event', params);
}

export async function fetchNews(): Promise<NewsData> {
  return rpc<NewsData>('news');
}

export interface CommunityPlaceRow {
  id: number;
  lat: number;
  lon: number;
  note: string | null;
  fee: 'free' | 'paid' | 'unknown';
  toilet_type: 'iranian' | 'western' | 'both' | 'unknown';
  opening_hours: string | null;
  confirms: number;
  last_status: 'usable' | 'clean' | 'dirty' | 'closed' | 'paid' | null;
  last_reported_at: string | null;
}

export async function fetchPlacesNear(
  lat: number,
  lon: number,
  radius = 5000
): Promise<CommunityPlaceRow[]> {
  return rpc<CommunityPlaceRow[]>('places_near', {
    p_lat: lat,
    p_lon: lon,
    p_radius: radius,
  });
}

export async function addPlaceWithDetails(params: {
  p_session: string;
  p_lat: number;
  p_lon: number;
  p_fee: string;
  p_note: string | null;
  p_toilet_type: string;
  p_opening_hours: string | null;
}): Promise<number> {
  return rpc<number>('add_place_with_details', params);
}

export async function reportStatus(params: {
  p_session: string;
  p_place_id: number;
  p_status: string;
}): Promise<{ status: string; reported_at: string }> {
  return rpc<{ status: string; reported_at: string }>('report_status', params);
}

export async function reportPlace(params: { p_session: string; p_id: number }): Promise<void> {
  return rpc<void>('report_place', params);
}

export async function submitFeedback(params: {
  p_session: string;
  p_kind: string;
  p_message: string;
  p_name: string | null;
  p_lang: string;
  p_app_version: string;
}): Promise<void> {
  return rpc<void>('submit_feedback', params);
}
