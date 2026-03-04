import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Workspace,
  Position,
  Connector,
  Edge,
  Container,
  AutoLayout,
  SvgRenderer,
  SnapConnection,
  screenToWorld,
  RemoveCommand,
  EdgeBuilder,
  NestingZone,
  observeContentSize,
  InteractionManager,
  DomSyncHelper,
  bindWheelZoom,
  bindDefaultShortcuts,
} from './lib/headless-vpl'
import { getMouseState } from './lib/headless-vpl/util/mouse'
import { animate } from './lib/headless-vpl/util/animate'

// ─── Types ──────────────────────────────────────────────────────────

type UiState = {
  selectedCount: number
  scale: number
  canUndo: boolean
  canRedo: boolean
  snapToGrid: boolean
  debugMode: boolean
}

// ─── Sub-components ─────────────────────────────────────────────────

function Toolbar({
  uiState,
  onFitView,
  onToggleSnap,
  onToggleDebug,
  onUndo,
  onRedo,
  onAddNode,
  onDeleteSelected,
}: {
  uiState: UiState
  onFitView: () => void
  onToggleSnap: () => void
  onToggleDebug: () => void
  onUndo: () => void
  onRedo: () => void
  onAddNode: () => void
  onDeleteSelected: () => void
}) {
  return (
    <div className='toolbar'>
      <button onClick={onFitView}>Fit View</button>
      <button onClick={onToggleSnap} className={uiState.snapToGrid ? 'active' : ''}>
        Grid: {uiState.snapToGrid ? 'ON' : 'OFF'}
      </button>
      <button onClick={onToggleDebug} className={uiState.debugMode ? 'active' : ''}>
        Debug: {uiState.debugMode ? 'ON' : 'OFF'}
      </button>
      <div className='toolbar-sep' />
      <button onClick={onUndo} disabled={!uiState.canUndo}>
        Undo
      </button>
      <button onClick={onRedo} disabled={!uiState.canRedo}>
        Redo
      </button>
      <div className='toolbar-sep' />
      <button onClick={onAddNode}>+ Add Node</button>
      <button onClick={onDeleteSelected} disabled={uiState.selectedCount === 0}>
        Delete
      </button>
    </div>
  )
}

function StatusBar({ uiState }: { uiState: UiState }) {
  return (
    <div className='status-bar'>
      <span>Selected: {uiState.selectedCount}</span>
      <span>Zoom: {uiState.scale}%</span>
      <span>Grid: {uiState.snapToGrid ? 'ON' : 'OFF'}</span>
      <span className='status-hint'>
        Click: select &middot; Drag: marquee &middot; Middle-drag: pan &middot; Scroll: zoom
        &middot; Ctrl+Z/Shift+Z: undo/redo &middot; Ctrl+C/V: copy/paste &middot; Del: delete
      </span>
    </div>
  )
}

function FlowNode({
  id,
  label,
  width = 130,
  height = 50,
}: {
  id: string
  label: string
  width?: number
  height?: number
}) {
  return (
    <div id={id} className='node-flow' style={{ width, height }}>
      <span className='node-label'>{label}</span>
    </div>
  )
}

