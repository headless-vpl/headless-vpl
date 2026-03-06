import { describe, expect, it } from 'vitest'
import { getBezierPath, getSmoothStepPath, getStepPath, getStraightPath } from './edgePath'

const start = { x: 0, y: 0 }
const end = { x: 200, y: 100 }

describe('getStraightPath', () => {
  it('M ... L ... 形式のパスを返す', () => {
    const result = getStraightPath(start, end)
    expect(result.path).toContain('M 0 0')
    expect(result.path).toContain('L 200 100')
  })

  it('ラベル位置が始点と終点の中間', () => {
    const result = getStraightPath(start, end)
    expect(result.labelPosition).toEqual({ x: 100, y: 50 })
  })

  it('同一点でもエラーにならない', () => {
    const result = getStraightPath({ x: 50, y: 50 }, { x: 50, y: 50 })
    expect(result.path).toBeDefined()
    expect(result.labelPosition).toEqual({ x: 50, y: 50 })
  })
})

describe('getBezierPath', () => {
  it('M ... C ... 形式のパスを返す', () => {
    const result = getBezierPath(start, end)
    expect(result.path).toMatch(/^M .+ C .+/)
  })

  it('ラベル位置を返す', () => {
    const result = getBezierPath(start, end)
    expect(result.labelPosition.x).toBeGreaterThan(start.x)
    expect(result.labelPosition.x).toBeLessThan(end.x)
  })
})

describe('getStepPath', () => {
  it('3つの L セグメントを持つ', () => {
    const result = getStepPath(start, end)
    const lCount = (result.path.match(/L /g) || []).length
    expect(lCount).toBe(3)
  })

  it('ラベル位置が中間 X にある', () => {
    const result = getStepPath(start, end)
    expect(result.labelPosition.x).toBe(100) // midX
  })
})

describe('getSmoothStepPath', () => {
  it('Q（二次ベジェ）セグメントを含む', () => {
    const result = getSmoothStepPath(start, end)
    expect(result.path).toContain('Q ')
  })

  it('dy === 0 の場合 getStepPath にフォールバックする', () => {
    const flat = getSmoothStepPath({ x: 0, y: 50 }, { x: 200, y: 50 })
    expect(flat.path).not.toContain('Q ')
  })

  it('borderRadius を指定できる', () => {
    const result = getSmoothStepPath(start, end, 16)
    expect(result.path).toBeDefined()
  })
})
