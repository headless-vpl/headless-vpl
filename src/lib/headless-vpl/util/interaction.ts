import type Connector from '../core/Connector'
import type Container from '../core/Container'
import type { IPosition } from '../core/Position'
import type Workspace from '../core/Workspace'
import { BatchCommand, MoveCommand, NestCommand } from '../core/commands'
import { computeAutoPan } from './autoPan'
import { collectConnectedChain } from './blockStack'
import { getDistance } from './distance'
import { DragAndDrop } from './dnd'
import { isConnectorHit } from './edgeBuilder'
import type { EdgeBuilder } from './edgeBuilder'
import {
  arbitrateHoveredNestingZones,
  getOrderedSnapCandidates,
  selectBestNestingZone,
} from './interactionArbitration'
import {
  resolvePointerIntent,
  findTopmostContainerAt as resolveTopmostContainerAt,
} from './interactionTargets'
import type { MarqueeRect } from './marquee'
import { createMarqueeRect, getElementsInScreenMarquee } from './marquee'
import type { MouseState, getMouseState } from './mouse'
import type { NestingZone } from './nesting'
import type { ResizeState } from './resize'
import { applyResize, beginResize, detectResizeHandle } from './resize'
import type { SnapConnection } from './snap'
import { snapToGrid } from './snapToGrid'
import { screenToWorld } from './viewport'

export type InteractionMode =
  | 'idle'
  | 'panning'
  | 'dragging'
  | 'marquee'
  | 'resizing'
  | 'edgeBuilding'

export type InteractionConfig = {
  workspace: Workspace
  canvasElement: HTMLElement
  containers: () => Container[]
  connectors?: () => Connector[]
  snapConnections?: SnapConnection[]
  nestingZones?: NestingZone[]
  edgeBuilder?: EdgeBuilder
  snapToGrid?: () => boolean
  gridSize?: number
  onModeChange?: (mode: InteractionMode, prev: InteractionMode) => void
  onDragEnd?: (containers: Container[], commands: MoveCommand[]) => void
  onNest?: (container: Container, zone: NestingZone) => void
  onUnnest?: (container: Container, zone: NestingZone) => void
  onMarqueeUpdate?: (rect: MarqueeRect | null) => void
  onResizeEnd?: (container: Container, command: MoveCommand | null) => void
  onEdgeSelect?: (edgeId: string | null) => void
  onHover?: (container: Container | null) => void
  onContainerPointerDown?: (container: Container) => void
  isContainerVisible?: (container: Container) => boolean
  isConnectorVisible?: (connector: Connector) => boolean
  isContainerLocked?: (container: Container) => boolean
}

type PendingUnnest = {
  container: Container
  zone: NestingZone
  insertIndex: number
}

/**
 * VPL のインタラクション状態を統合管理するステートマシン。
 * mousedown/mouseup/tick の3メソッドで全モードを制御する。
 */
export class InteractionManager {
  private config: InteractionConfig
  private workspace: Workspace

  private _mode: InteractionMode = 'idle'
  private _dragContainers: Container[] = []
  private dragEligible = false
  private dragStarts = new Map<string, { x: number; y: number }>()
  private prevMouse = { x: 0, y: 0 }
  private marqueeOrigin = { x: 0, y: 0 }
  private selectedEdgeId: string | null = null
  private _disableDrag = false
  private _disableEdgeBuilder = false

  // リサイズ状態
  private rState: ResizeState | null = null
  private rStart: { x: number; y: number } | null = null
  private rContainer: Container | null = null

  // グリッドスナップ用の仮想位置
  private gridVirtualPos: { x: number; y: number } | null = null
  private dragPointerStart: IPosition | null = null
  private pendingUnnest: PendingUnnest | null = null

  constructor(config: InteractionConfig) {
    this.config = config
    this.workspace = config.workspace
  }

  get mode(): InteractionMode {
    return this._mode
  }

  get dragContainers(): readonly Container[] {
    return this._dragContainers
  }

