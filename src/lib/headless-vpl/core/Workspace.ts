import { EventBus } from './EventBus'
import { History } from './History'
import { SelectionManager } from './SelectionManager'
import type { IWorkspaceElement, IEdge, VplEventType, VplEvent, Viewport } from './types'

/**
 * 要素の管理と EventBus を提供するワークスペース。
 * DOM への依存はゼロ — 描画は外部の Renderer が担う。
 */
class Workspace {
  readonly eventBus: EventBus = new EventBus()
  readonly viewport: Viewport = { x: 0, y: 0, scale: 1 }
  readonly selection: SelectionManager = new SelectionManager(this.eventBus)
  readonly history: History = new History()
  private _elements: IWorkspaceElement[] = []
  private _edges: IEdge[] = []

  addElement(element: IWorkspaceElement): void {
    this._elements.push(element)
    this.eventBus.emit('add', element)
  }

  addEdge(edge: IEdge): void {
    this._edges.push(edge)
    this.eventBus.emit('add', edge)
  }

  removeElement(element: IWorkspaceElement): void {
    const index = this._elements.indexOf(element)
    if (index !== -1) {
      this._elements.splice(index, 1)
      this.eventBus.emit('remove', element)
    }
  }

  removeEdge(edge: IEdge): void {
    const index = this._edges.indexOf(edge)
    if (index !== -1) {
      this._edges.splice(index, 1)
      this.eventBus.emit('remove', edge)
    }
  }

  /**
   * コンテナを削除する。関連 Edge の自動削除、Parent/Children 関係のクリア、
   * 子要素の再帰削除を行う。
   * instanceof を使わずダックタイピングで判定し、循環参照を回避する。
   */
  removeContainer(element: IWorkspaceElement): void {
    // 関連 Edge を削除（コネクターの id を持つ Edge を検索）
    const childIds = new Set<string>()
    childIds.add(element.id)
    if ('children' in element) {
      const children = (element as { children: Record<string, IWorkspaceElement> }).children
      for (const child of Object.values(children)) {
        if (child && typeof child === 'object' && 'id' in child) {
          childIds.add((child as { id: string }).id)
        }
      }
    }

    // Edge を逆順に削除（splice 安全）
    const edgesToRemove = this._edges.filter((edge) => {
      const e = edge as unknown as { startConnector?: { id: string }; endConnector?: { id: string } }
      return (
        (e.startConnector && childIds.has(e.startConnector.id)) ||
        (e.endConnector && childIds.has(e.endConnector.id))
      )
    })
    for (const edge of edgesToRemove) {
      this.removeEdge(edge)
    }

    // Parent/Children 関係をクリア
    const mo = element as unknown as { Parent?: { Children: unknown } | null; Children?: { Parent: unknown } | null }
    if (mo.Parent) {
      mo.Parent.Children = null
      mo.Parent = null
    }
    if (mo.Children) {
      mo.Children.Parent = null
      mo.Children = null
    }

    // 子要素を再帰的にワークスペースから除去
    if ('children' in element) {
      const children = (element as { children: Record<string, IWorkspaceElement> }).children
      for (const child of Object.values(children)) {
        if (child && typeof child === 'object' && 'id' in child) {
          this.removeElement(child as IWorkspaceElement)
        }
      }
    }

    // Selection から除去
    if ('selected' in element) {
      this.selection.deselect(element as unknown as import('./MovableObject').MovableObject)
    }

    this.removeElement(element)
  }

  get elements(): readonly IWorkspaceElement[] {
    return this._elements
  }

  get edges(): readonly IEdge[] {
    return this._edges
  }

  on(type: VplEventType, handler: (event: VplEvent) => void): () => void {
    return this.eventBus.on(type, handler)
  }

  pan(x: number, y: number): void {
    this.viewport.x = x
    this.viewport.y = y
    this.eventBus.emit('pan', this.viewport)
  }

  panBy(dx: number, dy: number): void {
    this.viewport.x += dx
    this.viewport.y += dy
    this.eventBus.emit('pan', this.viewport)
  }

  zoomAt(screenX: number, screenY: number, newScale: number): void {
    const worldX = (screenX - this.viewport.x) / this.viewport.scale
    const worldY = (screenY - this.viewport.y) / this.viewport.scale
    this.viewport.scale = newScale
    this.viewport.x = screenX - worldX * newScale
    this.viewport.y = screenY - worldY * newScale
    this.eventBus.emit('zoom', this.viewport)
  }

  setScale(scale: number): void {
    this.viewport.scale = scale
    this.eventBus.emit('zoom', this.viewport)
  }

  /**
   * 全要素が収まるようにビューポートを自動調整する。
   * scale は 1.0 を上限とし、過度なズームインを防止する。
   * canvasWidth/canvasHeight は引数で渡す（DOM 依存回避）。
   */
  fitView(canvasWidth: number, canvasHeight: number, padding: number = 50): void {
    const containers = this._elements.filter(
      (el) => 'width' in el && 'height' in el
    ) as (IWorkspaceElement & { width: number; height: number })[]

    if (containers.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const el of containers) {
      const x = el.position.x
      const y = el.position.y
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + el.width)
      maxY = Math.max(maxY, y + el.height)
    }

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    if (contentWidth <= 0 || contentHeight <= 0) return

    const availableWidth = canvasWidth - padding * 2
    const availableHeight = canvasHeight - padding * 2

    const scale = Math.min(1.0, availableWidth / contentWidth, availableHeight / contentHeight)

    this.viewport.scale = scale
    this.viewport.x = (canvasWidth - contentWidth * scale) / 2 - minX * scale
    this.viewport.y = (canvasHeight - contentHeight * scale) / 2 - minY * scale

    this.eventBus.emit('zoom', this.viewport)
    this.eventBus.emit('pan', this.viewport)
  }
}

export default Workspace
