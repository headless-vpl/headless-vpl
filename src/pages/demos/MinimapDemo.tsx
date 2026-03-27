import { useEffect, useRef, useState } from 'react'
import { getExampleByPath } from '../../data/examplesData'
import { useRecipeWorkspace } from '../../hooks/workspace/useRecipeWorkspace'
import { bindMinimapNavigation, collectMinimapElements, computeMinimapSnapshot } from '../../lib/headless-vpl/helpers'
import { Container, Position } from '../../lib/headless-vpl/primitives'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'

const exampleData = getExampleByPath('/demos/minimap')
const MINIMAP_SIZE = { width: 220, height: 140 }

const seedNodes = [
  { name: 'Entry', caption: 'Trigger', x: 80, y: 80, width: 160, height: 64, color: '#0ea5e9' },
  { name: 'Classifier', caption: 'LLM', x: 420, y: 120, width: 190, height: 72, color: '#8b5cf6' },
  { name: 'Review', caption: 'Human', x: 760, y: 340, width: 180, height: 68, color: '#f97316' },
  { name: 'Memory', caption: 'Store', x: 240, y: 420, width: 170, height: 64, color: '#10b981' },
  { name: 'Dispatch', caption: 'Route', x: 980, y: 120, width: 180, height: 68, color: '#ec4899' },
  { name: 'Archive', caption: 'Done', x: 1220, y: 420, width: 170, height: 64, color: '#f59e0b' },
]

export default function MinimapDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const minimapRef = useRef<HTMLDivElement | null>(null)
  const initialized = useRef(false)
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [, setRenderTick] = useState(0)

  const { workspaceRef, containersRef, ready } = useRecipeWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: false,
  })

  useEffect(() => {
    const ws = workspaceRef.current
    const canvasElement = canvasRef.current
    if (!ready || !ws || !canvasElement || initialized.current) return

    initialized.current = true
    for (const node of seedNodes) {
      containersRef.current.push(
        new Container({
          workspace: ws,
          position: new Position(node.x, node.y),
          name: node.name,
          color: node.color,
          width: node.width,
          height: node.height,
        })
      )
    }

    const rect = canvasElement.getBoundingClientRect()
    ws.fitView(rect.width, rect.height, 96)
    setZoom(Math.round(ws.viewport.scale * 100))
    setRenderTick((tick) => tick + 1)
  }, [ready, workspaceRef, containersRef])

  useEffect(() => {
    const ws = workspaceRef.current
    if (!ready || !ws) return

    const sync = () => {
      setZoom(Math.round(ws.viewport.scale * 100))
      setRenderTick((tick) => tick + 1)
    }

    sync()
    const unsubs = [
      ws.on('add', sync),
      ws.on('remove', sync),
      ws.on('move', sync),
      ws.on('update', sync),
      ws.on('pan', sync),
      ws.on('zoom', sync),
    ]

    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [ready, workspaceRef])

  function getCanvasSize() {
    const canvasElement = canvasRef.current
    if (!canvasElement) return { width: 1, height: 1 }
    const rect = canvasElement.getBoundingClientRect()
    return {
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
    }
  }

  function getSnapshot() {
    const ws = workspaceRef.current
    if (!ws) return null

    return computeMinimapSnapshot({
      workspace: ws,
      elements: collectMinimapElements(ws.elements),
      canvas: getCanvasSize(),
      size: MINIMAP_SIZE,
      padding: 10,
      boundViewport: true,
    })
  }

  useEffect(() => {
    const ws = workspaceRef.current
    const minimapElement = minimapRef.current
    if (!ready || !ws || !minimapElement) return

    return bindMinimapNavigation(minimapElement, {
      workspace: ws,
      getSnapshot: () =>
        getSnapshot() ?? {
          size: MINIMAP_SIZE,
          bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 },
          transform: { x: 0, y: 0, scale: 1 },
          nodes: [],
          viewport: { x: 0, y: 0, width: 1, height: 1 },
        },
      getCanvasSize,
    })
  }, [ready, workspaceRef])

  const snapshot = getSnapshot()

  const handleFitView = () => {
    const ws = workspaceRef.current
    const canvasElement = canvasRef.current
    if (!ws || !canvasElement) return
    const rect = canvasElement.getBoundingClientRect()
    ws.fitView(rect.width, rect.height, 96)
  }

  return (
    <SampleLayout
      title='Minimap'
      description='右下の minimap で全体確認。クリックでセンタリング、viewport 矩形ドラッグでパン。'
      longDescription={exampleData?.longDescription}
      codeSnippet={exampleData?.codeSnippet}
    >
      <div className='relative h-full'>
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
          <div className='pointer-events-auto absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/80'>
            <button
              type='button'
              onClick={handleFitView}
              className='rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
            >
              Fit view
            </button>
            <button
              type='button'
              onClick={() => setShowGrid((value) => !value)}
              className='rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
            >
              Grid {showGrid ? 'on' : 'off'}
            </button>
            <span className='text-xs text-zinc-500 dark:text-zinc-400'>Zoom {zoom}%</span>
          </div>

          {containersRef.current.map((container, index) => (
            <div
              key={container.id}
              id={`node-${container.id}`}
              className='node-flow'
              style={{
                width: container.width,
                height: container.height,
                borderColor: `${container.color}55`,
                boxShadow: `0 12px 30px ${container.color}18`,
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 88%, white 12%), var(--color-surface))',
              }}
            >
              <span className='node-label'>{container.name}</span>
              <span className='mt-1 text-[11px] text-zinc-500 dark:text-zinc-400'>
                {seedNodes[index]?.caption}
              </span>
            </div>
          ))}
        </VplCanvas>
        <div
          ref={minimapRef}
          className='pointer-events-auto absolute bottom-4 right-4 z-10 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/92 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/84'
          style={{ width: MINIMAP_SIZE.width, height: MINIMAP_SIZE.height }}
        >
          <div className='pointer-events-none absolute left-3 top-2 z-10 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400'>
            Minimap
          </div>
          <svg width={MINIMAP_SIZE.width} height={MINIMAP_SIZE.height} className='block'>
            <rect
              x={0}
              y={0}
              width={MINIMAP_SIZE.width}
              height={MINIMAP_SIZE.height}
              fill='transparent'
            />
            {snapshot?.nodes.map((node) => (
              <rect
                key={node.id}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={6}
                fill={node.color ?? '#64748b'}
                fillOpacity={0.18}
                stroke={node.color ?? '#64748b'}
                strokeOpacity={0.8}
                strokeWidth={1}
              />
            ))}
            {snapshot && (
              <rect
                x={snapshot.viewport.x}
                y={snapshot.viewport.y}
                width={snapshot.viewport.width}
                height={snapshot.viewport.height}
                rx={8}
                fill='rgba(59,130,246,0.12)'
                stroke='rgba(59,130,246,0.95)'
                strokeWidth={1.5}
              />
            )}
          </svg>
        </div>
      </div>
    </SampleLayout>
  )
}
