import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 5;

const SUPABASE_PULSE_URL = 'https://qpaastiurmstbmzcjcvo.supabase.co/rest/v1/rpc/pulse';
const SUPABASE_KEY = 'sb_publishable_rGOhLBbGZ7ET96mKtJKfGQ_U_wiXuTB';

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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
