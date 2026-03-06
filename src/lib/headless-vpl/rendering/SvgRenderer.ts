import AutoLayout from '../core/AutoLayout'
import Connector from '../core/Connector'
import Container from '../core/Container'
import Edge from '../core/Edge'
import type { IPosition } from '../core/Position'
import type Workspace from '../core/Workspace'
import type { EdgeMarker, VplEvent } from '../core/types'

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * EventBus を購読し、Workspace の要素を SVG として描画する。
 * core/ から分離された描画レイヤー。
 */
export class SvgRenderer {
  private svgRoot: SVGSVGElement
  private viewportGroup: SVGGElement
  private defsElement: SVGDefsElement
  private workspace: Workspace
  private elementMap = new Map<string, SVGElement>()
  private markerDefs = new Set<string>()

  /** position → connectorId の逆引きマップ */
  private positionToConnectorId = new WeakMap<IPosition, string>()

  /** proximity 中のコネクタIDペアを追跡（connectionId → { sourceId, targetId }） */
  private proximityConnectors = new Map<string, { sourceId: string; targetId: string }>()

  constructor(svgRoot: SVGSVGElement, workspace: Workspace) {
    this.svgRoot = svgRoot
    this.workspace = workspace

    // <defs> for markers
    this.defsElement = document.createElementNS(SVG_NS, 'defs')
    this.svgRoot.appendChild(this.defsElement)

    this.viewportGroup = document.createElementNS(SVG_NS, 'g')
    this.viewportGroup.setAttribute('data-role', 'viewport')
    this.svgRoot.appendChild(this.viewportGroup)

    workspace.on('add', (event) => this.onAdd(event))
    workspace.on('move', (event) => this.onMove(event))
    workspace.on('update', (event) => this.onUpdate(event))
    workspace.on('remove', (event) => this.onRemove(event))
    workspace.on('select', (event) => this.onSelect(event))
    workspace.on('deselect', (event) => this.onDeselect(event))
    workspace.on('pan', () => this.updateViewportTransform())
    workspace.on('zoom', () => this.updateViewportTransform())
    workspace.on('proximity', (event) => this.onProximity(event))
    workspace.on('proximity-end', (event) => this.onProximityEnd(event))
    workspace.on('connect', (event) => this.onConnect(event))
    workspace.on('disconnect', (event) => this.onDisconnect(event))
  }

