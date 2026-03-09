import { useCallback } from 'react'
import type Connector from '../../../lib/headless-vpl/core/Connector'
import { useFactory } from '../../../contexts/FactoryContext'
import { MoveCommand, UpdateElementCommand } from '../../../lib/headless-vpl'
import { PropertyField } from './PropertyField'

type Props = {
  connector: Connector
}

export function ConnectorProperties({ connector }: Props) {
  const { workspace, syncState } = useFactory()

  const update = useCallback(
    (apply: () => void, revert: () => void) => {
      if (!workspace) {
        apply()
        connector.update()
        syncState()
        return
      }
      workspace.history.execute(
        new UpdateElementCommand({
          execute: apply,
          undo: revert,
          onAfter: () => {
            connector.update()
            syncState()
          },
        })
      )
    },
    [connector, syncState, workspace]
  )

  return (
    <div className='factory-props-section'>
      <div className='factory-props-title'>Connector</div>
      <PropertyField
        label='Name'
        type='text'
        value={connector.name}
        onChange={(v) => {
          const previous = connector.name
          update(() => { connector.name = v }, () => { connector.name = previous })
        }}
      />
      <PropertyField
        label='Type'
        type='select'
        value={connector.type}
        options={[
          { label: 'Input', value: 'input' },
          { label: 'Output', value: 'output' },
        ]}
        onChange={(v) => {
          const previous = connector.type
          update(() => { connector.type = v }, () => { connector.type = previous })
        }}
      />
      <PropertyField
        label='Hit Radius'
        type='number'
        value={connector.hitRadius}
        min={1}
        max={50}
        onChange={(v) => {
          const previous = connector.hitRadius
          update(() => { connector.hitRadius = v }, () => { connector.hitRadius = previous })
        }}
      />
      <div className='factory-props-row'>
        <PropertyField
          label='X'
          type='number'
          value={Math.round(connector.position.x)}
          onChange={(v) => {
            if (!workspace) return
            workspace.history.execute(
              new MoveCommand(
                connector,
                connector.position.x,
                connector.position.y,
                v,
                connector.position.y
              )
            )
            syncState()
          }}
        />
        <PropertyField
          label='Y'
          type='number'
          value={Math.round(connector.position.y)}
          onChange={(v) => {
            if (!workspace) return
            workspace.history.execute(
              new MoveCommand(
                connector,
                connector.position.x,
                connector.position.y,
                connector.position.x,
                v
              )
            )
            syncState()
          }}
        />
      </div>
    </div>
  )
}
