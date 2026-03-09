import type { RefObject } from 'react'
import AutoLayout from '../core/AutoLayout'
import Connector, { type ConnectorAnchor, type ConnectorAnchorOrigin } from '../core/Connector'
import Container from '../core/Container'
import Edge from '../core/Edge'
import type { MovableObject } from '../core/MovableObject'
import Position from '../core/Position'
import type Workspace from '../core/Workspace'
import {
  type EdgeMarker,
  type EdgeType,
  type Viewport,
  syncGeneratedIdCounter,
} from '../core/types'

type PositionMode = 'absolute' | 'relative'

type SerializedAnchor =
  | {
      target: 'parent' | string
      origin?: ConnectorAnchorOrigin
      offset?: { x?: number; y?: number }
    }
  | {
      target: { refId: string }
      origin?: ConnectorAnchorOrigin
      offset?: { x?: number; y?: number }
    }

export type SerializedFactoryContainer = {
  id: string
  name: string
  color: string
  position: { x: number; y: number }
  positionMode: PositionMode
  width: number
  height: number
  widthMode: 'fixed' | 'hug' | 'fill'
  heightMode: 'fixed' | 'hug' | 'fill'
  padding: { top: number; right: number; bottom: number; left: number }
  minWidth: number
  maxWidth: number | null
  minHeight: number
  maxHeight: number | null
  resizable: boolean
  contentGap: number
  structuralParentId?: string
  structuralKey?: string
  snapParentId?: string
  snapIndex?: number
  autoLayoutParentId?: string
}

export type SerializedFactoryConnector = {
  id: string
  name: string
  connectorType: 'input' | 'output'
  position: { x: number; y: number }
  positionMode: PositionMode
  hitRadius: number
  structuralParentId?: string
  structuralKey?: string
  anchor?: SerializedAnchor
}

export type SerializedFactoryAutoLayout = {
  id: string
  name: string
  position: { x: number; y: number }
  positionMode: PositionMode
  width: number
  height: number
  direction: 'horizontal' | 'vertical'
  gap: number
  alignment: 'start' | 'center' | 'end'
  minWidth: number
  minHeight: number
  resizesParent: boolean
  structuralParentId?: string
  structuralKey?: string
  childIds: string[]
}

export type SerializedFactoryEdge = {
  id: string
  edgeType: EdgeType
  startConnectorId: string
  endConnectorId: string
  label?: string
  markerStart?: EdgeMarker
  markerEnd?: EdgeMarker
}

export type FactoryProject = {
  version: 1
  viewport: Viewport
  containers: SerializedFactoryContainer[]
  connectors: SerializedFactoryConnector[]
  autoLayouts: SerializedFactoryAutoLayout[]
  edges: SerializedFactoryEdge[]
  ui: {
    expandedNodeIds: string[]
    hiddenIds: string[]
    lockedIds: string[]
  }
}

type SerializeOptions = {
  expandedNodeIds?: Iterable<string>
  hiddenIds?: Iterable<string>
  lockedIds?: Iterable<string>
}

type DeserializeOptions = {
  project: FactoryProject
  workspace: Workspace
  containersRef: RefObject<Container[]>
  connectorsRef: RefObject<Connector[]>
}

function assignSavedId<T extends { id: string }>(target: T, id: string): T {
  ;(target as { id: string }).id = id
  return target
}

function toRelativePosition(child: { position: { x: number; y: number } }, parent: Container) {
  return {
    x: child.position.x - parent.position.x,
    y: parent.position.y - child.position.y,
  }
}

function serializeAnchor(anchor: ConnectorAnchor | null): SerializedAnchor | undefined {
  if (!anchor) return undefined
  if (anchor.target === 'parent' || typeof anchor.target === 'string') {
    return {
      target: anchor.target,
      origin: anchor.origin,
      offset: anchor.offset,
    }
  }
  return {
    target: { refId: anchor.target.id },
    origin: anchor.origin,
    offset: anchor.offset,
  }
}

