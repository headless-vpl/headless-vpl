import Container from '../core/Container'
import { IPosition } from '../core/Position'

export function isCollision(container: Container, position: IPosition): boolean {
  //containerの矩形のサイズ
  const width = container.width
  const height = container.height

  //containerの左上座標
  const x = container.position.x
  const y = container.position.y

  return x < position.x && position.x < x + width && y < position.y && position.y < y + height
}
