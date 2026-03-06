import type AutoLayout from '../core/AutoLayout'
import type Container from '../core/Container'
import type Workspace from '../core/Workspace'

// --- スタンドアロン関数 ---

/**
 * コンテナの中心がターゲットの範囲内か判定する。
 * padding で判定領域を内側に縮小できる。
 */
export function isInsideContainer(dragged: Container, target: Container, padding = 0): boolean {
  const cx = dragged.position.x + dragged.width / 2
  const cy = dragged.position.y + dragged.height / 2

  return (
    cx >= target.position.x + padding &&
    cx <= target.position.x + target.width - padding &&
    cy >= target.position.y + padding &&
    cy <= target.position.y + target.height - padding
  )
}

/**
 * AutoLayout の既存子を参考に挿入位置を計算する。
 * ドラッグ中のコンテナの中心位置に最も近いインデックスを返す。
 */
export function computeInsertIndex(container: Container, layout: AutoLayout): number {
  const children = layout.Children
  if (children.length === 0) return 0

  const cx = container.position.x + container.width / 2
  const cy = container.position.y + container.height / 2

  if (layout.direction === 'horizontal') {
    for (let i = 0; i < children.length; i++) {
      const childCenter = children[i].position.x + children[i].width / 2
      if (cx < childCenter) return i
    }
  } else {
    for (let i = 0; i < children.length; i++) {
      const childCenter = children[i].position.y + children[i].height / 2
      if (cy < childCenter) return i
    }
  }

  return children.length
}

/**
 * AutoLayout に子を追加し、イベントを発火する。
 */
export function nestContainer(
  child: Container,
  layout: AutoLayout,
  workspace: Workspace,
  index?: number
): void {
  layout.insertElement(child, index)
  workspace.eventBus.emit('nest', child, {
    parentId: layout.parentContainer?.id ?? layout.id,
    childId: child.id,
    index: index ?? layout.Children.length - 1,
  })
}

/**
 * AutoLayout から子を除去し、イベントを発火する。
 */
export function unnestContainer(
  child: Container,
  layout: AutoLayout,
  workspace: Workspace
): boolean {
  const removed = layout.removeElement(child)
  if (removed) {
    workspace.eventBus.emit('unnest', child, {
      parentId: layout.parentContainer?.id ?? layout.id,
      childId: child.id,
    })
  }
  return removed
}

// --- NestingZone クラス ---

export type NestingValidator = (dragged: Container) => boolean

/** コネクタ当たり判定。dragged の上端が layout 内ブロックの下端に近いとき insertIndex を返す */
export type ConnectorHitDetector = (dragged: Container, layout: AutoLayout) => number | null

export type NestingZoneConfig = {
  target: Container
  layout: AutoLayout
  workspace: Workspace
  validator?: NestingValidator
  padding?: number
  priority?: number
  /** body 用: ブロック下端コネクタへの当たり判定。非nullなら isInsideLayout より優先 */
  connectorHit?: ConnectorHitDetector
}

export type SlotZoneConfig = {
  target: Container
  layout: AutoLayout
  workspace: Workspace
  accepts?: NestingValidator
  occupancy?: 'single' | 'multiple'
  centerTolerance?: {
    x?: number
    y?: number
  }
  padding?: number
  priority?: number
}

/**
 * ネスト領域の状態管理を統合するクラス。
 * SnapConnection パターンに倣い、detectHover / nest / unnest を提供する。
 */
export class NestingZone {
  readonly target: Container
  readonly layout: AutoLayout
  readonly workspace: Workspace
  readonly validator?: NestingValidator
  readonly padding: number
  readonly priority: number

  private _hovered: Container | null = null
  private _insertIndex = 0

  readonly connectorHit?: ConnectorHitDetector

  constructor(config: NestingZoneConfig) {
    this.target = config.target
    this.layout = config.layout
    this.workspace = config.workspace
    this.validator = config.validator
    this.padding = config.padding ?? 0
    this.priority = config.priority ?? 0
    this.connectorHit = config.connectorHit
  }

  /** ホバー中のコンテナ（視覚フィードバック用） */
  get hovered(): Container | null {
    return this._hovered
  }

  /** 外部からホバー状態をクリアする */
  clearHover(): void {
    this._hovered = null
  }

