import { describe, expect, it } from 'vitest'

import Container from '../core/Container'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import { createSnapConnections } from './snap'

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
