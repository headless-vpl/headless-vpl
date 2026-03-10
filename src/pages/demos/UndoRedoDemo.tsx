import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useRecipeWorkspace } from '../../hooks/workspace/useRecipeWorkspace'
import { Container, Position } from '../../lib/headless-vpl/primitives'

export default function UndoRedoDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  const { workspaceRef, containersRef, ready } = useRecipeWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: true,
  })

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current

    for (let i = 0; i < 3; i++) {
      const c = new Container({
        workspace: ws,
        position: new Position(80 + i * 170, 120),
        name: `Node ${i + 1}`,
        color: '#3b82f6',
        width: 120,
        height: 50,
      })
      containersRef.current.push(c)
    }

  }

  return (
    <SampleLayout
      title='Undo / Redo'
      description='ノードを移動後、Ctrl+Z / Ctrl+Shift+Z でUndo/Redo。ボタンでも操作可能。'
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
