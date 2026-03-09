import { describe, expect, it } from 'vitest'

import Container from '../core/Container'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import {
  attachSnapRelation,
  canSnap,
  computeConnectorSnapDistance,
  computeSnapDelta,
  computeSnapDistance,
  createSnapConnections,
  detachSnapRelation,
  isWithinSnapDistance,
} from './snap'

describe('createSnapConnections', () => {
  it('ペアごとの SnapConnection をまとめて生成し priority を設定する', () => {
    const ws = new Workspace()
    const a = new Container({ workspace: ws, name: 'A', position: new Position(0, 0) })
    const b = new Container({ workspace: ws, name: 'B', position: new Position(0, 100) })

    const items = [
      {
        id: 'a',
        container: a,
        top: new Position(40, 0),
        bottom: new Position(40, 42),
      },
      {
        id: 'b',
        container: b,
        top: new Position(40, 100),
        bottom: new Position(40, 142),
      },
    ]

    const connections = createSnapConnections({
      workspace: ws,
      items,
      sourceContainer: (item) => item.container,
      sourcePosition: (item) => item.top,
      targetContainer: (item) => item.container,
      targetPosition: (item) => item.bottom,
      priority: ({ target }) => (target.id === 'a' ? 200 : 100),
    })

    expect(connections).toHaveLength(2)
    expect(connections.find((conn) => conn.target === a)?.priority).toBe(200)
    expect(connections.find((conn) => conn.target === b)?.priority).toBe(100)
  })
})

describe('snap helpers', () => {
  it('computes distance and delta without mutating state', () => {
    expect(computeSnapDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    expect(computeSnapDelta({ x: 10, y: 12 }, { x: 14, y: 20 })).toEqual({ x: -4, y: -8 })
    expect(isWithinSnapDistance({ x: 0, y: 0 }, { x: 20, y: 0 }, 25)).toBe(true)
    expect(isWithinSnapDistance({ x: 0, y: 0 }, { x: 30, y: 0 }, 25)).toBe(false)
  })

  it('derives connector snap distance from the two hit radii', () => {
    expect(computeConnectorSnapDistance({ hitRadius: 12 }, { hitRadius: 8 })).toBe(20)
    expect(computeConnectorSnapDistance({}, {})).toBe(24)
    expect(computeConnectorSnapDistance({ hitRadius: 10 }, {}, 6)).toBe(16)
  })

  it('attaches and detaches structural snap relations explicitly', () => {
    const workspace = new Workspace()
    const parent = new Container({ workspace, name: 'Parent', position: new Position(0, 0) })
    const child = new Container({ workspace, name: 'Child', position: new Position(0, 50) })

    attachSnapRelation({
      source: child,
      sourcePosition: child.position,
      target: parent,
      targetPosition: parent.position,
      workspace,
    })

    expect(child.Parent).toBe(parent)
    expect(parent.Children.has(child)).toBe(true)

    expect(
      detachSnapRelation(
        {
          source: child,
          sourcePosition: child.position,
          target: parent,
          targetPosition: parent.position,
          workspace,
        },
        'fail'
      )
    ).toBe(true)
    expect(child.Parent).toBeNull()
    expect(parent.Children.has(child)).toBe(false)
  })

  it('gates snap attempts on mouse release and validator success', () => {
    const released = {
      buttonState: { leftButton: 'up', middleButton: 'up' },
      mousePosition: { x: 0, y: 0 },
    } as const
    const dragging = {
      buttonState: { leftButton: 'down', middleButton: 'up' },
      mousePosition: { x: 0, y: 0 },
    } as const

    expect(canSnap(released, () => true)).toBe(true)
    expect(canSnap(released, () => false)).toBe(false)
    expect(canSnap(dragging, () => true)).toBe(false)
  })
})
