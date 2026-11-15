// Supabase publishable (anon) key: safe to expose, access is enforced by RLS and the RPC functions.
// Override per environment with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_KEY.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpaastiurmstbmzcjcvo.supabase.co';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_KEY || 'sb_publishable_rGOhLBbGZ7ET96mKtJKfGQ_U_wiXuTB';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://holding-it.vercel.app';
