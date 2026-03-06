import { useState } from 'react'
import { useFactory } from '../../../contexts/FactoryContext'
import { PaletteCategory } from './PaletteCategory'
import { paletteItems } from './paletteItems'

export function Palette() {
  const [search, setSearch] = useState('')
  const { setPlacementMode, actions } = useFactory()

  const filtered = search
    ? paletteItems
        .map((cat) => ({
          ...cat,
          items: cat.items.filter((item) =>
            item.label.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : paletteItems

  return (
    <div className='factory-palette'>
      <div className='factory-panel-header'>
        <span>Palette</span>
      </div>
      <div className='factory-palette-search'>
        <input
          type='text'
          placeholder='Search...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='factory-palette-input'
        />
      </div>
      <div className='factory-palette-list'>
        {filtered.map((cat) => (
          <PaletteCategory
            key={cat.name}
            name={cat.name}
            items={cat.items}
            onSelect={(item) => {
              if (item.type === 'container') {
                setPlacementMode({
                  type: 'container',
                  variant: item.variant || 'default',
                  color: item.color,
                  width: item.width,
                  height: item.height,
                })
              } else if (item.type === 'connector') {
                setPlacementMode({ type: 'connector', connectorType: item.connectorType || 'input' })
              } else if (item.type === 'edge') {
                setPlacementMode({ type: 'edge', edgeType: item.edgeType || 'straight' })
              } else if (item.type === 'autolayout') {
                setPlacementMode({
                  type: 'autolayout',
                  direction: (item.variant as 'horizontal' | 'vertical') || 'horizontal',
                })
              } else if (item.type === 'template') {
                actions.loadTemplate(item.variant || '')
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}
