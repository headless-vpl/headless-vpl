import { describe, expect, it } from 'vitest'
import { snapDeltaToGrid, snapToGrid } from './snapToGrid'

describe('snapToGrid', () => {
  it('グリッドサイズの倍数に丸める', () => {
    expect(snapToGrid({ x: 17, y: 23 }, 10)).toEqual({ x: 20, y: 20 })
  })

  it('ちょうどグリッド上ならそのまま', () => {
    expect(snapToGrid({ x: 30, y: 40 }, 10)).toEqual({ x: 30, y: 40 })
  })

  it('負の座標でも正しく丸める', () => {
    expect(snapToGrid({ x: -17, y: -23 }, 10)).toEqual({ x: -20, y: -20 })
  })

  it('原点は原点のまま', () => {
    expect(snapToGrid({ x: 0, y: 0 }, 20)).toEqual({ x: 0, y: 0 })
  })

  it('グリッドサイズ 1 ならそのまま（四捨五入）', () => {
    expect(snapToGrid({ x: 3.7, y: 8.2 }, 1)).toEqual({ x: 4, y: 8 })
  })
})

describe('snapDeltaToGrid', () => {
  it('移動量をグリッドの倍数に丸める', () => {
    expect(snapDeltaToGrid({ x: 12, y: 18 }, 10)).toEqual({ x: 10, y: 20 })
  })

  it('小さい移動量は 0 に丸められる', () => {
    expect(snapDeltaToGrid({ x: 3, y: 4 }, 10)).toEqual({ x: 0, y: 0 })
  })

  it('負の移動量でも正しく動く', () => {
    expect(snapDeltaToGrid({ x: -7, y: -13 }, 10)).toEqual({ x: -10, y: -10 })
  })
})
