import { describe, expect, it, vi } from 'vitest'
import Position from './Position'
import Workspace from './Workspace'
import type { IEdge, IWorkspaceElement } from './types'

function createMockElement(id: string, x = 0, y = 0): IWorkspaceElement {
  return {
    id,
    position: new Position(x, y),
    name: id,
    type: 'container',
    move: vi.fn(),
    update: vi.fn(),
    toJSON: () => ({ id }),
  }
}

function createMockEdge(id: string): IEdge {
  return {
    id,
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 100, y: 100 },
    toJSON: () => ({ id }),
  }
}

describe('Workspace', () => {
  it('初期状態で elements と edges が空', () => {
    const ws = new Workspace()
    expect(ws.elements).toEqual([])
    expect(ws.edges).toEqual([])
  })

  it('addElement / removeElement が動作する', () => {
    const ws = new Workspace()
    const el = createMockElement('n1')

    ws.addElement(el)
    expect(ws.elements).toHaveLength(1)

    ws.removeElement(el)
    expect(ws.elements).toHaveLength(0)
  })

  it('addEdge / removeEdge が動作する', () => {
    const ws = new Workspace()
    const edge = createMockEdge('e1')

    ws.addEdge(edge)
    expect(ws.edges).toHaveLength(1)

    ws.removeEdge(edge)
    expect(ws.edges).toHaveLength(0)
  })

  it('存在しない要素の removeElement はエラーにならない', () => {
    const ws = new Workspace()
    const el = createMockElement('n1')
    expect(() => ws.removeElement(el)).not.toThrow()
  })

  it('add/remove 時に EventBus にイベントを発行する', () => {
    const ws = new Workspace()
    const addHandler = vi.fn()
    const removeHandler = vi.fn()

    ws.on('add', addHandler)
    ws.on('remove', removeHandler)

    const el = createMockElement('n1')
    ws.addElement(el)
    expect(addHandler).toHaveBeenCalledOnce()

    ws.removeElement(el)
    expect(removeHandler).toHaveBeenCalledOnce()
  })

  it('on() の戻り値で購読解除できる', () => {
    const ws = new Workspace()
    const handler = vi.fn()

    const unsub = ws.on('move', handler)
    unsub()
    ws.eventBus.emit('move', null)

    expect(handler).not.toHaveBeenCalled()
  })

  describe('viewport', () => {
    it('初期値が x:0, y:0, scale:1', () => {
      const ws = new Workspace()
      expect(ws.viewport).toEqual({ x: 0, y: 0, scale: 1 })
    })

    it('pan で x, y を設定する', () => {
      const ws = new Workspace()
      ws.pan(100, 200)
      expect(ws.viewport.x).toBe(100)
      expect(ws.viewport.y).toBe(200)
    })

    it('panBy で相対移動する', () => {
      const ws = new Workspace()
      ws.pan(50, 50)
      ws.panBy(10, -20)
      expect(ws.viewport.x).toBe(60)
      expect(ws.viewport.y).toBe(30)
    })

    it('setScale でスケールを変更する', () => {
      const ws = new Workspace()
      ws.setScale(2.0)
      expect(ws.viewport.scale).toBe(2.0)
    })

    it('zoomAt で指定点を中心にズームする', () => {
      const ws = new Workspace()
      ws.zoomAt(400, 300, 2.0)
      expect(ws.viewport.scale).toBe(2.0)
      // ワールド座標の点 (400, 300) がスクリーン上の同じ位置に留まる
      expect(ws.viewport.x).toBe(400 - 400 * 2.0)
      expect(ws.viewport.y).toBe(300 - 300 * 2.0)
    })
  })

  describe('fitView', () => {
    it('要素が無い場合はビューポートを変更しない', () => {
      const ws = new Workspace()
      ws.fitView(800, 600)
      expect(ws.viewport).toEqual({ x: 0, y: 0, scale: 1 })
    })

    it('要素が収まるようにスケールとパンを調整する', () => {
      const ws = new Workspace()
      const el = Object.assign(createMockElement('n1', 100, 100), { width: 200, height: 100 })
      ws.addElement(el)

      ws.fitView(800, 600)

      // scale は 1.0 を上限とする
      expect(ws.viewport.scale).toBeLessThanOrEqual(1.0)
      expect(ws.viewport.scale).toBeGreaterThan(0)
    })
  })

  describe('history', () => {
    it('History インスタンスを持っている', () => {
      const ws = new Workspace()
      expect(ws.history).toBeDefined()
      expect(ws.history.canUndo).toBe(false)
    })
  })

  describe('selection', () => {
    it('SelectionManager インスタンスを持っている', () => {
      const ws = new Workspace()
      expect(ws.selection).toBeDefined()
    })
  })
})
