import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Container, Position } from '../../lib/headless-vpl'

export default function ZoomPanDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(100)
  const [showGrid, setShowGrid] = useState(true)

  const { workspaceRef, containersRef, ready } = useWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: false,
  })

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current

    // 散らばったノードを配置
    const positions = [
      [100, 100],
      [400, 50],
      [250, 250],
      [50, 400],
      [450, 350],
      [300, 500],
    ]
    for (let i = 0; i < positions.length; i++) {
      const c = new Container({
        workspace: ws,
        position: new Position(positions[i][0], positions[i][1]),
        name: `Node ${i + 1}`,
        color: '#3b82f6',
        width: 120,
        height: 50,
      })
      containersRef.current.push(c)
    }

    ws.on('zoom', () => setZoom(Math.round(ws.viewport.scale * 100)))
  }

  const handleFitView = () => {
    const ws = workspaceRef.current
    const el = canvasRef.current
    if (!ws || !el) return
    const r = el.getBoundingClientRect()
    ws.fitView(r.width, r.height)
    setZoom(Math.round(ws.viewport.scale * 100))
  }

  return (
    <SampleLayout
      title='Zoom & Pan'
      description='スクロールでズーム、中ボタンドラッグでパン。'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} ready={ready} />}
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
        height='100%'
      >
        {containersRef.current.map((c) => (
          <div
            key={c.id}
            id={`node-${c.id}`}
            className='node-flow'
            style={{ width: c.width, height: c.height }}
          >
            <span className='node-label'>{c.name}</span>
          </div>
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
