import type { PaletteItemDef } from './paletteItems'

type PaletteItemProps = {
  item: PaletteItemDef
  onSelect: () => void
}

export function PaletteItem({ item, onSelect }: PaletteItemProps) {
  return (
    <button className='factory-palette-item' onClick={onSelect} title={item.description}>
      <div
        className='factory-palette-item-preview'
        style={{ backgroundColor: item.color || '#3b82f6' }}
      />
      <div className='factory-palette-item-info'>
        <span className='factory-palette-item-label'>{item.label}</span>
        <span className='factory-palette-item-desc'>{item.description}</span>
      </div>
    </button>
  )
}
