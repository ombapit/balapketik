'use client'

import { useEffect, useMemo, useState } from 'react'
import { signInWithGoogle } from '../lib/auth'
import { supabase } from '../lib/supabase'
import WpmChart from './components/WpmChart'

type HostedRoom = { id: string; code: string; name: string; max_players: number }
type Score = [string, string, string]
type WpmRecord = { wpm: number; createdAt: string }
type ChartPoint = { wpm: number; label: string }
type ChartRange = 'daily' | 'weekly' | 'monthly' | 'custom'

export default function Home() {
  const [liveScores, setLiveScores] = useState<Score[]>([])
  const [liveHistory, setLiveHistory] = useState<Score[]>([])
  const [wpmHistory, setWpmHistory] = useState<WpmRecord[]>([])
  const [chartRange, setChartRange] = useState<ChartRange>('daily')
  const [customFrom, setCustomFrom] = useState(() => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [liveStats, setLiveStats] = useState({ totalRaces: 0, wins: 0, averageWpm: 0, averageAccuracy: 0, bestWpm: 0 })
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [liveUser, setLiveUser] = useState({ name: 'Pemain', email: '' })
  const [tab, setTab] = useState('dashboard')
  const [hostedRoom, setHostedRoom] = useState<HostedRoom | null>(null)
  const [showRoomEditor, setShowRoomEditor] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(5)
  const [joinCode, setJoinCode] = useState('')
  const [toast, setToast] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }

  useEffect(() => {
    const syncTabFromUrl = () => setTab(new URLSearchParams(window.location.search).get('tab') === 'profile' ? 'profile' : 'dashboard')
    syncTabFromUrl()
    window.addEventListener('popstate', syncTabFromUrl)
    return () => window.removeEventListener('popstate', syncTabFromUrl)
  }, [])

  function changeTab(nextTab: string) {
    if (nextTab === 'profile') { window.location.href = '/profile'; return }
    setTab('dashboard')
    window.history.pushState({}, '', '/')
  }

  useEffect(() => {
    async function load() {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setIsLoggedIn(true)
      setLiveUser({ name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Pemain', email: session.user.email || '' })
      const headers = { Authorization: `Bearer ${session.access_token}` }
      const [leaderboard, stats, myRoom] = await Promise.all([fetch('/api/results', { headers }), fetch('/api/profile/stats', { headers }), fetch('/api/rooms?mine=1', { headers })])
      if (leaderboard.ok) { const body = await leaderboard.json(); if (body.results?.length) setLiveScores(body.results.map((item: any) => [item.profiles?.display_name || 'Pemain', `${Math.round(item.wpm)} WPM`, `${item.accuracy}%`])) }
      if (stats.ok) { const body = await stats.json(); setLiveStats(body.stats); if (body.history?.length) { setLiveHistory(body.history.map((item: any) => [item.races?.song_texts?.title || 'Race', `${Math.round(item.wpm)} WPM`, `${item.accuracy}%`])); setWpmHistory(body.history.map((item: any) => ({ wpm: Math.round(item.wpm), createdAt: item.created_at }))) } }
      if (myRoom.ok) { const body = await myRoom.json(); if (body.room) setHostedRoom(body.room) }
    }
    load()
  }, [])

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const end = new Date(); const start = new Date(end)
    if (chartRange === 'daily') start.setDate(end.getDate() - 6)
    if (chartRange === 'weekly') start.setDate(end.getDate() - 55)
    if (chartRange === 'monthly') start.setMonth(end.getMonth() - 5)
    if (chartRange === 'custom') { start.setTime(new Date(`${customFrom}T00:00:00`).getTime()); end.setTime(new Date(`${customTo}T23:59:59`).getTime()) }
    const groups = new Map<string, { max: number; date: Date; label: string }>()
    for (const item of wpmHistory) { const date = new Date(item.createdAt); if (date < start || date > end) continue; const bucket = new Date(date); let key: string; let label: string
      if (chartRange === 'monthly') { bucket.setDate(1); key = `${bucket.getFullYear()}-${bucket.getMonth()}`; label = bucket.toLocaleDateString('id-ID', { month: 'short' }) }
      else if (chartRange === 'weekly') { bucket.setDate(bucket.getDate() - ((bucket.getDay() + 6) % 7)); key = bucket.toISOString().slice(0, 10); label = bucket.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }
      else { key = bucket.toISOString().slice(0, 10); label = bucket.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }
      const group = groups.get(key) || { max: 0, date: bucket, label }; group.max = Math.max(group.max, item.wpm); groups.set(key, group)
    }
    return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime()).map(group => ({ wpm: group.max, label: group.label }))
  }, [wpmHistory, chartRange, customFrom, customTo])
  function openEditor(room: HostedRoom) { setRoomName(room.name); setMaxPlayers(room.max_players); setShowRoomEditor(true) }

  async function createRoom() {
    if (!supabase) return showToast('Supabase belum aktif.')
    if (hostedRoom) return openEditor(hostedRoom)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return showToast('Login dengan Google terlebih dahulu.')
    setIsCreating(true)
    try {
      const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({}) })
      const body = await response.json()
      if (!response.ok) { if (body.room) { setHostedRoom(body.room); openEditor(body.room) } return showToast(body.error || 'Gagal membuat room.') }
      setHostedRoom(body.room); openEditor(body.room); showToast('Room baru berhasil dibuat.')
    } finally { setIsCreating(false) }
  }

  async function saveRoom() {
    if (!supabase || !hostedRoom) return
    const { data: { session } } = await supabase.auth.getSession(); if (!session) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/rooms', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ roomId: hostedRoom.id, name: roomName.trim() || hostedRoom.name, maxPlayers }) })
      const body = await response.json(); if (!response.ok) return showToast(body.error || 'Gagal menyimpan room.')
      setHostedRoom(body.room); setShowRoomEditor(false); showToast('Pengaturan room disimpan.')
    } finally { setIsSaving(false) }
  }

  async function deleteRoom() {
    if (!supabase || !hostedRoom || !window.confirm('Tutup room ini? Link room tidak dapat dipakai lagi.')) return
    const { data: { session } } = await supabase.auth.getSession(); if (!session) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/rooms?roomId=${hostedRoom.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
      const body = await response.json(); if (!response.ok) return showToast(body.error || 'Gagal menutup room.')
      setHostedRoom(null); setShowRoomEditor(false); showToast('Room telah ditutup.')
    } finally { setIsDeleting(false) }
  }

  async function joinRoom() {
    if (!supabase || !joinCode.trim()) return
    const { data: { session } } = await supabase.auth.getSession(); if (!session) return showToast('Login dengan Google terlebih dahulu.')
    setIsJoining(true)
    try {
      const response = await fetch(`/api/rooms?code=${encodeURIComponent(joinCode)}`, { headers: { Authorization: `Bearer ${session.access_token}` } }); const body = await response.json()
      if (!response.ok) return showToast(body.error || 'Room tidak ditemukan.')
      window.location.href = `/room/${body.room.code}`
    } finally { setIsJoining(false) }
  }

  return <main>{toast && <div className="toast"><span>✓</span>{toast}</div>}<aside><div className="brand"><span className="logo">⌁</span><span>balap<span>ketik</span></span></div><nav>{[['dashboard', '⌂', 'Dashboard'], ['profile', '◉', 'Profil saya']].map(([id, icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => changeTab(id)}><b>{icon}</b>{label}</button>)}</nav><div className="user"><div className="avatar">{liveUser.name.slice(0, 2).toUpperCase()}</div><div><strong>{liveUser.name}</strong><small>Level {Math.floor(liveStats.totalRaces / 5) + 1} · {liveStats.totalRaces * 50} XP</small></div></div></aside><section className="content"><header><div><p className="eyebrow">SELAMAT DATANG KEMBALI</p><h1>{tab === 'dashboard' ? `Siap adu cepat, ${liveUser.name}?` : 'Profil & statistik'}</h1></div>{isLoggedIn ? <button className="secondary" onClick={async () => { await supabase?.auth.signOut(); window.location.reload() }}>Keluar</button> : <button className="secondary" onClick={() => signInWithGoogle().catch(error => showToast(error.message))}>Masuk dengan Google</button>}</header>{tab === 'dashboard' ? <><div className="hero"><div><span className="pill">● LIVE WITH FRIENDS</span><h2>Buat room.<br /><em>Gas pol.</em></h2><p>Ajak temanmu dan buktikan siapa jari tercepat.</p><a className="hero-practice-link" href="/practice">⌁ Latihan sendiri</a>{hostedRoom ? <div className="hero-room-actions"><button className="primary" onClick={() => openEditor(hostedRoom)}>Edit room</button><button className="secondary" onClick={deleteRoom} disabled={isDeleting}>{isDeleting ? 'Menutup...' : 'Hapus room'}</button><button className="hero-room-link" onClick={() => window.location.href = `/room/${hostedRoom.code}`}>Buka lobby →</button></div> : <button className="primary" disabled={isCreating} onClick={createRoom}>{isCreating ? 'Membuat room...' : '+ Buat room baru'}</button>}</div><div className="hero-art"><div className="speed">WPM<br /><strong>{liveStats.bestWpm}</strong></div><div className="track">••••••••••••••</div><div className="car">▰</div></div></div><div className="join-bar"><input value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} placeholder="Masukkan kode room" /><button className="secondary" disabled={isJoining || !joinCode.trim()} onClick={joinRoom}>{isJoining ? 'Menghubungkan...' : 'Join room'}</button></div><div className="stats"><div><small>RACE SELESAI</small><strong>{liveStats.totalRaces}</strong><span className="muted">Total race tervalidasi</span></div><div><small>WPM TERBAIK</small><strong>{liveStats.bestWpm}</strong><span className="muted">WPM terbaik</span></div><div><small>AKURASI RATA-RATA</small><strong>{liveStats.averageAccuracy}%</strong><span className="muted">Rata-rata semua race</span></div></div><div className="grid"><div className="panel"><div className="panel-head"><div><p className="eyebrow">PERFORMA</p><h3>Perkembangan WPM</h3></div><select value={chartRange} onChange={event => setChartRange(event.target.value as ChartRange)}><option value="daily">Harian · 7 hari</option><option value="weekly">Mingguan · 8 minggu</option><option value="monthly">Bulanan · 6 bulan</option><option value="custom">Custom</option></select></div>{chartRange === 'custom' && <div className="chart-custom"><input type="date" value={customFrom} max={customTo} onChange={event => setCustomFrom(event.target.value)} /><span>sampai</span><input type="date" value={customTo} min={customFrom} onChange={event => setCustomTo(event.target.value)} /></div>}<div className="chart"><WpmChart points={chartPoints} /></div></div><div className="panel top"><div className="panel-head"><div><p className="eyebrow">LEADERBOARD</p><h3>Top score</h3></div></div>{liveScores.length ? liveScores.map((score, index) => <div className="score" key={`${score[0]}-${index}`}><i>{index + 1}</i><div className="avatar mini">{score[0].slice(0, 2).toUpperCase()}</div><strong>{score[0]}<small>{score[2]} akurasi</small></strong><b>{score[1]}</b></div>) : <p className="muted empty-state">Belum ada hasil race.</p>}</div></div></> : <div className="profile panel"><div className="profile-head"><div className="avatar big">{liveUser.name.slice(0, 2).toUpperCase()}</div><div><h2>{liveUser.name}</h2><p>{liveUser.email}</p></div></div><div className="stats"><div><small>TOTAL RACE</small><strong>{liveStats.totalRaces}</strong></div><div><small>KEMENANGAN</small><strong>{liveStats.wins}</strong></div><div><small>WIN RATE</small><strong>{liveStats.totalRaces ? Math.round(liveStats.wins / liveStats.totalRaces * 100) : 0}%</strong></div></div><h3>Riwayat race</h3><div className="history">{liveHistory.length ? liveHistory.slice(0, 4).map((score, index) => <div key={index}><span>♫</span><strong>{score[0]}<small>Race tervalidasi</small></strong><b>{score[1]} · {score[2]}</b></div>) : <p className="muted">Belum ada riwayat race.</p>}</div></div>}{showRoomEditor && hostedRoom && <div className="modal"><div className="room panel room-editor"><button className="close" onClick={() => setShowRoomEditor(false)}>×</button><p className="eyebrow">ROOM AKTIF</p><h2>Edit room</h2><label>Nama room<input value={roomName} onChange={event => setRoomName(event.target.value)} placeholder="Nama room" /></label><label>Maksimum peserta<select value={maxPlayers} onChange={event => setMaxPlayers(Number(event.target.value))}>{[2, 3, 4, 5, 6, 8].map(value => <option key={value} value={value}>{value} peserta</option>)}</select></label><div className="invite"><span>{window.location.origin}/room/{hostedRoom.code}</span><button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/room/${hostedRoom.code}`).then(() => showToast('Link room berhasil disalin'))}>Copy link</button></div><div className="room-editor-actions"><button className="primary" disabled={isSaving} onClick={saveRoom}>{isSaving ? 'Menyimpan...' : 'Simpan perubahan'}</button><button className="danger-button" disabled={isDeleting} onClick={deleteRoom}>{isDeleting ? 'Menutup...' : 'Hapus room'}</button></div></div></div>}</section></main>
}







