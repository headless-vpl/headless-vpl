import { describe, expect, it } from 'vitest'
import AutoLayout from './AutoLayout'
import Connector from './Connector'
import Container from './Container'
import Position from './Position'
import Workspace from './Workspace'
import {
  ReorderAutoLayoutChildrenCommand,
  ReorderChildrenCommand,
  UpdateElementCommand,
} from './commands'

function createContainer(workspace: Workspace, name: string, x: number, y: number) {
  return new Container({
    workspace,
    position: new Position(x, y),
    name,
    color: '#3b82f6',
    width: 120,
    height: 48,
    children: {
      left: new Connector({ position: new Position(0, -24), name: 'in', type: 'input' }),
      right: new Connector({ position: new Position(120, -24), name: 'out', type: 'output' }),
    },
  })
}

describe('commands', () => {
  it('ReorderChildrenCommand reorders snap children and supports undo', () => {
    const workspace = new Workspace()
    const parent = createContainer(workspace, 'Parent', 100, 100)
    const a = createContainer(workspace, 'A', 200, 100)
    const b = createContainer(workspace, 'B', 300, 100)
    const c = createContainer(workspace, 'C', 400, 100)

    a.Parent = parent
    b.Parent = parent
    c.Parent = parent
    parent.Children.add(a)
    parent.Children.add(b)
    parent.Children.add(c)

    const command = new ReorderChildrenCommand(workspace, parent, [c, a, b])
    command.execute()
    expect([...parent.Children].map((item) => item.name)).toEqual(['C', 'A', 'B'])

    command.undo()
    expect([...parent.Children].map((item) => item.name)).toEqual(['A', 'B', 'C'])
  })

  it('ReorderAutoLayoutChildrenCommand reorders layout children and supports undo', () => {
    const workspace = new Workspace()
    const parent = createContainer(workspace, 'Parent', 80, 80)
    const layout = new AutoLayout({
      workspace,
      position: new Position(0, 0),
      direction: 'vertical',
      gap: 8,
      containers: [],
    })
    parent.addChild('body', layout)

    const a = createContainer(workspace, 'A', 0, 0)
    const b = createContainer(workspace, 'B', 0, 0)
    const c = createContainer(workspace, 'C', 0, 0)
    layout.insertElement(a, 0)
    layout.insertElement(b, 1)
    layout.insertElement(c, 2)

    const command = new ReorderAutoLayoutChildrenCommand(workspace, layout, [c, a, b])
    command.execute()
    expect(layout.Children.map((item) => item.name)).toEqual(['C', 'A', 'B'])

    command.undo()
    expect(layout.Children.map((item) => item.name)).toEqual(['A', 'B', 'C'])
  })

  it('UpdateElementCommand runs execute/undo hooks and after callback', () => {
    const workspace = new Workspace()
    const container = createContainer(workspace, 'Node', 40, 40)
    let afterCount = 0

    const command = new UpdateElementCommand({
      execute: () => {
        container.color = '#ef4444'
      },
      undo: () => {
        container.color = '#3b82f6'
      },
      onAfter: () => {
        afterCount += 1
      },
    })

    workspace.history.execute(command)
    expect(container.color).toBe('#ef4444')

    workspace.history.undo()
    expect(container.color).toBe('#3b82f6')
    expect(afterCount).toBe(2)
  })
})