export function serializeFactoryProject(
  workspace: Workspace,
  options: SerializeOptions = {}
): FactoryProject {
  const containers = workspace.elements.filter((el) => el.type === 'container') as Container[]
  const connectors = workspace.elements.filter(
    (el) => el.type === 'input' || el.type === 'output'
  ) as Connector[]
  const autoLayouts = workspace.elements.filter((el) => el.type === 'autoLayout') as AutoLayout[]

  const structuralParentInfo = new Map<
    string,
    { parentId: string; key: string; parent: Container }
  >()
  for (const container of containers) {
    for (const [key, child] of Object.entries(container.children) as Array<
      [string, MovableObject | AutoLayout]
    >) {
      structuralParentInfo.set(child.id, { parentId: container.id, key, parent: container })
    }
  }

  return {
    version: 1,
    viewport: {
      x: workspace.viewport.x,
      y: workspace.viewport.y,
      scale: workspace.viewport.scale,
    },
    containers: containers.map((container) => {
      const structuralInfo = structuralParentInfo.get(container.id)
      const position = structuralInfo
        ? toRelativePosition(container, structuralInfo.parent)
        : container.position
      return {
        id: container.id,
        name: container.name,
        color: container.color,
        position: { x: position.x, y: position.y },
        positionMode: structuralInfo ? 'relative' : 'absolute',
        width: container.width,
        height: container.height,
        widthMode: container.widthMode,
        heightMode: container.heightMode,
        padding: { ...container.padding },
        minWidth: container.minWidth,
        maxWidth: Number.isFinite(container.maxWidth) ? container.maxWidth : null,
        minHeight: container.minHeight,
        maxHeight: Number.isFinite(container.maxHeight) ? container.maxHeight : null,
        resizable: container.resizable,
        contentGap: container.contentGap,
        structuralParentId: structuralInfo?.parentId,
        structuralKey: structuralInfo?.key,
        snapParentId: container.Parent?.type === 'container' ? container.Parent.id : undefined,
        snapIndex:
          container.Parent?.type === 'container'
            ? [...container.Parent.Children].indexOf(container)
            : undefined,
        autoLayoutParentId: container.parentAutoLayout?.id,
      }
    }),
    connectors: connectors.map((connector) => {
      const structuralInfo = structuralParentInfo.get(connector.id)
      const position = structuralInfo
        ? toRelativePosition(connector, structuralInfo.parent)
        : connector.position
      const connectorType: SerializedFactoryConnector['connectorType'] =
        connector.type === 'input' ? 'input' : 'output'
      return {
        id: connector.id,
        name: connector.name,
        connectorType,
        position: { x: position.x, y: position.y },
        positionMode: structuralInfo ? 'relative' : 'absolute',
        hitRadius: connector.hitRadius,
        structuralParentId: structuralInfo?.parentId,
        structuralKey: structuralInfo?.key,
        anchor: serializeAnchor(connector.anchor),
      }
    }),
    autoLayouts: autoLayouts.map((layout) => {
      const structuralInfo = structuralParentInfo.get(layout.id)
      return {
        id: layout.id,
        name: layout.name,
        position: { x: layout.position.x, y: layout.position.y },
        positionMode: structuralInfo ? 'relative' : 'absolute',
        width: layout.width,
        height: layout.height,
        direction: layout.direction,
        gap: layout.gap,
        alignment: layout.alignment,
        minWidth: layout.minWidth,
        minHeight: layout.minHeight,
        resizesParent: layout.resizesParent,
        structuralParentId: structuralInfo?.parentId,
        structuralKey: structuralInfo?.key,
        childIds: layout.Children.map((child) => child.id),
      }
    }),
    edges: workspace.edges.map((edge) => {
      const typedEdge = edge as Edge
      return {
        id: typedEdge.id,
        edgeType: typedEdge.edgeType,
        startConnectorId: typedEdge.startConnector.id,
        endConnectorId: typedEdge.endConnector.id,
        label: typedEdge.label,
        markerStart: typedEdge.markerStart,
        markerEnd: typedEdge.markerEnd,
      }
    }),
    ui: {
      expandedNodeIds: [...(options.expandedNodeIds ?? [])],
      hiddenIds: [...(options.hiddenIds ?? [])],
      lockedIds: [...(options.lockedIds ?? [])],
    },
  }
}

export function clearWorkspaceContents(
  workspace: Workspace,
  containersRef: RefObject<Container[]>,
  connectorsRef: RefObject<Connector[]>
): void {
  workspace.selection.deselectAll()

  for (const edge of [...workspace.edges]) {
    workspace.removeEdge(edge)
  }

  for (const container of [...containersRef.current].reverse()) {
    workspace.removeContainer(container)
  }

  const remainingElements = [...workspace.elements]
  for (const element of remainingElements) {
    workspace.removeElement(element)
  }

  containersRef.current.length = 0
  connectorsRef.current.length = 0
  workspace.history.clear()
}

function restoreAnchor(
  serializedAnchor: SerializedAnchor | undefined,
  lookup: Map<string, Container | AutoLayout>
): ConnectorAnchor | null {
  if (!serializedAnchor) return null
  if (serializedAnchor.target === 'parent' || typeof serializedAnchor.target === 'string') {
    return {
      target: serializedAnchor.target,
      origin: serializedAnchor.origin,
      offset: serializedAnchor.offset,
    }
  }
  const target = lookup.get(serializedAnchor.target.refId)
  if (!target) return null
  return {
    target,
    origin: serializedAnchor.origin,
    offset: serializedAnchor.offset,
  }
}

