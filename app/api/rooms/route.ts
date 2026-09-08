import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db(request: Request) { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } } }) }
function code() { return Math.random().toString(36).slice(2, 8).toUpperCase() }

export async function POST(request: Request) {
  const supabase = db(request); const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const { data: existing } = await supabase.from('rooms').select('id,code,name,max_players,host_id,status').eq('host_id', user.id).eq('status', 'lobby').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Kamu masih memiliki room aktif.', room: existing }, { status: 409 })
  const body = await request.json().catch(() => ({})); const profile = { id: user.id, display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Pemain', avatar_url: user.user_metadata?.avatar_url }
  await supabase.from('profiles').upsert(profile)
  const { data, error } = await supabase.from('rooms').insert({ code: code(), name: body.name ?? `Room ${profile.display_name}`, host_id: user.id, max_players: body.maxPlayers ?? 5 }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const member = await supabase.from('room_members').insert({ room_id: data.id, user_id: user.id, is_ready: true })
  if (member.error) return NextResponse.json({ error: member.error.message }, { status: 400 })
  return NextResponse.json({ room: data })
}

export async function PATCH(request: Request) {
  const supabase = db(request); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const body = await request.json(); const { data: room } = await supabase.from('rooms').select('id,host_id,status').eq('id', body.roomId).single()
  if (!room) return NextResponse.json({ error: 'Room tidak ditemukan.' }, { status: 404 }); if (room.host_id !== user.id) return NextResponse.json({ error: 'Hanya host yang dapat mengedit room.' }, { status: 403 }); if (room.status !== 'lobby') return NextResponse.json({ error: 'Room sudah dimulai.' }, { status: 400 })
  const { data, error } = await supabase.from('rooms').update({ name: body.name, max_players: body.maxPlayers }).eq('id', body.roomId).select().single(); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json({ room: data })
}

export async function DELETE(request: Request) {
  const supabase = db(request); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const params = new URL(request.url).searchParams; const roomId = params.get('roomId'); const leaving = params.get('leave') === '1'
  const { data: room } = await supabase.from('rooms').select('id,host_id').eq('id', roomId).single()
  if (!room) return NextResponse.json({ error: 'Room tidak ditemukan.' }, { status: 404 })
  if (leaving && room.host_id !== user.id) {
    const { error } = await supabase.from('room_members').delete().eq('room_id', room.id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, left: true })
  }
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Hanya host yang dapat menutup room.' }, { status: 403 })
  const { error } = await supabase.from('rooms').update({ status: 'closed' }).eq('id', roomId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, closed: true })
}

export async function GET(request: Request) {
  const supabase = db(request); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  if (params.get('mine') === '1') {
    const { data, error } = await supabase.from('rooms').select('id,code,name,max_players,host_id,status').eq('host_id', user.id).eq('status', 'lobby').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ room: data })
  }
  const codeParam = params.get('code')?.toUpperCase(); if (!codeParam) return NextResponse.json({ error: 'Kode room wajib diisi.' }, { status: 400 })
  const { data: room, error } = await supabase.from('rooms').select('*, room_members(*, profiles(*))').eq('code', codeParam).single()
  if (error || !room || room.status !== 'lobby') return NextResponse.json({ error: 'Room tidak ditemukan atau sudah dimulai.' }, { status: 404 })
  await supabase.from('profiles').upsert({ id: user.id, display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Pemain', avatar_url: user.user_metadata?.avatar_url })
  const joined = await supabase.from('room_members').upsert({ room_id: room.id, user_id: user.id }).select().single()
  if (joined.error) return NextResponse.json({ error: joined.error.message }, { status: 400 })
  return NextResponse.json({ room })
}

