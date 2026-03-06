import { describe, expect, it } from 'vitest'
import type { Viewport } from '../core/types'
import { screenToWorld, worldToScreen } from './viewport'

const defaultViewport: Viewport = { x: 0, y: 0, scale: 1 }

describe('screenToWorld', () => {
  it('デフォルトビューポートではそのまま', () => {
    expect(screenToWorld({ x: 100, y: 200 }, defaultViewport)).toEqual({ x: 100, y: 200 })
  })

  it('パンオフセットを考慮する', () => {
    const vp: Viewport = { x: 50, y: 100, scale: 1 }
    expect(screenToWorld({ x: 150, y: 200 }, vp)).toEqual({ x: 100, y: 100 })
  })

  it('スケールを考慮する', () => {
    const vp: Viewport = { x: 0, y: 0, scale: 2 }
    expect(screenToWorld({ x: 200, y: 100 }, vp)).toEqual({ x: 100, y: 50 })
  })

  it('パン + スケールの複合', () => {
    const vp: Viewport = { x: 100, y: 50, scale: 2 }
    const result = screenToWorld({ x: 300, y: 150 }, vp)
    expect(result.x).toBe(100)
    expect(result.y).toBe(50)
  })
})

describe('worldToScreen', () => {
  it('デフォルトビューポートではそのまま', () => {
    expect(worldToScreen({ x: 100, y: 200 }, defaultViewport)).toEqual({ x: 100, y: 200 })
  })

  it('パンオフセットを適用する', () => {
    const vp: Viewport = { x: 50, y: 100, scale: 1 }
    expect(worldToScreen({ x: 100, y: 100 }, vp)).toEqual({ x: 150, y: 200 })
  })

  it('スケールを適用する', () => {
    const vp: Viewport = { x: 0, y: 0, scale: 2 }
    expect(worldToScreen({ x: 100, y: 50 }, vp)).toEqual({ x: 200, y: 100 })
  })

  it('screenToWorld と worldToScreen は逆変換', () => {
    const vp: Viewport = { x: 30, y: -20, scale: 1.5 }
    const screen = { x: 400, y: 300 }
    const world = screenToWorld(screen, vp)
    const back = worldToScreen(world, vp)
    expect(back.x).toBeCloseTo(screen.x)
    expect(back.y).toBeCloseTo(screen.y)
  })
})
