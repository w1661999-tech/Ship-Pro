import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface ShipNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export function useRealtimeNotifications() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<ShipNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (!error && data) setItems(data as ShipNotification[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    load()

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => {
          const n = payload.new as ShipNotification
          setItems(prev => [n, ...prev].slice(0, 30))
          toast.success(n.title, { duration: 4500 })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const markAllRead = async () => {
    if (!user) return
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
  }

  const unreadCount = items.filter(n => !n.is_read).length

  return { items, loading, unreadCount, markRead, markAllRead, reload: load }
}
