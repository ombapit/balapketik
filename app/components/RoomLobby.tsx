'use client'

import { useEffect, useState } from 'react'
import { subscribeToRoom, broadcastRaceEvent } from '../../lib/room-realtime'
import { supabase } from '../../lib/supabase'

type Member = { user_id: string; is_ready: boolean; profiles?: { display_name?: string; avatar_url?: string } }

export default function RoomLobby({ roomId, hostId, currentUserId, onStart }: { roomId: string; hostId: string; currentUserId: string; onStart?: (raceId: string) => void }) {
  const [members, setMembers] = useState<Member[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const [messages, setMessages] = useState<{ name: string; message: string }[]>([])
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState<ReturnType<typeof subscribeToRoom>>(null)
  const [isTogglingReady, setIsTogglingReady] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    const active = subscribeToRoom(roomId, currentUserId, {
      onMemberChange: () => loadMembers(),
      onPresenceChange: setOnlineUserIds,
      onChat: payload => {
        const row = payload as { new?: { message?: string; user_id?: string } }
        const item = row.new
        if (item?.message) setMessages(items => [...items, { name: item.user_id === currentUserId ? 'Kamu' : 'Teman', message: item.message! }])
      },
      onRaceEvent: payload => {
        const event = payload as { type?: string; raceId?: string }
        if (event.type === 'started' && event.raceId) window.location.href = `/race/${event.raceId}`
      },
    })
    setChannel(active)
    loadMembers()
    return () => { if (active && supabase) supabase.removeChannel(active) }
  }, [roomId, currentUserId])

  async function loadMembers() {
    if (!supabase) return
    const { data } = await supabase.from('room_members').select('user_id,is_ready,profiles(display_name,avatar_url)').eq('room_id', roomId)
    if (data) setMembers(data as Member[])
  }

  async function toggleReady() {
    if (!supabase || isTogglingReady) return
    setIsTogglingReady(true)
    try {
      const me = members.find(member => member.user_id === currentUserId)
      await supabase.from('room_members').update({ is_ready: !me?.is_ready }).eq('room_id', roomId).eq('user_id', currentUserId)
      await loadMembers()
    } finally { setIsTogglingReady(false) }
  }

  async function sendMessage() {
    if (!message.trim() || !supabase || !channel || isSending) return
    setIsSending(true)
    try {
      await supabase.from('chat_messages').insert({ room_id: roomId, user_id: currentUserId, message: message.trim() })
      setMessage('')
    } finally { setIsSending(false) }
  }

  async function startRace() {
    if (!channel || !canStart || !supabase || isStarting) return
    setIsStarting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setIsStarting(false); return }
    const response = await fetch('/api/races', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ roomId }) })
    const body = await response.json()
    if (!response.ok) { setIsStarting(false); return alert(body.error || 'Gagal memulai race') }
    await broadcastRaceEvent(channel, { type: 'started', raceId: body.race.id, startsAt: body.startsAt })
    if (onStart) onStart(body.race.id)
    else window.location.href = `/race/${body.race.id}`
  }

  const visibleMembers = members.filter(member => onlineUserIds.includes(member.user_id))
  const readyCount = visibleMembers.filter(member => member.is_ready).length
  const canStart = readyCount >= 2
  const ownMember = members.find(member => member.user_id === currentUserId)

  return <div className="lobby-live">
    <section className="lobby-members lobby-section">
      <div className="lobby-section-head"><div><p className="eyebrow">GARASI PESERTA</p><h2>{visibleMembers.length} pembalap di room</h2></div><span className={`ready-badge${canStart ? ' ready-badge-on' : ''}`}>{readyCount}/{Math.max(2, visibleMembers.length)} siap</span></div>
      <div className="member-list">{visibleMembers.map(member => { const name = member.profiles?.display_name ?? 'Pemain'; return <div className="lobby-member" key={member.user_id}><span className="avatar mini">{name.slice(0, 2).toUpperCase()}</span><strong>{member.user_id === currentUserId ? 'Kamu' : name}{member.user_id === hostId && <small>HOST</small>}</strong><span className={`member-car${member.is_ready ? ' member-car-ready' : ''}`} aria-hidden="true"><i /><b /></span><span className={member.is_ready ? 'ready' : 'waiting'}>{member.is_ready ? 'SIAP' : 'MENUNGGU'}</span></div> })}</div>
      <div className="lobby-actions"><button className="secondary full" disabled={isTogglingReady || isStarting} onClick={toggleReady}>{isTogglingReady && <span className="button-spinner" />} {isTogglingReady ? 'Memperbarui...' : ownMember?.is_ready ? 'Batalkan siap' : 'Saya siap balapan'}</button>{currentUserId === hostId && <button className="primary full" disabled={!canStart || isStarting} onClick={startRace}>{isStarting && <span className="button-spinner" />} {isStarting ? 'Menyiapkan lintasan...' : canStart ? 'Mulai race →' : 'Butuh 2 peserta siap'}</button>}</div>
    </section>
    <section className="lobby-chat lobby-section"><div className="lobby-section-head"><div><p className="eyebrow">PIT STOP CHAT</p><h2>Obrolan room</h2></div><span className="chat-dot">LIVE</span></div><div className="chat-stream">{messages.length ? messages.map((item, index) => <p key={index}><strong>{item.name}</strong>{item.message}</p>) : <p className="chat-empty">Sapa temanmu sebelum lampu start menyala.</p>}</div><form className="chat-form" onSubmit={event => { event.preventDefault(); sendMessage() }}><input disabled={isSending || isStarting} value={message} onChange={event => setMessage(event.target.value)} placeholder="Tulis pesan ke room..." /><button disabled={isSending || !message.trim()} type="submit" aria-label="Kirim pesan">{isSending ? <span className="button-spinner" /> : '↑'}</button></form></section>
  </div>
}

