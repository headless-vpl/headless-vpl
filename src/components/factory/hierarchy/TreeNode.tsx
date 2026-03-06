import { useState } from 'react'

export type DropPosition = 'before' | 'on' | 'after'

export type TreeItem = {
  id: string
  name: string
  type: 'container' | 'connector' | 'autolayout' | 'edge'
  color?: string
  children: TreeItem[]
  element: unknown
}

type TreeNodeProps = {
  item: TreeItem
  depth: number
  selectedId: string | null
  onSelect: (item: TreeItem) => void
  dragItemId: string | null
  dragTargetId: string | null
  dropPosition: DropPosition | null
  onDragStart: (e: React.DragEvent, item: TreeItem) => void
  onDragOver: (e: React.DragEvent, item: TreeItem) => void
  onDrop: (e: React.DragEvent, item: TreeItem) => void
  onDragEnd: () => void
  onDragLeave: () => void
  isDragActive: boolean
  droppableIds: Set<string>
}

const TYPE_ICONS: Record<string, string> = {
  container: '\u25A0',
  connector: '\u25CF',
  autolayout: '\u2261',
  edge: '\u2192',
}

/** マウスY座標からドロップ位置を判定（中央を広めに確保してネストしやすくする） */
export function calcDropPosition(e: React.DragEvent, element: HTMLElement): DropPosition {
  const rect = element.getBoundingClientRect()
  const y = e.clientY - rect.top
  const edgeThreshold = Math.min(6, rect.height * 0.25)
  if (y <= edgeThreshold) return 'before'
  if (y >= rect.height - edgeThreshold) return 'after'
  return 'on'
}

export function TreeNode({
  item,
  depth,
  selectedId,
  onSelect,
  dragItemId,
  dragTargetId,
  dropPosition,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDragLeave,
  isDragActive,
  droppableIds,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = item.children.length > 0
  const isSelected = item.id === selectedId
  const isDraggable = item.type === 'container' || item.type === 'connector' || item.type === 'autolayout'
  const isDragging = dragItemId === item.id
  const isDropTarget = dragTargetId === item.id
  const isDroppable = isDragActive && droppableIds.has(item.id)

  const classNames = [
    'factory-tree-node',
    isSelected ? 'factory-tree-node-selected' : '',
    isDragging ? 'dragging' : '',
    isDroppable && !isDropTarget ? 'factory-tree-node-droppable' : '',
    isDropTarget && dropPosition === 'on' ? 'factory-tree-drop-target' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      {isDropTarget && dropPosition === 'before' && (
        <div className='factory-tree-drop-indicator' style={{ marginLeft: depth * 16 }} />
      )}
      <button
        className={classNames}
        style={{ paddingLeft: depth * 16 }}
        draggable={isDraggable}
        onClick={() => onSelect(item)}
        onDragStart={(e) => onDragStart(e, item)}
        onDragOver={(e) => onDragOver(e, item)}
        onDrop={(e) => onDrop(e, item)}
        onDragEnd={onDragEnd}
        onDragLeave={onDragLeave}
      >
        {hasChildren ? (
          <span
            className='factory-tree-toggle'
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            <svg
              width='10'
              height='10'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
            >
              <polyline points='9 18 15 12 9 6' />
            </svg>
          </span>
        ) : (
          <span className='factory-tree-toggle-spacer' />
        )}
        <span
          className='factory-tree-icon'
          style={{ color: item.color || 'var(--color-text-secondary)' }}
        >
          {TYPE_ICONS[item.type] || '\u25A0'}
        </span>
        <span className='factory-tree-label'>{item.name}</span>
      </button>
      {isDropTarget && dropPosition === 'after' && (
        <div className='factory-tree-drop-indicator' style={{ marginLeft: depth * 16 }} />
      )}
      {hasChildren && expanded && (
        <div>
          {item.children.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              dragItemId={dragItemId}
              dragTargetId={dragTargetId}
              dropPosition={dragTargetId === child.id ? dropPosition : null}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onDragLeave={onDragLeave}
              isDragActive={isDragActive}
              droppableIds={droppableIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}
