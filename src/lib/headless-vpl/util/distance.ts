import Position from '../core/Position'

export function getDistance(point1: Position, point2: Position): number {
  return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2)
}

export function getAngle(point1: Position, point2: Position): number {
  return Math.atan2(point2.y - point1.y, point2.x - point1.x)
}
