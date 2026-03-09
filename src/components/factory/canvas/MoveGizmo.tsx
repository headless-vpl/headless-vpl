import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MovableObject } from '../../../lib/headless-vpl/core/MovableObject'
import type Workspace from '../../../lib/headless-vpl/core/Workspace'
import { MoveCommand, MoveManyCommand, worldToScreen } from '../../../lib/headless-vpl/primitives'

type DragAxis = 'x' | 'y' | 'free'

type MoveGizmoProps = {
  element: MovableObject
  selectionItems: MovableObject[]
  workspace: Workspace
  onMoveEnd: () => void
}

const ARROW_LENGTH = 60
const HEAD_SIZE = 12
const CENTER_SIZE = 16
const SVG_SIZE = 160
const CENTER = SVG_SIZE / 2

const COLOR_X = '#ef4444'
const COLOR_Y = '#22c55e'
const COLOR_FREE = '#3b82f6'

export function MoveGizmo({
  element,
  selectionItems,
  workspace,
  onMoveEnd,
}: MoveGizmoProps) {
  const [hoveredAxis, setHoveredAxis] = useState<DragAxis | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef<DragAxis | null>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const elementStartsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const dragTargets = selectionItems.length > 0 ? selectionItems : [element]

  const getWorldCenter = useCallback(() => {
    if (dragTargets.length > 1) {
      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY

      for (const item of dragTargets) {
        const width = 'width' in item ? item.width : 0
        const height = 'height' in item ? item.height : 0
        minX = Math.min(minX, item.position.x)
        minY = Math.min(minY, item.position.y)
        maxX = Math.max(maxX, item.position.x + width)
        maxY = Math.max(maxY, item.position.y + height)
      }

      return {
        x: minX + Math.max(0, maxX - minX) / 2,
        y: minY + Math.max(0, maxY - minY) / 2,
      }
    }

    const hasSize = 'width' in element && 'height' in element
    return hasSize
      ? {
          x: element.position.x + (element as { width: number }).width / 2,
          y: element.position.y + (element as { height: number }).height / 2,
        }
      : { x: element.position.x, y: element.position.y }
  }, [dragTargets, element])

  const syncPosition = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const screenPos = worldToScreen(getWorldCenter(), workspace.viewport)
    root.style.transform = `translate(${screenPos.x - CENTER}px, ${screenPos.y - CENTER}px)`
  }, [getWorldCenter, workspace])

  useLayoutEffect(() => {
    syncPosition()
  }, [syncPosition])

  useEffect(() => {
    const unsubs = [
      workspace.on('move', syncPosition),
      workspace.on('pan', syncPosition),
      workspace.on('zoom', syncPosition),
      workspace.on('update', syncPosition),
    ]
    return () => {
      for (const unsubscribe of unsubs) unsubscribe()
    }
  }, [syncPosition, workspace])

  const handleMouseDown = useCallback(
    (axis: DragAxis, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      draggingRef.current = axis
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      elementStartsRef.current = new Map(
        dragTargets.map((item) => [item.id, { x: item.position.x, y: item.position.y }])
      )
    },
    [dragTargets]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const axis = draggingRef.current
      if (!axis) return

      const scale = workspace.viewport.scale
      const dx = (e.clientX - dragStartRef.current.x) / scale
      const dy = (e.clientY - dragStartRef.current.y) / scale

      for (const item of dragTargets) {
        const start = elementStartsRef.current.get(item.id)
        if (!start) continue
        let nextX = start.x
        let nextY = start.y
        if (axis === 'x' || axis === 'free') nextX += dx
        if (axis === 'y' || axis === 'free') nextY += dy
        item.move(nextX, nextY)
      }
    }

    const handleMouseUp = () => {
      const axis = draggingRef.current
      if (!axis) return
      draggingRef.current = null

      const commands = dragTargets.flatMap((item) => {
        const start = elementStartsRef.current.get(item.id)
        if (!start) return []
        if (start.x === item.position.x && start.y === item.position.y) return []
        return [new MoveCommand(item, start.x, start.y, item.position.x, item.position.y)]
      })

      if (commands.length === 1) {
        workspace.history.execute(commands[0])
        onMoveEnd()
      } else if (commands.length > 1) {
        workspace.history.execute(new MoveManyCommand(commands))
        onMoveEnd()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragTargets, onMoveEnd, workspace])

  const isActive = (axis: DragAxis) => draggingRef.current === axis
  const isHovered = (axis: DragAxis) => hoveredAxis === axis && !draggingRef.current

  const xStroke = isActive('x') ? 3 : 2
  const yStroke = isActive('y') ? 3 : 2
  const xOpacity = isHovered('x') || isActive('x') ? 1 : 0.8
  const yOpacity = isHovered('y') || isActive('y') ? 1 : 0.8
  const freeOpacity = isHovered('free') || isActive('free') ? 1 : 0.8

  const xShaftEnd = CENTER + ARROW_LENGTH
  const xHeadTip = xShaftEnd + HEAD_SIZE
  const yShaftEnd = CENTER - ARROW_LENGTH
  const yHeadTip = yShaftEnd - HEAD_SIZE

  return (
    <div
      ref={rootRef}
      className='factory-move-gizmo'
    >
      <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
        <g opacity={xOpacity}>
          <line
            x1={CENTER + 10}
            y1={CENTER}
            x2={xShaftEnd}
            y2={CENTER}
            stroke={COLOR_X}
            strokeWidth={xStroke}
            strokeLinecap='round'
          />
          <polygon
            points={`${xShaftEnd},${CENTER - 6} ${xHeadTip},${CENTER} ${xShaftEnd},${CENTER + 6}`}
            fill={COLOR_X}
          />
        </g>
        <rect
          x={CENTER + 8}
          y={CENTER - 8}
          width={xHeadTip - CENTER - 8}
          height={16}
          fill='transparent'
          className='factory-gizmo-handle factory-gizmo-handle-x'
          onMouseEnter={() => setHoveredAxis('x')}
          onMouseLeave={() => setHoveredAxis(null)}
          onMouseDown={(e) => handleMouseDown('x', e)}
        />

        <g opacity={yOpacity}>
          <line
            x1={CENTER}
            y1={CENTER - 10}
            x2={CENTER}
            y2={yShaftEnd}
            stroke={COLOR_Y}
            strokeWidth={yStroke}
            strokeLinecap='round'
          />
          <polygon
            points={`${CENTER - 6},${yShaftEnd} ${CENTER},${yHeadTip} ${CENTER + 6},${yShaftEnd}`}
            fill={COLOR_Y}
          />
        </g>
        <rect
          x={CENTER - 8}
          y={yHeadTip}
          width={16}
          height={CENTER - 8 - yHeadTip}
          fill='transparent'
          className='factory-gizmo-handle factory-gizmo-handle-y'
          onMouseEnter={() => setHoveredAxis('y')}
          onMouseLeave={() => setHoveredAxis(null)}
          onMouseDown={(e) => handleMouseDown('y', e)}
        />

        <rect
          x={CENTER - CENTER_SIZE / 2}
          y={CENTER - CENTER_SIZE / 2}
          width={CENTER_SIZE}
          height={CENTER_SIZE}
          rx={2}
          fill={COLOR_FREE}
          opacity={freeOpacity}
          className='factory-gizmo-handle factory-gizmo-handle-free'
          onMouseEnter={() => setHoveredAxis('free')}
          onMouseLeave={() => setHoveredAxis(null)}
          onMouseDown={(e) => handleMouseDown('free', e)}
        />
      </svg>
    </div>
  )
}
