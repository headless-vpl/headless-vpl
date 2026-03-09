import { useCallback } from 'react'
import type AutoLayout from '../../../lib/headless-vpl/core/AutoLayout'
import { useFactory } from '../../../contexts/FactoryContext'
import { UpdateElementCommand } from '../../../lib/headless-vpl'
import { PropertyField } from './PropertyField'

type Props = {
  layout: AutoLayout
}

export function AutoLayoutProperties({ layout }: Props) {
  const { workspace, syncState } = useFactory()

  const update = useCallback(
    (apply: () => void, revert: () => void) => {
      if (!workspace) {
        apply()
        layout.update()
        syncState()
        return
      }
      workspace.history.execute(
        new UpdateElementCommand({
          execute: apply,
          undo: revert,
          onAfter: () => {
            layout.update()
            syncState()
          },
        })
      )
    },
    [layout, syncState, workspace]
  )

  return (
    <div className='factory-props-section'>
      <div className='factory-props-title'>AutoLayout</div>
      <PropertyField
        label='Direction'
        type='select'
        value={layout.direction}
        options={[
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' },
        ]}
        onChange={(v) => {
          const previous = layout.direction
          update(
            () => { layout.direction = v as 'horizontal' | 'vertical' },
            () => { layout.direction = previous }
          )
        }}
      />
      <PropertyField
        label='Gap'
        type='number'
        value={layout.gap}
        min={0}
        onChange={(v) => {
          const previous = layout.gap
          update(() => { layout.gap = v }, () => { layout.gap = previous })
        }}
      />
      <PropertyField
        label='Alignment'
        type='select'
        value={layout.alignment}
        options={[
          { label: 'Start', value: 'start' },
          { label: 'Center', value: 'center' },
          { label: 'End', value: 'end' },
        ]}
        onChange={(v) => {
          const previous = layout.alignment
          update(
            () => { layout.alignment = v as 'start' | 'center' | 'end' },
            () => { layout.alignment = previous }
          )
        }}
      />
      <PropertyField
        label='Resizes Parent'
        type='checkbox'
        value={layout.resizesParent}
        onChange={(v) => {
          const previous = layout.resizesParent
          update(() => { layout.resizesParent = v }, () => { layout.resizesParent = previous })
        }}
      />
    </div>
  )
}
