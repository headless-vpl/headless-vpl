import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useRecipeWorkspace } from '../../hooks/workspace/useRecipeWorkspace'
import { Container, Position } from '../../lib/headless-vpl/primitives'

export default function SelectionDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [selectedCount, setSelectedCount] = useState(0)
  const [showGrid, setShowGrid] = useState(true)

  const { workspaceRef, containersRef, ready } = useRecipeWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: false,
  })

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']

    for (let i = 0; i < 6; i++) {
      const c = new Container({
        workspace: ws,
        position: new Position(60 + (i % 3) * 160, 60 + Math.floor(i / 3) * 100),
        name: `Node ${i + 1}`,
        color: colors[i],
        width: 120,
        height: 50,
      })
      containersRef.current.push(c)
    }

    ws.on('select', () => setSelectedCount(ws.selection.size))
    ws.on('deselect', () => setSelectedCount(ws.selection.size))
  }

  return (
    <SampleLayout
      title='Selection'
      description='クリックで選択、Shift+クリックで複数選択、ドラッグでマーキー矩形選択。'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} ready={ready} />}
    >
      <div className='mb-2 text-xs text-zinc-500'>
        選択中: <span className='text-zinc-900 dark:text-white'>{selectedCount}</span>
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
        height='calc(100% - 28px)'
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
