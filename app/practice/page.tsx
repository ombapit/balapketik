'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { signInWithGoogle } from '../../lib/auth'

export default function PracticePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('Pemain')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) setName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pemain')
      setReady(Boolean(user))
    })
  }, [])

  async function startPractice() {
    if (!supabase) return setError('Supabase belum dikonfigurasi.')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return signInWithGoogle().catch(item => setError(item.message))
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/practice', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token } })
      const body = await response.json()
      if (!response.ok) return setError(body.error || 'Gagal memulai latihan.')
      router.push('/race/' + body.raceId)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!ready || loading || !window.sessionStorage.getItem('balapketik-autostart')) return
    window.sessionStorage.removeItem('balapketik-autostart')
    startPractice()
  }, [ready])
  return <main className="practice-page"><section className="practice-hero"><a href="/" className="practice-back">← Dashboard</a><p className="eyebrow">MODE LATIHAN</p><h1>Asah jari.<br /><em>Kejar WPM-mu.</em></h1><p className="practice-copy">Main sendiri dengan teks lagu Indonesia acak. Hasilnya tetap masuk ke statistik dan leaderboard kamu.</p><div className="practice-kart" aria-hidden="true"><span>🏎️</span><i>──────────── ⚑</i></div><button className="primary practice-start" disabled={loading} onClick={startPractice}>{loading && <span className="button-spinner" />} {loading ? 'Menyiapkan lintasan...' : ready ? 'Mulai typing test →' : 'Login untuk mulai →'}</button>{error && <p className="practice-error">{error}</p>}<div className="practice-points"><span>♫ Teks lagu acak</span><span>✓ Hasil tersimpan</span><span>⌁ Tanpa menunggu lawan</span></div><p className="practice-greeting">Siap latihan, {name}?</p></section></main>
}