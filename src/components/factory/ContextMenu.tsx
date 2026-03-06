import { useCallback, useEffect, useRef, useState } from 'react'

type MenuItem = {
  label: string
  shortcut?: string
  action: () => void
  disabled?: boolean
  separator?: false
} | {
  separator: true
}

type ContextMenuProps = {
  items: MenuItem[]
  targetRef: React.RefObject<HTMLElement | null>
}

export function ContextMenu({ items, targetRef }: ContextMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      setPos({ x: e.clientX, y: e.clientY })
      setOpen(true)
    },
    []
  )

  useEffect(() => {
    const el = targetRef.current
    if (!el) return
    el.addEventListener('contextmenu', handleContextMenu)
    return () => el.removeEventListener('contextmenu', handleContextMenu)
  }, [targetRef, handleContextMenu])

  useEffect(() => {
    if (!open) return
    const handleClose = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClose)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClose)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={menuRef}
      className='factory-context-menu'
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={`sep-${i}`} className='factory-context-sep' />
        }
        return (
          <button
            key={item.label}
            className='factory-context-item'
            disabled={item.disabled}
            onClick={() => {
              item.action()
              setOpen(false)
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className='factory-context-shortcut'>{item.shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}
