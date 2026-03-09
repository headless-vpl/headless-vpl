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
  isExpanded: (id: string) => boolean
  isHidden: (id: string) => boolean
  isLocked: (id: string) => boolean
  onToggleExpand: (id: string, expanded: boolean) => void
  onToggleHidden: (id: string) => void
  onToggleLocked: (id: string) => void
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

function VisibilityIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <path d='M3 3l18 18' />
        <path d='M10.6 10.6a3 3 0 0 0 4.2 4.2' />
        <path d='M9.9 5.2A10.7 10.7 0 0 1 12 5c7 0 10 7 10 7a17.2 17.2 0 0 1-3.1 4.2' />
        <path d='M6.2 6.3A17.7 17.7 0 0 0 2 12s3 7 10 7a9.8 9.8 0 0 0 4.1-.9' />
      </svg>
    )
  }

  return (
    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
      <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  )
}

function LockIcon({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <rect x='4' y='11' width='16' height='10' rx='2' />
        <path d='M8 11V8a4 4 0 1 1 8 0v3' />
      </svg>
    )
  }

  return (
    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
      <rect x='4' y='11' width='16' height='10' rx='2' />
      <path d='M8 11V8a4 4 0 0 1 7.2-2.4' />
      <path d='M18 11V8' />
    </svg>
  )
}

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
  isExpanded,
  isHidden,
  isLocked,
  onToggleExpand,
  onToggleHidden,
  onToggleLocked,
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
  const expanded = isExpanded(item.id)
  const hidden = isHidden(item.id)
  const locked = isLocked(item.id)
  const hasChildren = item.children.length > 0
  const isSelected = item.id === selectedId
  const isDraggable =
    !locked && (item.type === 'container' || item.type === 'connector' || item.type === 'autolayout')
  const isDragging = dragItemId === item.id
  const isDropTarget = dragTargetId === item.id
  const isDroppable = isDragActive && droppableIds.has(item.id)

  const classNames = [
    'factory-tree-node',
    isSelected ? 'factory-tree-node-selected' : '',
    hidden ? 'factory-tree-node-hidden' : '',
    locked ? 'factory-tree-node-locked' : '',
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
              onToggleExpand(item.id, !expanded)
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
        <span className='factory-tree-icon' style={{ color: item.color || 'var(--color-text-secondary)' }}>
          {TYPE_ICONS[item.type] || '\u25A0'}
        </span>
        <span className='factory-tree-label'>{item.name}</span>
        <span className='factory-tree-actions'>
          <span
            className='factory-tree-action'
            onClick={(e) => {
              e.stopPropagation()
              onToggleHidden(item.id)
            }}
            title={hidden ? 'Show item' : 'Hide item'}
          >
            <VisibilityIcon hidden={hidden} />
          </span>
          <span
            className='factory-tree-action'
            onClick={(e) => {
              e.stopPropagation()
              onToggleLocked(item.id)
            }}
            title={locked ? 'Unlock item' : 'Lock item'}
          >
            <LockIcon locked={locked} />
          </span>
        </span>
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
              isExpanded={isExpanded}
              isHidden={isHidden}
              isLocked={isLocked}
              onToggleExpand={onToggleExpand}
              onToggleHidden={onToggleHidden}
              onToggleLocked={onToggleLocked}
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
