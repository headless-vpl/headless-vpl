import { useEffect, useRef, useState } from 'react'
import { useNumberDrag } from '../../../hooks/useNumberDrag'

type BaseProps = {
  label: string
}

type TextFieldProps = BaseProps & {
  type: 'text'
  value: string
  onChange: (v: string) => void
}

type NumberFieldProps = BaseProps & {
  type: 'number'
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}

type SelectFieldProps = BaseProps & {
  type: 'select'
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}

type ColorFieldProps = BaseProps & {
  type: 'color'
  value: string
  onChange: (v: string) => void
}

type CheckboxFieldProps = BaseProps & {
  type: 'checkbox'
  value: boolean
  onChange: (v: boolean) => void
}

type PropertyFieldProps =
  | TextFieldProps
  | NumberFieldProps
  | SelectFieldProps
  | ColorFieldProps
  | CheckboxFieldProps

function NumberDragInput(props: NumberFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { onPointerDown, draggedRef, dragValue } = useNumberDrag({
    value: props.value,
    onChange: props.onChange,
    step: props.step ?? 1,
    min: props.min,
    max: props.max,
  })

  const enterEditMode = () => {
    setDraft(String(props.value))
    setEditing(true)
  }

  const confirm = () => {
    const parsed = Number(draft)
    if (!Number.isNaN(parsed)) {
      props.onChange(parsed)
    }
    setEditing(false)
  }

  const cancel = () => {
    setEditing(false)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type='text'
        inputMode='numeric'
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm()
          if (e.key === 'Escape') cancel()
        }}
        onBlur={confirm}
        className='factory-input factory-input-number'
      />
    )
  }

  return (
    <div
      className='factory-input-number-drag'
      onPointerDown={onPointerDown}
      onClick={() => {
        if (!draggedRef.current) {
          enterEditMode()
        }
      }}
    >
      {dragValue ?? props.value}
    </div>
  )
}

export function PropertyField(props: PropertyFieldProps) {
  return (
    <div className='factory-prop-field'>
      <label className='factory-prop-label'>{props.label}</label>
      <div className='factory-prop-input'>
        {props.type === 'text' && (
          <input
            type='text'
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            className='factory-input'
          />
        )}
        {props.type === 'number' && <NumberDragInput {...props} />}
        {props.type === 'select' && (
          <select
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            className='factory-select'
          >
            {props.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {props.type === 'color' && (
          <div className='factory-color-field'>
            <input
              type='color'
              value={props.value}
              onChange={(e) => props.onChange(e.target.value)}
              className='factory-color-input'
            />
            <input
              type='text'
              value={props.value}
              onChange={(e) => props.onChange(e.target.value)}
              className='factory-input factory-input-color-text'
            />
          </div>
        )}
        {props.type === 'checkbox' && (
          <input
            type='checkbox'
            checked={props.value}
            onChange={(e) => props.onChange(e.target.checked)}
            className='factory-checkbox'
          />
        )}
      </div>
    </div>
  )
}
