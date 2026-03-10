import { useCallback } from 'react'
import { useFactory } from '../../../contexts/FactoryContext'

export function CanvasToolbar() {
  const {
    workspace,
    showGrid,
    setShowGrid,
    showDebugSvg,
    setShowDebugSvg,
    zoom,
    toolMode,
    setToolMode,
    syncState,
    actions,
  } = useFactory()

  const handleUndo = useCallback(() => {
    if (!workspace) return
    workspace.history.undo()
    syncState()
  }, [workspace, syncState])

  const handleRedo = useCallback(() => {
    if (!workspace) return
    workspace.history.redo()
    syncState()
  }, [workspace, syncState])

  const handleZoom = useCallback(
    (delta: number) => {
      if (!workspace) return
      const scale = workspace.viewport.scale + delta
      workspace.zoomAt(0, 0, Math.max(0.1, Math.min(3, scale)))
      syncState()
    },
    [workspace, syncState]
  )

  const handleZoomReset = useCallback(() => {
    if (!workspace) return
    workspace.zoomAt(0, 0, 1)
    syncState()
  }, [workspace, syncState])

  const handleFitView = useCallback(() => {
    if (!workspace) return
    const el = document.querySelector('.factory-canvas-area')
    if (!el) return
    const r = el.getBoundingClientRect()
    workspace.fitView(r.width, r.height)
    syncState()
  }, [workspace, syncState])

  return (
    <div className='factory-toolbar'>
      <div className='factory-toolbar-group'>
        <button
          onClick={() => setToolMode('select')}
          className={`factory-toolbar-btn${toolMode === 'select' ? ' factory-toolbar-btn-active' : ''}`}
          title='Select mode'
        >
          Select
        </button>
        <button
          onClick={() => setToolMode('move')}
          className={`factory-toolbar-btn${toolMode === 'move' ? ' factory-toolbar-btn-active' : ''}`}
          title='Move gizmo mode'
        >
          Move
        </button>
        <button
          onClick={() => setToolMode('connect')}
          className={`factory-toolbar-btn${toolMode === 'connect' ? ' factory-toolbar-btn-active' : ''}`}
          title='Connect mode'
        >
          Connect
        </button>
      </div>

      <div className='factory-toolbar-group'>
        <button
          onClick={handleUndo}
          disabled={!workspace?.history.canUndo}
          className='factory-toolbar-btn'
          title='Undo (Ctrl+Z)'
        >
          Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={!workspace?.history.canRedo}
          className='factory-toolbar-btn'
          title='Redo (Ctrl+Y)'
        >
          Redo
        </button>
      </div>

      <div className='factory-toolbar-group'>
        <button onClick={actions.frameSelection} className='factory-toolbar-btn'>
          Frame
        </button>
        <button onClick={() => handleZoom(-0.1)} className='factory-toolbar-btn'>
          -
        </button>
        <button onClick={handleZoomReset} className='factory-toolbar-btn factory-toolbar-btn-wide'>
          {zoom}%
        </button>
        <button onClick={() => handleZoom(0.1)} className='factory-toolbar-btn'>
          +
        </button>
        <button onClick={handleFitView} className='factory-toolbar-btn'>
          Fit
        </button>
      </div>

      <div className='factory-toolbar-group'>
        <label className='factory-toolbar-toggle'>
          <input
            type='checkbox'
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          <span>Grid</span>
        </label>
        <label className='factory-toolbar-toggle'>
          <input
            type='checkbox'
            checked={showDebugSvg}
            onChange={(e) => setShowDebugSvg(e.target.checked)}
          />
          <span>SVG</span>
        </label>
      </div>
    </div>
  )
}
