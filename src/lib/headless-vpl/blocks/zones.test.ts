import { describe, expect, it } from 'vitest'

import AutoLayout from '../core/AutoLayout'
import Connector from '../core/Connector'
import Container from '../core/Container'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import { createConnectorInsertZone, findConnectorInsertHit } from './zones'

describe('findConnectorInsertHit', () => {
  it('entry connector と child connector のどちらに当たったかで挿入位置を返す', () => {
    const ws = new Workspace()
    const draggedTop = new Connector({
      workspace: ws,
      name: 'dragged-top',
      type: 'input',
      position: new Position(50, 40),
      hitRadius: 12,
    })
    const entry = new Connector({
      workspace: ws,
      name: 'entry',
      type: 'input',
      position: new Position(50, 40),
      hitRadius: 8,
    })
    const childBottom = new Connector({
      workspace: ws,
      name: 'child-bottom',
      type: 'output',
      position: new Position(50, 82),
      hitRadius: 12,
    })

    const dragged = new Container({
      workspace: ws,
      name: 'Dragged',
      position: new Position(10, 40),
      width: 120,
      height: 42,
    })
    const child = new Container({
      workspace: ws,
      name: 'Child',
      position: new Position(10, 40),
      width: 120,
      height: 42,
    })
    const layout = new AutoLayout({
      position: new Position(16, 40),
      direction: 'vertical',
      gap: 0,
      alignment: 'start',
      containers: [child],
      minWidth: 120,
      minHeight: 40,
    })

    const entryHit = findConnectorInsertHit({
      dragged,
      layout,
      entryConnector: entry,
      getDraggedConnector: () => draggedTop,
      getChildConnector: () => childBottom,
    })

    expect(entryHit?.insertIndex).toBe(0)
    expect(entryHit?.targetConnector).toBe(entry)

    draggedTop.move(50, 82)

    const childHit = findConnectorInsertHit({
      dragged,
      layout,
      entryConnector: entry,
      getDraggedConnector: () => draggedTop,
      getChildConnector: () => childBottom,
    })

    expect(childHit?.insertIndex).toBe(1)
    expect(childHit?.targetConnector).toBe(childBottom)
  })
})

describe('createConnectorInsertZone', () => {
  it('connector ベースの挿入ゾーンを組み立てる', () => {
    const ws = new Workspace()
    const body = new AutoLayout({
      position: new Position(16, 40),
      direction: 'vertical',
      gap: 0,
      alignment: 'start',
      containers: [],
      minWidth: 120,
      minHeight: 40,
    })
    const owner = new Container({
      workspace: ws,
      position: new Position(100, 100),
      name: 'Owner',
      width: 220,
      height: 160,
      children: { body },
    })
    const draggedTop = new Connector({
      workspace: ws,
      name: 'dragged-top',
      type: 'input',
      position: new Position(166, 140),
      hitRadius: 12,
    })
    const dragged = new Container({
      workspace: ws,
      name: 'Dragged',
      position: new Position(116, 140),
      width: 120,
      height: 42,
    })
    const entry = new Connector({
      workspace: ws,
      name: 'entry',
      type: 'input',
      position: new Position(166, 140),
      hitRadius: 8,
    })

    const zone = createConnectorInsertZone({
      target: owner,
      layout: body,
      workspace: ws,
      entryConnector: entry,
      priority: 200,
      accepts: () => true,
      getDraggedConnector: () => draggedTop,
      getChildConnector: () => null,
    })

    expect(zone.priority).toBe(200)
    expect(zone.detectHover([dragged])).toBe(dragged)
    expect(zone.insertIndex).toBe(0)
  })
})
