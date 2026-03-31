import type Connector from '../core/Connector'
import type Container from '../core/Container'
import type { IPosition } from '../core/Position'
import type { IEdge, Viewport } from '../core/types'
import { isCollision } from './collision_detection'
import { findEdgeAtPoint, isConnectorHit } from './edgeBuilder'
import type { NestingZone } from './nesting'
import { detectResizeHandle } from './resize'
import { screenToWorld } from './viewport'

export type PointerIntent =
  | { kind: 'ignore' }
  | { kind: 'pan' }
  | { kind: 'connector'; connector: Connector }
  | { kind: 'edge'; edge: IEdge }
  | { kind: 'resize'; container: Container }
  | { kind: 'nested-container'; container: Container; zone: NestingZone }
  | { kind: 'container'; container: Container }
  | { kind: 'empty' }

type ResolvePointerIntentConfig = {
  screenPos: IPosition
  button: number
  target?: EventTarget | null
  viewport: Viewport
  connectors: Connector[]
  edges: readonly IEdge[]
  containers: Container[]
  nestingZones: NestingZone[]
  isContainerLocked: (container: Container) => boolean
  isConnectorVisible: (connector: Connector) => boolean
}

export function findTopmostContainerAt(
  worldPos: IPosition,
  containers: Container[]
): Container | null {
  return [...containers].reverse().find((container) => isCollision(container, worldPos)) ?? null
}

export function resolvePointerIntent(config: ResolvePointerIntentConfig): PointerIntent {
  if (
    config.target &&
    (config.target as HTMLElement).closest?.(
      'input, textarea, select, button, .toolbar, .status-bar'
    )
  ) {
    return { kind: 'ignore' }
  }

  if (config.button === 1) {
    return { kind: 'pan' }
  }

  const worldPos = screenToWorld(config.screenPos, config.viewport)

  for (const connector of config.connectors) {
    if (!config.isConnectorVisible(connector)) continue
    if (isConnectorHit(worldPos, connector)) {
      return { kind: 'connector', connector }
    }
  }

  const edge = findEdgeAtPoint(worldPos, config.edges)
  if (edge) {
    return { kind: 'edge', edge }
  }

  for (const container of [...config.containers].reverse()) {
    if (!container.resizable) continue
    if (detectResizeHandle(worldPos, container, 10)) {
      return { kind: 'resize', container }
    }
  }

  const hit = findTopmostContainerAt(worldPos, config.containers)
  if (!hit) return { kind: 'empty' }

  const hitZone = config.nestingZones.find((zone) => zone.isNested(hit))
  if (hitZone && !config.isContainerLocked(hit)) {
    return { kind: 'nested-container', container: hit, zone: hitZone }
  }
  if (hitZone && config.isContainerLocked(hit)) {
    return { kind: 'container', container: hit }
  }

  return { kind: 'container', container: hit }
}
