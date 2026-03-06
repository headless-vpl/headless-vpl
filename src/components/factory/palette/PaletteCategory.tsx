import { useState } from 'react'
import { PaletteItem } from './PaletteItem'
import type { PaletteItemDef } from './paletteItems'

type PaletteCategoryProps = {
  name: string
  items: PaletteItemDef[]
  onSelect: (item: PaletteItemDef) => void
}

export function PaletteCategory({ name, items, onSelect }: PaletteCategoryProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className='factory-palette-category'>
      <button
        className='factory-palette-category-header'
        onClick={() => setOpen(!open)}
      >
        <svg
          width='12'
          height='12'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
        >
          <polyline points='9 18 15 12 9 6' />
        </svg>
        <span>{name}</span>
        <span className='factory-palette-count'>{items.length}</span>
      </button>
      {open && (
        <div className='factory-palette-items'>
          {items.map((item) => (
            <PaletteItem key={item.id} item={item} onSelect={() => onSelect(item)} />
          ))}
        </div>
      )}
    </div>
  )
}
