import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './EllipsisTooltip.css'

export function EllipsisTooltip({
  text,
  maxChars = 20,
}: {
  text: string
  maxChars?: number
}) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const truncated = text.length > maxChars
  const display = truncated ? `${text.slice(0, maxChars)}...` : text

  return (
    <span
      ref={wrapRef}
      className="ellipsis-wrap"
      onMouseEnter={() => {
        if (!truncated || !wrapRef.current) return
        const rect = wrapRef.current.getBoundingClientRect()
        setPos({ left: rect.left, top: rect.top })
      }}
      onMouseLeave={() => setPos(null)}
    >
      {display}
      {pos &&
        createPortal(
          <span
            className="ellipsis-bubble"
            style={{ left: pos.left, top: pos.top }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  )
}
