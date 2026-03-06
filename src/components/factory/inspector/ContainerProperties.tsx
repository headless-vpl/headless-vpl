import { useCallback } from 'react'
import type Container from '../../../lib/headless-vpl/core/Container'
import { useFactory } from '../../../contexts/FactoryContext'
import { PropertyField } from './PropertyField'

type Props = {
  container: Container
}

export function ContainerProperties({ container }: Props) {
  const { workspace, syncState } = useFactory()

  const update = useCallback(
    (fn: () => void) => {
      fn()
      container.update()
      syncState()
    },
    [container, syncState]
  )

  return (
    <div className='factory-props-section'>
      <div className='factory-props-title'>Container</div>
      <PropertyField
        label='Name'
        type='text'
        value={container.name}
        onChange={(v) => update(() => { container.name = v })}
      />
      <PropertyField
        label='Color'
        type='color'
        value={container.color}
        onChange={(v) => update(() => { container.setColor(v) })}
      />
      <div className='factory-props-row'>
        <PropertyField
          label='X'
          type='number'
          value={Math.round(container.position.x)}
          onChange={(v) => { container.move(v, container.position.y); syncState() }}
        />
        <PropertyField
          label='Y'
          type='number'
          value={Math.round(container.position.y)}
          onChange={(v) => { container.move(container.position.x, v); syncState() }}
        />
      </div>
      <div className='factory-props-row'>
        <PropertyField
          label='Width'
          type='number'
          value={container.width}
          min={10}
          onChange={(v) => update(() => { container.width = v })}
        />
        <PropertyField
          label='Height'
          type='number'
          value={container.height}
          min={10}
          onChange={(v) => update(() => { container.height = v })}
        />
      </div>
      <div className='factory-props-row'>
        <PropertyField
          label='W Mode'
          type='select'
          value={container.widthMode}
          options={[
            { label: 'Fixed', value: 'fixed' },
            { label: 'Hug', value: 'hug' },
            { label: 'Fill', value: 'fill' },
          ]}
          onChange={(v) => update(() => { container.widthMode = v as 'fixed' | 'hug' | 'fill' })}
        />
        <PropertyField
          label='H Mode'
          type='select'
          value={container.heightMode}
          options={[
            { label: 'Fixed', value: 'fixed' },
            { label: 'Hug', value: 'hug' },
            { label: 'Fill', value: 'fill' },
          ]}
          onChange={(v) => update(() => { container.heightMode = v as 'fixed' | 'hug' | 'fill' })}
        />
      </div>

      <div className='factory-props-title' style={{ marginTop: 8 }}>Padding</div>
      <div className='factory-props-row'>
        <PropertyField
          label='Top'
          type='number'
          value={container.padding.top}
          min={0}
          onChange={(v) => update(() => { container.padding.top = v })}
        />
        <PropertyField
          label='Right'
          type='number'
          value={container.padding.right}
          min={0}
          onChange={(v) => update(() => { container.padding.right = v })}
        />
      </div>
      <div className='factory-props-row'>
        <PropertyField
          label='Bottom'
          type='number'
          value={container.padding.bottom}
          min={0}
          onChange={(v) => update(() => { container.padding.bottom = v })}
        />
        <PropertyField
          label='Left'
          type='number'
          value={container.padding.left}
          min={0}
          onChange={(v) => update(() => { container.padding.left = v })}
        />
      </div>
      <PropertyField
        label='Content Gap'
        type='number'
        value={container.contentGap}
        min={0}
        onChange={(v) => update(() => { container.contentGap = v })}
      />
      <PropertyField
        label='Resizable'
        type='checkbox'
        value={container.resizable}
        onChange={(v) => update(() => { container.resizable = v })}
      />
    </div>
  )
}
