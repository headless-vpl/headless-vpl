import type Workspace from '../core/Workspace'
import type Container from '../core/Container'

export type DomSyncConfig = {
  workspace: Workspace
  overlayElement: HTMLElement
  canvasElement?: HTMLElement
  gridSize?: number
  resolveElement: (container: Container) => HTMLElement | null
}

/**
 * Container の位置を DOM 要素に同期するヘルパー。
 * viewport transform とグリッド背景の更新も行う。
 */
export class DomSyncHelper {
  private workspace: Workspace
  private overlayElement: HTMLElement
  private canvasElement: HTMLElement | null
  private gridSize: number
  private resolveElement: (container: Container) => HTMLElement | null

  constructor(config: DomSyncConfig) {
    this.workspace = config.workspace
    this.overlayElement = config.overlayElement
    this.canvasElement = config.canvasElement ?? null
    this.gridSize = config.gridSize ?? 24
    this.resolveElement = config.resolveElement
  }

  /**
   * 全コンテナの DOM 位置を同期する。
   * viewport transform とグリッド背景も更新する。
   */
  syncAll(containers: readonly Container[]): void {
    this.syncViewport()
    for (const c of containers) {
      this.syncOne(c)
    }
  }

  /**
   * viewport transform のみ同期する。
   */
  syncViewport(): void {
    const { x, y, scale } = this.workspace.viewport
    this.overlayElement.style.transformOrigin = '0 0'
    this.overlayElement.style.transform = `translate(${x}px, ${y}px) scale(${scale})`

    if (this.canvasElement) {
      const gs = this.gridSize * scale
      this.canvasElement.style.backgroundSize = `${gs}px ${gs}px`
      this.canvasElement.style.backgroundPosition = `${x}px ${y}px`
    }
  }

  /**
   * 単一コンテナの DOM 位置を同期する。
   */
  syncOne(container: Container): void {
    const el = this.resolveElement(container)
    if (!el) return
    el.style.transform = `translate(${container.position.x}px, ${container.position.y}px)`
    if (container.resizable) {
      el.style.width = `${container.width}px`
      el.style.height = `${container.height}px`
    }
  }
}
