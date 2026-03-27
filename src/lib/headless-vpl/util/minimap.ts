import type { IPosition } from '../core/Position'
import type Workspace from '../core/Workspace'
import type { IWorkspaceElement, Viewport } from '../core/types'

export type MinimapSize = {
  width: number
  height: number
}

export type MinimapElement = {
  id: string
  position: IPosition
  width: number
  height: number
  color?: string
}

export type MinimapBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export type MinimapRect = {
  x: number
  y: number
  width: number
  height: number
}

export type MinimapTransform = {
  x: number
  y: number
  scale: number
}

export type MinimapNodeRect = MinimapRect & {
  id: string
  color?: string
}

export type MinimapSnapshot = {
  size: MinimapSize
  bounds: MinimapBounds
  transform: MinimapTransform
  nodes: MinimapNodeRect[]
  viewport: MinimapRect
}

export type ComputeMinimapSnapshotConfig = {
  workspace: Pick<Workspace, 'viewport'> | { viewport: Viewport }
  elements: readonly MinimapElement[]
  canvas: MinimapSize
  size: MinimapSize
  padding?: number
  boundViewport?: boolean
  minWorldWidth?: number
  minWorldHeight?: number
}

export type BindMinimapNavigationConfig = {
  workspace: Workspace
  getSnapshot: () => MinimapSnapshot
  getCanvasSize: () => MinimapSize
}

type BoundsAccumulator = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type DragState = {
  pointerId: number
  mode: 'center' | 'viewport'
  snapshot: MinimapSnapshot
  viewportOffset: IPosition
}

const EPSILON = 1e-6

export function collectMinimapElements(elements: readonly IWorkspaceElement[]): MinimapElement[] {
  const result: MinimapElement[] = []

  for (const element of elements) {
    if (!('width' in element) || !('height' in element)) continue
    if (typeof element.width !== 'number' || typeof element.height !== 'number') continue

    result.push({
      id: element.id,
      position: element.position,
      width: element.width,
      height: element.height,
      color: 'color' in element && typeof element.color === 'string' ? element.color : undefined,
    })
  }

  return result
}

export function computeMinimapSnapshot({
  workspace,
  elements,
  canvas,
  size,
  padding = 16,
  boundViewport = true,
  minWorldWidth = 1,
  minWorldHeight = 1,
}: ComputeMinimapSnapshotConfig): MinimapSnapshot {
  const safeSize = {
    width: Math.max(1, size.width),
    height: Math.max(1, size.height),
  }
  const safeCanvas = {
    width: Math.max(1, canvas.width),
    height: Math.max(1, canvas.height),
  }
  const safePadding = Math.max(0, padding)
  const baseBounds = getElementBounds(elements)
  const viewportBounds = getViewportBounds(workspace.viewport, safeCanvas)

  let bounds = baseBounds
  if (boundViewport || !bounds) {
    bounds = bounds ? expandBounds(bounds, viewportBounds) : viewportBounds
  }
  if (!bounds) {
    bounds = normalizeBounds(
      {
        minX: 0,
        minY: 0,
        maxX: minWorldWidth,
        maxY: minWorldHeight,
      },
      minWorldWidth,
      minWorldHeight
    )
  } else {
    bounds = normalizeBounds(bounds, minWorldWidth, minWorldHeight)
  }

  const innerWidth = Math.max(1, safeSize.width - safePadding * 2)
  const innerHeight = Math.max(1, safeSize.height - safePadding * 2)
  const scale = Math.min(innerWidth / bounds.width, innerHeight / bounds.height)
  const transform = {
    x: (safeSize.width - bounds.width * scale) / 2 - bounds.minX * scale,
    y: (safeSize.height - bounds.height * scale) / 2 - bounds.minY * scale,
    scale,
  }

  return {
    size: safeSize,
    bounds,
    transform,
    nodes: elements.map((element) => ({
      id: element.id,
      color: element.color,
      ...projectRect(
        {
          x: element.position.x,
          y: element.position.y,
          width: element.width,
          height: element.height,
        },
        transform
      ),
    })),
    viewport: projectRect(
      {
        x: viewportBounds.minX,
        y: viewportBounds.minY,
        width: viewportBounds.width,
        height: viewportBounds.height,
      },
      transform
    ),
  }
}

