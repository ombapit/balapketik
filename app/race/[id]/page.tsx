'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import LoadingSkeleton from '../../components/LoadingSkeleton'

type Opponent = { name: string; progress: number }

function Kart({ label, progress, own = false }: { label: string; progress: number; own?: boolean }) {
  const left = `clamp(4px, calc(${progress}% - 25px), calc(100% - 54px))`

  return (
    <div className={`racer-lane${own ? ' racer-lane-own' : ''}`}>
      <span className="racer-label">{label}</span>
      <div className="lane-road">
        <span className="lane-dashes" />
        <div className={`kart${own ? ' kart-own' : ' kart-opponent'}`} style={{ left }} aria-label={`${label}: ${progress}%`}>
          <span className="kart-spoiler" />
          <span className="kart-cabin" />
          <span className="kart-nose" />
          <span className="kart-wheel kart-wheel-left" />
          <span className="kart-wheel kart-wheel-right" />
        </div>
        <span className="lane-finish" aria-hidden="true" />
      </div>
      <span className="racer-progress">{progress}%</span>
    </div>
  )
}

export default function RacePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [race, setRace] = useState<any>(null)
  const [opponents, setOpponents] = useState<Record<string, Opponent>>({})
  const [currentUser, setCurrentUser] = useState({ id: '', name: 'Kamu' })
  const channelRef = useRef<any>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [now, setNow] = useState(Date.now())
  const [value, setValue] = useState('')
  const [typingStats, setTypingStats] = useState({ total: 0, mistakes: 0 })
  const typingStatsRef = useRef({ total: 0, mistakes: 0 })
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)
  const [finalResult, setFinalResult] = useState<{ wpm: number; accuracy: number } | null>(null)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [error, setError] = useState('')
  const countdown = race ? Math.max(0, Math.ceil((new Date(race.started_at).getTime() - now) / 1000)) : 0

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!started || countdown > 0 || done) return
    const focusInput = () => {
      const input = inputRef.current
      if (input && !input.disabled) input.focus({ preventScroll: true })
    }
    const frame = window.requestAnimationFrame(focusInput)
    const retry = window.setTimeout(focusInput, 120)
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(retry) }
  }, [started, countdown, done])

  useEffect(() => {
    let startTimer: number | undefined

    async function load() {
      if (!supabase) return setError('Supabase belum dikonfigurasi.')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setError('Login terlebih dahulu.')

      setCurrentUser({
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Kamu',
      })

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/races/${id}`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      const body = await response.json()
      if (!response.ok) return setError(body.error || 'Race tidak ditemukan.')

      setRace(body.race)
      const delay = Math.max(0, new Date(body.race.started_at).getTime() - Date.now())
      startTimer = window.setTimeout(() => setStarted(true), delay)
    }

    load()
    return () => { if (startTimer) window.clearTimeout(startTimer) }
  }, [id])

  useEffect(() => {
    if (!race || !supabase || !currentUser.id) return

    const channel = supabase
      .channel(`race-progress:${id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === currentUser.id) return
        setOpponents(current => ({
          ...current,
          [payload.userId]: {
            name: payload.name || 'Peserta lain',
            progress: Math.max(0, Math.min(100, Number(payload.progress) || 0)),
          },
        }))
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') channelRef.current = channel
      })

    return () => {
      channelRef.current = null
      supabase?.removeChannel(channel)
    }
  }, [race, id, currentUser.id])

  const target = race?.song_texts?.text_content ?? ''
  const progress = target ? Math.min(100, Math.round(value.length / target.length * 100)) : 0
  const accuracy = useMemo(() => {
    if (!typingStats.total) return 100
    return Math.round(Math.max(0, (typingStats.total - typingStats.mistakes) / typingStats.total) * 1000) / 10
  }, [typingStats])
  const wpm = useMemo(() => {
    if (!started || !value) return 0
    const elapsedMinutes = Math.max(1 / 60, (Date.now() - new Date(race.started_at).getTime()) / 60000)
    return Math.round(value.length / 5 / elapsedMinutes)
  }, [value, started, race])

  function trackTyping(previous: string, next: string) {
    let start = 0
    while (start < previous.length && start < next.length && previous[start] === next[start]) start += 1
    let previousEnd = previous.length - 1
    let nextEnd = next.length - 1
    while (previousEnd >= start && nextEnd >= start && previous[previousEnd] === next[nextEnd]) { previousEnd -= 1; nextEnd -= 1 }
    const inserted = next.slice(start, nextEnd + 1)
    if (!inserted.length) return
    const mistakes = inserted.split('').filter((char, index) => char !== target[start + index]).length
    const updated = { total: typingStatsRef.current.total + inserted.length, mistakes: typingStatsRef.current.mistakes + mistakes }
    typingStatsRef.current = updated
    setTypingStats(updated)
  }

  function sendProgress(next: string) {
    const nextProgress = target ? Math.min(100, Math.round(next.length / target.length * 100)) : 0
    channelRef.current?.send({
      type: 'broadcast',
      event: 'progress',
      payload: { userId: currentUser.id, name: currentUser.name, progress: nextProgress },
    })
  }

  async function finish(completedValue: string) {
    if (done || !supabase || completedValue !== target) return
    setDone(true)
    const elapsedMs = Date.now() - new Date(race.started_at).getTime()
    const elapsedMinutes = Math.max(1 / 60, elapsedMs / 60000)
    const finalWpm = Math.round(completedValue.length / 5 / elapsedMinutes)
    const finalAccuracy = typingStatsRef.current.total ? Math.round(Math.max(0, (typingStatsRef.current.total - typingStatsRef.current.mistakes) / typingStatsRef.current.total) * 1000) / 10 : 100
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ raceId: id, wpm: finalWpm, accuracy: finalAccuracy, elapsedMs, correctChars: completedValue.length }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setDone(false)
      setError(body.error || 'Hasil race gagal disimpan.')
      return
    }
    setFinalResult({ wpm: finalWpm, accuracy: finalAccuracy })
    setShowFinishDialog(true)
  }
  if (error) return <main className="content"><div className="panel"><h1>{error}</h1><a href="/">Kembali</a></div></main>
  if (!race) return <main className="content"><LoadingSkeleton variant="race" label="Menyiapkan lintasan dan peserta..." /></main>

  return (
    <main className="content race-page">
      <div className="race-top">
        <div><p className="eyebrow">RACE SEDANG BERLANGSUNG</p><h1>{race.song_texts.title}</h1><p>{race.song_texts.artist}</p></div>
        <div className="countdown">{countdown > 0 ? countdown : 'GO!'}</div>
        <div className="race-metrics"><strong>{wpm}<small>WPM</small></strong><strong>{accuracy}%<small>AKURASI</small></strong><strong>{progress}%<small>PROGRES</small></strong></div>
        {done && <div className="race-nav-actions"><button className="primary" onClick={() => router.push(`/room/${race.rooms.code}`)}>Tanding lagi</button><button className="secondary" onClick={() => router.push('/')}>Dashboard</button></div>}
      </div>
      <div className="panel race-card">
        <p className="race-copy">{target.split('').map((char: string, index: number) => <span className={index < value.length ? (value[index] === char ? 'correct' : 'wrong') : ''} key={index}>{char}</span>)}</p>
        <textarea ref={inputRef} autoFocus disabled={countdown > 0 || !started || done} value={value} onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') event.preventDefault() }} onChange={event => { const next = event.target.value; trackTyping(value, next); setValue(next); sendProgress(next); if (next === target) finish(next) }} placeholder={countdown > 0 ? 'Bersiap...' : 'Mulai mengetik...'} />
        <div className="progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="race-lanes">
          <Kart label="Kamu" progress={progress} own />
          {Object.entries(opponents).map(([userId, opponent]) => <Kart key={userId} label={opponent.name} progress={opponent.progress} />)}
          {!Object.keys(opponents).length && <p className="opponent-hint">Mobil peserta lain akan muncul di sini saat mereka mulai mengetik.</p>}
        </div>

      </div>
      {done && finalResult && showFinishDialog && <div className="finish-modal" role="dialog" aria-modal="true" aria-label="Hasil race"><div className="finish-alert"><button className="finish-close" onClick={() => setShowFinishDialog(false)} aria-label="Tutup hasil">×</button><span className="finish-check">✓</span><div><p className="eyebrow">FINISH · HASIL TERSIMPAN</p><h2>Teks sempurna. Keren!</h2><p>{finalResult.wpm} WPM · {finalResult.accuracy}% akurasi</p><button className="primary" onClick={() => router.push(`/room/${race.rooms.code}`)}>Tanding lagi →</button></div></div></div>}    </main>
  )
}














