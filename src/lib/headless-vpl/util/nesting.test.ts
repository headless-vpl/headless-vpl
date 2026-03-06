import { describe, expect, it } from 'vitest'

import AutoLayout from '../core/AutoLayout'
import Container from '../core/Container'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import { createSlotZone } from './nesting'

describe('createSlotZone', () => {
  it('中心ヒットかつ単一占有のスロットゾーンを作る', () => {
    const ws = new Workspace()
    const slot = new AutoLayout({
      position: new Position(20, 10),
      direction: 'horizontal',
      gap: 0,
      alignment: 'center',
      containers: [],
      minWidth: 40,
      minHeight: 24,
      resizesParent: false,
    })
    const target = new Container({
      workspace: ws,
      position: new Position(100, 100),
      name: 'Target',
      width: 120,
      height: 42,
      children: { slot },
    })
    const dragged = new Container({
      workspace: ws,
      position: new Position(115, 102),
      name: 'Value',
      width: 30,
      height: 20,
    })

    const zone = createSlotZone({
      target,
      layout: slot,
      workspace: ws,
      priority: 150,
      occupancy: 'single',
      accepts: () => true,
      centerTolerance: { x: 30, y: 20 },
    })

    expect(zone.priority).toBe(150)
    expect(zone.detectHover([dragged])).toBe(dragged)

    slot.insertElement(dragged)

    const nextDragged = new Container({
      workspace: ws,
      position: new Position(115, 102),
      name: 'Next',
      width: 30,
      height: 20,
    })
    expect(zone.detectHover([nextDragged])).toBeNull()
  })
})
