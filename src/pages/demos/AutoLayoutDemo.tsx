import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useRecipeWorkspace } from '../../hooks/workspace/useRecipeWorkspace'
import { NestingZone } from '../../lib/headless-vpl/helpers'
import { AutoLayout, Container, Position } from '../../lib/headless-vpl/primitives'

type BlockView = { id: string; name: string; color: string }

export default function AutoLayoutDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [blocks, setBlocks] = useState<BlockView[]>([])

  const nestingZonesRef = useRef<NestingZone[]>([])

  const { workspaceRef, containersRef, interactionRef, ready } = useRecipeWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: false,
    interactionOverrides: {
      nestingZones: nestingZonesRef.current,
      onNest: () => {},
      onUnnest: () => {},
    },
  })

  const syncBlocks = () => {
    const allContainers = collectAllContainers()
    setBlocks(allContainers.map((c) => ({ id: c.id, name: c.name, color: c.color })))
  }

  const collectAllContainers = (): Container[] => {
    const result: Container[] = []
    const visit = (c: Container) => {
      result.push(c)
      if (c.children.autoLayout) {
        for (const child of (c.children.autoLayout as AutoLayout).containers) {
          visit(child)
        }
      }
    }
    for (const c of containersRef.current) {
      visit(c)
    }
    return result
  }

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current
    const blockViews: BlockView[] = []

    // --- 外に出せるパターン（水平） ---
    const hChildren = [
      new Container({ name: 'A', color: '#d97706', width: 50, height: 40 }),
      new Container({ name: 'B', color: '#b45309', width: 60, height: 50 }),
      new Container({ name: 'C', color: '#92400e', width: 40, height: 40 }),
    ]
    const hContainer = new Container({
      workspace: ws,
      position: new Position(40, 40),
      name: 'Reorderable (H)',
      color: '#f59e0b',
      widthMode: 'hug',
      heightMode: 'fixed',
      height: 80,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      minWidth: 100,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(10, 10),
          direction: 'horizontal',
          gap: 8,
          alignment: 'center',
          containers: hChildren,
        }),
      },
    })

    const hZone = new NestingZone({
      target: hContainer,
      layout: hContainer.children.autoLayout,
      workspace: ws,
      validator: (d) => d !== hContainer && d !== vContainer,
      padding: 5,
    })
    nestingZonesRef.current.push(hZone)

    blockViews.push({ id: hContainer.id, name: 'Reorderable (H)', color: '#f59e0b' })
    for (const c of hChildren) blockViews.push({ id: c.id, name: c.name, color: c.color })

    // --- 外に出せるパターン（垂直） ---
    const vChildren = [
      new Container({ name: 'D', color: '#0891b2', width: 100, height: 35 }),
      new Container({ name: 'E', color: '#0e7490', width: 80, height: 35 }),
      new Container({ name: 'F', color: '#155e75', width: 120, height: 35 }),
    ]
    const vContainer = new Container({
      workspace: ws,
      position: new Position(40, 180),
      name: 'Reorderable (V)',
      color: '#06b6d4',
      widthMode: 'hug',
      heightMode: 'hug',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      minWidth: 80,
      minHeight: 50,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(10, 10),
          direction: 'vertical',
          gap: 8,
          alignment: 'start',
          containers: vChildren,
        }),
      },
    })

    const vZone = new NestingZone({
      target: vContainer,
      layout: vContainer.children.autoLayout,
      workspace: ws,
      validator: (d) => d !== vContainer && d !== hContainer,
      padding: 5,
    })
    nestingZonesRef.current.push(vZone)

    blockViews.push({ id: vContainer.id, name: 'Reorderable (V)', color: '#06b6d4' })
    for (const c of vChildren) blockViews.push({ id: c.id, name: c.name, color: c.color })

    // ネスト: 垂直内に水平AutoLayout（静的表示）
    const nestedHChildren = [
      new Container({ name: 'X', color: '#a855f7', width: 40, height: 30 }),
      new Container({ name: 'Y', color: '#9333ea', width: 40, height: 30 }),
    ]
    const innerH = new Container({
      name: 'Inner H',
      color: '#c084fc',
      widthMode: 'hug',
      heightMode: 'hug',
      padding: { top: 6, right: 6, bottom: 6, left: 6 },
      minWidth: 50,
      minHeight: 30,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(6, 6),
          direction: 'horizontal',
          gap: 6,
          alignment: 'center',
          containers: nestedHChildren,
        }),
      },
    })
    const outerVChildren = [
      new Container({ name: 'G', color: '#7c3aed', width: 100, height: 35 }),
      innerH,
      new Container({ name: 'H', color: '#6d28d9', width: 80, height: 35 }),
    ]
    const nestedContainer = new Container({
      workspace: ws,
      position: new Position(300, 40),
      name: 'Nested (static)',
      color: '#8b5cf6',
      widthMode: 'hug',
      heightMode: 'hug',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      minWidth: 80,
      minHeight: 50,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(10, 10),
          direction: 'vertical',
          gap: 8,
          alignment: 'start',
          containers: outerVChildren,
        }),
      },
    })
    blockViews.push({ id: nestedContainer.id, name: 'Nested (static)', color: '#8b5cf6' })
    for (const c of outerVChildren) blockViews.push({ id: c.id, name: c.name, color: c.color })
    for (const c of nestedHChildren) blockViews.push({ id: c.id, name: c.name, color: c.color })

    interactionRef.current?.setNestingZones(nestingZonesRef.current)
    containersRef.current.push(hContainer, ...hChildren, vContainer, ...vChildren, nestedContainer, ...outerVChildren, ...nestedHChildren)
    setBlocks(blockViews)
  }

  return (
    <SampleLayout
      title='Auto Layout'
      description='水平/垂直のAutoLayout。子要素をドラッグで入れ替え可能（外に出すこともできます）。右のNestedは静的表示。'
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
      >
        {blocks.map((b) => (
          <div
            key={b.id}
            id={`node-${b.id}`}
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: `${b.color}22`,
              border: `1.5px solid ${b.color}88`,
              fontSize: 11,
              fontWeight: 500,
              color: b.color,
            }}
          >
            {b.name}
          </div>
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
