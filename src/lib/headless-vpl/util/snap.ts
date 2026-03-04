import { Container, getDistance, Position } from '../../headless-vpl'
import { getPositionDelta, getMouseState } from './mouse'
import Workspace from '../core/Workspace'

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
  snapDistance: number = 50,
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
}

/**
 * スナップ接続の状態管理を統合するクラス。
 * snap() + SnapStrategy + Parent/Children 管理 + イベント発火をまとめる。
 */
export class SnapConnection {
  readonly source: Container
  readonly sourcePosition: Position
  readonly target: Container
  readonly targetPosition: Position
  readonly workspace: Workspace
  readonly snapDistance: number
  readonly strategy: SnapStrategy
  readonly validator?: ConnectionValidator

  private _locked = false
  private _hasFailed = false
  private _destroyed = false
  private _lastDragContainers: Container[] = []

  constructor(config: SnapConnectionConfig) {
    this.source = config.source
    this.sourcePosition = config.sourcePosition
    this.target = config.target
    this.targetPosition = config.targetPosition
    this.workspace = config.workspace
    this.snapDistance = config.snapDistance ?? 50
    this.strategy = config.strategy ?? childOnly
    this.validator = config.validator
  }

  get locked(): boolean {
    return this._locked
  }

  get destroyed(): boolean {
    return this._destroyed
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    // 接続中ならクリア
    if (this._locked) {
      this.source.Parent = null
      this.target.Children = null
      this.workspace.eventBus.emit('disconnect', this.source, {
        parent: this.target.id,
        child: this.source.id,
      })
    }
    this._locked = false
  }

  tick(mouseState: getMouseState, dragContainers: Container[]): void {
    if (this._locked || this._destroyed) return

    // mouseup 時に dragContainers が空になるため、ドラッグ中の値を記憶する
    if (dragContainers.length > 0) {
      this._lastDragContainers = dragContainers
    }

    if (!this.strategy(this.source, this.target, this._lastDragContainers)) return

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
    if (snapped) this._locked = true
  }

  unlock(): void {
    this._locked = false
    this._lastDragContainers = []
  }

  private onSnap(): void {
    this.source.Parent = this.target
    this.target.Children = this.source
    this.workspace.eventBus.emit('connect', this.source, {
      parent: this.target.id,
      child: this.source.id,
    })
    this._hasFailed = false
  }

  private onFail(): void {
    if (!this._hasFailed) {
      if (this.source.Parent) {
        this.workspace.eventBus.emit('disconnect', this.source, {
          parent: this.target.id,
          child: this.source.id,
        })
      }
      this.source.Parent = null
      this.target.Children = null
      this._hasFailed = true
    }
  }
}