function ScratchBlock({
  id,
  label,
  embeddedSize,
}: {
  id: string
  label: string
  embeddedSize: { w: number; h: number } | null
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const style = getComputedStyle(input)
    const ctx = document.createElement('canvas').getContext('2d')!
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const text = value || input.placeholder || ''
    const textWidth = Math.ceil(ctx.measureText(text).width)
    const px = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    const bx = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
    input.style.width = `${Math.max(30, textWidth + px + bx + 2)}px`
  }, [value, embeddedSize])

  return (
    <div id={id} className='node-scratch'>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {embeddedSize ? (
          <div
            className='scratch-slot-spacer'
            style={{ width: embeddedSize.w, height: embeddedSize.h }}
          />
        ) : (
          <input
            ref={inputRef}
            type='text'
            placeholder='val'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className='scratch-input'
          />
        )}
        <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '13px' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

function SayForSecsBlock({
  id,
  slot1Size,
  slot2Size,
}: {
  id: string
  slot1Size: { w: number; h: number } | null
  slot2Size: { w: number; h: number } | null
}) {
  const [val1, setVal1] = useState('hello')
  const [val2, setVal2] = useState('2')
  const input1Ref = useRef<HTMLInputElement>(null)
  const input2Ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    for (const [ref, value] of [
      [input1Ref, val1],
      [input2Ref, val2],
    ] as const) {
      const input = ref.current
      if (!input) continue
      const style = getComputedStyle(input)
      const ctx = document.createElement('canvas').getContext('2d')!
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const text = value || input.placeholder || ''
      const textWidth = Math.ceil(ctx.measureText(text).width)
      const px = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const bx = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
      input.style.width = `${Math.max(30, textWidth + px + bx + 2)}px`
    }
  }, [val1, val2, slot1Size, slot2Size])

  const textStyle = { color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '13px' } as const

  return (
    <div id={id} className='node-scratch'>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={textStyle}>say</span>
        {slot1Size ? (
          <div
            className='scratch-slot-spacer'
            data-slot='slot1'
            style={{ width: slot1Size.w, height: slot1Size.h }}
          />
        ) : (
          <input
            data-slot='slot1'
            ref={input1Ref}
            type='text'
            placeholder='hello'
            value={val1}
            onChange={(e) => setVal1(e.target.value)}
            className='scratch-input'
          />
        )}
        <span style={textStyle}>for</span>
        {slot2Size ? (
          <div
            className='scratch-slot-spacer'
            data-slot='slot2'
            style={{ width: slot2Size.w, height: slot2Size.h }}
          />
        ) : (
          <input
            data-slot='slot2'
            ref={input2Ref}
            type='text'
            placeholder='2'
            value={val2}
            onChange={(e) => setVal2(e.target.value)}
            className='scratch-input'
          />
        )}
        <span style={textStyle}>secs</span>
      </div>
    </div>
  )
}

function ResizableNode({ id }: { id: string }) {
  return (
    <div id={id} className='node-resizable'>
      <span className='node-label'>Resizable</span>
      <span style={{ fontSize: '11px', color: '#71717a' }}>Drag corners to resize</span>
      <div className='resize-handle rh-se' />
      <div className='resize-handle rh-sw' />
      <div className='resize-handle rh-ne' />
      <div className='resize-handle rh-nw' />
    </div>
  )
}

// ─── Main App ───────────────────────────────────────────────────────