  get marqueeRect(): MarqueeRect | null {
    if (this._mode !== 'marquee') return null
    return createMarqueeRect(this.marqueeOrigin, this.prevMouse)
  }

  private setMode(mode: InteractionMode): void {
    if (this._mode === mode) return
    const prev = this._mode
    this._mode = mode
    this.config.onModeChange?.(mode, prev)
  }

  /**
   * ポインタダウン時に呼ぶ。モードを判定して遷移する。
   */
  handlePointerDown(
    screenPos: IPosition,
    event: { button: number; shiftKey: boolean; target?: EventTarget | null }
  ): void {
    const nestingZones = this.config.nestingZones ?? []
    const visibleContainers = this.getVisibleContainers()
    const pointerIntent = resolvePointerIntent({
      screenPos,
      button: event.button,
      target: event.target,
      viewport: this.workspace.viewport,
      connectors: this.config.connectors?.() ?? [],
      edges: this.workspace.edges,
      containers: visibleContainers,
      nestingZones,
      isContainerLocked: (container) => this.isContainerLocked(container),
      isConnectorVisible: (connector) => this.isConnectorVisible(connector),
    })

    if (
      pointerIntent.kind !== 'edge' &&
      pointerIntent.kind !== 'ignore' &&
      pointerIntent.kind !== 'pan' &&
      this.selectedEdgeId
    ) {
      this.selectedEdgeId = null
      this.config.onEdgeSelect?.(null)
    }

    switch (pointerIntent.kind) {
      case 'ignore':
        this.dragEligible = false
        return

      case 'pan':
        this.setMode('panning')
        return

      case 'connector': {
        if (this._disableEdgeBuilder || !this.config.edgeBuilder) {
          const selection = this.workspace.selection
          if (event.shiftKey) {
            selection.toggleSelect(pointerIntent.connector)
          } else {
            selection.deselectAll()
            selection.select(pointerIntent.connector)
          }
          this.dragEligible = false
          this.pendingUnnest = null
          return
        }
        this.config.edgeBuilder.start(pointerIntent.connector)
        this.dragEligible = false
        this.pendingUnnest = null
        this.setMode('edgeBuilding')
        return
      }

      case 'edge':
        this.workspace.selection.deselectAll()
        this.selectedEdgeId = pointerIntent.edge.id
        this.config.onEdgeSelect?.(pointerIntent.edge.id)
        this.dragEligible = false
        this.pendingUnnest = null
        return

      case 'resize': {
        const worldMouse = screenToWorld(screenPos, this.workspace.viewport)
        const handle = detectResizeHandle(worldMouse, pointerIntent.container, 10)
        if (!handle) return
        this.config.onContainerPointerDown?.(pointerIntent.container)
        this.rState = beginResize(handle, worldMouse, pointerIntent.container)
        this.rStart = {
          x: pointerIntent.container.position.x,
          y: pointerIntent.container.position.y,
        }
        this.rContainer = pointerIntent.container
        this.setMode('resizing')
        return
      }

      case 'nested-container': {
        const hit = pointerIntent.container
        const hitZone = pointerIntent.zone
        if (this.isContainerLocked(hit)) {
          this.pendingUnnest = null
          this.workspace.selection.deselectAll()
          this.workspace.selection.select(hit)
          return
        }
        this.pendingUnnest = this._disableDrag
          ? null
          : {
              container: hit,
              zone: hitZone,
              insertIndex: Math.max(0, hitZone.layout.Children.indexOf(hit)),
            }
        this.config.onContainerPointerDown?.(hit)
        this.workspace.selection.deselectAll()
        this.workspace.selection.select(hit)
        if (!this._disableDrag) {
          this.dragStarts = new Map()
          this.dragStarts.set(hit.id, { x: hit.position.x, y: hit.position.y })
          this._dragContainers = [hit]
          this.dragEligible = true
          this.gridVirtualPos = { x: hit.position.x, y: hit.position.y }
          this.dragPointerStart = { x: screenPos.x, y: screenPos.y }
          this.unlockSnapConnections()
          this.setMode('dragging')
        }
        return
      }

      case 'container': {
        const hit = pointerIntent.container
        this.pendingUnnest = null
        this.config.onContainerPointerDown?.(hit)

        if (event.shiftKey) {
          this.workspace.selection.toggleSelect(hit)
        } else if (!hit.selected) {
          this.workspace.selection.deselectAll()
          this.workspace.selection.select(hit)
        }

        if (!this._disableDrag && !this.isContainerLocked(hit)) {
          this.dragStarts = new Map()
          for (const selection of this.workspace.selection.getSelection()) {
            this.dragStarts.set(selection.id, {
              x: selection.position.x,
              y: selection.position.y,
            })
          }
          this._dragContainers = this.workspace.selection
            .getSelection()
            .filter((selection) =>
              visibleContainers.includes(selection as Container)
            ) as Container[]
          this.dragEligible = true
          this.unlockSnapConnections()

          const ref = this._dragContainers[0] || hit
          this.gridVirtualPos = { x: ref.position.x, y: ref.position.y }
          this.dragPointerStart = { x: screenPos.x, y: screenPos.y }
          this.setMode('dragging')
        }
        return
      }

      case 'empty':
        this.pendingUnnest = null
        if (!event.shiftKey) this.workspace.selection.deselectAll()
        this.marqueeOrigin = { x: screenPos.x, y: screenPos.y }
        this.setMode('marquee')
        return
    }
  }

