import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const cookieStore = cookies()
  const response = NextResponse.redirect(new URL('/', request.url))
  if (!code) return response
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(items) { items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
    },
  })
  await supabase.auth.exchangeCodeForSession(code)
  return response
}
