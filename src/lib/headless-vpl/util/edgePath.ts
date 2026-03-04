import type { IPosition } from '../core/Position'

export type EdgePathResult = {
  path: string
  labelPosition: IPosition
}

/**
 * 直線パス。
 */
export function getStraightPath(start: IPosition, end: IPosition): EdgePathResult {
  return {
    path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    labelPosition: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    },
  }
}

/**
 * ベジェ曲線パス（3次）。
 * 制御点は始点・終点の中間 X に配置。
 */
export function getBezierPath(start: IPosition, end: IPosition): EdgePathResult {
  const dx = Math.abs(end.x - start.x)
  const offset = Math.max(dx * 0.5, 50)

  const c1x = start.x + offset
  const c1y = start.y
  const c2x = end.x - offset
  const c2y = end.y

  // ベジェ曲線の中間点（t = 0.5）
  const t = 0.5
  const mt = 1 - t
  const labelX = mt * mt * mt * start.x + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * end.x
  const labelY = mt * mt * mt * start.y + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * end.y

  return {
    path: `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`,
    labelPosition: { x: labelX, y: labelY },
  }
}

/**
 * ステップパス（直角折れ線）。
 * 中間 X で折れる。
 */
export function getStepPath(start: IPosition, end: IPosition): EdgePathResult {
  const midX = (start.x + end.x) / 2

  return {
    path: `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`,
    labelPosition: {
      x: midX,
      y: (start.y + end.y) / 2,
    },
  }
}

/**
 * スムースステップパス（角丸の折れ線）。
 * borderRadius で角丸のサイズを制御。
 */
export function getSmoothStepPath(
  start: IPosition,
  end: IPosition,
  borderRadius: number = 8
): EdgePathResult {
  const midX = (start.x + end.x) / 2
  const dy = end.y - start.y
  const r = Math.min(borderRadius, Math.abs(dy) / 2, Math.abs(midX - start.x), Math.abs(end.x - midX))

  if (r <= 0 || dy === 0) {
    return getStepPath(start, end)
  }

  const dirY = dy > 0 ? 1 : -1

  const path = [
    `M ${start.x} ${start.y}`,
    `L ${midX - r} ${start.y}`,
    `Q ${midX} ${start.y}, ${midX} ${start.y + r * dirY}`,
    `L ${midX} ${end.y - r * dirY}`,
    `Q ${midX} ${end.y}, ${midX + r} ${end.y}`,
    `L ${end.x} ${end.y}`,
  ].join(' ')

  return {
    path,
    labelPosition: {
      x: midX,
      y: (start.y + end.y) / 2,
    },
  }
}
