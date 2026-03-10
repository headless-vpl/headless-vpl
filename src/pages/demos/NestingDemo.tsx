import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useRecipeWorkspace } from '../../hooks/workspace/useRecipeWorkspace'
import { NestingZone } from '../../lib/headless-vpl/helpers'
import { AutoLayout, Container, Position } from '../../lib/headless-vpl/primitives'

export default function NestingDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  const nestingZonesRef = useRef<NestingZone[]>([])

  const { workspaceRef, containersRef, interactionRef, ready } = useRecipeWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: false,
    interactionOverrides: { nestingZones: nestingZonesRef.current },
  })

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current

    // --- 垂直 Drop Zone ---
    const vParent = new Container({
      workspace: ws,
      position: new Position(60, 40),
      name: 'Vertical Zone',
      color: '#f59e0b',
      widthMode: 'hug',
      heightMode: 'hug',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      minWidth: 150,
      minHeight: 80,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(10, 10),
          direction: 'vertical',
          gap: 8,
          alignment: 'start',
          containers: [],
        }),
      },
    })

    const vZone = new NestingZone({
      target: vParent,
      layout: vParent.children.autoLayout,
      workspace: ws,
      validator: (d) => d !== vParent && d !== hParent,
      padding: 5,
    })
    nestingZonesRef.current.push(vZone)

    // 垂直用ブロック
    const vColors = ['#3b82f6', '#8b5cf6', '#ec4899']
    const vNames = ['Item A', 'Item B', 'Item C']
    const vBlocks: Container[] = []
    for (let i = 0; i < 3; i++) {
      const c = new Container({
        workspace: ws,
        position: new Position(280, 40 + i * 70),
        name: vNames[i],
        color: vColors[i],
        width: 100,
        height: 45,
      })
      vBlocks.push(c)
    }

    // --- 水平 Drop Zone ---
    const hParent = new Container({
      workspace: ws,
      position: new Position(60, 260),
      name: 'Horizontal Zone',
      color: '#06b6d4',
      widthMode: 'hug',
      heightMode: 'hug',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      minWidth: 150,
      minHeight: 60,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(10, 10),
          direction: 'horizontal',
          gap: 8,
          alignment: 'center',
          containers: [],
        }),
      },
    })

    const hZone = new NestingZone({
      target: hParent,
      layout: hParent.children.autoLayout,
      workspace: ws,
      validator: (d) => d !== hParent && d !== vParent,
      padding: 5,
    })
    nestingZonesRef.current.push(hZone)

    // 水平用ブロック
    const hColors = ['#059669', '#0891b2', '#d97706']
    const hNames = ['Item D', 'Item E', 'Item F']
    const hBlocks: Container[] = []
    for (let i = 0; i < 3; i++) {
      const c = new Container({
        workspace: ws,
        position: new Position(280, 260 + i * 70),
        name: hNames[i],
        color: hColors[i],
        width: 80,
        height: 40,
      })
      hBlocks.push(c)
    }

    interactionRef.current?.setNestingZones(nestingZonesRef.current)
    containersRef.current.push(vParent, ...vBlocks, hParent, ...hBlocks)
  }

  return (
    <SampleLayout
      title='Nesting'
      description='垂直/水平のDrop Zoneにブロックをドラッグしてネスト。外にドラッグするとアンネスト。'
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
