import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

type PresenceEntry = { user_id?: string }

export function subscribeToRoom(roomId: string, currentUserId: string, handlers: {
  onMemberChange?: (payload: unknown) => void
  onChat?: (payload: unknown) => void
  onRaceEvent?: (payload: unknown) => void
  onPresenceChange?: (userIds: string[]) => void
}) {
  if (!supabase) return null
  const channel = supabase.channel(`room:${roomId}`, { config: { presence: { key: currentUserId } } })
  const publishPresence = () => {
    const ids = Object.values(channel.presenceState()).flat().map(item => (item as PresenceEntry).user_id).filter((id): id is string => Boolean(id))
    handlers.onPresenceChange?.(Array.from(new Set(ids)))
  }
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, payload => handlers.onMemberChange?.(payload))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, payload => handlers.onChat?.(payload))
    .on('broadcast', { event: 'race' }, payload => handlers.onRaceEvent?.(payload.payload))
    .on('presence', { event: 'sync' }, publishPresence)
    .on('presence', { event: 'join' }, publishPresence)
    .on('presence', { event: 'leave' }, publishPresence)
    .subscribe(status => { if (status === 'SUBSCRIBED') channel.track({ user_id: currentUserId }) })
  return channel
}

export async function broadcastRaceEvent(channel: RealtimeChannel, event: unknown) {
  await channel.send({ type: 'broadcast', event: 'race', payload: event })
}

