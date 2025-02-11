import { IPosition } from '../core/Position'

export function getDistance(point1: IPosition, point2: IPosition): number {
  return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2)
}

export function getAngle(point1: IPosition, point2: IPosition): number {
  return Math.atan2(point2.y - point1.y, point2.x - point1.x)
}