  /**
   * ポインタアップ時に呼ぶ。モードに応じた完了処理を行う。
   */
  handlePointerUp(screenPos: IPosition): void {
    // EdgeBuilder の完了/キャンセル
    if (this.config.edgeBuilder?.active) {
      const wm = screenToWorld(screenPos, this.workspace.viewport)
      const connectors = (this.config.connectors?.() ?? []).filter((conn) =>
        this.isConnectorVisible(conn)
      )
      let found: Connector | null = null
      for (const conn of connectors) {
        if (isConnectorHit(wm, conn) && conn !== this.config.edgeBuilder.startConnector) {
          found = conn
          break
        }
      }
      if (found) {
        this.config.edgeBuilder.complete(found)
      } else {
        this.config.edgeBuilder.cancel()
      }
    }

    // 移動判定
    const hasMoved = this.hasEffectiveDragMovement(screenPos)

    const nestingZones = this.config.nestingZones ?? []
    const hoveredZonesUp = nestingZones.filter((z) => z.hovered)
    const activeZone =
      hoveredZonesUp.length > 1
        ? selectBestNestingZone(hoveredZonesUp)
        : (hoveredZonesUp[0] ?? null)
    const snapConnections = this.config.snapConnections ?? []
    const bestSnapCandidate = getOrderedSnapCandidates(
      this._dragContainers as Container[],
      snapConnections,
      true
    )[0]

    // SnapConnectionのスナップ判定（priorityがNestingZone以上のときのみ先に評価）
    let snapped = false
    const worldMouse: getMouseState = {
      buttonState: { leftButton: 'up', middleButton: 'up' },
      mousePosition: screenToWorld(screenPos, this.workspace.viewport),
    }
    const shouldTrySnap =
      !activeZone || !bestSnapCandidate || bestSnapCandidate.priority >= activeZone.priority

    let restoredUnnest = false
    if (!hasMoved && this.pendingUnnest) {
      restoredUnnest = this.restorePendingUnnest()
    }

    if (this._dragContainers.length > 0 && hasMoved && shouldTrySnap) {
      const prevLocked = new Set(snapConnections.filter((connection) => connection.locked))
      const candidates = getOrderedSnapCandidates(
        this._dragContainers as Container[],
        snapConnections,
        true
      )
      for (const connection of candidates) {
        connection.tick(worldMouse, this._dragContainers as Container[])
        if (connection.locked && !prevLocked.has(connection)) {
          snapped = true
          break
        }
      }
    }

    // ネスト判定（スナップ成功時はスキップ）
    console.debug('[InteractionManager] handlePointerUp nesting check:', {
      nestingZonesCount: nestingZones.length,
      hoveredZones: hoveredZonesUp.map((z) => ({ target: z.target.id, hovered: z.hovered?.id })),
      dragContainersCount: this._dragContainers.length,
      hasMoved,
      snapped,
      restoredUnnest,
    })
    if (!restoredUnnest && !snapped && this._dragContainers.length > 0 && activeZone && hasMoved) {
      const nested = activeZone.hovered
      if (nested) {
        const chain = collectConnectedChain(nested).filter(
          (container) => !activeZone.layout.Children.includes(container)
        )
        console.debug('[NestingZone] nest:', {
          nested: nested.id,
          chain: chain.map((c) => c.id),
          zone: activeZone.target.id,
          layoutPos: activeZone.layout.absolutePosition,
          draggedPos: { x: nested.position.x, y: nested.position.y },
          insertIndex: activeZone.insertIndex,
        })

        const nestCommands: NestCommand[] = []
        let insertIndex = activeZone.insertIndex
        for (const container of chain) {
          nestCommands.push(
            new NestCommand(container, activeZone.layout, this.workspace, insertIndex)
          )
          insertIndex += 1
        }

        if (nestCommands.length === 1) {
          this.workspace.history.execute(nestCommands[0])
        } else if (nestCommands.length > 1) {
          this.workspace.history.execute(new BatchCommand(nestCommands))
        }

        this.config.onNest?.(nested, activeZone)
      }
    } else if (!restoredUnnest && this._dragContainers.length > 0 && this.dragStarts.size > 0) {
      // MoveCommand 記録
      const cmds: MoveCommand[] = []
      for (const c of this._dragContainers) {
        const s = this.dragStarts.get(c.id)
        if (s && (s.x !== c.position.x || s.y !== c.position.y)) {
          cmds.push(new MoveCommand(c, s.x, s.y, c.position.x, c.position.y))
        }
      }
      if (cmds.length > 0) {
        this.workspace.history.execute(new BatchCommand(cmds))
      }
      this.config.onDragEnd?.(this._dragContainers, cmds)
    }

    // マーキー完了
    if (this._mode === 'marquee') {
      const containers = this.getVisibleContainers()
      const elems = containers.map((c) => ({
        id: c.id,
        position: c.position,
        width: c.width,
        height: c.height,
      }))
      const selected = getElementsInScreenMarquee(
        elems,
        this.marqueeOrigin,
        screenPos,
        this.workspace.viewport,
        'full'
      )
      for (const h of selected) {
        const c = containers.find((x) => x.id === h.id)
        if (c) this.workspace.selection.select(c)
      }
      this.config.onMarqueeUpdate?.(null)
    }

    // リサイズ完了
    if (this.rState && this.rContainer && this.rStart) {
      let cmd: MoveCommand | null = null
      if (
        this.rStart.x !== this.rContainer.position.x ||
        this.rStart.y !== this.rContainer.position.y
      ) {
        cmd = new MoveCommand(
          this.rContainer,
          this.rStart.x,
          this.rStart.y,
          this.rContainer.position.x,
          this.rContainer.position.y
        )
        this.workspace.history.execute(cmd)
      }
      this.config.onResizeEnd?.(this.rContainer, cmd)
    }

    // 全状態リセット
    this.dragEligible = false
    this._dragContainers = []
    this.dragStarts = new Map()
    this.rState = null
    this.rStart = null
    this.rContainer = null
    this.gridVirtualPos = null
    this.dragPointerStart = null
    this.pendingUnnest = null
    this.setMode('idle')
  }