export function bindMinimapNavigation(
  minimapElement: HTMLElement,
  config: BindMinimapNavigationConfig
): () => void {
  let dragState: DragState | null = null

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return

    const snapshot = config.getSnapshot()
    const localPoint = getLocalPoint(event, minimapElement, snapshot.size)
    const insideViewport = isPointInsideRect(localPoint, snapshot.viewport)

    dragState = {
      pointerId: event.pointerId,
      mode: insideViewport ? 'viewport' : 'center',
      snapshot,
      viewportOffset: {
        x: localPoint.x - snapshot.viewport.x,
        y: localPoint.y - snapshot.viewport.y,
      },
    }

    applyNavigation(config.workspace, config.getCanvasSize(), dragState, localPoint)
    if (typeof minimapElement.setPointerCapture === 'function') {
      minimapElement.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return
    const localPoint = getLocalPoint(event, minimapElement, dragState.snapshot.size)
    applyNavigation(config.workspace, config.getCanvasSize(), dragState, localPoint)
    event.preventDefault()
  }

  const clearDragState = (event: PointerEvent) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return
    if (typeof minimapElement.releasePointerCapture === 'function') {
      minimapElement.releasePointerCapture(event.pointerId)
    }
    dragState = null
    event.preventDefault()
  }

  minimapElement.addEventListener('pointerdown', onPointerDown)
  minimapElement.addEventListener('pointermove', onPointerMove)
  minimapElement.addEventListener('pointerup', clearDragState)
  minimapElement.addEventListener('pointercancel', clearDragState)

  return () => {
    minimapElement.removeEventListener('pointerdown', onPointerDown)
    minimapElement.removeEventListener('pointermove', onPointerMove)
    minimapElement.removeEventListener('pointerup', clearDragState)
    minimapElement.removeEventListener('pointercancel', clearDragState)
  }
}

function getElementBounds(elements: readonly MinimapElement[]): MinimapBounds | null {
  if (elements.length === 0) return null

  const bounds = elements.reduce<BoundsAccumulator>(
    (acc, element) => ({
      minX: Math.min(acc.minX, element.position.x),
      minY: Math.min(acc.minY, element.position.y),
      maxX: Math.max(acc.maxX, element.position.x + element.width),
      maxY: Math.max(acc.maxY, element.position.y + element.height),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  )

  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  }
}

function getViewportBounds(viewport: Viewport, canvas: MinimapSize): MinimapBounds {
  const scale = Math.max(EPSILON, viewport.scale)
  const minX = -viewport.x / scale
  const minY = -viewport.y / scale
  const width = canvas.width / scale
  const height = canvas.height / scale

  return {
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
    width,
    height,
  }
}

function expandBounds(a: MinimapBounds, b: MinimapBounds): MinimapBounds {
  const minX = Math.min(a.minX, b.minX)
  const minY = Math.min(a.minY, b.minY)
  const maxX = Math.max(a.maxX, b.maxX)
  const maxY = Math.max(a.maxY, b.maxY)

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function normalizeBounds(
  bounds: Pick<MinimapBounds, 'minX' | 'minY' | 'maxX' | 'maxY'>,
  minWorldWidth: number,
  minWorldHeight: number
): MinimapBounds {
  const width = Math.max(minWorldWidth, bounds.maxX - bounds.minX)
  const height = Math.max(minWorldHeight, bounds.maxY - bounds.minY)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return {
    minX: centerX - width / 2,
    minY: centerY - height / 2,
    maxX: centerX + width / 2,
    maxY: centerY + height / 2,
    width,
    height,
  }
}

function projectRect(rect: MinimapRect, transform: MinimapTransform): MinimapRect {
  return {
    x: rect.x * transform.scale + transform.x,
    y: rect.y * transform.scale + transform.y,
    width: rect.width * transform.scale,
    height: rect.height * transform.scale,
  }
}

function getLocalPoint(
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
  minimapElement: HTMLElement,
  size: MinimapSize
): IPosition {
  const rect = minimapElement.getBoundingClientRect()
  const width = rect.width || size.width || 1
  const height = rect.height || size.height || 1

  return {
    x: clamp(((event.clientX - rect.left) / width) * size.width, 0, size.width),
    y: clamp(((event.clientY - rect.top) / height) * size.height, 0, size.height),
  }
}

function isPointInsideRect(point: IPosition, rect: MinimapRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

function applyNavigation(
  workspace: Workspace,
  canvas: MinimapSize,
  dragState: DragState,
  localPoint: IPosition
): void {
  if (dragState.mode === 'viewport') {
    const origin = {
      x: localPoint.x - dragState.viewportOffset.x,
      y: localPoint.y - dragState.viewportOffset.y,
    }
    const world = minimapToWorld(origin, dragState.snapshot)
    workspace.pan(-world.x * workspace.viewport.scale, -world.y * workspace.viewport.scale)
    return
  }

  const world = minimapToWorld(localPoint, dragState.snapshot)
  workspace.pan(
    canvas.width / 2 - world.x * workspace.viewport.scale,
    canvas.height / 2 - world.y * workspace.viewport.scale
  )
}

function minimapToWorld(point: IPosition, snapshot: MinimapSnapshot): IPosition {
  return {
    x: (point.x - snapshot.transform.x) / snapshot.transform.scale,
    y: (point.y - snapshot.transform.y) / snapshot.transform.scale,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
