import { describe, expect, it } from 'vitest'

import Connector from '../core/Connector'
import Container from '../core/Container'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import { SnapConnection } from '../util/snap'
import { connectStackPairs } from './connect'

function createStackBlock(workspace: Workspace, name: string, x: number, y: number) {
  return {
    container: new Container({
      workspace,
      name,
      position: new Position(x, y),
      width: 120,
      height: 42,
    }),
    topConn: new Connector({
      workspace,
      name: `${name}-top`,
      type: 'input',
      position: new Position(x + 40, y),
      hitRadius: 12,
    }),
    bottomConn: new Connector({
      workspace,
      name: `${name}-bottom`,
      type: 'output',
      position: new Position(x + 40, y + 42),
      hitRadius: 12,
    }),
  }
}

describe('connectStackPairs', () => {
  it('matching snap connection があれば lock して connect イベントを流す', () => {
    const workspace = new Workspace()
    const parent = createStackBlock(workspace, 'parent', 60, 50)
    const child = createStackBlock(workspace, 'child', 140, 120)
    const events: Array<{ parent?: string; child?: string }> = []

    workspace.eventBus.on('connect', (event) => {
      events.push({
        parent: event.data?.parent as string | undefined,
        child: event.data?.child as string | undefined,
      })
    })

    const connection = new SnapConnection({
      source: child.container,
      sourcePosition: child.topConn.position,
      target: parent.container,
      targetPosition: parent.bottomConn.position,
      workspace,
    })

    connectStackPairs({
      workspace,
      snapConnections: [connection],
      pairs: [[child, parent]],
    })

    expect(connection.locked).toBe(true)
    expect(child.container.Parent).toBe(parent.container)
    expect(parent.container.Children.has(child.container)).toBe(true)
    expect(child.container.position.x).toBe(60)
    expect(child.container.position.y).toBe(92)
    expect(events).toEqual([
      {
        parent: parent.container.id,
        child: child.container.id,
      },
    ])
  })

  it('matching snap connection がなくても parent-child 関係を張る', () => {
    const workspace = new Workspace()
    const parent = createStackBlock(workspace, 'parent', 100, 80)
    const child = createStackBlock(workspace, 'child', 220, 180)

    connectStackPairs({
      workspace,
      snapConnections: [],
      pairs: [[child, parent]],
    })

    expect(child.container.Parent).toBe(parent.container)
    expect(parent.container.Children.has(child.container)).toBe(true)
    expect(child.container.position.x).toBe(100)
    expect(child.container.position.y).toBe(122)
  })
})
