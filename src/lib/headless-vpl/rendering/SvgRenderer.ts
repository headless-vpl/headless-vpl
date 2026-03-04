import type { VplEvent, EdgeMarker } from '../core/types'
import type Workspace from '../core/Workspace'
import Container from '../core/Container'
import Connector from '../core/Connector'
import Edge from '../core/Edge'
import AutoLayout from '../core/AutoLayout'
import { MovableObject } from '../core/MovableObject'

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
  }

  private updateViewportTransform(): void {
    const { x, y, scale } = this.workspace.viewport
    this.viewportGroup.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`)
  }

  // --- Event handlers ---

  private onAdd(event: VplEvent) {
    const target = event.target
    this.ensureElement(target)
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
  }

  private onUpdate(event: VplEvent) {
    const target = event.target
    this.ensureElement(target)
    this.updateElement(target)
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
  }

  private onSelect(event: VplEvent) {
    const target = event.target
    const id = this.getId(target)
    if (!id) return
    const svgEl = this.elementMap.get(id)
    if (svgEl) {
      svgEl.setAttribute('stroke-dasharray', '6 3')
      svgEl.setAttribute('stroke-width', '6')
    }
  }

  private onDeselect(event: VplEvent) {
    const target = event.target
    const id = this.getId(target)
    if (!id) return
    const svgEl = this.elementMap.get(id)
    if (svgEl) {
      svgEl.removeAttribute('stroke-dasharray')
      if (target instanceof Container) {
        svgEl.setAttribute('stroke-width', '4')
      } else if (target instanceof Connector) {
        svgEl.removeAttribute('stroke-width')
      }
    }
  }

  // --- Lazy SVG creation ---

  private ensureElement(target: unknown): SVGElement | null {
    const id = this.getId(target)
    if (!id) return null
    if (this.elementMap.has(id)) return this.elementMap.get(id)!
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

  private createConnectorCircle(connector: Connector): SVGCircleElement {
    const circle = document.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('cx', `${connector.position.x}`)
    circle.setAttribute('cy', `${connector.position.y}`)
    circle.setAttribute('r', '10')
    circle.setAttribute('stroke', 'black')
    circle.setAttribute('fill', 'red')
    return circle
  }

  private updateConnectorCircle(connector: Connector): void {
    const circle = this.elementMap.get(connector.id)
    if (!circle) return
    circle.setAttribute('cx', `${connector.position.x}`)
    circle.setAttribute('cy', `${connector.position.y}`)
  }

  // --- Edge (<g> wrapping <path> + optional <text>) ---

  private getMarkerId(marker: EdgeMarker): string {
    const color = marker.color ?? 'black'
    const size = marker.size ?? 10
    return `marker-${marker.type}-${color.replace('#', '')}-${size}`
  }

  private ensureMarkerDef(marker: EdgeMarker): string {
    const id = this.getMarkerId(marker)
    if (this.markerDefs.has(id)) return id

    const color = marker.color ?? 'black'
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
    pathEl.setAttribute('stroke', 'black')
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
      text.setAttribute('fill', '#333')
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
}
