import { useCallback, useEffect, useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Connector, Container, Edge, EdgeBuilder, Position } from '../../lib/headless-vpl'

type NodeData = { id: string; name: string; w: number; h: number }

export default function FlowEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [showGrid, setShowGrid] = useState(true)

  // コネクター参照を保持 (エッジ接続用)
  const connectorMapRef = useRef<Map<string, { left: Connector; right: Connector }>>(new Map())

  const { workspaceRef, containersRef, connectorsRef } = useWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: true,
    }
  )

  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !workspaceRef.current || !svgRef.current) return
    initialized.current = true
    const ws = workspaceRef.current
    const W = 140,
      H = 55

    // EdgeBuilder
    const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    previewPath.setAttribute('fill', 'none')
    previewPath.setAttribute('stroke', 'rgba(59,130,246,0.6)')
    previewPath.setAttribute('stroke-width', '2')
    previewPath.setAttribute('stroke-dasharray', '6 3')
    previewPath.setAttribute('display', 'none')
    const vg = svgRef.current!.querySelector('[data-role="viewport"]') as SVGGElement
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
          execute() {
            ws.addEdge(edge)
          },
          undo() {
            ws.removeEdge(edge)
          },
        })
      },
      onCancel: () => {
        previewPath.setAttribute('display', 'none')
      },
    })

    // 初期ノード
    const defs: { name: string; x: number; y: number }[] = [
      { name: 'Start', x: 60, y: 100 },
      { name: 'Process A', x: 280, y: 40 },
      { name: 'Process B', x: 280, y: 180 },
      { name: 'Merge', x: 500, y: 100 },
      { name: 'Output', x: 720, y: 100 },
    ]

    const connectors: { left: Connector; right: Connector }[] = []
    const nodeData: NodeData[] = []
    for (const d of defs) {
      const left = new Connector({ position: new Position(0, -H / 2), name: 'in', type: 'input' })
      const right = new Connector({
        position: new Position(W, -H / 2),
        name: 'out',
        type: 'output',
      })
      const c = new Container({
        workspace: ws,
        position: new Position(d.x, d.y),
        name: d.name,
        color: '#3b82f6',
        width: W,
        height: H,
        children: { left, right },
      })
      connectors.push({ left, right })
      containersRef.current.push(c)
      connectorsRef.current.push(left, right)
      connectorMapRef.current.set(c.id, { left, right })
      nodeData.push({ id: c.id, name: d.name, w: W, h: H })
    }

    // エッジ
    const edges: [number, number][] = [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
    ]
    for (const [a, b] of edges) {
      new Edge({ start: connectors[a].right, end: connectors[b].left, edgeType: 'bezier' })
    }

    setNodes(nodeData)
    ws.on('add', () => {
      setNodes(
        containersRef.current.map((c) => ({ id: c.id, name: c.name, w: c.width, h: c.height }))
      )
    })
  }, [workspaceRef, containersRef, connectorsRef])

  const handleAddNode = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    const W = 140,
      H = 55
    const x = -ws.viewport.x / ws.viewport.scale + 200
    const y = -ws.viewport.y / ws.viewport.scale + 150
    const left = new Connector({ position: new Position(0, -H / 2), name: 'in', type: 'input' })
    const right = new Connector({ position: new Position(W, -H / 2), name: 'out', type: 'output' })
    const c = new Container({
      workspace: ws,
      position: new Position(x, y),
      name: `Node ${containersRef.current.length + 1}`,
      color: '#3b82f6',
      width: W,
      height: H,
      children: { left, right },
    })
    containersRef.current.push(c)
    connectorsRef.current.push(left, right)
    setNodes((prev) => [...prev, { id: c.id, name: c.name, w: W, h: H }])
  }, [workspaceRef, containersRef, connectorsRef])

  return (
    <SampleLayout
      title='Flow Editor'
      description='ReactFlow風ノードエディター — ベジェエッジ、ドラッグ接続、ズーム/パン対応'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} />}
    >
      <div className='mb-2 flex items-center gap-2'>
        <button
          onClick={handleAddNode}
          className='rounded border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
        >
          + Add Node
        </button>
      </div>
      <VplCanvas
        ref={(handle) => {
          if (handle) {
            svgRef.current = handle.svg
            overlayRef.current = handle.overlay
            canvasRef.current = handle.canvas
          }
        }}
        showGrid={showGrid}
        height='calc(100% - 36px)'
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
    </SampleLayout>
  )
}
