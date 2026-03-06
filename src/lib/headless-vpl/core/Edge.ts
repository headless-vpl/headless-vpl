import { getBezierPath, getSmoothStepPath, getStepPath, getStraightPath } from '../util/edgePath'
import type { EdgePathResult } from '../util/edgePath'
import type Connector from './Connector'
import type { IPosition } from './Position'
import type Workspace from './Workspace'
import { generateId } from './types'
import type { EdgeMarker, EdgeType, IEdge } from './types'

type EdgeProps = {
  workspace?: Workspace
  start: Connector
  end: Connector
  edgeType?: EdgeType
  label?: string
  markerStart?: EdgeMarker
  markerEnd?: EdgeMarker
}

/**
 * 2 つの Connector を結ぶ接続線。
 * Position ではなく Connector への参照を保持し、
 * Connector の移動に自動追従する（Renderer 側で処理）。
 */
class Edge implements IEdge {
  readonly id: string
  public workspace: Workspace
  public startConnector: Connector
  public endConnector: Connector
  public edgeType: EdgeType
  public label?: string
  public markerStart?: EdgeMarker
  public markerEnd?: EdgeMarker

  constructor({ workspace, start, end, edgeType, label, markerStart, markerEnd }: EdgeProps) {
    this.id = generateId('edge')
    this.workspace = workspace ?? start.workspace
    this.startConnector = start
    this.endConnector = end
    this.edgeType = edgeType ?? 'straight'
    this.label = label
    this.markerStart = markerStart
    this.markerEnd = markerEnd
    this.workspace.addEdge(this)
  }

  get startPosition() {
    return this.startConnector.position
  }

  get endPosition() {
    return this.endConnector.position
  }

  /**
   * edgeType に応じたパス文字列とラベル位置を計算する。
   */
  computePath(): EdgePathResult {
    const start: IPosition = { x: this.startPosition.x, y: this.startPosition.y }
    const end: IPosition = { x: this.endPosition.x, y: this.endPosition.y }

    switch (this.edgeType) {
      case 'bezier':
        return getBezierPath(start, end)
      case 'step':
        return getStepPath(start, end)
      case 'smoothstep':
        return getSmoothStepPath(start, end)
      default:
        return getStraightPath(start, end)
    }
  }

  /**
   * ラベルの表示位置を返す。
   */
  getLabelPosition(): IPosition {
    return this.computePath().labelPosition
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: 'edge',
      edgeType: this.edgeType,
      startConnectorId: this.startConnector.id,
      endConnectorId: this.endConnector.id,
      label: this.label,
      markerStart: this.markerStart,
      markerEnd: this.markerEnd,
    }
  }
}

export default Edge
