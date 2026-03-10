import type { RefObject } from 'react'
import { describe, expect, it } from 'vitest'
import AutoLayout from '../core/AutoLayout'
import Connector from '../core/Connector'
import Container from '../core/Container'
import Edge from '../core/Edge'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import { deserializeFactoryProject, serializeFactoryProject } from './factorySerializer'

function createContainer(
  workspace: Workspace,
  name: string,
  x: number,
  y: number,
  color = '#3b82f6'
) {
  return new Container({
    workspace,
    position: new Position(x, y),
    name,
    color,
    width: 140,
    height: 52,
    children: {
      left: new Connector({ position: new Position(0, -26), name: 'in', type: 'input' }),
      right: new Connector({ position: new Position(140, -26), name: 'out', type: 'output' }),
    },
  })
}

describe('factorySerializer', () => {
  it('serializes and restores container relationships, edges, viewport, and ui state', () => {
    const workspace = new Workspace()
    const host = createContainer(workspace, 'Host', 100, 120, '#10b981')
    const layout = new AutoLayout({
      workspace,
      position: new Position(12, 16),
      direction: 'vertical',
      gap: 10,
      containers: [],
    })
    host.addChild('body', layout)

    const layoutChild = createContainer(workspace, 'Layout Child', 0, 0, '#f59e0b')
    layout.insertElement(layoutChild, 0)

    const root = createContainer(workspace, 'Root', 360, 180, '#3b82f6')
    const snapChild = createContainer(workspace, 'Snap Child', 520, 180, '#ef4444')
    snapChild.Parent = root
    root.Children.add(snapChild)

    const hostOut = host.children.right as Connector
    const rootIn = root.children.left as Connector
    new Edge({
      workspace,
      start: hostOut,
      end: rootIn,
      edgeType: 'bezier',
      label: 'flow',
    })

    workspace.pan(48, 72)
    workspace.setScale(1.2)

    const project = serializeFactoryProject(workspace, {
      expandedNodeIds: ['workspace', host.id],
      hiddenIds: [layoutChild.id],
      lockedIds: [root.id],
    })

    const restoredWorkspace = new Workspace()
    const containersRef = { current: [] as Container[] } as RefObject<Container[]>
    const connectorsRef = { current: [] as Connector[] } as RefObject<Connector[]>
    const restored = deserializeFactoryProject({
      project,
      workspace: restoredWorkspace,
      containersRef,
      connectorsRef,
    })

    expect(restored.warnings).toEqual([])
    expect(containersRef.current).toHaveLength(4)
    expect(connectorsRef.current).toHaveLength(8)
    expect(restoredWorkspace.edges).toHaveLength(1)
    expect(restoredWorkspace.viewport).toEqual(project.viewport)

    const restoredHost = containersRef.current.find((item) => item.name === 'Host')
    const restoredRoot = containersRef.current.find((item) => item.name === 'Root')
    const restoredSnapChild = containersRef.current.find((item) => item.name === 'Snap Child')
    expect(restoredHost?.children.body).toBeDefined()
    const restoredLayout = restoredHost?.children.body as AutoLayout
    expect(restoredLayout.Children.map((item) => item.name)).toEqual(['Layout Child'])
    expect(restoredSnapChild?.Parent).toBe(restoredRoot)
    expect(project.ui.hiddenIds).toEqual([layoutChild.id])
    expect(project.ui.lockedIds).toEqual([root.id])
  })
})
