import type { IPosition } from '../core/Position'

export type ClipboardData = {
  elements: Record<string, unknown>[]
}

/**
 * 要素を JSON としてシリアライズし、ClipboardData を生成する。
 */
export function copyElements(
  elements: { toJSON(): Record<string, unknown> }[]
): ClipboardData {
  return {
    elements: elements.map((el) => el.toJSON()),
  }
}

/**
 * 貼り付け時の新しい位置を計算する。
 * 元の位置から offset 分ずらす。
 */
export function calculatePastePositions(
  data: ClipboardData,
  offset: IPosition = { x: 20, y: 20 }
): IPosition[] {
  return data.elements.map((el) => {
    const pos = el.position as IPosition | undefined
    return {
      x: (pos?.x ?? 0) + offset.x,
      y: (pos?.y ?? 0) + offset.y,
    }
  })
}

/**
 * ClipboardData から要素を再生成する。
 * factory パターンにより、具体的な型の生成はユーザー責務。
 */
export function pasteElements<T>(
  data: ClipboardData,
  factory: (json: Record<string, unknown>, position: IPosition) => T,
  offset: IPosition = { x: 20, y: 20 }
): T[] {
  const positions = calculatePastePositions(data, offset)
  return data.elements.map((el, i) => factory(el, positions[i]))
}
