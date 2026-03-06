import { useCallback, useEffect, useState } from 'react'
import type { Workspace, Container } from '../lib/headless-vpl'

type DebugPanelProps = {
  workspaceRef: React.RefObject<Workspace | null>
  containersRef: React.RefObject<Container[]>
  svgRef: React.RefObject<SVGSVGElement | null>
  overlayRef: React.RefObject<HTMLDivElement | null>
  showGrid: boolean
  onShowGridChange: (v: boolean) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
  ready?: boolean
}

export function DebugPanel({
  workspaceRef,
  containersRef,
  svgRef,
  overlayRef,
  showGrid,
  onShowGridChange,
  canvasRef,
  ready,
}: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showDebug, setShowDebug] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [selectedCount, setSelectedCount] = useState(0)
  const [elementCount, setElementCount] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    const ws = workspaceRef.current
    if (!ws) return

    const syncState = () => {
      setZoom(Math.round(ws.viewport.scale * 100))
      setSelectedCount(ws.selection.size)
      setElementCount(containersRef.current.length)
      setCanUndo(ws.history.canUndo)
      setCanRedo(ws.history.canRedo)
    }

    syncState()

    const unsubs = [
      ws.on('zoom', syncState),
      ws.on('pan', syncState),
      ws.on('select', syncState),
      ws.on('deselect', syncState),
      ws.on('move', syncState),
      ws.on('add', syncState),
      ws.on('remove', syncState),
    ]

    return () => { for (const u of unsubs) u() }
  }, [workspaceRef, containersRef, ready])

  const handleToggleDebug = useCallback((v: boolean) => {
    setShowDebug(v)
    const overlay = overlayRef.current
    if (!overlay) return
    overlay.style.opacity = v ? '1' : '0'
    overlay.style.pointerEvents = v ? '' : 'none'
  }, [overlayRef])

  const handleUndo = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    ws.history.undo()
    setCanUndo(ws.history.canUndo)
    setCanRedo(ws.history.canRedo)
  }, [workspaceRef])

  const handleRedo = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    ws.history.redo()
    setCanUndo(ws.history.canUndo)
    setCanRedo(ws.history.canRedo)
  }, [workspaceRef])

  const handleZoomChange = useCallback((delta: number) => {
    const ws = workspaceRef.current
    const el = canvasRef.current
    if (!ws || !el) return
    const r = el.getBoundingClientRect()
    const cx = r.width / 2
    const cy = r.height / 2
    ws.zoomAt(cx, cy, ws.viewport.scale + delta)
    setZoom(Math.round(ws.viewport.scale * 100))
  }, [workspaceRef, canvasRef])

  const handleZoomReset = useCallback(() => {
    const ws = workspaceRef.current
    const el = canvasRef.current
    if (!ws || !el) return
    const r = el.getBoundingClientRect()
    ws.zoomAt(r.width / 2, r.height / 2, 1)
    setZoom(100)
  }, [workspaceRef, canvasRef])

  const handleFitView = useCallback(() => {
    const ws = workspaceRef.current
    const el = canvasRef.current
    if (!ws || !el) return
    const r = el.getBoundingClientRect()
    ws.fitView(r.width, r.height)
    setZoom(Math.round(ws.viewport.scale * 100))
  }, [workspaceRef, canvasRef])

  if (collapsed) {
    return (
      <div className="debug-panel debug-panel-collapsed">
        <button onClick={() => setCollapsed(false)} className="debug-toggle-btn" title="Open panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <span className="debug-header-title">Debug</span>
        <button onClick={() => setCollapsed(true)} className="debug-toggle-btn" title="Close panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="debug-section">
        <div className="debug-section-title">View</div>
        <label className="debug-row">
          <span>Debug SVG</span>
          <input type="checkbox" checked={showDebug} onChange={(e) => handleToggleDebug(e.target.checked)} />
        </label>
        <label className="debug-row">
          <span>Grid</span>
          <input type="checkbox" checked={showGrid} onChange={(e) => onShowGridChange(e.target.checked)} />
        </label>
      </div>

      <div className="debug-section">
        <div className="debug-section-title">Tools</div>
        <div className="debug-btn-row">
          <button onClick={handleUndo} disabled={!canUndo} className="debug-btn">Undo</button>
          <button onClick={handleRedo} disabled={!canRedo} className="debug-btn">Redo</button>
        </div>
      </div>

      <div className="debug-section">
        <div className="debug-section-title">Viewport</div>
        <div className="debug-btn-row">
          <button onClick={() => handleZoomChange(-0.1)} className="debug-btn">-</button>
          <button onClick={handleZoomReset} className="debug-btn debug-btn-wide">{zoom}%</button>
          <button onClick={() => handleZoomChange(0.1)} className="debug-btn">+</button>
        </div>
        <button onClick={handleFitView} className="debug-btn debug-btn-full">Fit View</button>
      </div>

      <div className="debug-section">
        <div className="debug-section-title">Info</div>
        <div className="debug-info-row">
          <span>Elements</span>
          <span className="debug-info-value">{elementCount}</span>
        </div>
        <div className="debug-info-row">
          <span>Selected</span>
          <span className="debug-info-value">{selectedCount}</span>
        </div>
      </div>
    </div>
  )
}
