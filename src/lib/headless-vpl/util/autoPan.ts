import type { IPosition } from '../core/Position'

export type CanvasBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type AutoPanResult = {
  dx: number
  dy: number
  active: boolean
}

/**
 * マウスがキャンバス端に近いとき、パン方向と速度を計算する。
 * 端からの距離に応じた線形速度を返す。
 *
 * @param mousePos スクリーン座標でのマウス位置
 * @param bounds キャンバスの矩形
 * @param isDragging ドラッグ中かどうか
 * @param threshold 端からの判定距離（px）
 * @param speed パン速度の最大値（px/frame）
 */
export function computeAutoPan(
  mousePos: IPosition,
  bounds: CanvasBounds,
  isDragging: boolean,
  threshold: number = 40,
  speed: number = 10
): AutoPanResult {
  if (!isDragging) return { dx: 0, dy: 0, active: false }

  let dx = 0
  let dy = 0

  // 左端
  const leftDist = mousePos.x - bounds.x
  if (leftDist < threshold && leftDist >= 0) {
    dx = speed * (1 - leftDist / threshold)
  }

  // 右端
  const rightDist = (bounds.x + bounds.width) - mousePos.x
  if (rightDist < threshold && rightDist >= 0) {
    dx = -speed * (1 - rightDist / threshold)
  }

  // 上端
  const topDist = mousePos.y - bounds.y
  if (topDist < threshold && topDist >= 0) {
    dy = speed * (1 - topDist / threshold)
  }

  // 下端
  const bottomDist = (bounds.y + bounds.height) - mousePos.y
  if (bottomDist < threshold && bottomDist >= 0) {
    dy = -speed * (1 - bottomDist / threshold)
  }

  return { dx, dy, active: dx !== 0 || dy !== 0 }
}
