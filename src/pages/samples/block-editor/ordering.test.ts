import { describe, expect, it } from 'vitest'

import { AutoLayout, Container, Position, Workspace } from '../../../lib/headless-vpl'
import { collectFrontGroup, sortContainersForNestedRender } from '../../../lib/headless-vpl/blocks'

describe('block editor render ordering', () => {
  it('keeps nested children after their parent in render order', () => {
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

    const ordered = sortContainersForNestedRender([child, parent])

    expect(ordered).toEqual([parent, child])
  })

  it('moves a promoted parent together with its nested children', () => {
    const ws = new Workspace()
    const other = new Container({
      workspace: ws,
      position: new Position(300, 0),
      name: 'Other',
      width: 120,
      height: 42,
    })
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

    const frontGroup = collectFrontGroup([parent, other, child], [parent])

    expect(frontGroup).toEqual([parent, child])
  })
})