  /**
   * animate ループ内で毎フレーム呼ぶ。
   * screenPos はスクリーン座標のマウス位置。
   * buttonState は現在のマウスボタン状態。
   */
  tick(screenPos: IPosition, buttonState: MouseState): void {
    const delta = {
      x: screenPos.x - this.prevMouse.x,
      y: screenPos.y - this.prevMouse.y,
    }
    this.prevMouse = { x: screenPos.x, y: screenPos.y }

    if (this._mode === 'panning' && buttonState.middleButton === 'down') {
      this.workspace.panBy(delta.x, delta.y)
      return
    }

    if (this._mode === 'resizing' && this.rState && this.rContainer) {
      const wm = screenToWorld(screenPos, this.workspace.viewport)
      const b = applyResize(wm, this.rState, {
        minWidth: this.rContainer.minWidth || 10,
        maxWidth: this.rContainer.maxWidth,
        minHeight: this.rContainer.minHeight || 10,
        maxHeight: this.rContainer.maxHeight,
      })
      this.rContainer.move(b.x, b.y)
      this.rContainer.width = b.width
      this.rContainer.height = b.height
      this.rContainer.update()
      return
    }

    if (this._mode === 'marquee' && buttonState.leftButton === 'down') {
      const r = createMarqueeRect(this.marqueeOrigin, screenPos)
      this.config.onMarqueeUpdate?.(r)
      return
    }

    if (this._mode === 'edgeBuilding' && this.config.edgeBuilder?.active) {
      const wm = screenToWorld(screenPos, this.workspace.viewport)
      this.config.edgeBuilder.update(wm)
      return
    }

    // ホバー検出（idle時のみ）
    if (this._mode === 'idle' && this.config.onHover) {
      const wm = screenToWorld(screenPos, this.workspace.viewport)
      const hovered = this.findTopmostContainerAt(wm)
      this.config.onHover(hovered)
    }

    // ドラッグ or アイドル
    const sc = this.workspace.viewport.scale
    let wd = { x: delta.x / sc, y: delta.y / sc }

    // グリッドスナップ
    if (this.config.snapToGrid?.() && this._dragContainers.length > 0 && this.gridVirtualPos) {
      const gridSize = this.config.gridSize ?? 24
      this.gridVirtualPos.x += wd.x
      this.gridVirtualPos.y += wd.y
      const snapped = snapToGrid(this.gridVirtualPos, gridSize)
      const ref = this._dragContainers[0]
      wd = { x: snapped.x - ref.position.x, y: snapped.y - ref.position.y }
    }

    // DragAndDrop（AutoLayoutにネスト中のコンテナを除外）
    const worldMouse = {
      buttonState,
      mousePosition: screenToWorld(screenPos, this.workspace.viewport),
    }
    if (
      this.pendingUnnest &&
      buttonState.leftButton === 'down' &&
      this.hasEffectiveDragMovement(screenPos)
    ) {
      this.activatePendingUnnest()
    }
    const nestingZonesForDnd = this.config.nestingZones ?? []
    const nestedInLayouts = new Set(
      nestingZonesForDnd.flatMap((z) => z.layout.Children as Container[])
    )
    const dndContainers = this.getVisibleContainers().filter(
      (c) => !nestedInLayouts.has(c) && !this.isContainerLocked(c)
    )
    this._dragContainers = DragAndDrop(
      dndContainers,
      wd,
      worldMouse,
      this.dragEligible,
      this._dragContainers as Container[],
      false
    )

    // SnapConnection
    const snapConnections = this.config.snapConnections ?? []
    for (const conn of snapConnections) {
      conn.tick(worldMouse, this._dragContainers as Container[])
    }

    // NestingZone
    const nestingZones = this.config.nestingZones ?? []
    for (const zone of nestingZones) {
      zone.detectHover(this._dragContainers as Container[])
    }
    const hoveredZones = nestingZones.filter((z) => z.hovered)
    if (this._dragContainers.length > 0 && nestingZones.length > 0 && hoveredZones.length > 0) {
      console.debug('[InteractionManager] tick: zone hovered', {
        zones: nestingZones.map((z) => ({ target: z.target.id, hovered: z.hovered?.id })),
      })
    }
    arbitrateHoveredNestingZones(this._dragContainers as Container[], nestingZones, snapConnections)

    // Auto-pan
    if (this._dragContainers.length > 0) {
      const cb = this.config.canvasElement.getBoundingClientRect()
      const ap = computeAutoPan(screenPos, { x: 0, y: 0, width: cb.width, height: cb.height }, true)
      if (ap.active) this.workspace.panBy(ap.dx, ap.dy)
    }
  }

