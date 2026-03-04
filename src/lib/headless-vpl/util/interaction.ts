import type { IPosition } from '../core/Position'
import type Workspace from '../core/Workspace'
import type Container from '../core/Container'
import type Connector from '../core/Connector'
import type Edge from '../core/Edge'
import type { Command } from '../core/History'
import { MoveCommand, BatchCommand } from '../core/commands'
import type { SnapConnection } from './snap'
import type { NestingZone } from './nesting'
import type { EdgeBuilder } from './edgeBuilder'
import type { ResizeState } from './resize'
import type { MarqueeRect } from './marquee'
import type { MouseState } from './mouse'
import { screenToWorld } from './viewport'
import { isCollision } from './collision_detecion'
import { DragAndDrop } from './dnd'
import { isConnectorHit, findEdgeAtPoint } from './edgeBuilder'
import { detectResizeHandle, beginResize, applyResize } from './resize'
import { createMarqueeRect, getElementsInScreenMarquee } from './marquee'
import { snapToGrid } from './snapToGrid'
import { computeAutoPan } from './autoPan'
import { NestCommand } from '../core/commands'

export type InteractionMode = 'idle' | 'panning' | 'dragging' | 'marquee' | 'resizing' | 'edgeBuilding'

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
  connectorHitRadius?: number

  onModeChange?: (mode: InteractionMode, prev: InteractionMode) => void
  onDragEnd?: (containers: Container[], commands: MoveCommand[]) => void
  onNest?: (container: Container, zone: NestingZone) => void
  onUnnest?: (container: Container, zone: NestingZone) => void
  onMarqueeUpdate?: (rect: MarqueeRect | null) => void
  onResizeEnd?: (container: Container, command: MoveCommand | null) => void
  onEdgeSelect?: (edgeId: string | null) => void
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

  // リサイズ状態
  private rState: ResizeState | null = null
  private rStart: { x: number; y: number } | null = null
  private rContainer: Container | null = null

  // グリッドスナップ用の仮想位置
  private gridVirtualPos: { x: number; y: number } | null = null

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
    // UI要素上でのクリックは無視
    if (
      event.target &&
      (event.target as HTMLElement).closest?.('input, textarea, select, button, .toolbar, .status-bar')
    ) {
      this.dragEligible = false
      return
    }

    // 中ボタン → パン
    if (event.button === 1) {
      this.setMode('panning')
      return
    }

    const wm = screenToWorld(screenPos, this.workspace.viewport)

    // Connector ヒット → EdgeBuilder
    const connectors = this.config.connectors?.() ?? []
    const hitRadius = this.config.connectorHitRadius ?? 12
    if (this.config.edgeBuilder) {
      for (const conn of connectors) {
        if (isConnectorHit(wm, conn, hitRadius)) {
          this.config.edgeBuilder.start(conn)
          this.dragEligible = false
          this.setMode('edgeBuilding')
          return
        }
      }
    }

    // Edge ヒット → Edge 選択
    const edgeHit = findEdgeAtPoint(wm, this.workspace.edges)
    if (edgeHit) {
      this.workspace.selection.deselectAll()
      this.selectedEdgeId = edgeHit.id
      this.config.onEdgeSelect?.(edgeHit.id)
      this.dragEligible = false
      return
    }

    // Edge 選択解除
    if (this.selectedEdgeId) {
      this.selectedEdgeId = null
      this.config.onEdgeSelect?.(null)
    }

    // リサイズハンドル
    const containers = this.config.containers()
    for (const c of containers) {
      if (!c.resizable) continue
      const h = detectResizeHandle(wm, c, 10)
      if (h) {
        this.rState = beginResize(h, wm, c)
        this.rStart = { x: c.position.x, y: c.position.y }
        this.rContainer = c
        this.setMode('resizing')
        return
      }
    }

    // コンテナヒットテスト（ネスト済みの子を親より先にチェック）
    const nestingZones = this.config.nestingZones ?? []
    const allNested = nestingZones.flatMap((z) => z.layout.Children as Container[])
    const allHittable = [
      ...allNested.filter((c) => !containers.includes(c)),
      ...containers,
    ]
    const hit = allHittable.find((c) => isCollision(c, wm))

    // ネスト済みコンテナをクリック → アンネスト
    const hitZone = hit ? nestingZones.find((z) => z.isNested(hit)) : null
    if (hit && hitZone) {
      hitZone.unnest(hit)
      this.config.onUnnest?.(hit, hitZone)
      this.workspace.selection.deselectAll()
      this.workspace.selection.select(hit)
      this.dragStarts = new Map()
      this.dragStarts.set(hit.id, { x: hit.position.x, y: hit.position.y })
      this._dragContainers = [hit]
      this.dragEligible = true
      this.gridVirtualPos = { x: hit.position.x, y: hit.position.y }
      this.unlockSnapConnections()
      this.setMode('dragging')
      return
    }

    if (hit) {
      // 選択管理
      if (event.shiftKey) {
        this.workspace.selection.toggleSelect(hit)
      } else if (!hit.selected) {
        this.workspace.selection.deselectAll()
        this.workspace.selection.select(hit)
      }

      // ドラッグ準備
      this.dragStarts = new Map()
      for (const s of this.workspace.selection.getSelection()) {
        this.dragStarts.set(s.id, { x: s.position.x, y: s.position.y })
      }
      this._dragContainers = this.workspace.selection
        .getSelection()
        .filter((s) => containers.includes(s as Container)) as Container[]
      this.dragEligible = true
      this.unlockSnapConnections()

      const ref = this._dragContainers[0] || hit
      this.gridVirtualPos = { x: ref.position.x, y: ref.position.y }
      this.setMode('dragging')
    } else {
      // 空白クリック → マーキー選択
      if (!event.shiftKey) this.workspace.selection.deselectAll()
      this.marqueeOrigin = { x: screenPos.x, y: screenPos.y }
      this.setMode('marquee')
    }
  }

  /**
   * ポインタアップ時に呼ぶ。モードに応じた完了処理を行う。
   */
  handlePointerUp(screenPos: IPosition): void {
    // EdgeBuilder の完了/キャンセル
    if (this.config.edgeBuilder?.active) {
      const wm = screenToWorld(screenPos, this.workspace.viewport)
      const connectors = this.config.connectors?.() ?? []
      const hitRadius = this.config.connectorHitRadius ?? 12
      let found: Connector | null = null
      for (const conn of connectors) {
        if (isConnectorHit(wm, conn, hitRadius) && conn !== this.config.edgeBuilder.startConnector) {
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

    // ネスト判定
    const nestingZones = this.config.nestingZones ?? []
    const activeZone = nestingZones.find((z) => z.hovered)
    if (this._dragContainers.length > 0 && activeZone) {
      const nested = activeZone.hovered!
      this.workspace.history.execute(
        new NestCommand(nested, activeZone.layout, this.workspace, activeZone.insertIndex)
      )
      this.config.onNest?.(nested, activeZone)
    } else if (this._dragContainers.length > 0 && this.dragStarts.size > 0) {
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
      const containers = this.config.containers()
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
      if (this.rStart.x !== this.rContainer.position.x || this.rStart.y !== this.rContainer.position.y) {
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

    // DragAndDrop
    const worldMouse = {
      buttonState,
      mousePosition: screenToWorld(screenPos, this.workspace.viewport),
    }
    this._dragContainers = DragAndDrop(
      this.config.containers(),
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

    // Auto-pan
    if (this._dragContainers.length > 0) {
      const cb = this.config.canvasElement.getBoundingClientRect()
      const ap = computeAutoPan(
        screenPos,
        { x: 0, y: 0, width: cb.width, height: cb.height },
        true
      )
      if (ap.active) this.workspace.panBy(ap.dx, ap.dy)
    }
  }

  /**
   * 現在選択中のEdge IDを返す。
   */
  getSelectedEdgeId(): string | null {
    return this.selectedEdgeId
  }

  destroy(): void {
    this._mode = 'idle'
    this._dragContainers = []
    this.dragStarts = new Map()
    this.rState = null
    this.rContainer = null
    this.gridVirtualPos = null
  }

  private unlockSnapConnections(): void {
    const snapConnections = this.config.snapConnections ?? []
    for (const conn of snapConnections) {
      conn.unlock()
    }
  }
}
