import { useCallback } from 'react'
import type AutoLayout from '../../../lib/headless-vpl/core/AutoLayout'
import { useFactory } from '../../../contexts/FactoryContext'
import { PropertyField } from './PropertyField'

type Props = {
  layout: AutoLayout
}

export function AutoLayoutProperties({ layout }: Props) {
  const { syncState } = useFactory()

  const update = useCallback(
    (fn: () => void) => {
      fn()
      layout.update()
      syncState()
    },
    [layout, syncState]
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
        onChange={(v) => update(() => { layout.direction = v as 'horizontal' | 'vertical' })}
      />
      <PropertyField
        label='Gap'
        type='number'
        value={layout.gap}
        min={0}
        onChange={(v) => update(() => { layout.gap = v })}
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
        onChange={(v) => update(() => { layout.alignment = v as 'start' | 'center' | 'end' })}
      />
      <PropertyField
        label='Resizes Parent'
        type='checkbox'
        value={layout.resizesParent}
        onChange={(v) => update(() => { layout.resizesParent = v })}
      />
    </div>
  )
}
