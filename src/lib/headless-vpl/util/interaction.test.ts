import { describe, expect, it } from 'vitest'

import AutoLayout from '../core/AutoLayout'
import Container from '../core/Container'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import { InteractionManager } from './interaction'
import { NestingZone } from './nesting'

function createCanvasElement(): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLElement
}

function createPointerTarget(): EventTarget {
  return {
    closest: () => null,
  } as unknown as EventTarget
}

describe('InteractionManager hit testing', () => {
  it('prefers the topmost nested child when blocks overlap', () => {
    const ws = new Workspace()
    const slot = new AutoLayout({
      position: new Position(20, 10),
      direction: 'horizontal',
      gap: 0,
      alignment: 'center',
      containers: [],
      minWidth: 80,
      minHeight: 32,
      resizesParent: false,
    })
    const parent = new Container({
      workspace: ws,
      position: new Position(0, 0),
      name: 'Parent',
      width: 200,
      height: 60,
      children: { slot },
    })
    const child = new Container({
      workspace: ws,
      position: new Position(0, 0),
      name: 'Child',
      width: 80,
      height: 32,
    })
    slot.insertElement(child, 0)

    const pointerHits: string[] = []
    const interaction = new InteractionManager({
      workspace: ws,
      canvasElement: createCanvasElement(),
      containers: () => [parent, child],
      nestingZones: [new NestingZone({ target: parent, layout: slot, workspace: ws })],
      onContainerPointerDown: (container) => {
        pointerHits.push(container.id)
      },
    })

    interaction.handlePointerDown(
      { x: 40, y: 20 },
      { button: 0, shiftKey: false, target: createPointerTarget() }
    )

    expect(pointerHits).toEqual([child.id])
    expect(interaction.dragContainers.map((container) => container.id)).toEqual([child.id])
  })

  it('restores the original nesting when a nested child is dropped without moving', () => {
    const ws = new Workspace()
    const slot = new AutoLayout({
      position: new Position(20, 10),
      direction: 'horizontal',
      gap: 0,
      alignment: 'center',
      containers: [],
      minWidth: 80,
      minHeight: 32,
      resizesParent: false,
    })
    const parent = new Container({
      workspace: ws,
      position: new Position(0, 0),
      name: 'Parent',
      width: 200,
      height: 60,
      children: { slot },
    })
    const child = new Container({
      workspace: ws,
      position: new Position(0, 0),
      name: 'Child',
      width: 80,
      height: 32,
    })
    slot.insertElement(child, 0)

    const interaction = new InteractionManager({
      workspace: ws,
      canvasElement: createCanvasElement(),
      containers: () => [parent, child],
      nestingZones: [new NestingZone({ target: parent, layout: slot, workspace: ws })],
    })

    interaction.handlePointerDown(
      { x: 40, y: 20 },
      { button: 0, shiftKey: false, target: createPointerTarget() }
    )
    interaction.handlePointerUp({ x: 40, y: 20 })

    expect(slot.Children).toContain(child)
    expect(child.parentAutoLayout).toBe(slot)
  })

  it('does not unnest a nested child until drag movement starts', () => {
    const ws = new Workspace()
    const slot = new AutoLayout({
      position: new Position(20, 10),
      direction: 'horizontal',
      gap: 0,
      alignment: 'center',
      containers: [],
      minWidth: 80,
      minHeight: 32,
      resizesParent: false,
    })
    const parent = new Container({
      workspace: ws,
      position: new Position(0, 0),
      name: 'Parent',
      width: 200,
      height: 60,
      children: { slot },
    })
    const child = new Container({
      workspace: ws,
      position: new Position(0, 0),
      name: 'Child',
      width: 80,
      height: 32,
    })
    slot.insertElement(child, 0)

    const unnested: string[] = []
    const interaction = new InteractionManager({
      workspace: ws,
      canvasElement: createCanvasElement(),
      containers: () => [parent, child],
      nestingZones: [new NestingZone({ target: parent, layout: slot, workspace: ws })],
      onUnnest: (container) => {
        unnested.push(container.id)
      },
    })

    interaction.handlePointerDown(
      { x: 40, y: 20 },
      { button: 0, shiftKey: false, target: createPointerTarget() }
    )

    expect(slot.Children).toContain(child)
    expect(unnested).toEqual([])

    interaction.tick({ x: 52, y: 32 }, { leftButton: 'down', middleButton: 'up' })

    expect(slot.Children).not.toContain(child)
    expect(unnested).toEqual([child.id])
  })
})
