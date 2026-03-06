import { useEffect, useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Connector, Container, Edge, Position } from '../../lib/headless-vpl'

type PinInputType = 'boolean' | 'string' | 'number' | 'color'
type PinDef = { name: string; type: 'input' | 'output'; color: string; inputType?: PinInputType }
type BlueprintNodeDef = {
  name: string
  headerColor: string
  x: number
  y: number
  pins: PinDef[]
}

type NodeView = {
  id: string
  name: string
  headerColor: string
  w: number
  h: number
  pins: PinDef[]
}

export default function BlueprintEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [nodes, setNodes] = useState<NodeView[]>([])
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
    const W = 180,
      pinSpacing = 28,
      headerH = 30,
      padBottom = 12

    const nodeDefs: BlueprintNodeDef[] = [
      {
        name: 'Begin Play',
        headerColor: '#dc2626',
        x: 40,
        y: 60,
        pins: [{ name: 'Exec', type: 'output', color: '#fff' }],
      },
      {
        name: 'Branch',
        headerColor: '#2563eb',
        x: 300,
        y: 40,
        pins: [
          { name: 'Exec', type: 'input', color: '#fff' },
          { name: 'Condition', type: 'input', color: '#dc2626', inputType: 'boolean' },
          { name: 'True', type: 'output', color: '#fff' },
          { name: 'False', type: 'output', color: '#fff' },
        ],
      },
      {
        name: 'Print String',
        headerColor: '#059669',
        x: 560,
        y: 20,
        pins: [
          { name: 'Exec', type: 'input', color: '#fff' },
          { name: 'String', type: 'input', color: '#ec4899', inputType: 'string' },
          { name: 'Exec Out', type: 'output', color: '#fff' },
        ],
      },
      {
        name: 'Get Variable',
        headerColor: '#7c3aed',
        x: 60,
        y: 220,
        pins: [{ name: 'Value', type: 'output', color: '#dc2626', inputType: 'color' }],
      },
      {
        name: 'Set Actor Hidden',
        headerColor: '#059669',
        x: 560,
        y: 200,
        pins: [
          { name: 'Exec', type: 'input', color: '#fff' },
          { name: 'Hidden', type: 'input', color: '#dc2626', inputType: 'boolean' },
          { name: 'Exec Out', type: 'output', color: '#fff' },
        ],
      },
    ]

    // コネクター参照: [nodeIdx][pinKey] → Connector
    const connectorMap: Map<string, Connector> = new Map()
    const nodeViews: NodeView[] = []

    for (let ni = 0; ni < nodeDefs.length; ni++) {
      const def = nodeDefs[ni]
      const inputPins = def.pins.filter((p) => p.type === 'input')
      const outputPins = def.pins.filter((p) => p.type === 'output')
      const maxPins = Math.max(inputPins.length, outputPins.length, 1)
      const H = headerH + maxPins * pinSpacing + padBottom

      const children: Record<string, Connector> = {}
      for (const pin of def.pins) {
        const pinIdx = pin.type === 'input' ? inputPins.indexOf(pin) : outputPins.indexOf(pin)
        const px = pin.type === 'input' ? 0 : W
        const py = -(headerH + pinIdx * pinSpacing + pinSpacing / 2)
        const key = `${pin.type}_${pin.name}_${pinIdx}`
        const conn = new Connector({
          position: new Position(px, py),
          name: pin.name,
          type: pin.type,
        })
        children[key] = conn
        connectorMap.set(`${ni}:${key}`, conn)
      }

      const c = new Container({
        workspace: ws,
        position: new Position(def.x, def.y),
        name: def.name,
        color: def.headerColor,
        width: W,
        height: H,
        children,
      })
      containersRef.current.push(c)
      for (const conn of Object.values(children)) {
        connectorsRef.current.push(conn)
      }
      nodeViews.push({
        id: c.id,
        name: def.name,
        headerColor: def.headerColor,
        w: W,
        h: H,
        pins: def.pins,
      })
    }

    // エッジ接続
    const edgeDefs: [number, string, number, string][] = [
      [0, 'output_Exec_0', 1, 'input_Exec_0'],
      [1, 'output_True_0', 2, 'input_Exec_0'],
      [1, 'output_False_1', 4, 'input_Exec_0'],
      [3, 'output_Value_0', 1, 'input_Condition_1'],
    ]

    for (const [sn, sk, en, ek] of edgeDefs) {
      const start = connectorMap.get(`${sn}:${sk}`)
      const end = connectorMap.get(`${en}:${ek}`)
      if (start && end) {
        new Edge({ start, end, edgeType: 'smoothstep' })
      }
    }

    setNodes(nodeViews)
  }, [workspaceRef, containersRef, connectorsRef])

  return (
    <SampleLayout
      title='Blueprint Editor'
      description='Unreal Blueprint風 — 複数ピン、smoothstepエッジ、色分けコネクター'
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
        {nodes.map((n) => {
          const inputPins = n.pins.filter((p) => p.type === 'input')
          const outputPins = n.pins.filter((p) => p.type === 'output')
          return (
            <div
              key={n.id}
              id={`node-${n.id}`}
              className='node-blueprint'
              style={{ width: n.w, height: n.h }}
            >
              <div
                className='px-3 py-1.5 text-xs font-semibold text-white'
                style={{ background: n.headerColor }}
              >
                {n.name}
              </div>
              <div className='flex flex-1 justify-between px-2 py-1' style={{ fontSize: '11px' }}>
                <div className='flex flex-col gap-1'>
                  {inputPins.map((p, i) => (
                    <div key={i} className='flex items-center gap-1.5'>
                      <div
                        className='h-2 w-2 rounded-full'
                        style={{ background: p.color, border: '1px solid #666' }}
                      />
                      <span className='text-zinc-500 dark:text-zinc-400'>{p.name}</span>
                      {p.inputType === 'boolean' && (
                        <button className='blueprint-toggle' onClick={(e) => { e.currentTarget.classList.toggle('active') }} />
                      )}
                      {p.inputType === 'string' && (
                        <input type='text' className='blueprint-input' defaultValue='Hello' />
                      )}
                    </div>
                  ))}
                </div>
                <div className='flex flex-col gap-1 items-end'>
                  {outputPins.map((p, i) => (
                    <div key={i} className='flex items-center gap-1.5'>
                      {p.inputType === 'color' && (
                        <input type='color' className='blueprint-input' defaultValue='#dc2626' />
                      )}
                      <span className='text-zinc-500 dark:text-zinc-400'>{p.name}</span>
                      <div
                        className='h-2 w-2 rounded-full'
                        style={{ background: p.color, border: '1px solid #666' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </VplCanvas>
    </SampleLayout>
  )
}
