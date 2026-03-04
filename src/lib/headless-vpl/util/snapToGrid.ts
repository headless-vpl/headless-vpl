import type { IPosition } from '../core/Position'

/**
 * 座標をグリッドの倍数に丸める。
 */
export function snapToGrid(position: IPosition, gridSize: number): IPosition {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  }
}

/**
 * 移動量をグリッドの倍数に丸める。
 * DnD の delta 前処理として使う。
 */
export function snapDeltaToGrid(delta: IPosition, gridSize: number): IPosition {
  return {
    x: Math.round(delta.x / gridSize) * gridSize,
    y: Math.round(delta.y / gridSize) * gridSize,
  }
}
