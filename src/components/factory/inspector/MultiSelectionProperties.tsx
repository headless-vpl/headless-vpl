import { useFactory } from '../../../contexts/FactoryContext'

export function MultiSelectionProperties() {
  const {
    selectionItems,
    selectionBounds,
    actions,
    isHidden,
    isLocked,
    toggleHidden,
    toggleLocked,
  } = useFactory()

  const allHidden = selectionItems.every((item) => isHidden(item.id))
  const allLocked = selectionItems.every((item) => isLocked(item.id))

  return (
    <div className='factory-props-section'>
      <div className='factory-props-title'>Multi Selection</div>
      <div className='factory-props-info'>
        <div className='factory-info-row'>
          <span>Items</span>
          <span>{selectionItems.length}</span>
        </div>
        {selectionBounds && (
          <>
            <div className='factory-info-row'>
              <span>Bounds</span>
              <span>
                {Math.round(selectionBounds.width)} x {Math.round(selectionBounds.height)}
              </span>
            </div>
            <div className='factory-info-row'>
              <span>Origin</span>
              <span>
                {Math.round(selectionBounds.x)}, {Math.round(selectionBounds.y)}
              </span>
            </div>
          </>
        )}
      </div>
      <div className='factory-code-actions'>
        <button onClick={actions.frameSelection} className='factory-code-btn'>
          Frame
        </button>
        <button onClick={actions.detachSelected} className='factory-code-btn'>
          Detach
        </button>
        <button
          onClick={() => selectionItems.forEach((item) => {
            if (isHidden(item.id) !== allHidden) return
            toggleHidden(item.id)
          })}
          className='factory-code-btn'
        >
          {allHidden ? 'Show' : 'Hide'}
        </button>
        <button
          onClick={() => selectionItems.forEach((item) => {
            if (isLocked(item.id) !== allLocked) return
            toggleLocked(item.id)
          })}
          className='factory-code-btn'
        >
          {allLocked ? 'Unlock' : 'Lock'}
        </button>
      </div>
    </div>
  )
}
