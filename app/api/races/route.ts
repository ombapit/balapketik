import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } } })
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const { roomId } = await request.json(); const { data: room, error: roomError } = await supabase.from('rooms').select('id,host_id,status').eq('id', roomId).single()
  if (roomError || !room) return NextResponse.json({ error: 'Room tidak ditemukan.' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Hanya host yang dapat memulai race.' }, { status: 403 })
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Room belum siap untuk race baru.' }, { status: 400 })
  const { data: songs } = await supabase.from('song_texts').select('id').eq('is_active', true)
  if (!songs?.length) return NextResponse.json({ error: 'Belum ada lagu aktif.' }, { status: 400 })
  const { data: lastRace } = await supabase.from('races').select('song_text_id').eq('room_id', roomId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const songOptions = songs.filter(song => song.id !== lastRace?.song_text_id)
  const choices = songOptions.length ? songOptions : songs
  const song = choices[Math.floor(Math.random() * choices.length)]
  const startsAt = new Date(Date.now() + 10000).toISOString(); const { data: race, error } = await supabase.from('races').insert({ room_id: roomId, song_text_id: song.id, status: 'racing', started_at: startsAt }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await supabase.from('rooms').update({ status: 'racing' }).eq('id', roomId)
  return NextResponse.json({ race, startsAt })
}
