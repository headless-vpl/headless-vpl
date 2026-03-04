import type Position from './Position'
import type { IPosition } from './Position'

export type SizingMode = 'fixed' | 'hug' | 'fill'

export type Padding = {
  top: number
  right: number
  bottom: number
  left: number
}

let _nextId = 1
export function generateId(prefix: string = 'vpl'): string {
  return `${prefix}_${_nextId++}`
}

/**
 * Workspace 上に配置される要素の共通インターフェース。
 * MovableObject と AutoLayout が共有するプロパティを統一する。
 */
export interface IWorkspaceElement {
  readonly id: string
  position: Position
  name: string
  type: string
  move(x: number, y: number): void
  update(): void
  toJSON(): Record<string, unknown>
}

/**
 * Edge のインターフェース（Position を 2 つ持つため IWorkspaceElement とは別）
 */
export interface IEdge {
  readonly id: string
  readonly startPosition: IPosition
  readonly endPosition: IPosition
  toJSON(): Record<string, unknown>
}

export type VplEventType = 'move' | 'connect' | 'disconnect' | 'add' | 'remove' | 'update' | 'pan' | 'zoom' | 'select' | 'deselect' | 'nest' | 'unnest'

// --- Edge Types ---

export type EdgeType = 'straight' | 'bezier' | 'step' | 'smoothstep'

export type MarkerType = 'arrow' | 'arrowClosed' | 'none'

export type EdgeMarker = {
  type: MarkerType
  color?: string
  size?: number
}

// --- Resize ---

export type ResizeHandleDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface Viewport {
  x: number      // パンオフセット X（ピクセル）
  y: number      // パンオフセット Y（ピクセル）
  scale: number  // ズームスケール（1.0 = 100%）
}

export interface VplEvent {
  type: VplEventType
  target: unknown
  data?: Record<string, unknown>
}
