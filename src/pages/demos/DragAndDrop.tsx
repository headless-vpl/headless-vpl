import { useRef, useState } from 'react'
import { SampleLayout } from '../../components/SampleLayout'
import { DebugPanel } from '../../components/DebugPanel'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Container, Position } from '../../lib/headless-vpl'

export default function DragAndDrop() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  const { workspaceRef, containersRef, ready } = useWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: false,
  })

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899']
    const names = ['Node A', 'Node B', 'Node C']
    for (let i = 0; i < 3; i++) {
      const c = new Container({
        workspace: ws,
        position: new Position(80 + i * 180, 100),
        name: names[i],
        color: colors[i],
        width: 130,
        height: 50,
      })
      containersRef.current.push(c)
    }
  }

  return (
    <SampleLayout title='Drag & Drop' description='コンテナをドラッグして移動。中ボタンでパン。' rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} ready={ready} />}>
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
