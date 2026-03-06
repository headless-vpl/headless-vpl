import { describe, expect, it, vi } from 'vitest'
import { EventBus } from './EventBus'

describe('EventBus', () => {
  it('ハンドラにイベントを配信する', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    bus.on('move', handler)
    bus.emit('move', { id: 'node1' })

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith({
      type: 'move',
      target: { id: 'node1' },
      data: undefined,
    })
  })

  it('data 付きでイベントを配信する', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    bus.on('connect', handler)
    bus.emit('connect', { id: 'edge1' }, { source: 'a', target: 'b' })

    expect(handler).toHaveBeenCalledWith({
      type: 'connect',
      target: { id: 'edge1' },
      data: { source: 'a', target: 'b' },
    })
  })

  it('異なる型のイベントは混ざらない', () => {
    const bus = new EventBus()
    const moveHandler = vi.fn()
    const addHandler = vi.fn()

    bus.on('move', moveHandler)
    bus.on('add', addHandler)
    bus.emit('move', null)

    expect(moveHandler).toHaveBeenCalledOnce()
    expect(addHandler).not.toHaveBeenCalled()
  })

  it('同一型に複数ハンドラを登録できる', () => {
    const bus = new EventBus()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    bus.on('move', handler1)
    bus.on('move', handler2)
    bus.emit('move', null)

    expect(handler1).toHaveBeenCalledOnce()
    expect(handler2).toHaveBeenCalledOnce()
  })

  it('unsubscribe 関数でハンドラを解除できる', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    const unsub = bus.on('move', handler)
    unsub()
    bus.emit('move', null)

    expect(handler).not.toHaveBeenCalled()
  })

  it('未登録のイベント型を emit してもエラーにならない', () => {
    const bus = new EventBus()
    expect(() => bus.emit('remove', null)).not.toThrow()
  })
})
