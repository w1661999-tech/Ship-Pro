import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, ScanLine, X, CheckCircle, AlertTriangle } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (value: string) => void | Promise<void>
  onClose?: () => void
  title?: string
  continuous?: boolean
  hint?: string
}

/**
 * BarcodeScanner – Mobile-first QR/Barcode scanner using camera.
 * Uses `html5-qrcode` which supports Code128, EAN, UPC, QR out of the box.
 */
export default function BarcodeScanner({ onScan, onClose, title = 'مسح الباركود', continuous = false, hint }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [lastHits, setLastHits] = useState<string[]>([])

  useEffect(() => {
    const id = 'ship-pro-scanner-' + Date.now()
    if (!containerRef.current) return
    containerRef.current.id = id

    let disposed = false
    const scanner = new Html5Qrcode(id)
    scannerRef.current = scanner

    const config = {
      fps: 10,
      qrbox: { width: 260, height: 180 },
      aspectRatio: 1.7,
      disableFlip: false,
    }

    ;(async () => {
      try {
        const devices = await Html5Qrcode.getCameras()
        if (!devices.length) throw new Error('لا توجد كاميرا متاحة على هذا الجهاز')

        const cameraId = devices.find(d => /back|rear|environment/i.test(d.label))?.id || devices[0].id

        await scanner.start(
          cameraId,
          config,
          async decoded => {
            if (disposed) return
            setLastHits(prev => (prev.includes(decoded) ? prev : [decoded, ...prev].slice(0, 10)))
            try { await onScan(decoded) } catch (e) { console.error('onScan error:', e) }
            if (!continuous) {
              try { await scanner.stop() } catch { /* ignore */ }
              setStatus('idle')
            }
          },
          () => { /* ignore decode errors */ }
        )
        setStatus('running')
      } catch (e) {
        setErr((e as Error).message || 'تعذر تشغيل الكاميرا')
        setStatus('error')
      }
    })()

    return () => {
      disposed = true
      const s = scannerRef.current
      if (s) {
        try { s.stop() } catch { /* ignore */ }
        try { s.clear() } catch { /* ignore */ }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous])

  const close = async () => {
    const s = scannerRef.current
    if (s) {
      try { await s.stop() } catch { /* ignore */ }
      try { await s.clear() } catch { /* ignore */ }
    }
    onClose?.()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-l from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            <h3 className="font-bold">{title}</h3>
          </div>
          <button onClick={close} className="p-1 rounded hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black">
          <div ref={containerRef} className="w-full aspect-video" />
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Camera className="w-10 h-10 opacity-60 animate-pulse" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 px-4 text-center bg-black/70">
              <CameraOff className="w-10 h-10 mb-2" />
              <p className="text-sm">{err}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 space-y-2">
          {hint && (
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              {hint}
            </p>
          )}
          {continuous && lastHits.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">آخر {lastHits.length} عملية مسح:</p>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {lastHits.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs bg-green-50 text-green-800 px-2 py-1 rounded">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="font-mono" dir="ltr">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
