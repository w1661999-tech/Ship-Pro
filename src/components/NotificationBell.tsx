import { useState, useRef, useEffect } from 'react'
import { Bell, Check, Inbox, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { items, unreadCount, markRead, markAllRead } = useRealtimeNotifications()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = async (n: { id: string; link: string | null }) => {
    await markRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
        title="الإشعارات"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-80 max-h-[70vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50 flex flex-col"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">الإشعارات</h3>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <Check className="w-3.5 h-3.5 inline" /> تعليم الكل كمقروء
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد إشعارات</p>
              </div>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`block w-full text-right px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !n.is_read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleString('ar-EG')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