  /** 計算された挿入位置 */
  get insertIndex(): number {
    return this._insertIndex
  }

  /**
   * ドラッグ中のコンテナがゾーン上にいるか検出する。
   * animate loop で毎フレーム呼ぶ。
   */
  detectHover(dragContainers: Container[]): Container | null {
    this._hovered = null

    for (const dragged of dragContainers) {
      // 自分自身にはネストしない
      if (dragged === this.target) continue
      // 既にネスト済みならスキップ
      if (this.isNested(dragged)) continue
      // バリデーターチェック
      if (this.validator && !this.validator(dragged)) continue

      const hitIndex = this.connectorHit?.(dragged, this.layout)
      if (hitIndex !== null && hitIndex !== undefined) {
        // connectorHitが返しても、layoutの近傍にいなければ棄却
        if (!this.isNearLayout(dragged)) {
          console.debug('[NestingZone] connectorHit棄却(遠すぎる):', {
            dragged: dragged.id,
            target: this.target.id,
            hitIndex,
          })
          continue
        }
        this._hovered = dragged
        this._insertIndex = hitIndex
        return dragged
      }
      if (this.isInsideLayout(dragged)) {
        this._hovered = dragged
        this._insertIndex = computeInsertIndex(dragged, this.layout)
        return dragged
      }
    }

    return null
  }

  /** ネスト実行 */
  nest(container: Container, index?: number): void {
    nestContainer(container, this.layout, this.workspace, index ?? this._insertIndex)
    this._hovered = null
  }

  /** アンネスト実行 */
  unnest(container: Container): boolean {
    const result = unnestContainer(container, this.layout, this.workspace)
    if (result) this._hovered = null
    return result
  }

  /** ターゲットコンテナの内部領域とAutoLayoutサイズの大きい方を返す */
  private getEffectiveSize(): { width: number; height: number } {
    const innerW = this.target.width - this.target.padding.left - this.target.padding.right
    const innerH = this.target.height - this.target.padding.top - this.target.padding.bottom
    return {
      width: Math.max(this.layout.width, innerW),
      height: Math.max(this.layout.height, innerH),
    }
  }

  /** connectorHit結果に対する防御的な近接チェック（isInsideLayoutより緩い） */
  private isNearLayout(dragged: Container): boolean {
    const abs = this.layout.absolutePosition
    const cx = dragged.position.x + dragged.width / 2
    const cy = dragged.position.y + dragged.height / 2
    const margin = Math.max(this.padding * 3, 50)
    const size = this.getEffectiveSize()
    return (
      cx >= abs.x - margin &&
      cx <= abs.x + size.width + margin &&
      cy >= abs.y - margin &&
      cy <= abs.y + size.height + margin
    )
  }

  /** draggedの中心がlayoutの絶対領域内（paddingで拡張）にあるか判定 */
  private isInsideLayout(dragged: Container): boolean {
    const abs = this.layout.absolutePosition
    const cx = dragged.position.x + dragged.width / 2
    const cy = dragged.position.y + dragged.height / 2
    const size = this.getEffectiveSize()
    return (
      cx >= abs.x - this.padding &&
      cx <= abs.x + size.width + this.padding &&
      cy >= abs.y - this.padding &&
      cy <= abs.y + size.height + this.padding
    )
  }

  /** ネスト済みか判定 */
  isNested(container: Container): boolean {
    return this.layout.Children.includes(container)
  }
}

export function createSlotZone(config: SlotZoneConfig): NestingZone {
  const toleranceX = config.centerTolerance?.x ?? 30
  const toleranceY = config.centerTolerance?.y ?? 20
  const occupancy = config.occupancy ?? 'single'

  return new NestingZone({
    target: config.target,
    layout: config.layout,
    workspace: config.workspace,
    padding: config.padding ?? 0,
    priority: config.priority,
    validator: (dragged) => {
      if (config.accepts && !config.accepts(dragged)) return false
      if (occupancy === 'single' && config.layout.Children.length > 0) return false

      const abs = config.layout.absolutePosition
      const cx = dragged.position.x + dragged.width / 2
      const cy = dragged.position.y + dragged.height / 2

      return (
        Math.abs(cx - (abs.x + config.layout.width / 2)) < toleranceX &&
        Math.abs(cy - (abs.y + config.layout.height / 2)) < toleranceY
      )
    },
  })
}