export function deserializeFactoryProject({
  project,
  workspace,
  containersRef,
  connectorsRef,
}: DeserializeOptions): { warnings: string[] } {
  clearWorkspaceContents(workspace, containersRef, connectorsRef)

  const warnings: string[] = []
  const allIds = [
    ...project.containers.map((item) => item.id),
    ...project.connectors.map((item) => item.id),
    ...project.autoLayouts.map((item) => item.id),
    ...project.edges.map((item) => item.id),
  ]
  syncGeneratedIdCounter(allIds)

  const containerMap = new Map<string, Container>()
  for (const item of project.containers) {
    const container = assignSavedId(
      new Container({
        workspace,
        position: new Position(item.position.x, item.position.y),
        name: item.name,
        color: item.color,
        width: item.width,
        height: item.height,
        widthMode: item.widthMode,
        heightMode: item.heightMode,
        padding: item.padding,
        minWidth: item.minWidth,
        maxWidth: item.maxWidth ?? Number.POSITIVE_INFINITY,
        minHeight: item.minHeight,
        maxHeight: item.maxHeight ?? Number.POSITIVE_INFINITY,
        resizable: item.resizable,
        contentGap: item.contentGap,
        children: {},
      }),
      item.id
    )
    containerMap.set(item.id, container)
    containersRef.current.push(container)
  }

  const autoLayoutMap = new Map<string, AutoLayout>()
  for (const item of project.autoLayouts) {
    const layout = assignSavedId(
      new AutoLayout({
        workspace,
        position: new Position(item.position.x, item.position.y),
        width: item.width,
        height: item.height,
        direction: item.direction,
        gap: item.gap,
        alignment: item.alignment,
        minWidth: item.minWidth,
        minHeight: item.minHeight,
        resizesParent: item.resizesParent,
        containers: [],
      }),
      item.id
    )
    layout.name = item.name
    autoLayoutMap.set(item.id, layout)
  }

  const connectorMap = new Map<string, Connector>()
  for (const item of project.connectors) {
    const connector = assignSavedId(
      new Connector({
        workspace,
        position: new Position(item.position.x, item.position.y),
        name: item.name,
        type: item.connectorType,
        hitRadius: item.hitRadius,
      }),
      item.id
    )
    connectorMap.set(item.id, connector)
    connectorsRef.current.push(connector)
  }

  for (const item of project.containers) {
    if (!item.structuralParentId || !item.structuralKey) continue
    const parent = containerMap.get(item.structuralParentId)
    const child = containerMap.get(item.id)
    if (!parent || !child) {
      warnings.push(`Missing structural container parent for ${item.id}`)
      continue
    }
    parent.addChild(item.structuralKey, child)
  }

  for (const item of project.autoLayouts) {
    if (!item.structuralParentId || !item.structuralKey) continue
    const parent = containerMap.get(item.structuralParentId)
    const layout = autoLayoutMap.get(item.id)
    if (!parent || !layout) {
      warnings.push(`Missing structural layout parent for ${item.id}`)
      continue
    }
    parent.addChild(item.structuralKey, layout)
  }

  for (const item of project.connectors) {
    if (!item.structuralParentId || !item.structuralKey) continue
    const parent = containerMap.get(item.structuralParentId)
    const connector = connectorMap.get(item.id)
    if (!parent || !connector) {
      warnings.push(`Missing structural connector parent for ${item.id}`)
      continue
    }
    parent.addChild(item.structuralKey, connector)
  }

  for (const item of project.autoLayouts) {
    const layout = autoLayoutMap.get(item.id)
    if (!layout) continue
    for (const childId of item.childIds) {
      const child = containerMap.get(childId)
      if (!child) {
        warnings.push(`Missing autolayout child ${childId} for ${item.id}`)
        continue
      }
      layout.insertElement(child, layout.Children.length)
    }
  }

  const snapChildrenByParent = new Map<string, { child: Container; index: number }[]>()
  for (const item of project.containers) {
    if (!item.snapParentId) continue
    const child = containerMap.get(item.id)
    if (!child) continue
    const list = snapChildrenByParent.get(item.snapParentId) ?? []
    list.push({ child, index: item.snapIndex ?? list.length })
    snapChildrenByParent.set(item.snapParentId, list)
  }

  for (const [parentId, children] of snapChildrenByParent) {
    const parent = containerMap.get(parentId)
    if (!parent) {
      warnings.push(`Missing snap parent ${parentId}`)
      continue
    }
    const orderedChildren = children.sort((a, b) => a.index - b.index)
    for (const { child } of orderedChildren) {
      child.Parent = parent
      parent.Children.add(child)
    }
  }

  const anchorLookup = new Map<string, Container | AutoLayout>()
  for (const [id, value] of containerMap) anchorLookup.set(id, value)
  for (const [id, value] of autoLayoutMap) anchorLookup.set(id, value)

  for (const item of project.connectors) {
    const connector = connectorMap.get(item.id)
    if (!connector) continue
    const owner = item.structuralParentId ? containerMap.get(item.structuralParentId) : undefined
    connector.setAnchor(restoreAnchor(item.anchor, anchorLookup), owner)
  }

  for (const item of project.edges) {
    const start = connectorMap.get(item.startConnectorId)
    const end = connectorMap.get(item.endConnectorId)
    if (!start || !end) {
      warnings.push(`Missing edge endpoints for ${item.id}`)
      continue
    }
    const edge = assignSavedId(
      new Edge({
        workspace,
        start,
        end,
        edgeType: item.edgeType,
        label: item.label,
        markerStart: item.markerStart,
        markerEnd: item.markerEnd,
      }),
      item.id
    )
    edge.label = item.label
  }

  workspace.pan(project.viewport.x, project.viewport.y)
  workspace.setScale(project.viewport.scale)
  workspace.history.clear()

  return { warnings }
}
