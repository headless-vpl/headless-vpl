import { type Container, type Position, getDistance } from '../../headless-vpl'
import type Workspace from '../core/Workspace'
import { generateId } from '../core/types'
import { type getMouseState, getPositionDelta } from './mouse'

/**
 * 接続バリデーター。snap の前に呼ばれ、false を返すと接続を拒否する。
 */
export type ConnectionValidator = () => boolean

/**
 * 指定されたソースとターゲットのコネクタ間で、ソースコンテナを動かしてスナップを試みます。
 *
 * @param source ソースコンテナ（スナップ対象）
 * @param sourcePosition ソースの座標
 * @param targetPosition ターゲットの座標
 * @param mouseState 現在のマウス状態。左ボタンが 'up' の場合にのみスナップを試みる。
 * @param snapDistance スナップを発動する距離の閾値
 * @param onSnap スナップが成功した場合に実行するコールバック
 * @param onFail スナップが失敗した場合に実行するコールバック
 * @param validator 接続の可否を判定するバリデーター
 * @returns スナップが実行された場合は true を返します。
 */
export function snap(
  source: Container,
  sourcePosition: Position,
  targetPosition: Position,
  mouseState: getMouseState,
  snapDistance = 50,
  onSnap?: () => void,
  onFail?: () => void,
  validator?: ConnectionValidator
): boolean {
  // マウスがリリース状態でなければ処理しない
  if (mouseState.buttonState.leftButton !== 'up') {
    return false
  }

  // バリデーターが設定されていて false を返した場合は接続拒否
  if (validator && !validator()) {
    onFail?.()
    return false
  }

  const sourceConnector = sourcePosition
  const targetConnector = targetPosition

  const distance = getDistance(sourceConnector, targetConnector)
  if (distance < snapDistance) {
    const delta = getPositionDelta(sourceConnector, targetConnector)
    // source の位置を調整してスナップさせる
    source.move(source.position.x - delta.x, source.position.y - delta.y)
    onSnap?.()
    return true
  }

  // スナップが失敗した場合にコールバックを実行
  onFail?.()
  return false
}

// --- SnapStrategy ---

/**
 * スナップを試みるかどうかの判定関数。
 * source（子）と target（親）のどちらがドラッグされているかで制御できる。
 */
export type SnapStrategy = (
  source: Container,
  target: Container,
  dragContainers: Container[]
) => boolean

/** デフォルト: 子（source）が親に近づいた時だけスナップ */
export const childOnly: SnapStrategy = (source, _target, dragContainers) =>
  dragContainers.includes(source)

/** 親（target）が子に近づいた時だけスナップ */
export const parentOnly: SnapStrategy = (_source, target, dragContainers) =>
  dragContainers.includes(target)

/** どちらが近づいてもスナップ */
export const either: SnapStrategy = (source, target, dragContainers) =>
  dragContainers.includes(source) || dragContainers.includes(target)

// --- SnapConnection ---

export type SnapConnectionConfig = {
  source: Container
  sourcePosition: Position
  target: Container
  targetPosition: Position
  workspace: Workspace
  snapDistance?: number
  strategy?: SnapStrategy
  validator?: ConnectionValidator
  priority?: number
}

export type CreateSnapConnectionsConfig<T> = {
  workspace: Workspace
  items: readonly T[]
  sourceContainer: (item: T) => Container | null | undefined
  sourcePosition: (item: T) => Position | null | undefined
  targetContainer: (item: T) => Container | null | undefined
  targetPosition: (item: T) => Position | null | undefined
  canConnect?: (args: { source: T; target: T }) => boolean
  snapDistance?: (args: { source: T; target: T }) => number | undefined
  strategy?: (args: { source: T; target: T }) => SnapStrategy | undefined
  validator?: (args: { source: T; target: T }) => ConnectionValidator | undefined
  priority?: (args: { source: T; target: T }) => number | undefined
}

