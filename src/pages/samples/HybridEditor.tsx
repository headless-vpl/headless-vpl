import { useEffect, useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Connector, Container, Edge, Position, SnapConnection } from '../../lib/headless-vpl'

type NodeData = {
  id: string
  name: string
  type: 'block' | 'data'
  color: string
  w: number
  h: number
}

export default function HybridEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [showGrid, setShowGrid] = useState(true)
  const snapConnsRef = useRef<SnapConnection[]>([])

  const { workspaceRef, containersRef, connectorsRef } = useWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: false,
      interactionOverrides: { snapConnections: snapConnsRef.current },
    }
  )

  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !workspaceRef.current) return
    initialized.current = true
    const ws = workspaceRef.current

    // ブロック型ノード
    const blockW = 160,
      blockH = 50
    const blockDefs = [
      { name: 'Start', color: '#22c55e', x: 60, y: 60 },
      { name: 'If condition', color: '#f59e0b', x: 60, y: 130 },
      { name: 'Execute', color: '#7c3aed', x: 60, y: 200 },
    ]

    const blockConnectors: { top: Connector; bottom: Connector; dataIn: Connector }[] = []
    const blockNodes: Container[] = []
    const nodeData: NodeData[] = []

    for (const d of blockDefs) {
      const top = new Connector({
        position: new Position(blockW / 2, 0),
        name: 'top',
        type: 'input',
      })
      const bottom = new Connector({
        position: new Position(blockW / 2, -blockH),
        name: 'bottom',
        type: 'output',
      })
      const dataIn = new Connector({
        position: new Position(blockW, -blockH / 2),
        name: 'dataIn',
        type: 'input',
      })
      const c = new Container({
        workspace: ws,
        position: new Position(d.x, d.y),
        name: d.name,
        color: d.color,
        width: blockW,
        height: blockH,
        children: { top, bottom, dataIn },
      })
      blockConnectors.push({ top, bottom, dataIn })
      blockNodes.push(c)
      containersRef.current.push(c)
      connectorsRef.current.push(top, bottom, dataIn)
      nodeData.push({ id: c.id, name: d.name, type: 'block', color: d.color, w: blockW, h: blockH })
    }

    // スナップ接続
    for (let i = 1; i < blockNodes.length; i++) {
      const sc = new SnapConnection({
        source: blockNodes[i],
        sourcePosition: blockConnectors[i].top.position,
        target: blockNodes[i - 1],
        targetPosition: blockConnectors[i - 1].bottom.position,
        workspace: ws,
      })
      snapConnsRef.current.push(sc)
    }

    // データノード
    const dataW = 120,
      dataH = 45
    const dataDefs = [
      { name: 'Variable X', color: '#3b82f6', x: 340, y: 80 },
      { name: 'Constant 42', color: '#06b6d4', x: 340, y: 180 },
    ]

    const dataConnectors: Connector[] = []
    for (const d of dataDefs) {
      const out = new Connector({
        position: new Position(0, -dataH / 2),
        name: 'out',
        type: 'output',
      })
      const c = new Container({
        workspace: ws,
        position: new Position(d.x, d.y),
        name: d.name,
        color: d.color,
        width: dataW,
        height: dataH,
        children: { out },
      })
      dataConnectors.push(out)
      containersRef.current.push(c)
      connectorsRef.current.push(out)
      nodeData.push({ id: c.id, name: d.name, type: 'data', color: d.color, w: dataW, h: dataH })
    }

    // データ→ブロックのエッジ
    new Edge({ start: dataConnectors[0], end: blockConnectors[1].dataIn, edgeType: 'bezier' })
    new Edge({ start: dataConnectors[1], end: blockConnectors[2].dataIn, edgeType: 'bezier' })

    setNodes(nodeData)
  }, [workspaceRef, containersRef, connectorsRef])

  return (
    <SampleLayout
      title='Hybrid Editor'
      description='ブロック+フロー混合型 — 制御フローはスナップ、データフローはベジェエッジで接続'
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
        {nodes.map((n) => {
          if (n.type === 'block') {
            return (
              <div
                key={n.id}
                id={`node-${n.id}`}
                className='node-scratch'
                style={{
                  width: n.w,
                  height: n.h,
                  background: `linear-gradient(135deg, ${n.color}, ${n.color}cc)`,
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '13px' }}>
                  {n.name}
                </span>
              </div>
            )
          }
          return (
            <div
              key={n.id}
              id={`node-${n.id}`}
              className='node-flow'
              style={{ width: n.w, height: n.h, borderColor: n.color }}
            >
              <span className='node-label'>{n.name}</span>
            </div>
          )
        })}
      </VplCanvas>
    </SampleLayout>
  )
}
