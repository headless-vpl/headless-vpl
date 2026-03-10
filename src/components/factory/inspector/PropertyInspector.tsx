import { useFactory } from '../../../contexts/FactoryContext'
import { ContainerProperties } from './ContainerProperties'
import { ConnectorProperties } from './ConnectorProperties'
import { EdgeProperties } from './EdgeProperties'
import { AutoLayoutProperties } from './AutoLayoutProperties'
import { MultiSelectionProperties } from './MultiSelectionProperties'
import { WorkspaceInfo } from './WorkspaceInfo'

export function PropertyInspector() {
  const { selectedElement, selectedCount } = useFactory()

  return (
    <div className='factory-inspector'>
      <div className='factory-panel-header'>
        <span>Inspector</span>
        {selectedCount > 1 && <span>{selectedCount} selected</span>}
      </div>
      <div className='factory-inspector-content'>
        {selectedCount === 0 && <WorkspaceInfo />}
        {selectedCount > 1 && <MultiSelectionProperties />}
        {selectedCount <= 1 && selectedElement?.type === 'container' && (
          <ContainerProperties container={selectedElement.element} />
        )}
        {selectedCount <= 1 && selectedElement?.type === 'connector' && (
          <ConnectorProperties connector={selectedElement.element} />
        )}
        {selectedCount <= 1 && selectedElement?.type === 'edge' && (
          <EdgeProperties edge={selectedElement.element} />
        )}
        {selectedCount <= 1 && selectedElement?.type === 'autolayout' && (
          <AutoLayoutProperties layout={selectedElement.element} />
        )}
      </div>
    </div>
  )
}
