import Container from '../core/Container'
import AutoLayout from '../core/AutoLayout'
import Workspace from '../core/Workspace'

// --- スタンドアロン関数 ---

/**
 * コンテナの中心がターゲットの範囲内か判定する。
 * padding で判定領域を内側に縮小できる。
 */
export function isInsideContainer(
  dragged: Container,
  target: Container,
  padding: number = 0
): boolean {
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
export function computeInsertIndex(
  container: Container,
  layout: AutoLayout
): number {
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

export type NestingZoneConfig = {
  target: Container
  layout: AutoLayout
  workspace: Workspace
  validator?: NestingValidator
  padding?: number
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

  private _hovered: Container | null = null
  private _insertIndex: number = 0

  constructor(config: NestingZoneConfig) {
    this.target = config.target
    this.layout = config.layout
    this.workspace = config.workspace
    this.validator = config.validator
    this.padding = config.padding ?? 0
  }

  /** ホバー中のコンテナ（視覚フィードバック用） */
  get hovered(): Container | null {
    return this._hovered
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

      if (isInsideContainer(dragged, this.target, this.padding)) {
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

  /** ネスト済みか判定 */
  isNested(container: Container): boolean {
    return this.layout.Children.includes(container)
  }
}
