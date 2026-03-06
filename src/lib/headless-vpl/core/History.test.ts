import { describe, expect, it, vi } from 'vitest'
import { History } from './History'
import type { Command } from './History'

function createMockCommand(): Command & {
  executeFn: ReturnType<typeof vi.fn>
  undoFn: ReturnType<typeof vi.fn>
} {
  const executeFn = vi.fn()
  const undoFn = vi.fn()
  return { execute: executeFn, undo: undoFn, executeFn, undoFn }
}

describe('History', () => {
  it('execute でコマンドを実行する', () => {
    const history = new History()
    const cmd = createMockCommand()

    history.execute(cmd)

    expect(cmd.executeFn).toHaveBeenCalledOnce()
  })

  it('undo で直前のコマンドを取り消す', () => {
    const history = new History()
    const cmd = createMockCommand()

    history.execute(cmd)
    history.undo()

    expect(cmd.undoFn).toHaveBeenCalledOnce()
  })

  it('redo で取り消したコマンドを再実行する', () => {
    const history = new History()
    const cmd = createMockCommand()

    history.execute(cmd)
    history.undo()
    history.redo()

    // execute: 初回 + redo = 2回
    expect(cmd.executeFn).toHaveBeenCalledTimes(2)
  })

  it('新しいコマンド実行で redo スタックがクリアされる', () => {
    const history = new History()
    const cmd1 = createMockCommand()
    const cmd2 = createMockCommand()

    history.execute(cmd1)
    history.undo()
    history.execute(cmd2)

    expect(history.canRedo).toBe(false)
  })

  it('canUndo / canRedo が正しく動く', () => {
    const history = new History()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)

    const cmd = createMockCommand()
    history.execute(cmd)
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)

    history.undo()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(true)
  })

  it('空の状態で undo/redo してもエラーにならない', () => {
    const history = new History()
    expect(() => history.undo()).not.toThrow()
    expect(() => history.redo()).not.toThrow()
  })

  it('clear でスタックを全消去する', () => {
    const history = new History()
    history.execute(createMockCommand())
    history.execute(createMockCommand())

    history.clear()

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })

  it('maxDepth を超えると古いコマンドが削除される', () => {
    const history = new History(3)

    for (let i = 0; i < 5; i++) {
      history.execute(createMockCommand())
    }

    // 3回しか undo できない
    let undoCount = 0
    while (history.canUndo) {
      history.undo()
      undoCount++
    }
    expect(undoCount).toBe(3)
  })

  it('複数コマンドの undo 順序が LIFO になる', () => {
    const history = new History()
    const order: number[] = []

    const cmd1: Command = {
      execute: () => {},
      undo: () => order.push(1),
    }
    const cmd2: Command = {
      execute: () => {},
      undo: () => order.push(2),
    }
    const cmd3: Command = {
      execute: () => {},
      undo: () => order.push(3),
    }

    history.execute(cmd1)
    history.execute(cmd2)
    history.execute(cmd3)

    history.undo()
    history.undo()
    history.undo()

    expect(order).toEqual([3, 2, 1])
  })
})
