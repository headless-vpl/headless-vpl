import type Connector from '../core/Connector'
import type { IPosition } from '../core/Position'
import type Workspace from '../core/Workspace'
import type { EdgeType, IEdge } from '../core/types'
import Edge from '../core/Edge'
import { getDistance } from './distance'
import { getBezierPath, getStraightPath, getStepPath, getSmoothStepPath } from './edgePath'

/**
 * コネクターがマウス位置のヒット範囲内かを判定する。
 */
export function isConnectorHit(
  mousePos: IPosition,
  connector: { position: IPosition },
  hitRadius: number = 16
): boolean {
  return getDistance(mousePos, connector.position) <= hitRadius
}

/**
 * マウス位置に最も近いコネクターを返す。hitRadius 内のもののみ。
 */
export function findNearestConnector(
  mousePos: IPosition,
  connectors: Array<{ position: IPosition }>,
  hitRadius: number = 16
): { connector: (typeof connectors)[number]; distance: number } | null {
  let best: { connector: (typeof connectors)[number]; distance: number } | null = null
  for (const connector of connectors) {
    const d = getDistance(mousePos, connector.position)
    if (d <= hitRadius && (!best || d < best.distance)) {
      best = { connector, distance: d }
    }
  }
  return best
}

export type EdgeBuilderConfig = {
  workspace: Workspace
  hitRadius?: number
  edgeType?: EdgeType
  onPreview?: (path: string, from: IPosition, to: IPosition) => void
  onComplete?: (edge: Edge) => void
  onCancel?: () => void
}

/**
 * コネクターからドラッグして Edge を作成するビルダー。
 * Headless 設計に従い DOM 操作なし。
 */
export class EdgeBuilder {
  private workspace: Workspace
  private hitRadius: number
  private edgeType: EdgeType
  private onPreview?: (path: string, from: IPosition, to: IPosition) => void
  private onComplete?: (edge: Edge) => void
  private onCancel?: () => void

  private _active = false
  private _startConnector: Connector | null = null
  private _previewPath: string | null = null

  constructor(config: EdgeBuilderConfig) {
    this.workspace = config.workspace
    this.hitRadius = config.hitRadius ?? 16
    this.edgeType = config.edgeType ?? 'bezier'
    this.onPreview = config.onPreview
    this.onComplete = config.onComplete
    this.onCancel = config.onCancel
  }

  get active(): boolean {
    return this._active
  }

  get previewPath(): string | null {
    return this._previewPath
  }

  get startConnector(): Connector | null {
    return this._startConnector
  }

  /**
   * ドラッグ開始。出力コネクターからスタート。
   */
  start(connector: Connector): void {
    this._active = true
    this._startConnector = connector
    this._previewPath = null
  }

  /**
   * マウス移動ごとにプレビューパスを更新。
   */
  update(mousePos: IPosition): void {
    if (!this._active || !this._startConnector) return

    const from = this._startConnector.position
    const to = mousePos
    this._previewPath = this.computePath(from, to)
    this.onPreview?.(this._previewPath, from, to)
  }

  /**
   * 入力コネクターにドロップして Edge を作成。
   */
  complete(connector: Connector): void {
    if (!this._active || !this._startConnector) return
    if (connector === this._startConnector) {
      this.cancel()
      return
    }

    const edge = new Edge({
      workspace: this.workspace,
      start: this._startConnector,
      end: connector,
      edgeType: this.edgeType,
    })
    this.onComplete?.(edge)
    this.reset()
  }

  /**
   * キャンセル。
   */
  cancel(): void {
    if (!this._active) return
    this.onCancel?.()
    this.reset()
  }

  private reset(): void {
    this._active = false
    this._startConnector = null
    this._previewPath = null
  }

  private computePath(from: IPosition, to: IPosition): string {
    switch (this.edgeType) {
      case 'bezier':
        return getBezierPath(from, to).path
      case 'step':
        return getStepPath(from, to).path
      case 'smoothstep':
        return getSmoothStepPath(from, to).path
      case 'straight':
      default:
        return getStraightPath(from, to).path
    }
  }
}

/**
 * 点から線分への最短距離を計算する。
 */
function pointToSegmentDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * ワールド座標でEdgeのヒットテストを行い、最初にヒットしたEdgeを返す。
 * startConnector/endConnector を持つ Edge 前提。
 */
export function findEdgeAtPoint(
  worldPos: IPosition,
  edges: readonly IEdge[],
  hitDistance: number = 8
): Edge | null {
  for (const edge of edges) {
    const e = edge as Edge
    if (!e.startConnector || !e.endConnector) continue
    const s = e.startConnector.position
    const en = e.endConnector.position
    if (pointToSegmentDist(worldPos.x, worldPos.y, s.x, s.y, en.x, en.y) < hitDistance) {
      return e
    }
  }
  return null
}