  /**
   * 現在選択中のEdge IDを返す。
   */
  getSelectedEdgeId(): string | null {
    return this.selectedEdgeId
  }

  setDisableDrag(disabled: boolean): void {
    this._disableDrag = disabled
  }

  setDisableEdgeBuilder(disabled: boolean): void {
    this._disableEdgeBuilder = disabled
  }

  setEdgeBuilder(builder: EdgeBuilder | undefined): void {
    this.config.edgeBuilder = builder
  }

  setNestingZones(zones: NestingZone[]): void {
    this.config.nestingZones = zones
  }

  destroy(): void {
    this._mode = 'idle'
    this._dragContainers = []
    this.dragStarts = new Map()
    this.rState = null
    this.rContainer = null
    this.gridVirtualPos = null
    this.dragPointerStart = null
    this.pendingUnnest = null
    this._disableDrag = false
    this._disableEdgeBuilder = false
  }

  private unlockSnapConnections(): void {
    const snapConnections = this.config.snapConnections ?? []
    for (const conn of snapConnections) {
      // 子(source)を直接ドラッグする場合のみunlockする。
      // 親(target)ドラッグ時はロック維持し、中途半端な「接続は残るがlock解除」状態を避ける。
      const srcDragged = this._dragContainers.includes(conn.source)
      if (srcDragged) {
        conn.unlock()
      }
    }
  }

