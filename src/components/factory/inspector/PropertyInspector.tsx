import { useFactory } from '../../../contexts/FactoryContext'
import { ContainerProperties } from './ContainerProperties'
import { ConnectorProperties } from './ConnectorProperties'
import { EdgeProperties } from './EdgeProperties'
import { AutoLayoutProperties } from './AutoLayoutProperties'
import { WorkspaceInfo } from './WorkspaceInfo'

export function PropertyInspector() {
  const { selectedElement } = useFactory()

  return (
    <div className='factory-inspector'>
      <div className='factory-panel-header'>
        <span>Inspector</span>
      </div>
      <div className='factory-inspector-content'>
        {!selectedElement && <WorkspaceInfo />}
        {selectedElement?.type === 'container' && (
          <ContainerProperties container={selectedElement.element} />
        )}
        {selectedElement?.type === 'connector' && (
          <ConnectorProperties connector={selectedElement.element} />
        )}
        {selectedElement?.type === 'edge' && (
          <EdgeProperties edge={selectedElement.element} />
        )}
        {selectedElement?.type === 'autolayout' && (
          <AutoLayoutProperties layout={selectedElement.element} />
        )}
      </div>
    </div>
  )
}
