import { describe, expect, it } from 'vitest'
import { getAngle, getDistance } from './distance'

describe('getDistance', () => {
  it('同一点間の距離は 0', () => {
    expect(getDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
  })

  it('水平距離を正しく計算する', () => {
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3)
  })

  it('垂直距離を正しく計算する', () => {
    expect(getDistance({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(4)
  })

  it('斜め距離を正しく計算する（3-4-5 三角形）', () => {
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('負の座標でも正しく動く', () => {
    expect(getDistance({ x: -1, y: -1 }, { x: 2, y: 3 })).toBe(5)
  })

  it('順序を入れ替えても同じ値', () => {
    const a = { x: 10, y: 20 }
    const b = { x: 30, y: 40 }
    expect(getDistance(a, b)).toBe(getDistance(b, a))
  })
})

describe('getAngle', () => {
  it('右方向は 0 ラジアン', () => {
    expect(getAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0)
  })

  it('下方向は π/2 ラジアン', () => {
    expect(getAngle({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2)
  })

  it('左方向は π ラジアン', () => {
    expect(getAngle({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(Math.PI)
  })

  it('上方向は -π/2 ラジアン', () => {
    expect(getAngle({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(-Math.PI / 2)
  })
})
