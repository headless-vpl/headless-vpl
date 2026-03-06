import { describe, expect, it } from 'vitest'

import AutoLayout from '../core/AutoLayout'
import Container from '../core/Container'
import Position from '../core/Position'
import Workspace from '../core/Workspace'
import { BlockStackController, collectConnectedChain } from './blockStack'

describe('BlockStackController', () => {
  it('reattach で古い親から切り離して新しい親へ付け替える', () => {
    const ws = new Workspace()
    const parentA = new Container({ workspace: ws, name: 'A', position: new Position(0, 0) })
    const parentB = new Container({ workspace: ws, name: 'B', position: new Position(0, 100) })
    const child = new Container({ workspace: ws, name: 'Child', position: new Position(0, 42) })
    const stack = new BlockStackController()

    stack.reattach(child, parentA)
    expect(child.Parent).toBe(parentA)
    expect(parentA.Children.has(child)).toBe(true)

    stack.reattach(child, parentB)
    expect(child.Parent).toBe(parentB)
    expect(parentA.Children.has(child)).toBe(false)
    expect(parentB.Children.has(child)).toBe(true)
  })

  it('pullFollowerChainOutOfLayout で後続チェーンを layout から外して維持する', () => {
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
    new Container({
      workspace: ws,
      position: new Position(100, 100),
      name: 'Owner',
      width: 220,
      height: 160,
      children: { body },
    })

    const root = new Container({
      workspace: ws,
      name: 'Root',
      position: new Position(116, 140),
      width: 120,
      height: 42,
    })
    const follower = new Container({
      workspace: ws,
      name: 'Follower',
      position: new Position(116, 182),
      width: 120,
      height: 42,
    })
    const tail = new Container({
      workspace: ws,
      name: 'Tail',
      position: new Position(116, 224),
      width: 120,
      height: 42,
    })
    const stack = new BlockStackController()

    body.insertElement(root, 0)
    body.insertElement(follower, 1)
    body.insertElement(tail, 2)
    stack.syncLayout(body)

    expect(collectConnectedChain(root).map((container) => container.id)).toEqual([
      root.id,
      follower.id,
      tail.id,
    ])

    stack.pullFollowerChainOutOfLayout(root, body)

    expect(body.Children).toEqual([root])
    expect(collectConnectedChain(root).map((container) => container.id)).toEqual([
      root.id,
      follower.id,
      tail.id,
    ])
    expect(follower.position.y).toBe(root.position.y + root.height)
    expect(tail.position.y).toBe(follower.position.y + follower.height)
  })
})
