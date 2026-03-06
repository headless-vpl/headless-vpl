import { describe, expect, it } from 'vitest'

import AutoLayout from './AutoLayout'
import Connector from './Connector'
import Container from './Container'
import Position from './Position'
import Workspace from './Workspace'

describe('Connector anchor', () => {
  it('親コンテナのサイズと位置に追従する', () => {
    const ws = new Workspace()
    const bottom = new Connector({
      name: 'bottom',
      type: 'output',
      anchor: {
        target: 'parent',
        origin: 'bottom-left',
        offset: { x: 40, y: 0 },
      },
    })

    const block = new Container({
      workspace: ws,
      position: new Position(100, 200),
      name: 'Block',
      width: 120,
      height: 60,
      children: { bottom },
    })

    expect(bottom.position.x).toBe(140)
    expect(bottom.position.y).toBe(260)

    block.height = 90
    block.update()

    expect(bottom.position.x).toBe(140)
    expect(bottom.position.y).toBe(290)

    block.move(150, 210)

    expect(bottom.position.x).toBe(190)
    expect(bottom.position.y).toBe(300)
  })

  it('兄弟 AutoLayout のキー指定 anchor に追従する', () => {
    const ws = new Workspace()
    const body = new AutoLayout({
      position: new Position(16, 40),
      direction: 'vertical',
      gap: 0,
      alignment: 'start',
      containers: [],
      minWidth: 120,
      minHeight: 30,
    })
    const entry = new Connector({
      name: 'body-entry',
      type: 'input',
      anchor: {
        target: 'body',
        origin: 'top-left',
        offset: { x: 50, y: 0 },
      },
    })

    const block = new Container({
      workspace: ws,
      position: new Position(80, 120),
      name: 'If',
      width: 220,
      height: 100,
      children: {
        body,
        entry,
      },
    })

    expect(entry.position.x).toBe(146)
    expect(entry.position.y).toBe(160)

    body.position.y = 70
    body.update()

    expect(entry.position.x).toBe(146)
    expect(entry.position.y).toBe(190)

    block.move(100, 180)

    expect(entry.position.x).toBe(166)
    expect(entry.position.y).toBe(250)
  })
})
