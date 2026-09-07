import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } } })
  const { data: { user } } = await db.auth.getUser(); if (!user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 })
  const { data, error } = await db.from('races').select('id,status,started_at,ended_at,rooms(id,code,name,status),song_texts(id,title,artist,text_content)').eq('id', params.id).single()
  if (error || !data) return NextResponse.json({ error: 'Race tidak ditemukan.' }, { status: 404 })
  return NextResponse.json({ race: data })
}
