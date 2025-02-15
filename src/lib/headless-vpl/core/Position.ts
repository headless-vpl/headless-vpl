export interface IPosition {
  x: number
  y: number
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