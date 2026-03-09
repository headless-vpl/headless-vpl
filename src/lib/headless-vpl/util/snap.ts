import type Container from '../core/Container'
import type { IPosition } from '../core/Position'
import type Position from '../core/Position'
import type Workspace from '../core/Workspace'
import { generateId } from '../core/types'
import { getDistance } from './distance'
import { type getMouseState, getPositionDelta } from './mouse'

/**
 * 接続バリデーター。snap の前に呼ばれ、false を返すと接続を拒否する。
 */
export type ConnectionValidator = () => boolean

export type SnapRelationDetachReason = 'fail' | 'separated' | 'destroy'

export type SnapAttachment = {
  source: Container
  sourcePosition: Position
  target: Container
  targetPosition: Position
  workspace: Workspace
}

export type SnapHitTarget = {
  hitRadius?: number
}

export function computeSnapDistance(sourcePosition: IPosition, targetPosition: IPosition): number {
  return getDistance(sourcePosition, targetPosition)
}

export function isWithinSnapDistance(
  sourcePosition: IPosition,
  targetPosition: IPosition,
  snapDistance: number
): boolean {
  return computeSnapDistance(sourcePosition, targetPosition) < snapDistance
}

export function computeSnapDelta(sourcePosition: IPosition, targetPosition: IPosition): IPosition {
  return getPositionDelta(sourcePosition, targetPosition)
}

export function computeConnectorSnapDistance(
  source: SnapHitTarget,
  target: SnapHitTarget,
  fallbackHitRadius = 12
): number {
  return (source.hitRadius ?? fallbackHitRadius) + (target.hitRadius ?? fallbackHitRadius)
}

export function canSnap(mouseState: getMouseState, validator?: ConnectionValidator): boolean {
  if (mouseState.buttonState.leftButton !== 'up') {
    return false
  }
  return !validator || validator()
}

export function applySnapDelta(source: Container, delta: IPosition): void {
  source.move(source.position.x - delta.x, source.position.y - delta.y)
}

export function isSnapConnectionActive(source: Container, target: Container): boolean {
  return source.Parent === target || target.Children.has(source)
}

function scrubSourceFromUnexpectedParents(
  source: Container,
  workspace: Workspace,
  expectedParent: Container | null
): void {
  for (const element of workspace.elements) {
    if (!element || typeof element !== 'object' || !('Children' in element)) continue
    if (expectedParent && element === expectedParent) continue
    const maybeParent = element as { Children?: Set<Container> }
    if (!(maybeParent.Children instanceof Set)) continue
    maybeParent.Children.delete(source)
  }

  source.Parent = expectedParent
  if (expectedParent) {
    expectedParent.Children.add(source)
  }
}

export function attachSnapRelation({
  source,
  sourcePosition,
  target,
  targetPosition,
  workspace,
}: SnapAttachment): void {
  const currentParent = source.Parent as Container | null
  if (currentParent && currentParent !== target) {
    workspace.eventBus.emit('disconnect', source, {
      parent: currentParent.id,
      child: source.id,
    })
  }

  scrubSourceFromUnexpectedParents(source, workspace, target)
  workspace.eventBus.emit('connect', source, {
    parent: target.id,
    child: source.id,
    sourcePosition,
    targetPosition,
  })
}

export function detachSnapRelation(
  attachment: SnapAttachment,
  reason: SnapRelationDetachReason
): boolean {
  const { source, sourcePosition, target, targetPosition, workspace } = attachment
  const hasParentLink = source.Parent === target
  const hasChildLink = target.Children.has(source)
  if (!hasParentLink && !hasChildLink) return false

  scrubSourceFromUnexpectedParents(source, workspace, null)

  if (reason !== 'destroy') {
    workspace.eventBus.emit('disconnect', source, {
      parent: target.id,
      child: source.id,
      sourcePosition,
      targetPosition,
    })
  }
  return true
}

/**
 * 指定されたソースとターゲットのコネクタ間で、ソースコンテナを動かしてスナップを試みます。
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
  if (mouseState.buttonState.leftButton !== 'up') {
    return false
  }

  if (validator && !validator()) {
    onFail?.()
    return false
  }

  if (!isWithinSnapDistance(sourcePosition, targetPosition, snapDistance)) {
    onFail?.()
    return false
  }

  applySnapDelta(source, computeSnapDelta(sourcePosition, targetPosition))
  onSnap?.()
  return true
}

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
 * スナップ接続の状態管理を統合する helper。
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
    detachSnapRelation(this.getAttachment(), 'destroy')
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

    const distance = computeSnapDistance(this.sourcePosition, this.targetPosition)
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
    scrubSourceFromUnexpectedParents(this.source, this.workspace, this.target)
    this._locked = true
  }

  unlock(): void {
    this._locked = false
    this._lastDragContainers = []
  }

  private getAttachment(): SnapAttachment {
    return {
      source: this.source,
      sourcePosition: this.sourcePosition,
      target: this.target,
      targetPosition: this.targetPosition,
      workspace: this.workspace,
    }
  }

  private detachIfSeparated(): void {
    if (this._destroyed) return
    if (!isSnapConnectionActive(this.source, this.target)) return

    const distance = computeSnapDistance(this.sourcePosition, this.targetPosition)
    const detachThreshold = Math.max(
      this.minDetachDistance,
      this.snapDistance * this.detachDistanceRatio
    )
    if (distance <= detachThreshold) return

    if (detachSnapRelation(this.getAttachment(), 'separated')) {
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
    attachSnapRelation(this.getAttachment())
    this._hasFailed = false
  }

  private onFail(): void {
    if (!this._hasFailed || isSnapConnectionActive(this.source, this.target)) {
      if (detachSnapRelation(this.getAttachment(), 'fail')) {
        this._locked = false
      }
      this._hasFailed = true
    }
  }
}
