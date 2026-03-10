import { useFactory } from '../../contexts/FactoryContext'

export function StatusBar() {
  const {
    elementCount,
    edgeCount,
    selectedCount,
    zoom,
    placementMode,
    toolMode,
    autosaveState,
    selectionPath,
  } = useFactory()

  return (
    <div className='factory-statusbar'>
      <span>Tool: {toolMode}</span>
      <span className='factory-statusbar-sep'>|</span>
      <span>Elements: {elementCount}</span>
      <span className='factory-statusbar-sep'>|</span>
      <span>Edges: {edgeCount}</span>
      <span className='factory-statusbar-sep'>|</span>
      <span>Selected: {selectedCount}</span>
      <span className='factory-statusbar-sep'>|</span>
      <span>Zoom: {zoom}%</span>
      <span className='factory-statusbar-sep'>|</span>
      <span>Autosave: {autosaveState}</span>
      {selectionPath.length > 0 && (
        <>
          <span className='factory-statusbar-sep'>|</span>
          <span className='factory-statusbar-placement'>{selectionPath.join(' / ')}</span>
        </>
      )}
      {placementMode.type === 'edge' && (
        <>
          <span className='factory-statusbar-sep'>|</span>
          <span className='factory-statusbar-placement'>
            {placementMode.startConnector
              ? 'Edge: 終点コネクターをクリック (ESC to cancel)'
              : 'Edge: 始点コネクターをクリック (ESC to cancel)'}
          </span>
        </>
      )}
      {placementMode.type !== 'none' && placementMode.type !== 'edge' && (
        <>
          <span className='factory-statusbar-sep'>|</span>
          <span className='factory-statusbar-placement'>
            Placing: {placementMode.type} (ESC to cancel)
          </span>
        </>
      )}
    </div>
  )
}
