import { useCallback, useEffect, useRef, useState } from 'react'
import type { MovableObject } from '../../../lib/headless-vpl/core/MovableObject'
import type Workspace from '../../../lib/headless-vpl/core/Workspace'
import { MoveCommand, worldToScreen } from '../../../lib/headless-vpl'
import { useFactory } from '../../../contexts/FactoryContext'

type DragAxis = 'x' | 'y' | 'free'

type MoveGizmoProps = {
  element: MovableObject
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

export function MoveGizmo({ element, workspace, onMoveEnd }: MoveGizmoProps) {
  const { revision } = useFactory()
  const [hoveredAxis, setHoveredAxis] = useState<DragAxis | null>(null)
  const draggingRef = useRef<DragAxis | null>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const elementStartRef = useRef({ x: 0, y: 0 })

  // 要素中心のスクリーン座標を計算（キャンバスローカル座標）
  const getScreenPos = useCallback(() => {
    const hasSize = 'width' in element && 'height' in element
    const worldCenter = hasSize
      ? {
          x: element.position.x + (element as { width: number }).width / 2,
          y: element.position.y + (element as { height: number }).height / 2,
        }
      : { x: element.position.x, y: element.position.y }
    return worldToScreen(worldCenter, workspace.viewport)
  }, [element, workspace])

  // revision が変わるたびに位置を再計算（内部的にはレンダーで反映）
  const screenPos = getScreenPos()

  const handleMouseDown = useCallback(
    (axis: DragAxis, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      draggingRef.current = axis
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      elementStartRef.current = { x: element.position.x, y: element.position.y }
    },
    [element]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const axis = draggingRef.current
      if (!axis) return

      const scale = workspace.viewport.scale
      const dx = (e.clientX - dragStartRef.current.x) / scale
      const dy = (e.clientY - dragStartRef.current.y) / scale

      let newX = elementStartRef.current.x
      let newY = elementStartRef.current.y

      if (axis === 'x' || axis === 'free') newX += dx
      if (axis === 'y' || axis === 'free') newY += dy

      element.move(newX, newY)
      // syncState は onMoveEnd で呼ぶが、リアルタイム追従のためにイベント発火
      workspace.eventBus.emit('move', element)
    }

    const handleMouseUp = () => {
      const axis = draggingRef.current
      if (!axis) return
      draggingRef.current = null

      const fromX = elementStartRef.current.x
      const fromY = elementStartRef.current.y
      const toX = element.position.x
      const toY = element.position.y

      // 実際に移動があった場合のみコマンド登録
      if (fromX !== toX || fromY !== toY) {
        // 現在位置に既に移動済みなので、execute で再度移動しないようインラインコマンドを使う
        workspace.history.execute({
          execute() {
            element.move(toX, toY)
          },
          undo() {
            element.move(fromX, fromY)
          },
        })
        onMoveEnd()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [element, workspace, onMoveEnd])

  const isActive = (axis: DragAxis) => draggingRef.current === axis
  const isHovered = (axis: DragAxis) => hoveredAxis === axis && !draggingRef.current

  const xStroke = isActive('x') ? 3 : 2
  const yStroke = isActive('y') ? 3 : 2
  const xOpacity = isHovered('x') || isActive('x') ? 1 : 0.8
  const yOpacity = isHovered('y') || isActive('y') ? 1 : 0.8
  const freeOpacity = isHovered('free') || isActive('free') ? 1 : 0.8

  // X軸矢印: 中央から右へ
  const xShaftEnd = CENTER + ARROW_LENGTH
  const xHeadTip = xShaftEnd + HEAD_SIZE

  // Y軸矢印: 中央から上へ (SVG Y軸は下向き)
  const yShaftEnd = CENTER - ARROW_LENGTH
  const yHeadTip = yShaftEnd - HEAD_SIZE

  return (
    <div
      className='factory-move-gizmo'
      style={{
        transform: `translate(${screenPos.x - CENTER}px, ${screenPos.y - CENTER}px)`,
      }}
    >
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      >
        {/* X軸: 赤 */}
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
        {/* X軸ヒットエリア */}
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

        {/* Y軸: 緑 */}
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
        {/* Y軸ヒットエリア */}
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

        {/* 中央ハンドル: 青 */}
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
