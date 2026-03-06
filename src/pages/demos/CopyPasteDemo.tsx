import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Connector, Container, Position } from '../../lib/headless-vpl'

export default function CopyPasteDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [nodeCount, setNodeCount] = useState(3)
  const [showGrid, setShowGrid] = useState(true)

  const { workspaceRef, containersRef, ready } = useWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: true,
    onPaste: (pasted) => setNodeCount((prev) => prev + pasted.length),
  })

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899']
    for (let i = 0; i < 3; i++) {
      const W = 120,
        H = 50
      const c = new Container({
        workspace: ws,
        position: new Position(80 + i * 170, 120),
        name: `Node ${i + 1}`,
        color: colors[i],
        width: W,
        height: H,
        children: {
          left: new Connector({ position: new Position(0, -H / 2), name: 'left', type: 'input' }),
          right: new Connector({
            position: new Position(W, -H / 2),
            name: 'right',
            type: 'output',
          }),
        },
      })
      containersRef.current.push(c)
    }

  }

  return (
    <SampleLayout
      title='Copy / Paste'
      description='ノードを選択 → Ctrl+C でコピー → Ctrl+V でペースト。Deleteで削除。'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} ready={ready} />}
    >
      <div className='mb-2 text-xs text-zinc-500'>
        ノード数: <span className='text-zinc-900 dark:text-white'>{nodeCount}</span>
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
