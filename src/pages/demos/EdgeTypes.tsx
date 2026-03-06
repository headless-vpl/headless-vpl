import { useCallback, useEffect, useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Connector, Container, Edge, Position } from '../../lib/headless-vpl'
import type { EdgeType } from '../../lib/headless-vpl'

const edgeTypes: { type: EdgeType; label: string }[] = [
  { type: 'straight', label: 'Straight' },
  { type: 'bezier', label: 'Bezier' },
  { type: 'step', label: 'Step' },
  { type: 'smoothstep', label: 'Smoothstep' },
]

export default function EdgeTypes() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const { workspaceRef, containersRef, ready } = useWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: false,
    interactionOverrides: {
      onEdgeSelect: (id) => setSelectedEdgeId(id),
    },
  })

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current
    const W = 120,
      H = 45
    edgeTypes.forEach(({ type, label }) => {
      const i = edgeTypes.findIndex((e) => e.type === type)
      const y = 40 + i * 90
      const leftConn = new Connector({
        position: new Position(W, -H / 2),
        name: 'right',
        type: 'output',
      })
      const rightConn = new Connector({
        position: new Position(0, -H / 2),
        name: 'left',
        type: 'input',
      })
      const left = new Container({
        workspace: ws,
        position: new Position(60, y),
        name: `${label} L`,
        color: '#3b82f6',
        width: W,
        height: H,
        children: { right: leftConn },
      })
      const right = new Container({
        workspace: ws,
        position: new Position(340, y),
        name: `${label} R`,
        color: '#3b82f6',
        width: W,
        height: H,
        children: { left: rightConn },
      })
      new Edge({
        start: leftConn,
        end: rightConn,
        edgeType: type,
        label,
        markerEnd: type === 'smoothstep' ? { type: 'arrowClosed' } : undefined,
      })
      containersRef.current.push(left, right)
    })
  }

  const handleDeleteEdge = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws || !selectedEdgeId) return
    const edge = ws.edges.find((e) => e.id === selectedEdgeId)
    if (edge) {
      ws.removeEdge(edge)
      setSelectedEdgeId(null)
    }
  }, [workspaceRef, selectedEdgeId])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteEdge()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleDeleteEdge])

  return (
    <SampleLayout
      title='Edge Types'
      description='4種類のエッジタイプを比較。エッジをクリックで選択、Delete/Backspaceで削除。'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} ready={ready} />}
    >
      {selectedEdgeId && (
        <div className='mb-2 flex items-center gap-2 text-xs text-zinc-500'>
          <span>
            選択中: <span className='text-zinc-900 dark:text-white'>{selectedEdgeId}</span>
          </span>
          <button
            onClick={handleDeleteEdge}
            className='debug-btn'
            style={{ fontSize: '11px', padding: '2px 8px' }}
          >
            削除
          </button>
        </div>
      )}
      <VplCanvas
        showGrid={showGrid}
        ref={(handle) => {
          if (handle) {
            svgRef.current = handle.svg
            overlayRef.current = handle.overlay
            canvasRef.current = handle.canvas
          }
        }}
        height={selectedEdgeId ? 'calc(100% - 28px)' : '100%'}
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