  private updateViewportTransform(): void {
    const { x, y, scale } = this.workspace.viewport
    this.viewportGroup.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`)
  }

  // --- Event handlers ---

  private onAdd(event: VplEvent) {
    const target = event.target
    this.ensureElement(target)
    if (target instanceof Connector) {
      this.refreshConnectorProximityColors()
    }
  }

  private onMove(event: VplEvent) {
    const target = event.target
    this.ensureElement(target)
    this.updateElement(target)

    // Edge は Connector の位置を参照するため、
    // 任意の要素が動いたら全 Edge を再描画する
    for (const edge of this.workspace.edges) {
      this.ensureElement(edge)
      this.updateEdgePath(edge as Edge)
    }

    this.refreshConnectorProximityColors()
  }

  private onUpdate(event: VplEvent) {
    const target = event.target
    this.ensureElement(target)
    this.updateElement(target)
    if (target instanceof Connector) {
      this.refreshConnectorProximityColors()
    }
  }

  private onRemove(event: VplEvent) {
    const target = event.target
    const id = this.getId(target)
    if (!id) return
    const svgEl = this.elementMap.get(id)
    if (svgEl) {
      svgEl.remove()
      this.elementMap.delete(id)
    }
    if (target instanceof Connector) {
      this.refreshConnectorProximityColors()
    }
  }

  private onSelect(event: VplEvent) {
    const target = event.target
    const id = this.getId(target)
    if (!id) return
    const svgEl = this.elementMap.get(id)
    if (!svgEl) return

    if (target instanceof Connector) {
      const dot = svgEl.querySelector('[data-role="center-dot"]')
      if (dot) {
        dot.setAttribute('stroke-dasharray', '6 3')
        dot.setAttribute('stroke-width', '6')
      }
    } else {
      svgEl.setAttribute('stroke-dasharray', '6 3')
      svgEl.setAttribute('stroke-width', '6')
    }
  }

  private onDeselect(event: VplEvent) {
    const target = event.target
    const id = this.getId(target)
    if (!id) return
    const svgEl = this.elementMap.get(id)
    if (!svgEl) return

    if (target instanceof Connector) {
      const dot = svgEl.querySelector('[data-role="center-dot"]')
      if (dot) {
        dot.removeAttribute('stroke-dasharray')
        dot.removeAttribute('stroke-width')
      }
    } else if (target instanceof Container) {
      svgEl.removeAttribute('stroke-dasharray')
      svgEl.setAttribute('stroke-width', '4')
    }
  }

  // --- Lazy SVG creation ---

  private ensureElement(target: unknown): SVGElement | null {
    const id = this.getId(target)
    if (!id) return null
    const existing = this.elementMap.get(id)
    if (existing) return existing
    return this.createElement(target, id)
  }

  private createElement(target: unknown, id: string): SVGElement | null {
    let svgEl: SVGElement | null = null

    if (target instanceof Container) {
      svgEl = this.createContainerRect(target)
    } else if (target instanceof Connector) {
      svgEl = this.createConnectorCircle(target)
    } else if (target instanceof Edge) {
      svgEl = this.createEdgeGroup(target)
    } else if (target instanceof AutoLayout) {
      svgEl = this.createAutoLayoutRect(target)
    }

    if (svgEl) {
      this.elementMap.set(id, svgEl)
      this.viewportGroup.appendChild(svgEl)
    }
    return svgEl
  }

  private updateElement(target: unknown) {
    if (target instanceof Container) {
      this.updateContainerRect(target)
    } else if (target instanceof Connector) {
      this.updateConnectorCircle(target)
    } else if (target instanceof Edge) {
      this.updateEdgePath(target)
    } else if (target instanceof AutoLayout) {
      this.updateAutoLayoutRect(target)
    }
  }

  private getId(target: unknown): string | null {
    if (target && typeof target === 'object' && 'id' in target) {
      return (target as { id: string }).id
    }
    return null
  }

  // --- Container ---

  private createContainerRect(container: Container): SVGRectElement {
    const rect = document.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('x', `${container.position.x}`)
    rect.setAttribute('y', `${container.position.y}`)
    rect.setAttribute('width', `${container.width}`)
    rect.setAttribute('height', `${container.height}`)
    rect.setAttribute('stroke-width', '4')
    rect.setAttribute('rx', '10')
    rect.setAttribute('ry', '10')
    rect.setAttribute('stroke', container.color)
    rect.setAttribute('fill', container.color)
    rect.setAttribute('fill-opacity', '0.15')
    return rect
  }

  private updateContainerRect(container: Container): void {
    const rect = this.elementMap.get(container.id)
    if (!rect) return
    rect.setAttribute('x', `${container.position.x}`)
    rect.setAttribute('y', `${container.position.y}`)
    rect.setAttribute('width', `${container.width}`)
    rect.setAttribute('height', `${container.height}`)
    rect.setAttribute('stroke', container.color)
    rect.setAttribute('fill', container.color)
  }

  // --- Connector ---

  private createConnectorCircle(connector: Connector): SVGGElement {
    const g = document.createElementNS(SVG_NS, 'g')

    // position → connectorId の逆引きを登録
    this.positionToConnectorId.set(connector.position, connector.id)

    // hit area circle（hitRadius反映）
    const hitArea = document.createElementNS(SVG_NS, 'circle')
    hitArea.setAttribute('cx', `${connector.position.x}`)
    hitArea.setAttribute('cy', `${connector.position.y}`)
    hitArea.setAttribute('r', `${connector.hitRadius}`)
    hitArea.setAttribute('fill', '#3b82f6')
    hitArea.setAttribute('fill-opacity', '0.15')
    hitArea.setAttribute('stroke', '#2563eb')
    hitArea.setAttribute('stroke-opacity', '0.5')
    hitArea.setAttribute('stroke-width', '1.5')
    hitArea.setAttribute('stroke-dasharray', '4 4')
    hitArea.setAttribute('pointer-events', 'none')
    hitArea.setAttribute('data-role', 'hit-area')
    g.appendChild(hitArea)

    // center dot（固定サイズ）
    const dot = document.createElementNS(SVG_NS, 'circle')
    dot.setAttribute('cx', `${connector.position.x}`)
    dot.setAttribute('cy', `${connector.position.y}`)
    dot.setAttribute('r', '5')
    dot.setAttribute('stroke', '#2563eb')
    dot.setAttribute('fill', '#3b82f6')
    dot.setAttribute('data-role', 'center-dot')
    g.appendChild(dot)

    return g
  }

  private updateConnectorCircle(connector: Connector): void {
    const g = this.elementMap.get(connector.id)
    if (!g) return
    for (const circle of g.querySelectorAll('circle')) {
      circle.setAttribute('cx', `${connector.position.x}`)
      circle.setAttribute('cy', `${connector.position.y}`)
    }
  }

  // --- Edge (<g> wrapping <path> + optional <text>) ---

  private getMarkerId(marker: EdgeMarker): string {
    const color = marker.color ?? 'currentColor'
    const size = marker.size ?? 10
    return `marker-${marker.type}-${color.replace('#', '')}-${size}`
  }

  private ensureMarkerDef(marker: EdgeMarker): string {
    const id = this.getMarkerId(marker)
    if (this.markerDefs.has(id)) return id

    const color = marker.color ?? 'currentColor'
    const size = marker.size ?? 10

    const markerEl = document.createElementNS(SVG_NS, 'marker')
    markerEl.setAttribute('id', id)
    markerEl.setAttribute('viewBox', `0 0 ${size} ${size}`)
    markerEl.setAttribute('refX', `${size}`)
    markerEl.setAttribute('refY', `${size / 2}`)
    markerEl.setAttribute('markerWidth', `${size}`)
    markerEl.setAttribute('markerHeight', `${size}`)
    markerEl.setAttribute('orient', 'auto-start-reverse')

    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', `M 0 0 L ${size} ${size / 2} L 0 ${size}`)
    path.setAttribute('fill', marker.type === 'arrowClosed' ? color : 'none')
    path.setAttribute('stroke', color)
    path.setAttribute('stroke-width', '1')

    markerEl.appendChild(path)
    this.defsElement.appendChild(markerEl)
    this.markerDefs.add(id)

    return id
  }

  private createEdgeGroup(edge: Edge): SVGGElement {
    const g = document.createElementNS(SVG_NS, 'g')
    g.setAttribute('data-edge-id', edge.id)

    const pathResult = edge.computePath()

    const pathEl = document.createElementNS(SVG_NS, 'path')
    pathEl.setAttribute('d', pathResult.path)
    pathEl.setAttribute('stroke', 'currentColor')
    pathEl.setAttribute('stroke-width', '2')
    pathEl.setAttribute('fill', 'none')
    pathEl.setAttribute('data-role', 'edge-path')

    // Markers
    if (edge.markerStart && edge.markerStart.type !== 'none') {
      const markerId = this.ensureMarkerDef(edge.markerStart)
      pathEl.setAttribute('marker-start', `url(#${markerId})`)
    }
    if (edge.markerEnd && edge.markerEnd.type !== 'none') {
      const markerId = this.ensureMarkerDef(edge.markerEnd)
      pathEl.setAttribute('marker-end', `url(#${markerId})`)
    }

    g.appendChild(pathEl)

    // Label
    if (edge.label) {
      const text = document.createElementNS(SVG_NS, 'text')
      text.setAttribute('x', `${pathResult.labelPosition.x}`)
      text.setAttribute('y', `${pathResult.labelPosition.y}`)
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('dominant-baseline', 'middle')
      text.setAttribute('font-size', '12')
      text.setAttribute('fill', 'currentColor')
      text.setAttribute('data-role', 'edge-label')
      text.textContent = edge.label
      g.appendChild(text)
    }

    return g
  }

