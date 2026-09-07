import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeCode() {
  return 'SOLO' + Math.random().toString(36).slice(2, 7).toUpperCase()
}

export async function POST(request: Request) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: request.headers.get('authorization') ?? '' } },
  })
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Login diperlukan untuk memulai latihan.' }, { status: 401 })

  const { data: songs, error: songsError } = await db.from('song_texts').select('id').eq('is_active', true)
  if (songsError || !songs?.length) return NextResponse.json({ error: 'Belum ada teks lagu aktif untuk latihan.' }, { status: 400 })
  const song = songs[Math.floor(Math.random() * songs.length)]
  const startsAt = new Date(Date.now() + 3000).toISOString()
  const { data: room, error: roomError } = await db.from('rooms').insert({
    code: makeCode(), name: 'Latihan Solo', host_id: user.id, max_players: 1, status: 'racing',
  }).select('id').single()
  if (roomError || !room) return NextResponse.json({ error: roomError?.message || 'Gagal menyiapkan lintasan latihan.' }, { status: 400 })

  const { data: race, error: raceError } = await db.from('races').insert({ room_id: room.id, song_text_id: song.id, status: 'racing', started_at: startsAt }).select('id').single()
  if (raceError || !race) {
    await db.from('rooms').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', room.id)
    return NextResponse.json({ error: raceError?.message || 'Gagal membuat latihan.' }, { status: 400 })
  }
  return NextResponse.json({ raceId: race.id })
}