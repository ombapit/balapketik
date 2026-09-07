'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import LoadingSkeleton from '../components/LoadingSkeleton'

type HistoryItem = { title: string; wpm: number; accuracy: number; createdAt: string }

export default function ProfilePage() {
  const [name, setName] = useState('Pemain')
  const [email, setEmail] = useState('')
  const [stats, setStats] = useState({ totalRaces: 0, wins: 0, winRate: 0, averageWpm: 0, averageAccuracy: 0, bestWpm: 0, bestAccuracy: 0 })
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabase) return setError('Supabase belum dikonfigurasi.')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return setError('Login dengan Google terlebih dahulu.')
      setName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Pemain')
      setEmail(session.user.email || '')
      const response = await fetch('/api/profile/stats', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const body = await response.json()
      if (!response.ok) return setError(body.error || 'Statistik profil gagal dimuat.')
      setStats(body.stats)
      setHistory((body.history || []).map((item: any) => ({ title: item.races?.song_texts?.title || 'Race', wpm: Math.round(item.wpm), accuracy: item.accuracy, createdAt: item.created_at })))
    }
    load()
  }, [])

  if (error) return <main><section className="content profile-page"><div className="panel"><p className="eyebrow">PROFIL</p><h1>{error}</h1><a className="secondary" href="/">← Dashboard</a></div></section></main>
  if (!email) return <main><section className="content profile-page"><LoadingSkeleton label="Memuat statistik profil..." /></section></main>

  return <main><aside><div className="brand"><span className="logo">⌁</span><span>balap<span>ketik</span></span></div><nav><a href="/">⌂ Dashboard</a><a className="active" href="/profile">◉ Profil saya</a></nav><div className="user"><div className="avatar">{name.slice(0, 2).toUpperCase()}</div><div><strong>{name}</strong><small>Level {Math.floor(stats.totalRaces / 5) + 1} · {stats.totalRaces * 50} XP</small></div></div></aside><section className="content profile-page"><header><div><p className="eyebrow">PROFIL PEMBALAP</p><h1>Profil & statistik</h1></div><a className="secondary" href="/">← Dashboard</a></header><div className="profile panel"><div className="profile-head"><div className="avatar big">{name.slice(0, 2).toUpperCase()}</div><div><h2>{name}</h2><p>{email}</p></div></div><div className="stats"><div><small>TOTAL RACE</small><strong>{stats.totalRaces}</strong><span className="muted">Race tervalidasi</span></div><div><small>WPM TERBAIK</small><strong>{stats.bestWpm}</strong><span className="muted">Kecepatan puncak</span></div><div><small>AKURASI RATA-RATA</small><strong>{stats.averageAccuracy}%</strong><span className="muted">Semua karakter diketik</span></div></div><div className="profile-substats"><div><small>WPM RATA-RATA</small><b>{stats.averageWpm}</b><span>WPM</span></div><div><small>AKURASI TERBAIK</small><b>{stats.bestAccuracy ?? stats.averageAccuracy}%</b><span>Hasil terbaik</span></div><div><small>AKURASI RATA-RATA</small><b>{stats.averageAccuracy}%</b><span>Semua race</span></div></div><div className="history-heading"><div><p className="eyebrow">RACE TERAKHIR</p><h3>Riwayat race</h3></div><span>10 terbaru</span></div><div className="history">{history.length ? history.slice(0, 10).map((item, index) => <div key={`${item.createdAt}-${index}`}><span>♫</span><strong>{item.title}<small>{new Date(item.createdAt).toLocaleDateString('id-ID')}</small></strong><b>{item.wpm} WPM · {item.accuracy}%</b></div>) : <p className="muted">Belum ada race yang selesai.</p>}</div></div></section></main>
}


