import type Container from '../core/Container'
import { getDistance } from './distance'
import type { NestingZone } from './nesting'
import type { SnapConnection } from './snap'

export function selectBestNestingZone(zones: NestingZone[]): NestingZone {
  const dragged = zones[0]?.hovered
  if (!dragged) return zones[0]

  const cx = dragged.position.x + dragged.width / 2
  const cy = dragged.position.y + dragged.height / 2

  return zones.reduce((best, zone) => {
    if (zone.priority > best.priority) return zone
    if (zone.priority < best.priority) return best

    const bestArea = best.layout.width * best.layout.height
    const zoneArea = zone.layout.width * zone.layout.height
    if (zoneArea < bestArea) return zone
    if (zoneArea > bestArea) return best

    const bestAbs = best.layout.absolutePosition
    const zoneAbs = zone.layout.absolutePosition
    const bestDist = Math.hypot(
      cx - (bestAbs.x + best.layout.width / 2),
      cy - (bestAbs.y + best.layout.height / 2)
    )
    const zoneDist = Math.hypot(
      cx - (zoneAbs.x + zone.layout.width / 2),
      cy - (zoneAbs.y + zone.layout.height / 2)
    )
    return zoneDist < bestDist ? zone : best
  })
}

export function getOrderedSnapCandidates(
  dragContainers: Container[],
  snapConnections: readonly SnapConnection[],
  requireInRange: boolean
): SnapConnection[] {
  return snapConnections
    .filter((connection) => {
      if (connection.locked || connection.destroyed) return false
      if (!dragContainers.includes(connection.source)) return false
      if (!connection.strategy(connection.source, connection.target, dragContainers)) return false
      if (connection.validator && !connection.validator()) return false
      if (!requireInRange) return true
      return (
        getDistance(connection.sourcePosition, connection.targetPosition) < connection.snapDistance
      )
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return (
        getDistance(a.sourcePosition, a.targetPosition) -
        getDistance(b.sourcePosition, b.targetPosition)
      )
    })
}

export function getBestNearSnapPriorityBySource(
  dragContainers: Container[],
  snapConnections: readonly SnapConnection[]
): Map<string, number> {
  const priorities = new Map<string, number>()

  for (const connection of getOrderedSnapCandidates(dragContainers, snapConnections, true)) {
    const current = priorities.get(connection.source.id)
    if (current === undefined || connection.priority > current) {
      priorities.set(connection.source.id, connection.priority)
    }
  }

  return priorities
}

export function arbitrateHoveredNestingZones(
  dragContainers: Container[],
  nestingZones: readonly NestingZone[],
  snapConnections: readonly SnapConnection[]
): void {
  if (dragContainers.length === 0 || nestingZones.length === 0) return

  let hoveredZones = nestingZones.filter((zone) => zone.hovered)
  if (hoveredZones.length > 1) {
    const winner = selectBestNestingZone(hoveredZones)
    for (const zone of hoveredZones) {
      if (zone !== winner) zone.clearHover()
    }
  }

  const snapPriorityBySource = getBestNearSnapPriorityBySource(dragContainers, snapConnections)
  for (const zone of nestingZones) {
    if (!zone.hovered) continue
    const snapPriority = snapPriorityBySource.get(zone.hovered.id)
    if (snapPriority !== undefined && snapPriority >= zone.priority) {
      zone.clearHover()
    }
  }

  hoveredZones = nestingZones.filter((zone) => zone.hovered)
  if (hoveredZones.length > 1) {
    const winner = selectBestNestingZone(hoveredZones)
    for (const zone of hoveredZones) {
      if (zone !== winner) zone.clearHover()
    }
  }
}
