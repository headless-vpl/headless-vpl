import { useCallback } from 'react'
import type Container from '../../../lib/headless-vpl/core/Container'
import { useFactory } from '../../../contexts/FactoryContext'
import { MoveCommand, UpdateElementCommand } from '../../../lib/headless-vpl'
import { PropertyField } from './PropertyField'

type Props = {
  container: Container
}

export function ContainerProperties({ container }: Props) {
  const { workspace, syncState } = useFactory()

  const update = useCallback(
    (apply: () => void, revert: () => void) => {
      if (!workspace) {
        apply()
        container.update()
        syncState()
        return
      }
      workspace.history.execute(
        new UpdateElementCommand({
          execute: apply,
          undo: revert,
          onAfter: () => {
            container.update()
            syncState()
          },
        })
      )
    },
    [container, syncState, workspace]
  )

  return (
    <div className='factory-props-section'>
      <div className='factory-props-title'>Container</div>
      <PropertyField
        label='Name'
        type='text'
        value={container.name}
        onChange={(v) => {
          const previous = container.name
          update(() => { container.name = v }, () => { container.name = previous })
        }}
      />
      <PropertyField
        label='Color'
        type='color'
        value={container.color}
        onChange={(v) => {
          const previous = container.color
          update(() => { container.color = v }, () => { container.color = previous })
        }}
      />
      <div className='factory-props-row'>
        <PropertyField
          label='X'
          type='number'
          value={Math.round(container.position.x)}
          onChange={(v) => {
            if (!workspace) return
            workspace.history.execute(
              new MoveCommand(
                container,
                container.position.x,
                container.position.y,
                v,
                container.position.y
              )
            )
            syncState()
          }}
        />
        <PropertyField
          label='Y'
          type='number'
          value={Math.round(container.position.y)}
          onChange={(v) => {
            if (!workspace) return
            workspace.history.execute(
              new MoveCommand(
                container,
                container.position.x,
                container.position.y,
                container.position.x,
                v
              )
            )
            syncState()
          }}
        />
      </div>
      <div className='factory-props-row'>
        <PropertyField
          label='Width'
          type='number'
          value={container.width}
          min={10}
          onChange={(v) => {
            const previous = container.width
            update(() => { container.width = v }, () => { container.width = previous })
          }}
        />
        <PropertyField
          label='Height'
          type='number'
          value={container.height}
          min={10}
          onChange={(v) => {
            const previous = container.height
            update(() => { container.height = v }, () => { container.height = previous })
          }}
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
          onChange={(v) => {
            const previous = container.widthMode
            update(
              () => { container.widthMode = v as 'fixed' | 'hug' | 'fill' },
              () => { container.widthMode = previous }
            )
          }}
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
          onChange={(v) => {
            const previous = container.heightMode
            update(
              () => { container.heightMode = v as 'fixed' | 'hug' | 'fill' },
              () => { container.heightMode = previous }
            )
          }}
        />
      </div>

      <div className='factory-props-title' style={{ marginTop: 8 }}>Padding</div>
      <div className='factory-props-row'>
        <PropertyField
          label='Top'
          type='number'
          value={container.padding.top}
          min={0}
          onChange={(v) => {
            const previous = container.padding.top
            update(() => { container.padding.top = v }, () => { container.padding.top = previous })
          }}
        />
        <PropertyField
          label='Right'
          type='number'
          value={container.padding.right}
          min={0}
          onChange={(v) => {
            const previous = container.padding.right
            update(() => { container.padding.right = v }, () => { container.padding.right = previous })
          }}
        />
      </div>
      <div className='factory-props-row'>
        <PropertyField
          label='Bottom'
          type='number'
          value={container.padding.bottom}
          min={0}
          onChange={(v) => {
            const previous = container.padding.bottom
            update(() => { container.padding.bottom = v }, () => { container.padding.bottom = previous })
          }}
        />
        <PropertyField
          label='Left'
          type='number'
          value={container.padding.left}
          min={0}
          onChange={(v) => {
            const previous = container.padding.left
            update(() => { container.padding.left = v }, () => { container.padding.left = previous })
          }}
        />
      </div>
      <PropertyField
        label='Content Gap'
        type='number'
        value={container.contentGap}
        min={0}
        onChange={(v) => {
          const previous = container.contentGap
          update(() => { container.contentGap = v }, () => { container.contentGap = previous })
        }}
      />
      <PropertyField
        label='Resizable'
        type='checkbox'
        value={container.resizable}
        onChange={(v) => {
          const previous = container.resizable
          update(() => { container.resizable = v }, () => { container.resizable = previous })
        }}
      />
    </div>
  )
}
