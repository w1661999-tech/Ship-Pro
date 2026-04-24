import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select, TextArea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LifeBuoy, Plus, MessageCircle, Send, Loader2, Inbox } from 'lucide-react'
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
  updated_at: string
  closed_at: string | null
  shipment?: { tracking_number: string } | null
}

interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string | null
  message: string
  is_internal: boolean
  created_at: string
  sender?: { full_name: string; role: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  resolved: 'تم الحل',
  closed: 'مغلقة',
}

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'gray'> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'gray',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
}

const PRIORITY_VARIANTS: Record<string, 'gray' | 'info' | 'warning' | 'danger'> = {
  low: 'gray',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
}

export default function MerchantTicketsPage() {
  const { user } = useAuthStore()
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [active, setActive] = useState<Ticket | null>(null)
  const [schemaReady, setSchemaReady] = useState(true)

  const loadMerchant = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('merchants').select('id').eq('user_id', user.id).single()
    if (data) setMerchantId(data.id as string)
  }, [user])

  const loadTickets = useCallback(async () => {
    if (!merchantId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('*, shipment:shipments(tracking_number)')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
    if (error && (error.message || '').toLowerCase().includes('relation')) {
      setSchemaReady(false)
    } else if (!error && data) {
      setTickets(data as Ticket[])
    }
    setLoading(false)
  }, [merchantId])

  useEffect(() => { loadMerchant() }, [loadMerchant])
  useEffect(() => { loadTickets() }, [loadTickets])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-blue-600" />
            الدعم الفني والتذاكر
          </h1>
          <p className="text-sm text-gray-500 mt-1">افتح تذكرة للحصول على مساعدة بشأن شحناتك أو حسابك</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 ml-1" />
          تذكرة جديدة
        </Button>
      </div>

      {!schemaReady ? (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <div className="py-8 text-center">
            <LifeBuoy className="w-10 h-10 text-amber-600 mx-auto mb-2" />
            <p className="text-sm text-amber-800">نظام التذاكر قيد التفعيل — يرجى مراجعة الإدارة لاحقاً</p>
          </div>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <div className="py-14 text-center text-gray-400">
            <Inbox className="w-12 h-12 mx-auto mb-2 opacity-60" />
            <p className="text-sm">لا توجد تذاكر بعد — افتح تذكرة جديدة عند الحاجة</p>
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
                  <h3 className="font-bold text-gray-900 text-sm truncate">{t.subject}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{t.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant={STATUS_VARIANTS[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                    <Badge variant={PRIORITY_VARIANTS[t.priority]}>أولوية {PRIORITY_LABELS[t.priority]}</Badge>
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

      {showNew && merchantId && (
        <NewTicketModal
          merchantId={merchantId}
          userId={user?.id || null}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadTickets() }}
        />
      )}

      {active && (
        <TicketDrawer
          ticket={active}
          userId={user?.id || null}
          onClose={() => { setActive(null); loadTickets() }}
        />
      )}
    </div>
  )
}

function NewTicketModal({ merchantId, userId, onClose, onCreated }: { merchantId: string; userId: string | null; onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [shipmentId, setShipmentId] = useState('')
  const [shipments, setShipments] = useState<{ id: string; tracking_number: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('shipments').select('id, tracking_number').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(30).then(({ data }) => {
      setShipments((data || []) as { id: string; tracking_number: string }[])
    })
  }, [merchantId])

  const submit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error('يرجى إدخال الموضوع والوصف')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('tickets').insert({
      merchant_id: merchantId,
      shipment_id: shipmentId || null,
      subject: subject.trim(),
      description: description.trim(),
      priority,
      created_by: userId,
    })
    setSaving(false)
    if (error) {
      toast.error('فشل إنشاء التذكرة: ' + error.message)
      return
    }
    toast.success('تم فتح التذكرة بنجاح')
    onCreated()
  }

  return (
    <Modal isOpen onClose={onClose} title="فتح تذكرة دعم فني">
      <div className="space-y-3">
        <Input
          label="الموضوع"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="مثال: طلب تغيير عنوان شحنة"
          required
        />
        <Select
          label="الشحنة المرتبطة (اختياري)"
          value={shipmentId}
          onChange={e => setShipmentId(e.target.value)}
          options={[
            { value: '', label: '— بدون شحنة —' },
            ...shipments.map(s => ({ value: s.id, label: s.tracking_number })),
          ]}
        />
        <Select
          label="الأولوية"
          value={priority}
          onChange={e => setPriority(e.target.value as typeof priority)}
          options={[
            { value: 'low', label: 'منخفضة' },
            { value: 'medium', label: 'متوسطة' },
            { value: 'high', label: 'عالية' },
            { value: 'urgent', label: 'عاجلة' },
          ]}
        />
        <TextArea
          label="الوصف"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={5}
          placeholder="اشرح المشكلة أو الطلب بالتفصيل..."
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال التذكرة'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function TicketDrawer({ ticket, userId, onClose }: { ticket: Ticket; userId: string | null; onClose: () => void }) {
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

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
    setSending(false)
    if (error) {
      toast.error('فشل الإرسال: ' + error.message)
      return
    }
    setReply('')
    load()
  }

  return (
    <Modal isOpen onClose={onClose} title={ticket.subject} size="lg">
      <div className="space-y-3">
        <Card padding="sm">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <Badge variant={STATUS_VARIANTS[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
            <Badge variant={PRIORITY_VARIANTS[ticket.priority]}>أولوية {PRIORITY_LABELS[ticket.priority]}</Badge>
            <span className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleString('ar-EG')}</span>
          </div>
        </Card>

        <div className="max-h-72 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد ردود بعد</p>
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
        )}
      </div>
    </Modal>
  )
}
