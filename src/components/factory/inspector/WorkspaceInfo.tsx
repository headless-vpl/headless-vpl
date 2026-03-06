import { useFactory } from '../../../contexts/FactoryContext'

export function WorkspaceInfo() {
  const { workspace, elementCount, edgeCount, zoom } = useFactory()

  return (
    <div className='factory-props-section'>
      <div className='factory-props-title'>Workspace</div>
      <div className='factory-props-info'>
        <div className='factory-info-row'>
          <span>Elements</span>
          <span>{elementCount}</span>
        </div>
        <div className='factory-info-row'>
          <span>Edges</span>
          <span>{edgeCount}</span>
        </div>
        <div className='factory-info-row'>
          <span>Zoom</span>
          <span>{zoom}%</span>
        </div>
        {workspace && (
          <>
            <div className='factory-info-row'>
              <span>Viewport X</span>
              <span>{Math.round(workspace.viewport.x)}</span>
            </div>
            <div className='factory-info-row'>
              <span>Viewport Y</span>
              <span>{Math.round(workspace.viewport.y)}</span>
            </div>
          </>
        )}
      </div>
      <div className='factory-props-hint'>
        Select an element to inspect its properties
      </div>
    </div>
  )
}
