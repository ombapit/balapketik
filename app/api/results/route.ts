import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function client(request: Request) { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } } }) }
function analyticsClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) }

export async function POST(request: Request) {
  const db = client(request); const { data: { user } } = await db.auth.getUser(); if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const body = await request.json(); const wpm = Number(body.wpm); const accuracy = Number(body.accuracy); const elapsedMs = Number(body.elapsedMs)
  if (!body.raceId || !Number.isFinite(wpm) || !Number.isFinite(accuracy) || wpm < 0 || accuracy < 0 || accuracy > 100) return NextResponse.json({ error: 'Data hasil race tidak valid.' }, { status: 400 })
  const { data: race } = await db.from('races').select('id,room_id,status,rooms(max_players)').eq('id', body.raceId).single(); if (!race) return NextResponse.json({ error: 'Race tidak ditemukan.' }, { status: 404 })
  const { data: previous } = await db.from('race_results').select('id').eq('race_id', body.raceId).eq('user_id', user.id).maybeSingle(); if (previous) return NextResponse.json({ error: 'Hasil race sudah tersimpan.' }, { status: 409 })
  const { data, error } = await db.from('race_results').insert({ race_id: body.raceId, user_id: user.id, wpm, accuracy, elapsed_ms: elapsedMs, is_valid: true }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await db.from('races').update({ status: 'finished', ended_at: new Date().toISOString() }).eq('id', race.id).eq('status', 'racing')
  const isPractice = (Array.isArray(race.rooms) ? race.rooms[0] : race.rooms)?.max_players === 1
  await db.from('rooms').update(isPractice ? { status: 'closed' } : { status: 'lobby' }).eq('id', race.room_id)
  return NextResponse.json({ result: data })
}

export async function GET(request: Request) {
  const auth = client(request); const { data: { user } } = await auth.auth.getUser(); if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const { data, error } = await analyticsClient().from('race_results').select('user_id,wpm,accuracy,created_at,profiles(display_name),races(song_texts(title,artist))').eq('is_valid', true).order('wpm', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const bestByUser = new Map<string, typeof data extends (infer Item)[] | null ? Item : never>()
  for (const result of data ?? []) { if (!bestByUser.has(result.user_id)) bestByUser.set(result.user_id, result) }
  return NextResponse.json({ results: Array.from(bestByUser.values()).slice(0, 10) })
}