function App() {
  const [uiState, setUiState] = useState<UiState>({
    selectedCount: 0,
    scale: 100,
    canUndo: false,
    canRedo: false,
    snapToGrid: false,
    debugMode: false,
  })
  const [dynamicNodes, setDynamicNodes] = useState<{ id: string; w: number; h: number }[]>([])
  const [slotState, setSlotState] = useState<Record<string, { w: number; h: number } | null>>({})

  const workspaceRef = useRef<Workspace | null>(null)
  const containersRef = useRef<Container[]>([])
  const allConnectorsRef = useRef<Connector[]>([])
  const snapToGridRef = useRef(false)
  const setDynRef = useRef(setDynamicNodes)
  setDynRef.current = setDynamicNodes
  const setSlotRef = useRef(setSlotState)
  setSlotRef.current = setSlotState
  const scratchIdsRef = useRef<{ a: string; b: string; c: string }>({ a: '', b: '', c: '' })
  const deleteSelectedRef = useRef<() => void>(() => {})

  // ─ UI sync helper ─
  const syncUi = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    setUiState((prev) => ({
      ...prev,
      selectedCount: ws.selection.size,
      scale: Math.round(ws.viewport.scale * 100),
      canUndo: ws.history.canUndo,
      canRedo: ws.history.canRedo,
    }))
  }, [])

  // ─ Toolbar handlers ─
  const handleFitView = useCallback(() => {
    const ws = workspaceRef.current
    const el = document.querySelector('#canvas') as HTMLElement | null
    if (!ws || !el) return
    const r = el.getBoundingClientRect()
    ws.fitView(r.width, r.height)
    syncUi()
  }, [syncUi])

  const handleToggleSnap = useCallback(() => {
    setUiState((prev) => {
      snapToGridRef.current = !prev.snapToGrid
      return { ...prev, snapToGrid: !prev.snapToGrid }
    })
  }, [])

  const handleUndo = useCallback(() => {
    workspaceRef.current?.history.undo()
    syncUi()
  }, [syncUi])

  const handleRedo = useCallback(() => {
    workspaceRef.current?.history.redo()
    syncUi()
  }, [syncUi])

  const handleAddNode = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    const x = -ws.viewport.x / ws.viewport.scale + 200
    const y = -ws.viewport.y / ws.viewport.scale + 200
    const W = 140,
      H = 50
    const node = new Container({
      workspace: ws,
      position: new Position(x, y),
      name: `Node ${containersRef.current.length + 1}`,
      color: '#3b82f6',
      width: W,
      height: H,
      children: {
        left: new Connector({ position: new Position(0, -H / 2), name: 'left', type: 'input' }),
        right: new Connector({ position: new Position(W, -H / 2), name: 'right', type: 'output' }),
      },
    })
    containersRef.current.push(node)
    allConnectorsRef.current.push(node.children.left, node.children.right)
    setDynRef.current((prev) => [...prev, { id: node.id, w: W, h: H }])
    syncUi()
  }, [syncUi])

  const handleToggleDebug = useCallback(() => {
    setUiState((prev) => {
      const next = !prev.debugMode
      const overlay = document.querySelector('#dom-overlay') as HTMLElement
      if (overlay) overlay.style.visibility = next ? 'hidden' : 'visible'
      return { ...prev, debugMode: next }
    })
  }, [])

  const handleDeleteSelected = useCallback(() => {
    deleteSelectedRef.current()
  }, [])

  // ─ Main setup ─
  useEffect(() => {
    const workspace = new Workspace()
    workspaceRef.current = workspace
    const svgEl = document.querySelector('#workspace') as SVGSVGElement
    new SvgRenderer(svgEl, workspace)

    // ── Block-type area ──
    const scratchA = new Container({
      workspace,
      position: new Position(50, 50),
      name: 'Move 10 steps',
      color: '#7c3aed',
      width: 200,
      height: 60,
      children: {
        top: new Connector({ position: new Position(50, 0), name: 'top', type: 'input' }),
        bottom: new Connector({ position: new Position(50, -60), name: 'bottom', type: 'output' }),
        slot: new AutoLayout({
          position: new Position(16, 10),
          direction: 'horizontal',
          gap: 0,
          alignment: 'center',
          containers: [],
          minWidth: 30,
          minHeight: 40,
        }),
      },
    })
    const scratchB = new Container({
      workspace,
      position: new Position(50, 170),
      name: 'Turn 15 degrees',
      color: '#7c3aed',
      width: 200,
      height: 60,
      children: {
        top: new Connector({ position: new Position(50, 0), name: 'top', type: 'input' }),
        bottom: new Connector({ position: new Position(50, -60), name: 'bottom', type: 'output' }),
        slot: new AutoLayout({
          position: new Position(16, 10),
          direction: 'horizontal',
          gap: 0,
          alignment: 'center',
          containers: [],
          minWidth: 30,
          minHeight: 40,
        }),
      },
    })
    const scratchC = new Container({
      workspace,
      position: new Position(50, 290),
      name: 'say hello for 2 secs',
      color: '#7c3aed',
      width: 280,
      height: 60,
      children: {
        top: new Connector({ position: new Position(50, 0), name: 'top', type: 'input' }),
        bottom: new Connector({ position: new Position(50, -60), name: 'bottom', type: 'output' }),
        slot1: new AutoLayout({
          position: new Position(46, 10),
          direction: 'horizontal',
          gap: 0,
          alignment: 'center',
          containers: [],
          minWidth: 30,
          minHeight: 40,
        }),
        slot2: new AutoLayout({
          position: new Position(120, 10),
          direction: 'horizontal',
          gap: 0,
          alignment: 'center',
          containers: [],
          minWidth: 30,
          minHeight: 40,
        }),
      },
    })
    const allScratchBlocks = [scratchA, scratchB, scratchC]

    const snapConn = new SnapConnection({
      source: scratchB,
      sourcePosition: scratchB.children.top.position,
      target: scratchA,
      targetPosition: scratchA.children.bottom.position,
      workspace,
    })
    scratchIdsRef.current = { a: scratchA.id, b: scratchB.id, c: scratchC.id }

    // ── Edge types showcase ──
    const pair = (y: number, nL: string, nR: string) => {
      const W = 130,
        H = 50
      const l = new Container({
        workspace,
        position: new Position(420, y),
        name: nL,
        color: '#3b82f6',
        width: W,
        height: H,
        children: {
          right: new Connector({
            position: new Position(W, -H / 2),
            name: 'right',
            type: 'output',
          }),
        },
      })
      const r = new Container({
        workspace,
        position: new Position(680, y),
        name: nR,
        color: '#3b82f6',
        width: W,
        height: H,
        children: {
          left: new Connector({ position: new Position(0, -H / 2), name: 'left', type: 'input' }),
        },
      })
      return [l, r] as const
    }
    const [n1, n2] = pair(30, 'N1', 'N2')
    const [n3, n4] = pair(110, 'N3', 'N4')
    const [n5, n6] = pair(190, 'N5', 'N6')
    const [n7, n8] = pair(270, 'N7', 'N8')

    new Edge({
      start: n1.children.right,
      end: n2.children.left,
      edgeType: 'straight',
      label: 'straight',
    })
    new Edge({
      start: n3.children.right,
      end: n4.children.left,
      edgeType: 'bezier',
      label: 'bezier',
    })
    new Edge({ start: n5.children.right, end: n6.children.left, edgeType: 'step', label: 'step' })
    new Edge({
      start: n7.children.right,
      end: n8.children.left,
      edgeType: 'smoothstep',
      label: 'smoothstep',
      markerEnd: { type: 'arrowClosed' },
    })

    // ── AutoLayout ──
    const autoLayoutC = new Container({
      workspace,
      position: new Position(50, 350),
      name: 'AutoLayout',
      color: 'orange',
      widthMode: 'hug',
      heightMode: 'fixed',
      height: 100,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      minWidth: 100,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(10, 10),
          direction: 'horizontal',
          gap: 10,
          alignment: 'center',
          containers: [
            new Container({ name: 'a', color: 'purple', width: 40, height: 40 }),
            new Container({ name: 'b', color: 'purple', width: 60, height: 50 }),
            new Container({ name: 'c', color: 'purple', width: 40, height: 40 }),
            new Container({ name: 'd', color: 'purple', width: 30, height: 40 }),
            new Container({ name: 'e', color: 'purple', width: 40, height: 40 }),
          ],
        }),
      },
    })

    // ── Resizable ──
    const resizableC = new Container({
      workspace,
      position: new Position(500, 370),
      name: 'Resizable',
      color: '#059669',
      width: 180,
      height: 120,
      resizable: true,
      minWidth: 80,
      minHeight: 60,
      maxWidth: 400,
      maxHeight: 300,
    })

    // ── Nesting: Vertical ──
    const nestParentV = new Container({
      workspace,
      position: new Position(420, 520),
      name: 'Vertical Layout',
      color: '#f59e0b',
      widthMode: 'hug',
      heightMode: 'hug',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      minWidth: 120,
      minHeight: 50,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(10, 10),
          direction: 'vertical',
          gap: 8,
          alignment: 'start',
          containers: [
            new Container({ name: 'V-1', color: '#d97706', width: 100, height: 40 }),
            new Container({ name: 'V-2', color: '#b45309', width: 80, height: 40 }),
            new Container({ name: 'V-3', color: '#92400e', width: 120, height: 40 }),
          ],
        }),
      },
    })

    // ── Nesting: Horizontal ──
    const nestParentH = new Container({
      workspace,
      position: new Position(600, 520),
      name: 'Horizontal Layout',
      color: '#06b6d4',
      widthMode: 'hug',
      heightMode: 'hug',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      minWidth: 50,
      minHeight: 60,
      children: {
        autoLayout: new AutoLayout({
          position: new Position(10, 10),
          direction: 'horizontal',
          gap: 8,
          alignment: 'center',
          containers: [
            new Container({ name: 'H-1', color: '#0891b2', width: 50, height: 50 }),
            new Container({ name: 'H-2', color: '#0e7490', width: 60, height: 40 }),
            new Container({ name: 'H-3', color: '#155e75', width: 50, height: 60 }),
          ],
        }),
      },
    })

    const slotZoneA = new NestingZone({
      target: scratchA,
      layout: scratchA.children.slot,
      workspace,
      validator: (d) => {
        if (allScratchBlocks.some((c) => c === d)) return false
        if (scratchA.children.slot.Children.length > 0) return false
        return true
      },
      padding: 5,
    })
    const slotZoneB = new NestingZone({
      target: scratchB,
      layout: scratchB.children.slot,
      workspace,
      validator: (d) => {
        if (allScratchBlocks.some((c) => c === d)) return false
        if (scratchB.children.slot.Children.length > 0) return false
        return true
      },
      padding: 5,
    })

    // scratchC 用: 左右半分判定で slot1/slot2 を振り分け
    const closestAvailableSlot = (d: Container): 'slot1' | 'slot2' | null => {
      const slots = (['slot1', 'slot2'] as const).filter(
        (name) => scratchC.children[name].Children.length === 0
      )
      if (slots.length === 0) return null
      if (slots.length === 1) return slots[0]
      const cx = d.position.x + d.width / 2
      const mid = scratchC.position.x + scratchC.width / 2
      return cx < mid ? 'slot1' : 'slot2'
    }
    const slotZoneC1 = new NestingZone({
      target: scratchC,
      layout: scratchC.children.slot1,
      workspace,
      validator: (d) => !allScratchBlocks.some((c) => c === d) && closestAvailableSlot(d) === 'slot1',
      padding: 5,
    })
    const slotZoneC2 = new NestingZone({
      target: scratchC,
      layout: scratchC.children.slot2,
      workspace,
      validator: (d) => !allScratchBlocks.some((c) => c === d) && closestAvailableSlot(d) === 'slot2',
      padding: 5,
    })

    const nestingZones = [
      new NestingZone({
        target: nestParentV,
        layout: nestParentV.children.autoLayout,
        workspace,
        validator: (d) => d !== nestParentV && d !== nestParentH,
        padding: 5,
      }),
      new NestingZone({
        target: nestParentH,
        layout: nestParentH.children.autoLayout,
        workspace,
        validator: (d) => d !== nestParentV && d !== nestParentH,
        padding: 5,
      }),
      slotZoneA,
      slotZoneB,
      slotZoneC1,
      slotZoneC2,
    ]

    // DOM要素のリサイズを監視 → Container幅を自動同期
    const cleanupA = observeContentSize(document.getElementById('node-scratchA')!, scratchA)
    const cleanupB = observeContentSize(document.getElementById('node-scratchB')!, scratchB)
    const cleanupC = observeContentSize(document.getElementById('node-scratchC')!, scratchC)

    // ── EdgeBuilder preview path (SVG) ──
    const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    previewPath.setAttribute('fill', 'none')
    previewPath.setAttribute('stroke', 'rgba(59,130,246,0.6)')
    previewPath.setAttribute('stroke-width', '2')
    previewPath.setAttribute('stroke-dasharray', '6 3')
    previewPath.setAttribute('display', 'none')
    const viewportGroup = svgEl.querySelector('[data-role="viewport"]') as SVGGElement
    viewportGroup.appendChild(previewPath)

    // Collect all connectors for hit testing
    const allConnectors = allConnectorsRef.current
    allConnectors.length = 0
    for (const c of [scratchA, scratchB, scratchC, n1, n2, n3, n4, n5, n6, n7, n8]) {
      for (const child of Object.values(c.children)) {
        if (child instanceof Connector) allConnectors.push(child)
      }
    }

    const edgeBuilder = new EdgeBuilder({
      workspace,
      edgeType: 'bezier',
      onPreview: (path) => {
        previewPath.setAttribute('d', path)
        previewPath.setAttribute('display', 'block')
      },
      onComplete: (edge) => {
        previewPath.setAttribute('display', 'none')
        // Edge constructor already added it — remove, then re-add via history
        workspace.removeEdge(edge)
        workspace.history.execute({
          execute() {
            workspace.addEdge(edge)
          },
          undo() {
            workspace.removeEdge(edge)
          },
        })
        sync()
      },
      onCancel: () => {
        previewPath.setAttribute('display', 'none')
      },
    })

    // ── All draggable containers ──
    const containers = [
      scratchA,
      scratchB,
      scratchC,
      n1,
      n2,
      n3,
      n4,
      n5,
      n6,
      n7,
      n8,
      autoLayoutC,
      resizableC,
      nestParentV,
      nestParentH,
    ]
    containersRef.current = containers

    // DOM id map: container.id → HTML element id
    const domId = new Map<string, string>([
      [scratchA.id, 'node-scratchA'],
      [scratchB.id, 'node-scratchB'],
      [scratchC.id, 'node-scratchC'],
      [n1.id, 'node-n1'],
      [n2.id, 'node-n2'],
      [n3.id, 'node-n3'],
      [n4.id, 'node-n4'],
      [n5.id, 'node-n5'],
      [n6.id, 'node-n6'],
      [n7.id, 'node-n7'],
      [n8.id, 'node-n8'],
      [resizableC.id, 'node-resizable'],
    ])
    const el = (c: Container) => document.getElementById(domId.get(c.id) || `node-${c.id}`)

    // ── Interaction setup ──
    const canvasEl = svgEl.parentElement as HTMLElement

    // Marquee SVG rect (screen coords, appended to root SVG, not viewport group)
    const mRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    mRect.setAttribute('fill', 'rgba(59,130,246,0.08)')
    mRect.setAttribute('stroke', 'rgba(59,130,246,0.4)')
    mRect.setAttribute('stroke-width', '1')
    mRect.setAttribute('stroke-dasharray', '4 2')
    mRect.setAttribute('display', 'none')
    mRect.setAttribute('rx', '2')
    svgEl.appendChild(mRect)

    const domOverlay = document.querySelector('#dom-overlay') as HTMLElement
    const canvasDiv = document.querySelector('#canvas') as HTMLElement

    // ── UI sync helpers ──
    const sync = () => {
      setUiState((prev) => ({
        ...prev,
        selectedCount: workspace.selection.size,
        scale: Math.round(workspace.viewport.scale * 100),
        canUndo: workspace.history.canUndo,
        canRedo: workspace.history.canRedo,
      }))
    }
    const highlightAll = () => {
      for (const c of containersRef.current) {
        const e = el(c)
        if (e) e.classList.toggle('selected', c.selected)
      }
    }

    workspace.on('select', () => {
      sync()
      highlightAll()
    })
    workspace.on('deselect', () => {
      sync()
      highlightAll()
    })
    workspace.on('zoom', sync)

    // スロットへのネスト/アンネストを検知してUIを切り替える
    const slotParentIds = new Set([scratchA.id, scratchB.id, scratchC.id])
    workspace.on('nest', (event) => {
      const data = event.data as { parentId: string; childId: string } | undefined
      if (!data || !slotParentIds.has(data.parentId)) return
      const allZoneChildren = nestingZones.flatMap((z) => z.layout.Children)
      const child =
        containersRef.current.find((c) => c.id === data.childId) ||
        allZoneChildren.find((c) => c.id === data.childId)
      if (!child) return

      const parent = allScratchBlocks.find((c) => c.id === data.parentId)
      if (!parent) return
      for (const [key, val] of Object.entries(parent.children)) {
        if (!(val instanceof AutoLayout)) continue
        if (!val.Children.some((c) => c.id === data.childId)) continue
        setSlotRef.current((prev) => ({
          ...prev,
          [`${data.parentId}:${key}`]: {
            w: (child as Container).width,
            h: (child as Container).height,
          },
        }))
        break
      }
    })
    workspace.on('unnest', (event) => {
      const data = event.data as { parentId: string } | undefined
      if (!data || !slotParentIds.has(data.parentId)) return
      const parent = allScratchBlocks.find((c) => c.id === data.parentId)
      if (!parent) return
      for (const [key, val] of Object.entries(parent.children)) {
        if (!(val instanceof AutoLayout)) continue
        if (val.Children.length === 0) {
          setSlotRef.current((prev) => ({ ...prev, [`${data.parentId}:${key}`]: null }))
        }
      }
    })

    // Edge ハイライト用ヘルパー
    let selectedEdgeId: string | null = null
    const highlightEdge = (edgeId: string | null) => {
      if (selectedEdgeId) {
        const prevG = viewportGroup.querySelector(`[data-edge-id="${selectedEdgeId}"]`)
        const prevPath = prevG?.querySelector('[data-role="edge-path"]')
        if (prevPath) {
          prevPath.setAttribute('stroke', 'black')
          prevPath.setAttribute('stroke-width', '2')
        }
      }
      selectedEdgeId = edgeId
      if (edgeId) {
        const g = viewportGroup.querySelector(`[data-edge-id="${edgeId}"]`)
        const pathEl = g?.querySelector('[data-role="edge-path"]')
        if (pathEl) {
          pathEl.setAttribute('stroke', '#ef4444')
          pathEl.setAttribute('stroke-width', '4')
        }
      }
    }

    // ── InteractionManager ──
    const interaction = new InteractionManager({
      workspace,
      canvasElement: canvasEl,
      containers: () => containersRef.current,
      connectors: () => allConnectors,
      snapConnections: [snapConn],
      nestingZones,
      edgeBuilder,
      snapToGrid: () => snapToGridRef.current,
      gridSize: 24,
      onModeChange: (mode) => {
        if (mode === 'dragging' || mode === 'panning') {
          canvasEl.style.cursor = 'grabbing'
        } else if (mode === 'edgeBuilding') {
          canvasEl.style.cursor = 'crosshair'
        } else {
          canvasEl.style.cursor = ''
        }
      },
      onEdgeSelect: (edgeId) => highlightEdge(edgeId),
      onUnnest: (hit) => {
        if (!containersRef.current.includes(hit)) {
          containersRef.current.push(hit)
        }
        sync()
      },
      onNest: (nested) => {
        const idx = containersRef.current.indexOf(nested)
        if (idx >= 0) containersRef.current.splice(idx, 1)
        setDynRef.current((prev) => prev.filter((n) => n.id !== nested.id))

        // スロットへのネスト時、即座に中央配置 + Connector 追従を適用
        for (const scratch of allScratchBlocks) {
          for (const val of Object.values(scratch.children)) {
            if (!(val instanceof AutoLayout) || val.Children.length === 0) continue
            const child = val.Children[0] as Container
            const targetY = (scratch.height - child.height) / 2
            if (Math.abs(val.position.y - targetY) > 0.1) {
              val.position.y = targetY
              val.update()
            }
          }
          const bottomY = scratch.position.y + scratch.height
          scratch.children.bottom.move(scratch.position.x + 50, bottomY)
        }

        sync()
      },
      onDragEnd: () => sync(),
      onMarqueeUpdate: (rect) => {
        if (rect) {
          mRect.setAttribute('display', 'block')
          mRect.setAttribute('x', `${rect.x}`)
          mRect.setAttribute('y', `${rect.y}`)
          mRect.setAttribute('width', `${rect.width}`)
          mRect.setAttribute('height', `${rect.height}`)
        } else {
          mRect.setAttribute('display', 'none')
        }
      },
      onResizeEnd: () => sync(),
    })

    // ── Mouse ──
    const mouse = getMouseState(canvasEl, {
      mousedown: (_bs, mp, ev) => {
        if (ev.button === 1) ev.preventDefault()
        interaction.handlePointerDown(mp, ev)
      },
      mouseup: (_bs, mp) => interaction.handlePointerUp(mp),
    })

    // 中ボタンの既定動作を抑制
    canvasEl.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault()
    })

    // ── Wheel zoom ──
    const cleanupZoom = bindWheelZoom(canvasEl, { workspace, onChange: sync })

    // ── Keyboard ──
    const deleteSelected = () => {
      // Edge 削除
      const edgeId = interaction.getSelectedEdgeId()
      if (edgeId) {
        const edge = workspace.edges.find((e) => e.id === edgeId)
        if (edge) {
          workspace.history.execute({
            execute() {
              workspace.removeEdge(edge)
            },
            undo() {
              workspace.addEdge(edge)
            },
          })
        }
        highlightEdge(null)
        sync()
        return
      }
      // Container 削除
      const sel = workspace.selection.getSelection().slice()
      for (const s of sel) {
        const htmlId = domId.get(s.id)
        if (htmlId) {
          const domEl = document.getElementById(htmlId)
          if (domEl) domEl.style.display = 'none'
        }
        workspace.history.execute(new RemoveCommand(workspace, s))
        const i = containersRef.current.indexOf(s as Container)
        if (i >= 0) containersRef.current.splice(i, 1)
      }
      setDynRef.current((prev) =>
        prev.filter((n) => containersRef.current.some((c) => c.id === n.id))
      )
      sync()
    }
    deleteSelectedRef.current = deleteSelected

    const kb = bindDefaultShortcuts({
      workspace,
      element: document.body,
      containers: () => containersRef.current,
      onChange: sync,
      onDelete: () => deleteSelected(),
      paste: {
        factory: (json, pos) => {
          const w = (json.width as number) || 140
          const h = (json.height as number) || 50
          return new Container({
            workspace,
            position: new Position(pos.x, pos.y),
            name: ((json.name as string) || 'Node') + ' (copy)',
            color: '#3b82f6',
            width: w,
            height: h,
            children: {
              left: new Connector({
                position: new Position(0, -h / 2),
                name: 'left',
                type: 'input',
              }),
              right: new Connector({
                position: new Position(w, -h / 2),
                name: 'right',
                type: 'output',
              }),
            },
          })
        },
        onPaste: (pasted) => {
          for (const n of pasted) {
            containersRef.current.push(n)
            setDynRef.current((prev) => [...prev, { id: n.id, w: n.width, h: n.height }])
          }
        },
      },
    })

    // ── DomSyncHelper ──
    const domSync = new DomSyncHelper({
      workspace,
      overlayElement: domOverlay,
      canvasElement: canvasDiv,
      gridSize: 24,
      resolveElement: el,
    })

    // ── Animate ──
    animate(() => {
      interaction.tick(mouse.mousePosition, mouse.buttonState)

      // DOM 同期
      domSync.syncAll(containersRef.current)

      // スロットの垂直中央配置
      for (const scratch of allScratchBlocks) {
        for (const val of Object.values(scratch.children)) {
          if (!(val instanceof AutoLayout) || val.Children.length === 0) continue
          const child = val.Children[0] as Container
          const targetY = (scratch.height - child.height) / 2
          if (Math.abs(val.position.y - targetY) > 0.1) {
            val.position.y = targetY
            val.update()
          }
        }
      }

      // bottom Connector の位置追従
      for (const scratch of allScratchBlocks) {
        const targetY = scratch.position.y + scratch.height
        const bottom = scratch.children.bottom
        if (Math.abs(bottom.position.y - targetY) > 0.1) {
          bottom.move(scratch.position.x + 50, targetY)
        }
      }

      // scratchC の slot2 x 位置を DOM から動的同期
      const { scale } = workspace.viewport
      const scratchCEl = document.getElementById('node-scratchC')
      if (scratchCEl) {
        const parentRect = scratchCEl.getBoundingClientRect()
        for (const slotName of ['slot1', 'slot2'] as const) {
          const slotEl = scratchCEl.querySelector(`[data-slot="${slotName}"]`) as HTMLElement
          if (!slotEl) continue
          const slotRect = slotEl.getBoundingClientRect()
          const relX = (slotRect.left - parentRect.left) / scale
          const layout = scratchC.children[slotName]
          if (Math.abs(layout.position.x - relX) > 0.5) {
            layout.position.x = relX
            layout.update()
          }
        }
      }

      // 埋め込みブロックの DOM 位置同期
      for (const zone of [slotZoneA, slotZoneB, slotZoneC1, slotZoneC2]) {
        for (const child of zone.layout.Children as Container[]) {
          const e = el(child)
          if (!e) continue
          e.style.transform = `translate(${child.position.x}px, ${child.position.y}px)`
        }
      }
    })

    return () => {
      cleanupA()
      cleanupB()
      cleanupC()
      kb.destroy()
      interaction.destroy()
      cleanupZoom()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='app'>
      <header className='header'>
        <h1 style={{ margin: 0 }}>Headless VPL Demo</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#71717a' }}>
          All features — Selection, Edges, EdgeBuilder, Snap, Marquee, Undo/Redo, Copy/Paste, Grid,
          Resize, Auto-pan, Nesting
        </p>
      </header>
      <Toolbar
        uiState={uiState}
        onFitView={handleFitView}
        onToggleSnap={handleToggleSnap}
        onToggleDebug={handleToggleDebug}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddNode={handleAddNode}
        onDeleteSelected={handleDeleteSelected}
      />
      <div id='canvas' className='canvas'>
        <svg id='workspace' className='workspace-svg' />
        <div id='dom-overlay' className='dom-overlay'>
          <ScratchBlock
            id='node-scratchA'
            label='Move 10 steps'
            embeddedSize={slotState[`${scratchIdsRef.current.a}:slot`] ?? null}
          />
          <ScratchBlock
            id='node-scratchB'
            label='Turn 15 degrees'
            embeddedSize={slotState[`${scratchIdsRef.current.b}:slot`] ?? null}
          />
          <SayForSecsBlock
            id='node-scratchC'
            slot1Size={slotState[`${scratchIdsRef.current.c}:slot1`] ?? null}
            slot2Size={slotState[`${scratchIdsRef.current.c}:slot2`] ?? null}
          />
          <FlowNode id='node-n1' label='N1' />
          <FlowNode id='node-n2' label='N2' />
          <FlowNode id='node-n3' label='N3' />
          <FlowNode id='node-n4' label='N4' />
          <FlowNode id='node-n5' label='N5' />
          <FlowNode id='node-n6' label='N6' />
          <FlowNode id='node-n7' label='N7' />
          <FlowNode id='node-n8' label='N8' />
          <ResizableNode id='node-resizable' />
          {dynamicNodes.map((n) => (
            <FlowNode key={n.id} id={`node-${n.id}`} label='Node' width={n.w} height={n.h} />
          ))}
        </div>
      </div>
      <StatusBar uiState={uiState} />
    </div>
  )
}

export default App
