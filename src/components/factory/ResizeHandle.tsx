import { useCallback, useEffect, useRef } from 'react'

type ResizeHandleProps = {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
}

export function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const dragging = useRef(false)
  const lastPos = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY
    },
    [direction]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const pos = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = pos - lastPos.current
      lastPos.current = pos
      onResize(delta)
    }

    const handleMouseUp = () => {
      dragging.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [direction, onResize])

  const isH = direction === 'horizontal'

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`factory-resize-handle ${isH ? 'factory-resize-h' : 'factory-resize-v'}`}
    />
  )
}
