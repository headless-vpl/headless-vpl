export interface IPosition {
  x: number
  y: number
}

/** [x, y] タプルまたは Position インスタンスを受け付ける型 */
export type PositionLike = Position | [number, number]

/** PositionLike を Position インスタンスに変換する */
export function resolvePosition(value: PositionLike): Position {
  if (Array.isArray(value)) {
    return new Position(value[0], value[1])
  }
  return value
}

class Position {
  public x: number
  public y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  setPosition(x: number, y: number) {
    this.x = x
    this.y = y
  }

  getPosition(): IPosition {
    return { x: this.x, y: this.y }
  }
}

export default Position
