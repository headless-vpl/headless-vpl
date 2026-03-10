import type { RefObject } from 'react'
import {
  Connector,
  Container,
  Edge,
  Position,
  type ConnectorAnchor,
  type EdgeMarker,
  type EdgeType,
  type Workspace,
} from '../../../lib/headless-vpl'

export type GraphPinModel = {
  id: string
  name: string
  type: 'input' | 'output'
  anchor: ConnectorAnchor
  dataType?: string
  hitRadius?: number
}

export type GraphNodeModel = {
  id: string
  kind: string
  name: string
  color: string
  x: number
  y: number
  width: number
  height: number
  resizable?: boolean
  pins: GraphPinModel[]
  data?: Record<string, string | number | boolean>
}

export type GraphEdgeModel = {
  id: string
  fromNodeId: string
  fromPinId: string
  toNodeId: string
  toPinId: string
  edgeType?: EdgeType
  label?: string
  markerStart?: EdgeMarker
  markerEnd?: EdgeMarker
}

export type GraphSceneModel = {
  version: 1
  nodes: GraphNodeModel[]
  edges: GraphEdgeModel[]
}

export type GraphConnectorMeta = {
  nodeId: string
  pinId: string
  pin: GraphPinModel
}

export type GraphBuildResult = {
  nodeToContainer: Map<string, Container>
  connectorMeta: Map<string, GraphConnectorMeta>
  edgeToWorkspace: Map<string, string>
}

export type GraphPinSide = 'left' | 'right' | 'top' | 'bottom'

export function createGraphSceneId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function clearGraphWorkspace(
  workspace: Workspace,
  containers: RefObject<Container[]>,
  connectors: RefObject<Connector[]>,
): void {
  workspace.selection.deselectAll()
  while (containers.current.length > 0) {
    const container = containers.current.pop()
    if (container) {
      workspace.removeContainer(container)
    }
  }
  connectors.current.length = 0
  workspace.history.clear()
}

export function rebuildGraphScene(
  workspace: Workspace,
  scene: GraphSceneModel,
  containers: RefObject<Container[]>,
  connectors: RefObject<Connector[]>,
): GraphBuildResult {
  clearGraphWorkspace(workspace, containers, connectors)

  const nodeToContainer = new Map<string, Container>()
  const connectorMeta = new Map<string, GraphConnectorMeta>()
  const connectorByKey = new Map<string, Connector>()

  for (const node of scene.nodes) {
    const children: Record<string, Connector> = {}

    for (const pin of node.pins) {
      const connector = new Connector({
        name: pin.name,
        type: pin.type,
        hitRadius: pin.hitRadius,
        anchor: pin.anchor,
      })
      children[pin.id] = connector
    }

    const container = new Container({
      workspace,
      position: new Position(node.x, node.y),
      name: node.name,
      color: node.color,
      width: node.width,
      height: node.height,
      resizable: node.resizable ?? false,
      children,
    })
    nodeToContainer.set(node.id, container)
    containers.current.push(container)

    for (const pin of node.pins) {
      const connector = children[pin.id]
      connectors.current.push(connector)
      connectorMeta.set(connector.id, { nodeId: node.id, pinId: pin.id, pin })
      connectorByKey.set(graphPinKey(node.id, pin.id), connector)
    }
  }

  const edgeToWorkspace = new Map<string, string>()

  for (const edge of scene.edges) {
    const start = connectorByKey.get(graphPinKey(edge.fromNodeId, edge.fromPinId))
    const end = connectorByKey.get(graphPinKey(edge.toNodeId, edge.toPinId))
    if (!start || !end) continue
    const workspaceEdge = new Edge({
      workspace,
      start,
      end,
      edgeType: edge.edgeType ?? 'bezier',
      label: edge.label,
      markerStart: edge.markerStart,
      markerEnd: edge.markerEnd,
    })
    edgeToWorkspace.set(edge.id, workspaceEdge.id)
  }

  return { nodeToContainer, connectorMeta, edgeToWorkspace }
}

export function graphPinKey(nodeId: string, pinId: string): string {
  return `${nodeId}:${pinId}`
}

export function createSideAnchor(side: GraphPinSide, offset = 0): ConnectorAnchor {
  switch (side) {
    case 'left':
      return { target: 'parent', origin: 'center-left', offset: { y: offset } }
    case 'right':
      return { target: 'parent', origin: 'center-right', offset: { y: offset } }
    case 'top':
      return { target: 'parent', origin: 'top-center', offset: { x: offset } }
    case 'bottom':
      return { target: 'parent', origin: 'bottom-center', offset: { x: offset } }
  }
}
