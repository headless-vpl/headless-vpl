import { useCallback } from 'react'
import type Edge from '../../../lib/headless-vpl/core/Edge'
import { useFactory } from '../../../contexts/FactoryContext'
import { UpdateElementCommand } from '../../../lib/headless-vpl'
import { PropertyField } from './PropertyField'

type Props = {
  edge: Edge
}

export function EdgeProperties({ edge }: Props) {
  const { workspace, syncState } = useFactory()

  const update = useCallback(
    (apply: () => void, revert: () => void) => {
      if (!workspace) {
        apply()
        syncState()
        return
      }
      workspace.history.execute(
        new UpdateElementCommand({
          execute: apply,
          undo: revert,
          onAfter: () => {
            workspace.eventBus.emit('update', edge)
            syncState()
          },
        })
      )
    },
    [edge, syncState, workspace]
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
        onChange={(v) => {
          const previous = edge.edgeType
          update(
            () => { edge.edgeType = v as 'straight' | 'bezier' | 'step' | 'smoothstep' },
            () => { edge.edgeType = previous }
          )
        }}
      />
      <PropertyField
        label='Label'
        type='text'
        value={edge.label || ''}
        onChange={(v) => {
          const previous = edge.label
          update(() => { edge.label = v || undefined }, () => { edge.label = previous })
        }}
      />
      <div className='factory-props-info'>
        <span>From: {edge.startConnector.name}</span>
        <span>To: {edge.endConnector.name}</span>
      </div>
    </div>
  )
}