  private hasDragPositionChanged(epsilon = 0.5): boolean {
    return this._dragContainers.some((container) => {
      const start = this.dragStarts.get(container.id)
      if (!start) return false
      return (
        Math.abs(start.x - container.position.x) > epsilon ||
        Math.abs(start.y - container.position.y) > epsilon
      )
    })
  }

  private hasEffectiveDragMovement(screenPos: IPosition): boolean {
    if (this.hasDragPositionChanged()) return true
    if (!this.dragPointerStart) return false
    return getDistance(screenPos, this.dragPointerStart) >= 4
  }

  private restorePendingUnnest(): boolean {
    const pending = this.pendingUnnest
    if (!pending) return false

    const chain = collectConnectedChain(pending.container).filter(
      (container) => !pending.zone.layout.Children.includes(container)
    )
    if (chain.length === 0) return false

    let insertIndex = Math.min(pending.insertIndex, pending.zone.layout.Children.length)
    for (const container of chain) {
      pending.zone.nest(container, insertIndex)
      insertIndex += 1
    }

    this.config.onNest?.(pending.container, pending.zone)
    return true
  }

  private activatePendingUnnest(): boolean {
    const pending = this.pendingUnnest
    if (!pending) return false
    if (!pending.zone.isNested(pending.container)) return false

    const unnested = pending.zone.unnest(pending.container)
    if (!unnested) return false

    this.config.onUnnest?.(pending.container, pending.zone)
    return true
  }

  private findTopmostContainerAt(worldPos: IPosition): Container | null {
    return resolveTopmostContainerAt(worldPos, this.getVisibleContainers())
  }

  private getVisibleContainers(): Container[] {
    return this.config
      .containers()
      .filter((container) => this.config.isContainerVisible?.(container) ?? true)
  }

  private isConnectorVisible(connector: Connector): boolean {
    return this.config.isConnectorVisible?.(connector) ?? true
  }

  private isContainerLocked(container: Container): boolean {
    return this.config.isContainerLocked?.(container) ?? false
  }
}
