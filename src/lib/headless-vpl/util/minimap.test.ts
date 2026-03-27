import { describe, expect, it, vi } from 'vitest'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import type { IWorkspaceElement } from '../core/types'
import { bindMinimapNavigation, collectMinimapElements, computeMinimapSnapshot } from './minimap'

function createMockElement(
  id: string,
  x: number,
  y: number,
  width?: number,
  height?: number,
  color?: string
): IWorkspaceElement {
  return {
    id,
    position: new Position(x, y),
    name: id,
    type: 'container',
    move: vi.fn(),
    update: vi.fn(),
    toJSON: () => ({ id }),
    ...(typeof width === 'number' ? { width } : {}),
    ...(typeof height === 'number' ? { height } : {}),
    ...(color ? { color } : {}),
  } as IWorkspaceElement
}

class MockMinimapElement {
  listeners = new Map<string, EventListener>()
  setPointerCapture = vi.fn()
  releasePointerCapture = vi.fn()

  addEventListener(type: string, listener: EventListener) {
    this.listeners.set(type, listener)
  }

  removeEventListener(type: string) {
    this.listeners.delete(type)
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
  }

  dispatch(type: string, event: Record<string, unknown>) {
    const listener = this.listeners.get(type)
    if (!listener) throw new Error(`Missing listener for ${type}`)
    listener(event as unknown as Event)
  }
}

describe('collectMinimapElements', () => {
  it('width / height を持つ要素だけを収集する', () => {
    const elements = [
      createMockElement('n1', 10, 20, 120, 80, '#3b82f6'),
      createMockElement('n2', 30, 40),
    ]

    expect(collectMinimapElements(elements)).toEqual([
      {
        id: 'n1',
        position: new Position(10, 20),
        width: 120,
        height: 80,
        color: '#3b82f6',
      },
    ])
  })
})

describe('computeMinimapSnapshot', () => {
  it('要素と viewport からミニマップ座標を計算する', () => {
    const ws = new Workspace()
    ws.pan(-200, 0)

    const snapshot = computeMinimapSnapshot({
      workspace: ws,
      elements: [
        { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 100, color: '#111111' },
        { id: 'b', position: { x: 300, y: 0 }, width: 100, height: 100, color: '#222222' },
      ],
      canvas: { width: 200, height: 100 },
      size: { width: 200, height: 100 },
      padding: 0,
    })

    expect(snapshot.bounds).toEqual({
      minX: 0,
      minY: 0,
      maxX: 400,
      maxY: 100,
      width: 400,
      height: 100,
    })
    expect(snapshot.transform.scale).toBeCloseTo(0.5)
    expect(snapshot.nodes).toEqual([
      { id: 'a', color: '#111111', x: 0, y: 25, width: 50, height: 50 },
      { id: 'b', color: '#222222', x: 150, y: 25, width: 50, height: 50 },
    ])
    expect(snapshot.viewport).toEqual({ x: 100, y: 25, width: 100, height: 50 })
  })

  it('boundViewport で off-screen viewport も bounds に含める', () => {
    const ws = new Workspace()
    ws.pan(-600, 0)

    const snapshot = computeMinimapSnapshot({
      workspace: ws,
      elements: [{ id: 'a', position: { x: 0, y: 0 }, width: 100, height: 100 }],
      canvas: { width: 200, height: 100 },
      size: { width: 200, height: 100 },
      padding: 0,
      boundViewport: true,
    })

    expect(snapshot.bounds.maxX).toBe(800)
    expect(snapshot.viewport.x + snapshot.viewport.width).toBeLessThanOrEqual(snapshot.size.width)
  })
})

describe('bindMinimapNavigation', () => {
  it('viewport 外クリックで指定位置を中心にパンする', () => {
    const ws = new Workspace()
    ws.pan(-200, 0)

    const minimap = new MockMinimapElement()
    const getSnapshot = () =>
      computeMinimapSnapshot({
        workspace: ws,
        elements: [
          { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 100 },
          { id: 'b', position: { x: 300, y: 0 }, width: 100, height: 100 },
        ],
        canvas: { width: 200, height: 100 },
        size: { width: 200, height: 100 },
        padding: 0,
      })

    const cleanup = bindMinimapNavigation(minimap as unknown as HTMLElement, {
      workspace: ws,
      getSnapshot,
      getCanvasSize: () => ({ width: 200, height: 100 }),
    })

    minimap.dispatch('pointerdown', {
      button: 0,
      pointerId: 1,
      clientX: 50,
      clientY: 50,
      preventDefault: vi.fn(),
    })

    expect(ws.viewport.x).toBeCloseTo(0)
    expect(ws.viewport.y).toBeCloseTo(0)

    cleanup()
  })

  it('viewport rect をドラッグすると origin 基準でパンする', () => {
    const ws = new Workspace()
    ws.pan(-200, 0)

    const minimap = new MockMinimapElement()
    const getSnapshot = () =>
      computeMinimapSnapshot({
        workspace: ws,
        elements: [
          { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 100 },
          { id: 'b', position: { x: 300, y: 0 }, width: 100, height: 100 },
        ],
        canvas: { width: 200, height: 100 },
        size: { width: 200, height: 100 },
        padding: 0,
      })

    const cleanup = bindMinimapNavigation(minimap as unknown as HTMLElement, {
      workspace: ws,
      getSnapshot,
      getCanvasSize: () => ({ width: 200, height: 100 }),
    })

    minimap.dispatch('pointerdown', {
      button: 0,
      pointerId: 7,
      clientX: 110,
      clientY: 50,
      preventDefault: vi.fn(),
    })
    minimap.dispatch('pointermove', {
      button: 0,
      pointerId: 7,
      clientX: 130,
      clientY: 50,
      preventDefault: vi.fn(),
    })

    expect(ws.viewport.x).toBeCloseTo(-240)
    expect(ws.viewport.y).toBeCloseTo(0)

    minimap.dispatch('pointerup', {
      button: 0,
      pointerId: 7,
      clientX: 130,
      clientY: 50,
      preventDefault: vi.fn(),
    })

    expect(minimap.setPointerCapture).toHaveBeenCalledWith(7)
    expect(minimap.releasePointerCapture).toHaveBeenCalledWith(7)

    cleanup()
  })
})
