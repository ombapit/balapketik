import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function authenticatedClient(request: Request) { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } } }) }
function analyticsClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) }

export async function GET(request: Request) {
  const auth = authenticatedClient(request); const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const db = analyticsClient()
  const { data: results, error } = await db.from('race_results').select('id,wpm,accuracy,elapsed_ms,rank,created_at,races(song_texts(title,artist),rooms(name))').eq('user_id', user.id).eq('is_valid', true).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const rows = results ?? []; const total = rows.length; const wins = rows.filter(row => row.rank === 1).length
  const average = (key: 'wpm' | 'accuracy') => total ? Math.round(rows.reduce((sum, row) => sum + Number(row[key]), 0) / total * 10) / 10 : 0
  return NextResponse.json({ stats: { totalRaces: total, wins, winRate: total ? Math.round(wins / total * 100) : 0, averageWpm: average('wpm'), bestWpm: total ? Math.max(...rows.map(row => Number(row.wpm))) : 0, averageAccuracy: average('accuracy'), bestAccuracy: total ? Math.max(...rows.map(row => Number(row.accuracy))) : 0 }, history: rows })
}

