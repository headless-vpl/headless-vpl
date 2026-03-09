import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useRecipeWorkspace } from '../../hooks/workspace/useRecipeWorkspace'
import { EdgeBuilder } from '../../lib/headless-vpl/helpers'
import { Connector, Container, Position } from '../../lib/headless-vpl/primitives'

export default function EdgeBuilderDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  const { workspaceRef, containersRef, connectorsRef, interactionRef, ready } = useRecipeWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: false,
    }
  )

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current && svgRef.current) {
    initialized.current = true
    const ws = workspaceRef.current
    const W = 120,
      H = 50

    // EdgeBuilderプレビュー用パス
    const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    previewPath.setAttribute('fill', 'none')
    previewPath.setAttribute('stroke', 'rgba(59,130,246,0.6)')
    previewPath.setAttribute('stroke-width', '2')
    previewPath.setAttribute('stroke-dasharray', '6 3')
    previewPath.setAttribute('display', 'none')
    const vg = svgRef.current!.querySelector('[data-role="viewport"]') as SVGGElement
    if (vg) vg.appendChild(previewPath)

    const builder = new EdgeBuilder({
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
    interactionRef.current?.setEdgeBuilder(builder)

    for (let i = 0; i < 4; i++) {
      const leftConn = new Connector({
        position: new Position(0, -H / 2),
        name: 'left',
        type: 'input',
      })
      const rightConn = new Connector({
        position: new Position(W, -H / 2),
        name: 'right',
        type: 'output',
      })
      const c = new Container({
        workspace: ws,
        position: new Position(60 + (i % 2) * 250, 60 + Math.floor(i / 2) * 120),
        name: `Node ${i + 1}`,
        color: '#3b82f6',
        width: W,
        height: H,
        children: { left: leftConn, right: rightConn },
      })
      containersRef.current.push(c)
      connectorsRef.current.push(leftConn, rightConn)
    }
  }

  return (
    <SampleLayout
      title='Edge Builder'
      description='コネクター（青い丸）からドラッグしてエッジを作成。出力→入力コネクターに接続します。'
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
