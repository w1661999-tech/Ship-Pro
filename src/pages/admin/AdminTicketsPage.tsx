import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TextArea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LifeBuoy, Inbox, MessageCircle, Send, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Ticket {
  id: string
  merchant_id: string
  shipment_id: string | null
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  merchant?: { store_name: string; phone: string } | null
  shipment?: { tracking_number: string } | null
}

interface TicketMessage {
  id: string
  sender_id: string | null
  message: string
  is_internal: boolean
  created_at: string
  sender?: { full_name: string; role: string } | null
}

const STATUS_LABELS: Record<string, string> = { open: 'مفتوحة', in_progress: 'قيد المعالجة', resolved: 'تم الحل', closed: 'مغلقة' }
const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'gray'> = { open: 'info', in_progress: 'warning', resolved: 'success', closed: 'gray' }
const PRIORITY_LABELS: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' }
const PRIORITY_VARIANTS: Record<string, 'gray' | 'info' | 'warning' | 'danger'> = { low: 'gray', medium: 'info', high: 'warning', urgent: 'danger' }

export default function AdminTicketsPage() {
  const { user } = useAuthStore()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Ticket | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('open')
  const [schemaReady, setSchemaReady] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('tickets')
      .select('*, merchant:merchants(store_name, phone), shipment:shipments(tracking_number)')
      .order('created_at', { ascending: false })
    if (filterStatus) q = q.eq('status', filterStatus)
    const { data, error } = await q
    if (error && (error.message || '').toLowerCase().includes('relation')) {
      setSchemaReady(false)
    } else {
      setTickets((data || []) as Ticket[])
    }
    setLoading(false)
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  const counts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-blue-600" />
          إدارة تذاكر الدعم الفني
        </h1>
        <p className="text-sm text-gray-500 mt-1">الرد على استفسارات وشكاوى التجار</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { key: '', label: 'الكل', c: tickets.length },
          { key: 'open', label: 'مفتوحة', c: counts.open },
          { key: 'in_progress', label: 'قيد المعالجة', c: counts.in_progress },
          { key: 'resolved', label: 'تم الحل', c: counts.resolved },
          { key: 'closed', label: 'مغلقة', c: 0 },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
              filterStatus === f.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!schemaReady ? (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <div className="py-10 text-center">
            <LifeBuoy className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <h2 className="text-lg font-black text-amber-900 mb-2">نظام التذاكر غير مفعّل</h2>
            <p className="text-sm text-amber-800 mb-4">جدول tickets غير موجود في قاعدة البيانات. يرجى تطبيق الـ migration.</p>
            <Button onClick={() => window.location.href = '/admin/system'}>الانتقال لإعدادات النظام</Button>
          </div>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-gray-400">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-60" />
            <p className="text-sm">لا توجد تذاكر ضمن هذا التصنيف</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              className="w-full text-right bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{t.subject}</h3>
                    <Badge variant={PRIORITY_VARIANTS[t.priority]}>{PRIORITY_LABELS[t.priority]}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant={STATUS_VARIANTS[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                    <span className="text-xs text-gray-600">🏪 {t.merchant?.store_name || '—'}</span>
                    {t.shipment?.tracking_number && (
                      <span className="text-xs text-gray-500 font-mono" dir="ltr">{t.shipment.tracking_number}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(t.created_at).toLocaleDateString('ar-EG')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <AdminTicketModal
          ticket={active}
          userId={user?.id || null}
          onClose={() => { setActive(null); load() }}
        />
      )}
    </div>
  )
}

function AdminTicketModal({ ticket, userId, onClose }: { ticket: Ticket; userId: string | null; onClose: () => void }) {
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('ticket_messages')
      .select('*, sender:ship_users(full_name, role)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
    setMessages((data || []) as TicketMessage[])
  }, [ticket.id])

  useEffect(() => { load() }, [load])

  const send = async () => {
    if (!reply.trim() || !userId) return
    setSending(true)
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: userId,
      message: reply.trim(),
    })
    if (!error) {
      if (ticket.status === 'open') {
        await supabase.from('tickets').update({ status: 'in_progress' }).eq('id', ticket.id)
      }
      toast.success('تم إرسال الرد')
      setReply('')
      load()
    } else {
      toast.error('فشل الإرسال: ' + error.message)
    }
    setSending(false)
  }

  const updateStatus = async (status: 'in_progress' | 'resolved' | 'closed') => {
    setUpdating(true)
    const patch: Record<string, unknown> = { status }
    if (status === 'closed') patch.closed_at = new Date().toISOString()
    const { error } = await supabase.from('tickets').update(patch).eq('id', ticket.id)
    setUpdating(false)
    if (error) {
      toast.error('فشل التحديث: ' + error.message)
      return
    }
    toast.success('تم تحديث الحالة')
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title={ticket.subject} size="lg">
      <div className="space-y-3">
        <Card padding="sm">
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
            <span>🏪 {ticket.merchant?.store_name} ({ticket.merchant?.phone})</span>
            {ticket.shipment?.tracking_number && (
              <span className="font-mono" dir="ltr">• {ticket.shipment.tracking_number}</span>
            )}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <Badge variant={STATUS_VARIANTS[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
            <Badge variant={PRIORITY_VARIANTS[ticket.priority]}>{PRIORITY_LABELS[ticket.priority]}</Badge>
            <span className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleString('ar-EG')}</span>
          </div>
        </Card>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">لم يتم الرد بعد</p>
          ) : (
            messages.map(m => {
              const isAdmin = m.sender?.role === 'admin'
              return (
                <div key={m.id} className={`rounded-lg px-3 py-2 ${isAdmin ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className={`w-3.5 h-3.5 ${isAdmin ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className="text-xs font-bold text-gray-800">{m.sender?.full_name || 'مستخدم'}</span>
                    <span className="text-[11px] text-gray-400">{new Date(m.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.message}</p>
                </div>
              )
            })
          )}
        </div>

        {ticket.status !== 'closed' && (
          <>
            <div className="flex gap-2">
              <TextArea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={2}
                placeholder="اكتب ردك هنا..."
              />
              <Button onClick={send} disabled={sending || !reply.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={() => updateStatus('resolved')} disabled={updating}>
                <CheckCircle className="w-4 h-4 ml-1" />
                تعليم كمحلولة
              </Button>
              <Button variant="danger" onClick={() => updateStatus('closed')} disabled={updating}>
                إغلاق التذكرة
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
