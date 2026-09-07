import { supabase } from './supabase'

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi. Isi file .env.local terlebih dahulu.')
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' } } })
}
