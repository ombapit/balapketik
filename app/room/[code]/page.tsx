'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import RoomLobby from '../../components/RoomLobby'
import LoadingSkeleton from '../../components/LoadingSkeleton'

type Room = { id: string; host_id: string; name?: string }

export default function RoomPage() {
  const params = useParams<{ code: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) return setError('Supabase belum dikonfigurasi.')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return setError('Login diperlukan untuk masuk ke room.')
      setUserId(session.user.id)
      const response = await fetch(`/api/rooms?code=${encodeURIComponent(params.code)}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      const body = await response.json()
      if (!response.ok) return setError(body.error || 'Room tidak ditemukan.')
      setRoom(body.room)
    }
    load()
  }, [params.code])

  async function leaveRoom() {
    if (!supabase || !room || isLeaving) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setIsLeaving(true)
    await fetch(`/api/rooms?roomId=${room.id}&leave=1`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
    window.location.href = '/'
  }

  if (error) return <main className="content room-page"><div className="panel room-error"><p className="eyebrow">ROOM TIDAK TERSEDIA</p><h1>{error}</h1><a className="secondary room-back" href="/">← Kembali ke dashboard</a></div></main>
  if (!room || !userId) return <main className="content room-page"><LoadingSkeleton variant="room" label="Menghubungkan ke lobby room..." /></main>

  return <main className="content room-page"><section className="room-banner"><div><p className="eyebrow">LOBBY ROOM · LIVE</p><h1>Siapkan mesin.<br /><em>Gas bareng teman.</em></h1><p>Semua peserta harus siap sebelum host memulai hitung mundur.</p></div><button className="secondary room-dashboard-button" disabled={isLeaving} onClick={leaveRoom}>{isLeaving ? 'Keluar...' : '← Dashboard'}</button><div className="room-code"><span>KODE ROOM</span><strong>{params.code.toUpperCase()}</strong><i>••••••••</i></div></section><section className="panel room-control"><div className="room-control-title"><div><p className="eyebrow">RACE CONTROL</p><h2>{room.name || `Room ${params.code.toUpperCase()}`}</h2></div></div><RoomLobby roomId={room.id} hostId={room.host_id} currentUserId={userId} /></section></main>
}




