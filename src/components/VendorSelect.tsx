import { useEffect, useMemo, useRef, useState } from 'react'
import { fuzzyMatch } from '../utils/fuzzy'
import './VendorSelect.css'

export interface PayeeOption {
  id: string
  code: string
  name: string
}

interface Props {
  items: PayeeOption[]
  value: string
  onChange: (id: string) => void
  error?: boolean
  disabled?: boolean
  placeholder?: string
  emptyText?: string
  searchPlaceholder?: string
  allowClear?: boolean
}

export function VendorSelect({
  items,
  value,
  onChange,
  error,
  disabled,
  placeholder = '搜尋或選擇付款對象',
  emptyText = '查無資料',
  searchPlaceholder = '搜尋編號或名稱',
  allowClear = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const selected = items.find((v) => v.id === value)

  const filtered = useMemo(() => {
    if (!keyword.trim()) return items
    return items.filter((v) => fuzzyMatch(`${v.code} ${v.name}`, keyword))
  }, [items, keyword])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setKeyword('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div
      className={`vendor-select${error ? ' has-error' : ''}${disabled ? ' is-disabled' : ''}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className={`vendor-trigger${open ? ' open' : ''}`}
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
        }}
        disabled={disabled}
      >
        <span className={selected ? 'vendor-value' : 'vendor-placeholder'}>
          {selected ? `${selected.code} ${selected.name}` : placeholder}
        </span>
        <span className="vendor-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && !disabled && (
        <div className="vendor-dropdown">
          <input
            className="vendor-search"
            autoFocus
            placeholder={searchPlaceholder}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <ul className="vendor-list">
            {allowClear && (
              <li>
                <button
                  type="button"
                  className={`vendor-option${!value ? ' selected' : ''}`}
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                    setKeyword('')
                  }}
                >
                  不限
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="vendor-empty">{emptyText}</li>
            ) : (
              filtered.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    className={`vendor-option${v.id === value ? ' selected' : ''}`}
                    onClick={() => {
                      onChange(v.id)
                      setOpen(false)
                      setKeyword('')
                    }}
                  >
                    <span className="vendor-code">{v.code}</span>
                    <span>{v.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
