import { useEffect, useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Connector, Container, Edge, Position } from '../../lib/headless-vpl'

type WorkflowNodeView = {
  id: string
  name: string
  icon: string
  color: string
  w: number
  h: number
}

export default function WorkflowEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [nodes, setNodes] = useState<WorkflowNodeView[]>([])
  const [showGrid, setShowGrid] = useState(true)

  const { workspaceRef, containersRef, connectorsRef } = useWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: false,
    }
  )

  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !workspaceRef.current) return
    initialized.current = true
    const ws = workspaceRef.current
    const W = 150,
      H = 70

    const nodeDefs = [
      { name: 'HTTP Input', icon: '⬇', color: '#3b82f6', x: 40, y: 100 },
      { name: 'LLM', icon: '🧠', color: '#8b5cf6', x: 240, y: 40 },
      { name: 'Knowledge Base', icon: '📚', color: '#06b6d4', x: 240, y: 180 },
      { name: 'Merge', icon: '🔀', color: '#f59e0b', x: 440, y: 100 },
      { name: 'Template', icon: '📝', color: '#ec4899', x: 640, y: 100 },
      { name: 'HTTP Output', icon: '⬆', color: '#22c55e', x: 840, y: 100 },
    ]

    const connPairs: { left: Connector; right: Connector }[] = []
    const views: WorkflowNodeView[] = []

    for (const d of nodeDefs) {
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
        color: d.color,
        width: W,
        height: H,
        children: { left, right },
      })
      connPairs.push({ left, right })
      containersRef.current.push(c)
      connectorsRef.current.push(left, right)
      views.push({ id: c.id, name: d.name, icon: d.icon, color: d.color, w: W, h: H })
    }

    // パイプラインエッジ
    const edges: [number, number][] = [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
      [4, 5],
    ]
    for (const [a, b] of edges) {
      new Edge({
        start: connPairs[a].right,
        end: connPairs[b].left,
        edgeType: 'step',
        markerEnd: { type: 'arrowClosed' },
      })
    }

    setNodes(views)
  }, [workspaceRef, containersRef, connectorsRef])

  return (
    <SampleLayout
      title='Workflow Editor'
      description='Dify/Make風 AIワークフロー — 横方向フロー、stepエッジ、アイコン付きノード'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} />}
    >
      <VplCanvas
        ref={(handle) => {
          if (handle) {
            svgRef.current = handle.svg
            overlayRef.current = handle.overlay
            canvasRef.current = handle.canvas
          }
        }}
        showGrid={showGrid}
      >
        {nodes.map((n) => (
          <div
            key={n.id}
            id={`node-${n.id}`}
            className='node-workflow'
            style={{ width: n.w, height: n.h }}
          >
            <span style={{ fontSize: '20px' }}>{n.icon}</span>
            <span className='text-xs font-medium text-zinc-600 dark:text-zinc-300'>{n.name}</span>
          </div>
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