  private updateEdgePath(edge: Edge): void {
    const g = this.elementMap.get(edge.id)
    if (!g) return

    const pathResult = edge.computePath()

    const pathEl = g.querySelector('[data-role="edge-path"]')
    if (pathEl) {
      pathEl.setAttribute('d', pathResult.path)
    }

    const textEl = g.querySelector('[data-role="edge-label"]')
    if (textEl && edge.label) {
      textEl.setAttribute('x', `${pathResult.labelPosition.x}`)
      textEl.setAttribute('y', `${pathResult.labelPosition.y}`)
      textEl.textContent = edge.label
    }
  }

  // --- AutoLayout ---

  private createAutoLayoutRect(autoLayout: AutoLayout): SVGRectElement {
    const rect = document.createElementNS(SVG_NS, 'rect')
    const abs = autoLayout.absolutePosition
    rect.setAttribute('x', `${abs.x}`)
    rect.setAttribute('y', `${abs.y}`)
    rect.setAttribute('width', `${autoLayout.width}`)
    rect.setAttribute('height', `${autoLayout.height}`)
    rect.setAttribute('stroke-width', '4')
    rect.setAttribute('stroke', 'blue')
    rect.setAttribute('fill', 'none')
    return rect
  }

  private updateAutoLayoutRect(autoLayout: AutoLayout): void {
    const rect = this.elementMap.get(autoLayout.id)
    if (!rect) return
    const abs = autoLayout.absolutePosition
    rect.setAttribute('x', `${abs.x}`)
    rect.setAttribute('y', `${abs.y}`)
    rect.setAttribute('width', `${autoLayout.width}`)
    rect.setAttribute('height', `${autoLayout.height}`)
  }