export function createSnapConnections<T>(config: CreateSnapConnectionsConfig<T>): SnapConnection[] {
  const connections: SnapConnection[] = []

  for (const sourceItem of config.items) {
    const source = config.sourceContainer(sourceItem)
    const sourcePosition = config.sourcePosition(sourceItem)
    if (!source || !sourcePosition) continue

    for (const targetItem of config.items) {
      const target = config.targetContainer(targetItem)
      const targetPosition = config.targetPosition(targetItem)
      if (!target || !targetPosition) continue
      if (source === target) continue

      const pair = { source: sourceItem, target: targetItem }
      if (config.canConnect && !config.canConnect(pair)) continue

      connections.push(
        new SnapConnection({
          source,
          sourcePosition,
          target,
          targetPosition,
          workspace: config.workspace,
          snapDistance: config.snapDistance?.(pair),
          strategy: config.strategy?.(pair),
          validator: config.validator?.(pair),
          priority: config.priority?.(pair),
        })
      )
    }
  }

  return connections
}

/**
 * スナップ接続の状態管理を統合するクラス。
 * snap() + SnapStrategy + Parent/Children 管理 + イベント発火をまとめる。
 */
export class SnapConnection {
  readonly id: string
  readonly source: Container
  readonly sourcePosition: Position
  readonly target: Container
  readonly targetPosition: Position
  readonly workspace: Workspace
  readonly snapDistance: number
  readonly strategy: SnapStrategy
  readonly validator?: ConnectionValidator
  readonly priority: number

  private _locked = false
  private _hasFailed = false
  private _destroyed = false
  private _inProximity = false
  private _lastDragContainers: Container[] = []
  private readonly minDetachDistance = 4
  private readonly detachDistanceRatio = 0.2

  constructor(config: SnapConnectionConfig) {
    this.id = generateId('snap')
    this.source = config.source
    this.sourcePosition = config.sourcePosition
    this.target = config.target
    this.targetPosition = config.targetPosition
    this.workspace = config.workspace
    this.snapDistance = config.snapDistance ?? 50
    this.strategy = config.strategy ?? childOnly
    this.validator = config.validator
    this.priority = config.priority ?? 0
  }

  get locked(): boolean {
    return this._locked
  }

  get destroyed(): boolean {
    return this._destroyed
  }

  destroy(): void {
    if (this._destroyed) return
    this.clearProximity()
    this._destroyed = true
    // 接続中ならクリア（locked状態に依存せず実際の参照で判定）
    this.detachFromTarget('destroy')
    this._locked = false
  }

  /** 拡大距離でスナップを試行（NestingZone競合時のフォールバック用） */
  forceSnap(mouseState: getMouseState, customDistance: number): boolean {
    if (this._locked || this._destroyed) return false
    if (!this.strategy(this.source, this.target, this._lastDragContainers)) return false
    const snapped = snap(
      this.source,
      this.sourcePosition,
      this.targetPosition,
      mouseState,
      customDistance,
      () => this.onSnap(),
      undefined,
      this.validator
    )
    if (snapped) {
      this._locked = true
      this.clearProximity()
    }
    return snapped
  }

  tick(mouseState: getMouseState, dragContainers: Container[]): void {
    this.detachIfSeparated()

    if (this._locked || this._destroyed) {
      this.clearProximity()
      return
    }

    // mouseup 時に dragContainers が空になるため、ドラッグ中の値を記憶する
    if (dragContainers.length > 0) {
      this._lastDragContainers = dragContainers
    }

    if (!this.strategy(this.source, this.target, this._lastDragContainers)) {
      this.clearProximity()
      return
    }

    if (!this.isConnectionValid()) {
      this.clearProximity()
      return
    }

    // 近接判定
    const distance = getDistance(this.sourcePosition, this.targetPosition)
    if (distance < this.snapDistance && !this._inProximity) {
      this._inProximity = true
      this.workspace.eventBus.emit('proximity', this.source, {
        connectionId: this.id,
        sourcePosition: this.sourcePosition,
        targetPosition: this.targetPosition,
        snapDistance: this.snapDistance,
      })
    } else if (distance >= this.snapDistance && this._inProximity) {
      this.clearProximity()
    }

    const snapped = snap(
      this.source,
      this.sourcePosition,
      this.targetPosition,
      mouseState,
      this.snapDistance,
      () => this.onSnap(),
      () => this.onFail(),
      this.validator
    )
    if (snapped) {
      this._locked = true
      this.clearProximity()
    }
  }

