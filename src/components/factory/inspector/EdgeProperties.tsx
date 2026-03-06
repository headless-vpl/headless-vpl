import { useCallback } from 'react'
import type Edge from '../../../lib/headless-vpl/core/Edge'
import { useFactory } from '../../../contexts/FactoryContext'
import { PropertyField } from './PropertyField'

type Props = {
  edge: Edge
}

export function EdgeProperties({ edge }: Props) {
  const { syncState } = useFactory()

  const update = useCallback(
    (fn: () => void) => {
      fn()
      syncState()
    },
    [syncState]
  )

  return (
    <div className='factory-props-section'>
      <div className='factory-props-title'>Edge</div>
      <PropertyField
        label='Type'
        type='select'
        value={edge.edgeType}
        options={[
          { label: 'Straight', value: 'straight' },
          { label: 'Bezier', value: 'bezier' },
          { label: 'Step', value: 'step' },
          { label: 'SmoothStep', value: 'smoothstep' },
        ]}
        onChange={(v) => update(() => { edge.edgeType = v as 'straight' | 'bezier' | 'step' | 'smoothstep' })}
      />
      <PropertyField
        label='Label'
        type='text'
        value={edge.label || ''}
        onChange={(v) => update(() => { edge.label = v || undefined })}
      />
      <div className='factory-props-info'>
        <span>From: {edge.startConnector.name}</span>
        <span>To: {edge.endConnector.name}</span>
      </div>
    </div>
  )
}
