import { useCallback, useEffect, useRef, useState } from 'react'
import { VplCanvas } from '../../VplCanvas'
import type { VplCanvasHandle } from '../../VplCanvas'
import { useFactory } from '../../../contexts/FactoryContext'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { CanvasToolbar } from './CanvasToolbar'
import { MoveGizmo } from './MoveGizmo'
import {
  AutoLayout,
  Connector,
  Container,
  Edge,
  EdgeBuilder,
  NestingZone,
  Position,
  RemoveCommand,
  findNearestConnector,
} from '../../../lib/headless-vpl'

type CanvasNodeData = { id: string; name: string; w: number; h: number; color: string }

type FactoryCanvasProps = {
  onWorkspaceReady: (args: {
    workspace: ReturnType<typeof useWorkspace>['workspaceRef']['current']
    containers: Container[]
    connectors: Connector[]
    interaction: ReturnType<typeof useWorkspace>['interactionRef']['current']
    containersRef: React.RefObject<Container[]>
    connectorsRef: React.RefObject<Connector[]>
    svgRef: React.RefObject<SVGSVGElement | null>
    overlayRef: React.RefObject<HTMLDivElement | null>
    canvasRef: React.RefObject<HTMLDivElement | null>
  }) => void
}

export function FactoryCanvas({ onWorkspaceReady }: FactoryCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [nodes, setNodes] = useState<CanvasNodeData[]>([])
  const nestingZonesRef = useRef<NestingZone[]>([])
  const { showGrid, showDebugSvg, placementMode, setPlacementMode, setSelectedElement, selectedElement, workspace: ctxWorkspace, toolMode, syncState } = useFactory()

  // placementModeの最新値をrefで保持（useEffect内のクロージャから参照）
  const placementModeRef = useRef(placementMode)
  placementModeRef.current = placementMode

  const { workspaceRef, containersRef, connectorsRef, interactionRef, ready } = useWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: true,
      interactionOverrides: { nestingZones: nestingZonesRef.current },
      onTick: () => {
        // ノード状態を定期同期
      },
    }
  )

  // ワークスペース準備完了時にFactoryProviderに通知
  const notified = useRef(false)
  useEffect(() => {
    if (!ready || notified.current) return
    notified.current = true
    onWorkspaceReady({
      workspace: workspaceRef.current,
      containers: containersRef.current,
      connectors: connectorsRef.current,
      interaction: interactionRef.current,
      containersRef,
      connectorsRef,
      svgRef,
      overlayRef,
      canvasRef,
    })
  }, [ready, onWorkspaceReady, workspaceRef, containersRef, connectorsRef, interactionRef])

  // SVGオーバーレイの表示切替
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    overlay.style.opacity = showDebugSvg ? '1' : '0'
  }, [showDebugSvg])

  // ツールモード連動: move モードではドラッグとEdgeBuilderを無効化
  useEffect(() => {
    const isMoveMode = toolMode === 'move'
    interactionRef.current?.setDisableDrag(isMoveMode)
    interactionRef.current?.setDisableEdgeBuilder(isMoveMode)
  }, [toolMode, interactionRef])

  // EdgeBuilder
  const edgeBuilderInitialized = useRef(false)
  useEffect(() => {
    if (!ready || edgeBuilderInitialized.current) return
    const ws = workspaceRef.current
    const svg = svgRef.current
    if (!ws || !svg) return
    edgeBuilderInitialized.current = true

    const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    previewPath.setAttribute('fill', 'none')
    previewPath.setAttribute('stroke', 'rgba(59,130,246,0.6)')
    previewPath.setAttribute('stroke-width', '2')
    previewPath.setAttribute('stroke-dasharray', '6 3')
    previewPath.setAttribute('display', 'none')
    const vg = svg.querySelector('[data-role="viewport"]') as SVGGElement
    if (vg) vg.appendChild(previewPath)

    new EdgeBuilder({
      workspace: ws,
      edgeType: 'bezier',
      onPreview: (path) => {
        previewPath.setAttribute('d', path)
        previewPath.setAttribute('display', 'block')
      },
      onComplete: (edge) => {
        previewPath.setAttribute('display', 'none')
        ws.removeEdge(edge)
        ws.history.execute({
          execute() { ws.addEdge(edge) },
          undo() { ws.removeEdge(edge) },
        })
        syncState()
      },
      onCancel: () => {
        previewPath.setAttribute('display', 'none')
      },
    })
  }, [ready, workspaceRef, syncState])

  // EventBusでノード一覧を同期
  useEffect(() => {
    if (!ready) return
    const ws = workspaceRef.current
    if (!ws) return

    const refreshNodes = () => {
      setNodes(
        containersRef.current.map((c) => ({
          id: c.id,
          name: c.name,
          w: c.width,
          h: c.height,
          color: c.color,
        }))
      )
    }

    refreshNodes()
    const unsubs = [
      ws.on('add', refreshNodes),
      ws.on('remove', (ev) => {
        // 削除されたコンテナに紐づく NestingZone をクリーンアップ
        const removed = ev.target as Container
        nestingZonesRef.current = nestingZonesRef.current.filter(
          (z) => z.target !== removed
        )
        // 常に参照を同期する（filter は新しい配列を作るため）
        interactionRef.current?.setNestingZones(nestingZonesRef.current)
        refreshNodes()
      }),
      ws.on('update', refreshNodes),
    ]
    return () => {
      for (const u of unsubs) u()
    }
  }, [ready, workspaceRef, containersRef])

  // 配置モード時のキャンバスクリック
  useEffect(() => {
    const canvas = canvasRef.current
    const ws = workspaceRef.current
    if (!canvas || !ws || placementMode.type === 'none') return

    const isEdgeMode = placementMode.type === 'edge'

    const handleClick = (e: MouseEvent) => {
      const mode = placementModeRef.current
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left - ws.viewport.x) / ws.viewport.scale
      const y = (e.clientY - rect.top - ws.viewport.y) / ws.viewport.scale

      if (mode.type === 'container') {
        const W = mode.width ?? 140
        const H = mode.height ?? 55
        const color = mode.color ?? '#3b82f6'
        const left = new Connector({ position: new Position(0, -H / 2), name: 'in', type: 'input' })
        const right = new Connector({ position: new Position(W, -H / 2), name: 'out', type: 'output' })
        const c = new Container({
          workspace: ws,
          position: new Position(x, y),
          name: `Node ${containersRef.current.length + 1}`,
          color,
          width: W,
          height: H,
          children: { left, right },
        })
        containersRef.current.push(c)
        connectorsRef.current.push(left, right)
        ws.selection.deselectAll()
        ws.selection.select(c)
        setSelectedElement({ type: 'container', element: c })
        syncState()
        setPlacementMode({ type: 'none' })
      } else if (mode.type === 'connector') {
        const c = new Connector({
          position: new Position(x, y),
          name: `connector_${connectorsRef.current.length + 1}`,
          type: mode.connectorType,
        })
        c.workspace = ws
        ws.addElement(c)
        connectorsRef.current.push(c)
        ws.selection.deselectAll()
        ws.selection.select(c)
        setSelectedElement({ type: 'connector', element: c })
        syncState()
        setPlacementMode({ type: 'none' })
      } else if (mode.type === 'edge') {
        const hit = findNearestConnector({ x, y }, connectorsRef.current, 30)
        if (!hit) return // コネクター外クリックは無視

        if (!mode.startConnector) {
          // Step 1: 始点コネクター設定（typeは変わらないのでuseEffectは再実行されない）
          setPlacementMode({ ...mode, startConnector: hit.connector as Connector })
          return
        }

        // Step 2: 終点コネクター → Edge作成
        const startConn = mode.startConnector
        const endConn = hit.connector as Connector
        if (startConn === endConn) return

        const edge = new Edge({ start: startConn, end: endConn, edgeType: mode.edgeType })
        ws.removeEdge(edge)
        ws.history.execute({
          execute() { ws.addEdge(edge) },
          undo() { ws.removeEdge(edge) },
        })
        setSelectedElement({ type: 'edge', element: edge })
        syncState()
        setPlacementMode({ type: 'none' })
      } else if (mode.type === 'autolayout') {
        const layout = new AutoLayout({
          position: new Position(0, 0),
          direction: mode.direction,
          gap: mode.gap ?? 10,
          containers: [],
          minWidth: 120,
          minHeight: 60,
        })
        const c = new Container({
          workspace: ws,
          position: new Position(x, y),
          name: `Layout ${containersRef.current.length + 1}`,
          color: '#6366f1',
          width: 120,
          height: 60,
          widthMode: 'hug',
          heightMode: 'hug',
          children: { layout },
        })
        containersRef.current.push(c)

        // NestingZone を自動登録
        const zone = new NestingZone({
          target: c,
          layout: c.children.layout,
          workspace: ws,
          validator: (d) => d !== c,
          padding: 20,
        })
        nestingZonesRef.current.push(zone)
        interactionRef.current?.setNestingZones(nestingZonesRef.current)
        console.debug('[Factory] NestingZone registered:', {
          zonesCount: nestingZonesRef.current.length,
          target: c.id,
          layoutWidth: c.children.layout.width,
          layoutHeight: c.children.layout.height,
          absPos: c.children.layout.absolutePosition,
        })

        ws.selection.deselectAll()
        ws.selection.select(c)
        setSelectedElement({ type: 'container', element: c })
        syncState()
        setPlacementMode({ type: 'none' })
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacementMode({ type: 'none' })
      }
    }

    // 少し遅延させてイベントを拾う（パレットのクリックと衝突回避）
    const timer = setTimeout(() => {
      if (isEdgeMode) {
        canvas.addEventListener('click', handleClick)
      } else {
        canvas.addEventListener('click', handleClick, { once: true })
      }
    }, 50)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      canvas.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [placementMode.type, workspaceRef, containersRef, connectorsRef, setPlacementMode, setSelectedElement, syncState])

  return (
    <div className='factory-canvas-wrapper'>
      <CanvasToolbar />
      <div className='factory-canvas-area'>
        <VplCanvas
          ref={(handle) => {
            if (handle) {
              svgRef.current = handle.svg
              overlayRef.current = handle.overlay
              canvasRef.current = handle.canvas
            }
          }}
          showGrid={showGrid}
          height='100%'
        >
          {nodes.map((n) => (
            <div
              key={n.id}
              id={`node-${n.id}`}
              className='node-flow'
              style={{ width: n.w, height: n.h }}
            >
              <span className='node-label'>{n.name}</span>
            </div>
          ))}
        </VplCanvas>
        {(selectedElement?.type === 'container' || selectedElement?.type === 'connector') &&
         toolMode === 'move' &&
         placementMode.type === 'none' &&
         ctxWorkspace && (
          <MoveGizmo
            element={selectedElement.element}
            workspace={ctxWorkspace}
            onMoveEnd={syncState}
          />
        )}
      </div>
    </div>
  )
}
