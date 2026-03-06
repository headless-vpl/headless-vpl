import type AutoLayout from '../core/AutoLayout'
import type Connector from '../core/Connector'
import type Container from '../core/Container'
import type Workspace from '../core/Workspace'
import { type ConnectorHitDetector, type NestingValidator, NestingZone } from '../util/nesting'

export type ConnectorInsertHit = {
  insertIndex: number
  targetConnector: Connector
}

export type FindConnectorInsertHitConfig = {
  dragged: Container
  layout: AutoLayout
  entryConnector?: Connector
  getDraggedConnector: (dragged: Container) => Connector | null | undefined
  getChildConnector: (child: Container) => Connector | null | undefined
}

export type CreateConnectorInsertZoneConfig = {
  target: Container
  layout: AutoLayout
  workspace: Workspace
  entryConnector?: Connector
  getDraggedConnector: (dragged: Container) => Connector | null | undefined
  getChildConnector: (child: Container) => Connector | null | undefined
  accepts?: NestingValidator
  priority?: number
  padding?: number
}

export function isConnectorColliding(source: Connector, target: Connector): boolean {
  const dx = source.position.x - target.position.x
  const dy = source.position.y - target.position.y
  const radius = source.hitRadius + target.hitRadius
  return dx * dx + dy * dy <= radius * radius
}

export function findConnectorInsertHit({
  dragged,
  layout,
  entryConnector,
  getDraggedConnector,
  getChildConnector,
}: FindConnectorInsertHitConfig): ConnectorInsertHit | null {
  const draggedConnector = getDraggedConnector(dragged)
  if (!draggedConnector) return null

  if (entryConnector && isConnectorColliding(draggedConnector, entryConnector)) {
    return {
      insertIndex: 0,
      targetConnector: entryConnector,
    }
  }

  for (let i = 0; i < layout.Children.length; i += 1) {
    const childConnector = getChildConnector(layout.Children[i])
    if (!childConnector) continue
    if (isConnectorColliding(draggedConnector, childConnector)) {
      return {
        insertIndex: i + 1,
        targetConnector: childConnector,
      }
    }
  }

  return null
}

export function createConnectorInsertZone({
  target,
  layout,
  workspace,
  entryConnector,
  getDraggedConnector,
  getChildConnector,
  accepts,
  priority,
  padding,
}: CreateConnectorInsertZoneConfig): NestingZone {
  const connectorHit: ConnectorHitDetector = (dragged, currentLayout) => {
    return (
      findConnectorInsertHit({
        dragged,
        layout: currentLayout,
        entryConnector,
        getDraggedConnector,
        getChildConnector,
      })?.insertIndex ?? null
    )
  }

  return new NestingZone({
    target,
    layout,
    workspace,
    priority,
    padding,
    validator: (dragged) => {
      if (dragged === target) return false
      if (accepts && !accepts(dragged)) return false
      return (
        findConnectorInsertHit({
          dragged,
          layout,
          entryConnector,
          getDraggedConnector,
          getChildConnector,
        }) !== null
      )
    },
    connectorHit,
  })
}
