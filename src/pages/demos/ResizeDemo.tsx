import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Container, Position } from '../../lib/headless-vpl'

export default function ResizeDemo() {
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

    const c = new Container({
      workspace: ws,
      position: new Position(100, 80),
      name: 'Resizable',
      color: '#059669',
      width: 200,
      height: 140,
      resizable: true,
      minWidth: 80,
      minHeight: 60,
      maxWidth: 500,
      maxHeight: 400,
    })
    containersRef.current.push(c)

    // 固定サイズのノードも比較用に配置
    const fixed = new Container({
      workspace: ws,
      position: new Position(400, 80),
      name: 'Fixed Size',
      color: '#3b82f6',
      width: 130,
      height: 60,
    })
    containersRef.current.push(fixed)
  }

  return (
    <SampleLayout
      title='Resize'
      description='緑のノードの角をドラッグしてリサイズ。min/max制約付き。'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} ready={ready} />}
    >
      <VplCanvas
        showGrid={showGrid}
        ref={(handle) => {
          if (handle) {
            svgRef.current = handle.svg
            overlayRef.current = handle.overlay
            canvasRef.current = handle.canvas
          }
        }}
      >
        {containersRef.current.map((c) => {
          if (c.name === 'Resizable') {
            return (
              <div
                key={c.id}
                id={`node-${c.id}`}
                className='node-resizable'
                style={{ width: c.width, height: c.height }}
              >
                <span className='node-label'>Resizable</span>
                <span style={{ fontSize: '11px', color: '#71717a' }}>Drag corners</span>
                <div className='resize-handle rh-se' />
                <div className='resize-handle rh-sw' />
                <div className='resize-handle rh-ne' />
                <div className='resize-handle rh-nw' />
              </div>
            )
          }
          return (
            <div
              key={c.id}
              id={`node-${c.id}`}
              className='node-flow'
              style={{ width: c.width, height: c.height }}
            >
              <span className='node-label'>{c.name}</span>
            </div>
          )
        })}
      </VplCanvas>
    </SampleLayout>
  )
}
