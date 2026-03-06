import { describe, expect, it } from 'vitest'
import Position from './Position'

describe('Position', () => {
  it('コンストラクタで x, y を設定する', () => {
    const pos = new Position(10, 20)
    expect(pos.x).toBe(10)
    expect(pos.y).toBe(20)
  })

  it('setPosition で座標を更新する', () => {
    const pos = new Position(0, 0)
    pos.setPosition(100, 200)
    expect(pos.x).toBe(100)
    expect(pos.y).toBe(200)
  })

  it('getPosition で IPosition を返す', () => {
    const pos = new Position(42, 84)
    const result = pos.getPosition()
    expect(result).toEqual({ x: 42, y: 84 })
  })

  it('getPosition はコピーを返す（参照ではない）', () => {
    const pos = new Position(1, 2)
    const result = pos.getPosition()
    result.x = 999
    expect(pos.x).toBe(1)
  })

  it('負の座標を扱える', () => {
    const pos = new Position(-50, -100)
    expect(pos.getPosition()).toEqual({ x: -50, y: -100 })
  })

  it('小数の座標を扱える', () => {
    const pos = new Position(3.14, 2.71)
    expect(pos.x).toBeCloseTo(3.14)
    expect(pos.y).toBeCloseTo(2.71)
  })
})
