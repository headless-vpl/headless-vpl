import type { IPosition } from '../core/Position'
import type { Viewport } from '../core/types'
import { screenToWorld } from './viewport'

export type MarqueeRect = {
  x: number
  y: number
  width: number
  height: number
}

export type MarqueeMode = 'full' | 'partial'

export type MarqueeElement = {
  id: string
  position: IPosition
  width: number
  height: number
}

/**
 * 2 点からマーキー矩形を生成する。
 * どちらの方向にドラッグしても正しい矩形が返る。
 */
export function createMarqueeRect(start: IPosition, end: IPosition): MarqueeRect {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

/**
 * マーキー矩形内にある要素をフィルタリングする。
 * mode: 'full' — 完全に内側にある要素のみ
 * mode: 'partial' — 一部でも重なる要素を含む
 */
export function getElementsInMarquee<T extends MarqueeElement>(
  elements: readonly T[],
  marquee: MarqueeRect,
  mode: MarqueeMode = 'full'
): T[] {
  const mx1 = marquee.x
  const my1 = marquee.y
  const mx2 = marquee.x + marquee.width
  const my2 = marquee.y + marquee.height

  return elements.filter((el) => {
    const ex1 = el.position.x
    const ey1 = el.position.y
    const ex2 = el.position.x + el.width
    const ey2 = el.position.y + el.height

    if (mode === 'full') {
      return ex1 >= mx1 && ey1 >= my1 && ex2 <= mx2 && ey2 <= my2
    }
    // partial: 矩形が重なるかチェック
    return ex1 < mx2 && ex2 > mx1 && ey1 < my2 && ey2 > my1
  })
}

/**
 * Screen 座標で指定されたマーキーを World 座標に変換してフィルタリングする。
 */
export function getElementsInScreenMarquee<T extends MarqueeElement>(
  elements: readonly T[],
  screenStart: IPosition,
  screenEnd: IPosition,
  viewport: Viewport,
  mode: MarqueeMode = 'full'
): T[] {
  const worldStart = screenToWorld(screenStart, viewport)
  const worldEnd = screenToWorld(screenEnd, viewport)
  const marquee = createMarqueeRect(worldStart, worldEnd)
  return getElementsInMarquee(elements, marquee, mode)
}
