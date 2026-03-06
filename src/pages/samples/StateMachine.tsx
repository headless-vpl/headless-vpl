import { useEffect, useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Connector, Container, Edge, Position } from '../../lib/headless-vpl'

type StateView = {
  id: string
  name: string
  color: string
  size: number
  type: 'start' | 'normal' | 'end'
}

export default function StateMachine() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [states, setStates] = useState<StateView[]>([])
  const [showGrid, setShowGrid] = useState(true)

  const { workspaceRef, containersRef, connectorsRef } = useWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: false,
    }
  )

  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !workspaceRef.current) return
    initialized.current = true
    const ws = workspaceRef.current

    const stateDefs: {
      name: string
      color: string
      x: number
      y: number
      size: number
      type: 'start' | 'normal' | 'end'
    }[] = [
      { name: 'Idle', color: '#22c55e', x: 60, y: 120, size: 70, type: 'start' },
      { name: 'Loading', color: '#3b82f6', x: 250, y: 40, size: 70, type: 'normal' },
      { name: 'Active', color: '#8b5cf6', x: 250, y: 200, size: 70, type: 'normal' },
      { name: 'Error', color: '#ef4444', x: 440, y: 40, size: 70, type: 'normal' },
      { name: 'Done', color: '#f59e0b', x: 440, y: 200, size: 70, type: 'end' },
    ]

    // コネクター参照マップ: `${nodeIdx}:${pinName}` → Connector
    const connMap = new Map<string, Connector>()
    const stateViews: StateView[] = []

    for (let i = 0; i < stateDefs.length; i++) {
      const d = stateDefs[i]
      const S = d.size
      const inConn = new Connector({ position: new Position(0, -S / 2), name: 'in', type: 'input' })
      const outConn = new Connector({
        position: new Position(S, -S / 2),
        name: 'out',
        type: 'output',
      })
      const topConn = new Connector({
        position: new Position(S / 2, 0),
        name: 'top',
        type: 'input',
      })
      const bottomConn = new Connector({
        position: new Position(S / 2, -S),
        name: 'bottom',
        type: 'output',
      })

      const c = new Container({
        workspace: ws,
        position: new Position(d.x, d.y),
        name: d.name,
        color: d.color,
        width: S,
        height: S,
        children: { in: inConn, out: outConn, top: topConn, bottom: bottomConn },
      })

      connMap.set(`${i}:in`, inConn)
      connMap.set(`${i}:out`, outConn)
      connMap.set(`${i}:top`, topConn)
      connMap.set(`${i}:bottom`, bottomConn)

      containersRef.current.push(c)
      connectorsRef.current.push(inConn, outConn, topConn, bottomConn)
      stateViews.push({ id: c.id, name: d.name, color: d.color, size: S, type: d.type })
    }

    // トランジション
    const transitions: [number, string, number, string, string][] = [
      [0, 'out', 1, 'in', 'load'],
      [0, 'bottom', 2, 'top', 'start'],
      [1, 'out', 3, 'in', 'fail'],
      [1, 'bottom', 2, 'top', 'ready'],
      [2, 'out', 4, 'in', 'complete'],
      [3, 'bottom', 0, 'top', 'retry'],
    ]

    for (const [si, sp, ei, ep, label] of transitions) {
      const start = connMap.get(`${si}:${sp}`)
      const end = connMap.get(`${ei}:${ep}`)
      if (start && end) {
        new Edge({ start, end, edgeType: 'smoothstep', label, markerEnd: { type: 'arrowClosed' } })
      }
    }

    setStates(stateViews)
  }, [workspaceRef, containersRef, connectorsRef])

  return (
    <SampleLayout
      title='State Machine'
      description='ステートマシンエディター — 円形ノード、ラベル付きトランジション'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} />}
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
        {states.map((s) => (
          <div
            key={s.id}
            id={`node-${s.id}`}
            className='node-state'
            style={{
              width: s.size,
              height: s.size,
              borderColor: s.color,
              borderWidth: s.type === 'end' ? '3px' : '2px',
              borderStyle: s.type === 'end' ? 'double' : 'solid',
            }}
          >
            {s.name}
          </div>
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
