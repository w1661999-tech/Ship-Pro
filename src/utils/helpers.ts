import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateStr))
}

export function generateTrackingNumber(): string {
  const prefix = 'SP'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}${timestamp}${random}`
}

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'في الانتظار',
  assigned: 'تم التعيين',
  picked_up: 'تم الاستلام',
  in_transit: 'في الطريق',
  out_for_delivery: 'خارج للتوصيل',
  delivered: 'تم التسليم',
  postponed: 'مؤجل',
  refused: 'مرفوض',
  returned: 'مُعاد',
  cancelled: 'ملغي',
}

export const SHIPMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  picked_up: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
  out_for_delivery: 'bg-orange-100 text-orange-800 border-orange-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  postponed: 'bg-gray-100 text-gray-700 border-gray-200',
  refused: 'bg-red-100 text-red-800 border-red-200',
  returned: 'bg-pink-100 text-pink-800 border-pink-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'الدفع عند الاستلام',
  prepaid: 'مدفوع مسبقاً',
  card: 'بطاقة ائتمان',
}

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  motorcycle: 'دراجة نارية',
  car: 'سيارة',
  van: 'ڤان',
  truck: 'شاحنة',
}

export const COURIER_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  on_delivery: 'في توصيل',
}

export const MERCHANT_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  pending: 'قيد المراجعة',
}
