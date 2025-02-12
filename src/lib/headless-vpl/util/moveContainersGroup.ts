import Container from '../core/Container'

export function moveGroup(containers: Container[], delta: { x: number; y: number }) {
  for (const container of containers) {
    container.move(container.position.x + delta.x, container.position.y + delta.y)
  }
}
