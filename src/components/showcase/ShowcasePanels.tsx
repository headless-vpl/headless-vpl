import { useMemo, useRef } from 'react'
import type { ShowcaseMatrixEntry, ShowcaseStatus, ShowcaseTemplate } from '../../data/showcaseMatrix'

export type ShowcaseInspectorField =
  | {
      key: string
      label: string
      type: 'text' | 'color' | 'number'
      value: string | number
      onChange: (value: string) => void
    }
  | {
      key: string
      label: string
      type: 'toggle'
      value: boolean
      onChange: (value: boolean) => void
    }
  | {
      key: string
      label: string
      type: 'select'
      value: string
      options: { label: string; value: string }[]
      onChange: (value: string) => void
    }

export type ShowcaseSelectionCard = {
  title: string
  subtitle: string
  fields: ShowcaseInspectorField[]
}

type ShowcaseToolbarProps = {
  templates?: ShowcaseTemplate[]
  onAddTemplate?: (templateId: string) => void
  onDuplicate?: () => void
  onDelete?: () => void
  onExport?: () => void
  onImport?: (json: string) => void
  onReset?: () => void
}

function statusLabel(status: ShowcaseStatus): string {
  switch (status) {
    case 'advanced':
      return 'Advanced'
    case 'editor':
      return 'Editor'
    default:
      return 'Seed'
  }
}

function statusClassName(status: ShowcaseStatus): string {
  switch (status) {
    case 'advanced':
      return 'showcase-status showcase-status-advanced'
    case 'editor':
      return 'showcase-status showcase-status-editor'
    default:
      return 'showcase-status showcase-status-seed'
  }
}

export function ShowcaseToolbar({
  templates = [],
  onAddTemplate,
  onDuplicate,
  onDelete,
  onExport,
  onImport,
  onReset,
}: ShowcaseToolbarProps) {
  const importRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className='showcase-toolbar'>
      <div className='showcase-toolbar-section'>
        {templates.map((template) => (
          <button
            key={template.id}
            type='button'
            className='showcase-chip'
            title={template.description}
            disabled={!onAddTemplate}
            onClick={() => onAddTemplate?.(template.id)}
          >
            {template.label}
          </button>
        ))}
      </div>
      <div className='showcase-toolbar-section showcase-toolbar-actions'>
        <button type='button' className='showcase-btn' onClick={onDuplicate} disabled={!onDuplicate}>
          Duplicate
        </button>
        <button type='button' className='showcase-btn' onClick={onDelete} disabled={!onDelete}>
          Delete
        </button>
        <button type='button' className='showcase-btn' onClick={onExport} disabled={!onExport}>
          Export
        </button>
        <button
          type='button'
          className='showcase-btn'
          disabled={!onImport}
          onClick={() => importRef.current?.click()}
        >
          Import
        </button>
        <button
          type='button'
          className='showcase-btn showcase-btn-primary'
          onClick={onReset}
          disabled={!onReset}
        >
          Reset
        </button>
        <input
          ref={importRef}
          type='file'
          accept='application/json'
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file || !onImport) return
            const json = await file.text()
            onImport(json)
            event.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

type ShowcaseRightPanelProps = {
  entry: ShowcaseMatrixEntry
  selection?: ShowcaseSelectionCard | null
  stats?: Array<{ label: string; value: string | number }>
  children?: React.ReactNode
}

export function ShowcaseRightPanel({
  entry,
  selection,
  stats = [],
  children,
}: ShowcaseRightPanelProps) {
  const normalizedStats = useMemo(() => stats.filter(Boolean), [stats])

  return (
    <div className='showcase-right-panel'>
      <div className='showcase-panel'>
        <div className='showcase-panel-header'>
          <div>
            <div className='showcase-panel-title'>{entry.title}</div>
            <div className='showcase-panel-copy'>{entry.summary}</div>
          </div>
          <span className={statusClassName(entry.status)}>{statusLabel(entry.status)}</span>
        </div>
        {normalizedStats.length > 0 && (
          <div className='showcase-stats-grid'>
            {normalizedStats.map((stat) => (
              <div key={stat.label} className='showcase-stat'>
                <span className='showcase-stat-label'>{stat.label}</span>
                <span className='showcase-stat-value'>{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selection && (
        <div className='showcase-panel'>
          <div className='showcase-panel-header'>
            <div>
              <div className='showcase-panel-title'>Inspector</div>
              <div className='showcase-panel-copy'>{selection.subtitle}</div>
            </div>
          </div>
          <div className='showcase-selection-title'>{selection.title}</div>
          <div className='showcase-field-list'>
            {selection.fields.map((field) => {
              if (field.type === 'toggle') {
                return (
                  <label key={field.key} className='showcase-field'>
                    <span>{field.label}</span>
                    <input
                      type='checkbox'
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  </label>
                )
              }

              if (field.type === 'select') {
                return (
                  <label key={field.key} className='showcase-field showcase-field-stack'>
                    <span>{field.label}</span>
                    <select
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    >
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              }

              return (
                <label key={field.key} className='showcase-field showcase-field-stack'>
                  <span>{field.label}</span>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className='showcase-panel'>
        <div className='showcase-panel-header'>
          <div>
            <div className='showcase-panel-title'>Implemented</div>
            <div className='showcase-panel-copy'>Current sample coverage.</div>
          </div>
        </div>
        <ul className='showcase-list'>
          {entry.implemented.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className='showcase-panel'>
        <div className='showcase-panel-header'>
          <div>
            <div className='showcase-panel-title'>Next Improvements</div>
            <div className='showcase-panel-copy'>Recommended expansion points.</div>
          </div>
        </div>
        <ul className='showcase-list'>
          {entry.next.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {children}
    </div>
  )
}
