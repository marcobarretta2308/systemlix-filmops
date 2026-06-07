// Supabase server client — for Server Components and Route Handlers.

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  // When @supabase/supabase-js is installed:
  // import { createServerClient } from '@supabase/ssr'
  // import { cookies } from 'next/headers'
  // ...
  return null;
}
