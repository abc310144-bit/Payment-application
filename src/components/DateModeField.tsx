import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DateQuery } from '../utils/dateQuery'
import './DateModeField.css'

interface Props {
  label: string
  value: DateQuery
  onChange: (next: DateQuery) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const CALENDAR_ICON = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
    <rect
      x="1.75"
      y="3"
      width="12.5"
      height="11.25"
      rx="1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path d="M1.75 6.25h12.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M5.25 1.5v3M10.75 1.5v3"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function iso(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}

function todayIso() {
  const now = new Date()
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

function addMonths(y: number, m: number, delta: number) {
  const date = new Date(y, m - 1 + delta, 1)
  return { y: date.getFullYear(), m: date.getMonth() + 1 }
}

function parseMonth(value: string) {
  if (!value) {
    const now = new Date()
    return { y: now.getFullYear(), m: now.getMonth() + 1 }
  }
  const [y, m] = value.split('-').map(Number)
  return { y, m }
}

function monthCells(y: number, m: number) {
  const startPad = new Date(y, m - 1, 1).getDay()
  const days = new Date(y, m, 0).getDate()
  const prev = addMonths(y, m, -1)
  const prevDays = new Date(prev.y, prev.m, 0).getDate()
  const next = addMonths(y, m, 1)
  const cells: { date: string; day: number; inMonth: boolean }[] = []
  for (let i = startPad - 1; i >= 0; i -= 1) {
    cells.push({
      date: iso(prev.y, prev.m, prevDays - i),
      day: prevDays - i,
      inMonth: false,
    })
  }
  for (let day = 1; day <= days; day += 1) {
    cells.push({ date: iso(y, m, day), day, inMonth: true })
  }
  let nextDay = 1
  while (cells.length < 42) {
    cells.push({
      date: iso(next.y, next.m, nextDay),
      day: nextDay,
      inMonth: false,
    })
    nextDay += 1
  }
  return cells
}

function bounds(from: string, to: string, hover: string) {
  const end = to || (from && hover ? hover : '')
  if (!from || !end) return null
  return from <= end ? { start: from, end } : { start: end, end: from }
}

export function DateModeField({ label, value, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState('')
  const [view, setView] = useState(() => parseMonth(value.from))

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    panel.style.left = '0'
    panel.style.right = 'auto'
    const rect = panel.getBoundingClientRect()
    if (rect.right > window.innerWidth - 8) {
      panel.style.left = 'auto'
      panel.style.right = '0'
    }
  }, [open, view])

  const openPicker = () => {
    setView(parseMonth(value.from || todayIso()))
    setHover('')
    setOpen(true)
  }

  const pick = (date: string) => {
    if (!value.from || value.to) {
      onChange({ from: date, to: '' })
      return
    }
    const start = value.from <= date ? value.from : date
    const end = value.from <= date ? date : value.from
    onChange({ from: start, to: end })
    setOpen(false)
    setHover('')
  }

  const range = bounds(value.from, value.to, hover)
  const right = addMonths(view.y, view.m, 1)
  const months = useMemo(
    () => [
      { y: view.y, m: view.m },
      { y: right.y, m: right.m },
    ],
    [view.y, view.m, right.y, right.m],
  )

  return (
    <div className="date-mode-field" ref={wrapRef}>
      <span>{label}</span>
      <button
        type="button"
        className={`date-range-picker${open ? ' open' : ''}`}
        onClick={() => {
          if (open) setOpen(false)
          else openPicker()
        }}
      >
        <span className={value.from ? 'date-range-value' : 'date-range-placeholder'}>
          {value.from || '開始日期'}
        </span>
        <span className="date-range-arrow" aria-hidden>
          →
        </span>
        <span className={value.to ? 'date-range-value' : 'date-range-placeholder'}>
          {value.to || '結束日期'}
        </span>
        <span className="date-range-icon">{CALENDAR_ICON}</span>
      </button>
      {open && (
        <div
          className="date-range-panel"
          ref={panelRef}
          onMouseLeave={() => setHover('')}
        >
          {months.map((month, index) => (
            <div className="date-cal" key={`${month.y}-${month.m}`}>
              <div className="date-cal-head">
                {index === 0 ? (
                  <div className="date-cal-nav">
                    <button
                      type="button"
                      onClick={() => setView(addMonths(view.y, view.m, -12))}
                    >
                      «
                    </button>
                    <button
                      type="button"
                      onClick={() => setView(addMonths(view.y, view.m, -1))}
                    >
                      ‹
                    </button>
                  </div>
                ) : (
                  <span className="date-cal-nav-spacer" />
                )}
                <span className="date-cal-title">
                  {month.y}年 {month.m}月
                </span>
                {index === 1 ? (
                  <div className="date-cal-nav">
                    <button
                      type="button"
                      onClick={() => setView(addMonths(view.y, view.m, 1))}
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      onClick={() => setView(addMonths(view.y, view.m, 12))}
                    >
                      »
                    </button>
                  </div>
                ) : (
                  <span className="date-cal-nav-spacer" />
                )}
              </div>
              <div className="date-cal-week">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="date-cal-grid">
                {monthCells(month.y, month.m).map((cell) => {
                  const isStart = cell.date === value.from
                  const isEnd = Boolean(value.to) && cell.date === value.to
                  const isEdge = isStart || isEnd
                  const inRange = Boolean(
                    range && cell.date > range.start && cell.date < range.end,
                  )
                  const isToday = cell.date === todayIso()
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      className={[
                        'date-cal-day',
                        cell.inMonth ? '' : ' is-muted',
                        isEdge ? ' is-edge' : '',
                        inRange ? ' is-in-range' : '',
                        isToday && !isEdge ? ' is-today' : '',
                        hover === cell.date ? ' is-hover' : '',
                      ].join('')}
                      onMouseEnter={() => setHover(cell.date)}
                      onClick={() => pick(cell.date)}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