  /**
   * 外部から接続状態にする（初期接続時など）。
   */
  lock(): void {
    if (this._destroyed) return
    this.scrubSourceFromUnexpectedParents(this.target)
    this._locked = true
  }

  unlock(): void {
    this._locked = false
    this._lastDragContainers = []
  }

  private isConnected(): boolean {
    return this.source.Parent === this.target || this.target.Children.has(this.source)
  }

  private scrubSourceFromUnexpectedParents(expectedParent: Container | null): void {
    for (const element of this.workspace.elements) {
      if (!element || typeof element !== 'object' || !('Children' in element)) continue
      if (expectedParent && element === expectedParent) continue
      const maybeParent = element as unknown as { Children?: Set<Container> }
      if (!(maybeParent.Children instanceof Set)) continue
      maybeParent.Children.delete(this.source)
    }

    this.source.Parent = expectedParent
    if (expectedParent) {
      expectedParent.Children.add(this.source)
    }
  }

  private detachFromTarget(reason: 'fail' | 'separated' | 'destroy'): boolean {
    const hasParentLink = this.source.Parent === this.target
    const hasChildLink = this.target.Children.has(this.source)
    if (!hasParentLink && !hasChildLink) return false

    this.scrubSourceFromUnexpectedParents(null)

    // destroy時以外はイベント通知
    if (reason !== 'destroy') {
      this.workspace.eventBus.emit('disconnect', this.source, {
        parent: this.target.id,
        child: this.source.id,
        sourcePosition: this.sourcePosition,
        targetPosition: this.targetPosition,
      })
    }
    return true
  }

  private detachIfSeparated(): void {
    if (this._destroyed) return
    if (!this.isConnected()) return

    const distance = getDistance(this.sourcePosition, this.targetPosition)
    const detachThreshold = Math.max(
      this.minDetachDistance,
      this.snapDistance * this.detachDistanceRatio
    )
    if (distance <= detachThreshold) return

    if (this.detachFromTarget('separated')) {
      this._locked = false
      this._hasFailed = true
      this._lastDragContainers = []
      this.clearProximity()
    }
  }

  private clearProximity(): void {
    if (this._inProximity) {
      this._inProximity = false
      this.workspace.eventBus.emit('proximity-end', this.source, {
        connectionId: this.id,
      })
    }
  }

  private isConnectionValid(): boolean {
    return !this.validator || this.validator()
  }

  private onSnap(): void {
    // 既存の親が別ターゲットなら先に切る（Children残骸を防ぐ）
    const currentParent = this.source.Parent as Container | null
    if (currentParent && currentParent !== this.target) {
      this.workspace.eventBus.emit('disconnect', this.source, {
        parent: currentParent.id,
        child: this.source.id,
      })
    }

    this.scrubSourceFromUnexpectedParents(this.target)
    this.workspace.eventBus.emit('connect', this.source, {
      parent: this.target.id,
      child: this.source.id,
      sourcePosition: this.sourcePosition,
      targetPosition: this.targetPosition,
    })
    this._hasFailed = false
  }

  private onFail(): void {
    if (!this._hasFailed || this.isConnected()) {
      if (this.detachFromTarget('fail')) {
        this._locked = false
      }
      this._hasFailed = true
    }
  }
}
