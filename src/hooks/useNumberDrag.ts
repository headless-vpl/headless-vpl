import { useCallback, useRef, useState } from 'react'

type UseNumberDragOptions = {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
}

type UseNumberDragReturn = {
  onPointerDown: (e: React.PointerEvent) => void
  /** ドラッグ中かどうか。pointerup後にクリック判定に使う */
  draggedRef: React.RefObject<boolean>
  /** ドラッグ中の値。null = ドラッグしていない */
  dragValue: number | null
}

/** ドラッグ判定の閾値（px） */
const DRAG_THRESHOLD = 3

function clamp(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min
  if (max !== undefined && value > max) return max
  return value
}

/**
 * ドラッグによる数値増減ロジックを管理するフック。
 * pointerdown → pointermove で値を増減し、pointerup で終了。
 * 移動量が閾値以下なら「クリック」とみなし draggedRef.current = false を返す。
 */
export function useNumberDrag({
  value,
  onChange,
  step = 1,
  min,
  max,
}: UseNumberDragOptions): UseNumberDragReturn {
  const startXRef = useRef(0)
  const startValueRef = useRef(0)
  const draggedRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [dragValue, setDragValue] = useState<number | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()

      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)

      startXRef.current = e.clientX
      startValueRef.current = value
      draggedRef.current = false

      const onMove = (ev: PointerEvent) => {
        const deltaX = ev.clientX - startXRef.current
        if (!draggedRef.current && Math.abs(deltaX) > DRAG_THRESHOLD) {
          draggedRef.current = true
        }
        if (draggedRef.current) {
          const newValue = clamp(
            startValueRef.current + Math.round(deltaX * step),
            min,
            max,
          )
          setDragValue(newValue)
          onChangeRef.current(newValue)
        }
      }

      const onUp = () => {
        el.releasePointerCapture(e.pointerId)
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        setDragValue(null)
      }

      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
    },
    [value, step, min, max],
  )

  return { onPointerDown, draggedRef, dragValue }
}