  // --- Connector hit area の動的表示制御 ---

  /** コネクタIDから hit-area circle を取得 */
  private getHitArea(connectorId: string): SVGCircleElement | null {
    const g = this.elementMap.get(connectorId)
    if (!g) return null
    return g.querySelector('[data-role="hit-area"]') as SVGCircleElement | null
  }

  /** hit area を赤色に変更する。半径は実際の hitRadius に固定する。 */
  private setHitAreaProximity(connector: Connector): void {
    const hitArea = this.getHitArea(connector.id)
    if (!hitArea) return
    hitArea.setAttribute('r', `${connector.hitRadius}`)
    hitArea.setAttribute('fill', '#ef4444')
    hitArea.setAttribute('fill-opacity', '0.12')
    hitArea.setAttribute('stroke', '#dc2626')
    hitArea.setAttribute('stroke-opacity', '0.4')
  }

  /** hit area を青色（デフォルト）に戻す */
  private resetHitAreaColor(connector: Connector): void {
    const hitArea = this.getHitArea(connector.id)
    if (!hitArea) return
    hitArea.setAttribute('r', `${connector.hitRadius}`)
    hitArea.setAttribute('fill', '#3b82f6')
    hitArea.setAttribute('fill-opacity', '0.08')
    hitArea.setAttribute('stroke', '#2563eb')
    hitArea.setAttribute('stroke-opacity', '0.25')
  }

  private onProximity(event: VplEvent): void {
    const data = event.data
    if (!data) return
    const connectionId = data.connectionId as string
    const sourcePosition = data.sourcePosition as IPosition
    const targetPosition = data.targetPosition as IPosition

    const sourceId = this.positionToConnectorId.get(sourcePosition)
    const targetId = this.positionToConnectorId.get(targetPosition)
    if (!sourceId || !targetId) return

    this.proximityConnectors.set(connectionId, { sourceId, targetId })
    this.refreshConnectorProximityColors()
  }

  private onProximityEnd(event: VplEvent): void {
    const data = event.data
    if (!data) return
    const connectionId = data.connectionId as string

    const entry = this.proximityConnectors.get(connectionId)
    if (!entry) return

    this.proximityConnectors.delete(connectionId)
    this.refreshConnectorProximityColors()
  }

  private onConnect(_event: VplEvent): void {
    // 接続後も他コネクタとの近接状況に応じて色を再評価する
    this.refreshConnectorProximityColors()
  }

  private onDisconnect(_event: VplEvent): void {
    this.refreshConnectorProximityColors()
  }

  private getAllConnectors(): Connector[] {
    return this.workspace.elements.filter((el): el is Connector => el instanceof Connector)
  }

  /**
   * proximity イベントで通知されたコネクタだけを赤表示にする。
   */
  private refreshConnectorProximityColors(): void {
    const connectors = this.getAllConnectors()
    const highlightedIds = new Set<string>()

    for (const [connectionId, entry] of this.proximityConnectors.entries()) {
      if (!this.elementMap.has(entry.sourceId) || !this.elementMap.has(entry.targetId)) {
        this.proximityConnectors.delete(connectionId)
        continue
      }
      highlightedIds.add(entry.sourceId)
      highlightedIds.add(entry.targetId)
    }

    for (const connector of connectors) {
      if (highlightedIds.has(connector.id)) {
        this.setHitAreaProximity(connector)
      } else {
        this.resetHitAreaColor(connector)
      }
    }
  }
}
