import { useCallback } from 'react'
import type Connector from '../../../lib/headless-vpl/core/Connector'
import { useFactory } from '../../../contexts/FactoryContext'
import { PropertyField } from './PropertyField'

type Props = {
  connector: Connector
}

export function ConnectorProperties({ connector }: Props) {
  const { syncState } = useFactory()

  const update = useCallback(
    (fn: () => void) => {
      fn()
      connector.update()
      syncState()
    },
    [connector, syncState]
  )

  return (
    <div className='factory-props-section'>
      <div className='factory-props-title'>Connector</div>
      <PropertyField
        label='Name'
        type='text'
        value={connector.name}
        onChange={(v) => update(() => { connector.name = v })}
      />
      <PropertyField
        label='Type'
        type='select'
        value={connector.type}
        options={[
          { label: 'Input', value: 'input' },
          { label: 'Output', value: 'output' },
        ]}
        onChange={(v) => update(() => { connector.type = v })}
      />
      <PropertyField
        label='Hit Radius'
        type='number'
        value={connector.hitRadius}
        min={1}
        max={50}
        onChange={(v) => update(() => { connector.hitRadius = v })}
      />
      <div className='factory-props-row'>
        <PropertyField
          label='X'
          type='number'
          value={Math.round(connector.position.x)}
          onChange={(v) => { connector.move(v, connector.position.y); syncState() }}
        />
        <PropertyField
          label='Y'
          type='number'
          value={Math.round(connector.position.y)}
          onChange={(v) => { connector.move(connector.position.x, v); syncState() }}
        />
      </div>
    </div>
  )
}
