import { NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/config';

export const runtime = 'edge';
export const revalidate = 5;

const SUPABASE_PULSE_URL = `${SUPABASE_URL}/rest/v1/rpc/pulse`;

export async function GET() {
  try {
    const res = await fetch(SUPABASE_PULSE_URL, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      next: { revalidate: 5 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Supabase returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
