import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } } })
  const { data: { user } } = await db.auth.getUser(); if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const { data: race } = await db.from('races').select('id,room_id,status,rooms(host_id)').eq('id', params.id).single(); if (!race) return NextResponse.json({ error: 'Race tidak ditemukan.' }, { status: 404 })
  const room = Array.isArray(race.rooms) ? race.rooms[0] : race.rooms; if (!room || room.host_id !== user.id) return NextResponse.json({ error: 'Hanya host yang dapat mengakhiri race.' }, { status: 403 })
  const endedAt = new Date().toISOString(); const { error } = await db.from('races').update({ status: 'finished', ended_at: endedAt }).eq('id', params.id); if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await db.from('rooms').update({ status: 'finished' }).eq('id', race.room_id)
  return NextResponse.json({ ok: true, endedAt })
}
