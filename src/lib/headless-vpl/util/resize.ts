import type { IPosition } from '../core/Position'
import type { ResizeHandleDirection } from '../core/types'

export type ResizableElement = {
  position: IPosition
  width: number
  height: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
}

export type ResizeState = {
  handle: ResizeHandleDirection
  startMousePos: IPosition
  startBounds: { x: number; y: number; width: number; height: number }
}

/**
 * マウス位置が要素のどのリサイズハンドルにヒットしているか判定する。
 * handleSize は各辺からの判定距離。
 */
export function detectResizeHandle(
  mousePos: IPosition,
  element: { position: IPosition; width: number; height: number },
  handleSize: number = 8
): ResizeHandleDirection | null {
  const { x, y } = element.position
  const { width, height } = element

  const onLeft = mousePos.x >= x - handleSize && mousePos.x <= x + handleSize
  const onRight = mousePos.x >= x + width - handleSize && mousePos.x <= x + width + handleSize
  const onTop = mousePos.y >= y - handleSize && mousePos.y <= y + handleSize
  const onBottom = mousePos.y >= y + height - handleSize && mousePos.y <= y + height + handleSize
  const inHorizRange = mousePos.x >= x - handleSize && mousePos.x <= x + width + handleSize
  const inVertRange = mousePos.y >= y - handleSize && mousePos.y <= y + height + handleSize

  if (onTop && onLeft) return 'nw'
  if (onTop && onRight) return 'ne'
  if (onBottom && onLeft) return 'sw'
  if (onBottom && onRight) return 'se'
  if (onTop && inHorizRange) return 'n'
  if (onBottom && inHorizRange) return 's'
  if (onLeft && inVertRange) return 'w'
  if (onRight && inVertRange) return 'e'

  return null
}

/**
 * リサイズ開始時の状態を記録する。
 */
export function beginResize(
  handle: ResizeHandleDirection,
  mousePos: IPosition,
  element: { position: IPosition; width: number; height: number }
): ResizeState {
  return {
    handle,
    startMousePos: { x: mousePos.x, y: mousePos.y },
    startBounds: {
      x: element.position.x,
      y: element.position.y,
      width: element.width,
      height: element.height,
    },
  }
}

/**
 * リサイズを適用し、新しい位置とサイズを返す。
 * min/max 制約を尊重する。
 */
export function applyResize(
  mousePos: IPosition,
  state: ResizeState,
  constraints: {
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
  } = {}
): { x: number; y: number; width: number; height: number } {
  const dx = mousePos.x - state.startMousePos.x
  const dy = mousePos.y - state.startMousePos.y

  let { x, y, width, height } = state.startBounds

  const handle = state.handle

  // 水平方向
  if (handle.includes('e')) {
    width += dx
  } else if (handle.includes('w')) {
    width -= dx
    x += dx
  }

  // 垂直方向
  if (handle.includes('s')) {
    height += dy
  } else if (handle === 'n' || handle === 'ne' || handle === 'nw') {
    height -= dy
    y += dy
  }

  // min/max 制約
  const minW = constraints.minWidth ?? 10
  const maxW = constraints.maxWidth ?? Infinity
  const minH = constraints.minHeight ?? 10
  const maxH = constraints.maxHeight ?? Infinity

  if (width < minW) {
    if (handle.includes('w')) x -= minW - width
    width = minW
  }
  if (width > maxW) {
    if (handle.includes('w')) x -= maxW - width
    width = maxW
  }
  if (height < minH) {
    if (handle === 'n' || handle === 'ne' || handle === 'nw') y -= minH - height
    height = minH
  }
  if (height > maxH) {
    if (handle === 'n' || handle === 'ne' || handle === 'nw') y -= maxH - height
    height = maxH
  }

  return { x, y, width, height }
}
