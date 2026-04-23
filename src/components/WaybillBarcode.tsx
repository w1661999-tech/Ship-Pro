import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface Props {
  value: string
  height?: number
  width?: number
  fontSize?: number
  displayValue?: boolean
}

/**
 * WaybillBarcode – renders a Code128 barcode as SVG (ready for thermal printers).
 */
export default function WaybillBarcode({ value, height = 60, width = 2, fontSize = 14, displayValue = true }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        width,
        height,
        fontSize,
        displayValue,
        margin: 0,
        textMargin: 2,
      })
    } catch (e) {
      console.warn('Barcode render failed:', e)
    }
  }, [value, height, width, fontSize, displayValue])

  return <svg ref={ref} />
}
