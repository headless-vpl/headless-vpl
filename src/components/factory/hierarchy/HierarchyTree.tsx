import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFactory } from '../../../contexts/FactoryContext'
import {
  BatchCommand,
  ConnectCommand,
  DetachCommand,
  NestCommand,
  ReparentChildCommand,
} from '../../../lib/headless-vpl'
import type { Connector } from '../../../lib/headless-vpl'
import type AutoLayout from '../../../lib/headless-vpl/core/AutoLayout'
import type Container from '../../../lib/headless-vpl/core/Container'
import type Edge from '../../../lib/headless-vpl/core/Edge'
import type { MovableObject } from '../../../lib/headless-vpl/core/MovableObject'
import type { IWorkspaceElement } from '../../../lib/headless-vpl'
import type Workspace from '../../../lib/headless-vpl/core/Workspace'
import { TreeNode, calcDropPosition } from './TreeNode'
import type { DropPosition, TreeItem } from './TreeNode'

/** Container をツリーアイテムに変換（再帰的に親子構造を展開） */
function containerToTreeItem(c: Container, visited = new Set<string>()): TreeItem {
  if (visited.has(c.id)) {
    return { id: c.id, name: `${c.name} (circular)`, type: 'container', color: c.color, children: [], element: c }
  }
  visited.add(c.id)

  const children: TreeItem[] = []

  // (A) 構造的子要素（コネクター、AutoLayout）
  for (const [key, child] of Object.entries(c.children)) {
    if ('hitRadius' in child) {
      children.push({
        id: child.id,
        name: `${key} (${(child as { connectorType?: string }).connectorType || 'connector'})`,
        type: 'connector',
        children: [],
        element: child,
      })
    } else if ('direction' in child) {
      // AutoLayout → 中のコンテナを再帰展開
      const layout = child as AutoLayout
      const layoutChildren = (layout.Children as Container[]).map(
        (nested) => containerToTreeItem(nested, visited)
      )
      children.push({
        id: layout.id,
        name: `${key} (AutoLayout ${layout.direction})`,
        type: 'autolayout',
        children: layoutChildren,
        element: layout,
      })
    } else if ('children' in child && 'color' in child) {
      // 構造的にぶら下がった Container も再帰展開
      children.push(containerToTreeItem(child as Container, visited))
    }
  }

  // (B) snap子要素（Children大文字）を再帰展開
  for (const snapChild of c.Children) {
    if ('children' in snapChild && 'color' in snapChild) {
      children.push(containerToTreeItem(snapChild as Container, visited))
    }
  }

  return {
    id: c.id,
    name: c.name,
    type: 'container',
    color: c.color,
    children,
    element: c,
  }
}

/** ツリーから全IDを収集 */
function collectAllIds(items: TreeItem[]): Set<string> {
  const ids = new Set<string>()
  const walk = (list: TreeItem[]) => {
    for (const item of list) {
      ids.add(item.id)
      walk(item.children)
    }
  }
  walk(items)
  return ids
}

/** スタンドアロン要素をツリーアイテムに変換 */
function elementToTreeItem(el: IWorkspaceElement): TreeItem {
  const mo = el as MovableObject
  let typeName: TreeItem['type'] = 'container'
  if (mo.type === 'input' || mo.type === 'output') {
    typeName = 'connector'
  }
  return {
    id: el.id,
    name: mo.name || mo.type,
    type: typeName,
    children: [],
    element: el,
  }
}

/** ドラッグ元がドロップ先の祖先でないかチェック（循環参照防止） */
function isAncestorOf(draggedEl: MovableObject, targetEl: MovableObject): boolean {
  // snap Parent チェーンを辿る
  let current: MovableObject | null = targetEl.Parent
  while (current) {
    if (current === draggedEl) return true
    current = current.Parent
  }
  // AutoLayout parentContainer チェーンを辿る
  let layout: AutoLayout | null = targetEl.parentAutoLayout
  while (layout) {
    if (layout.parentContainer === draggedEl) return true
    const parent = layout.parentContainer
    if (!parent) break
    layout = parent.parentAutoLayout
  }
  return false
}

/** 構造的子要素の親コンテナとキーを検索する */
function findSourceContainerInfo(
  child: MovableObject | AutoLayout,
  workspace: Workspace
): { container: Container; key: string } | null {
  const allContainers = workspace.elements.filter(
    (el) => el.type === 'container'
  ) as Container[]
  for (const c of allContainers) {
    const key = c.findChildKey(child)
    if (key) return { container: c, key }
  }
  return null
}

/** ワークスペース上で構造的親コンテナを持つ要素のID集合を収集 */
function collectStructuralChildIds(workspace: Workspace): Set<string> {
  const ids = new Set<string>()
  const allContainers = workspace.elements.filter(
    (el) => el.type === 'container'
  ) as Container[]
  for (const c of allContainers) {
    for (const child of Object.values(c.children) as (MovableObject | AutoLayout)[]) {
      ids.add(child.id)
    }
  }
  return ids
}

/** snap 親リンクが双方向で有効か判定（片側だけ残った壊れリンクを除外） */
function hasValidSnapParent(container: Container, allContainers: Set<Container>): boolean {
  const parent = container.Parent as Container | null
  return Boolean(parent && allContainers.has(parent) && parent.Children.has(container))
}

/** AutoLayout 親リンクが有効か判定（Children 側にも存在しているか） */
function hasValidAutoLayoutParent(container: Container): boolean {
  const layout = container.parentAutoLayout
  return Boolean(layout && layout.Children.includes(container))
}

/** 衝突しないキー名を生成する */
function resolveTargetKey(sourceKey: string, targetContainer: Container): string {
  if (!(sourceKey in targetContainer.children)) return sourceKey
  let i = 2
  while (`${sourceKey}_${i}` in targetContainer.children) i++
  return `${sourceKey}_${i}`
}

/** AutoLayoutの子孫コンテナにtargetが含まれていないかチェック（循環参照防止） */
function isContainerInAutoLayoutDescendants(target: Container, layout: AutoLayout): boolean {
  for (const child of layout.Children as Container[]) {
    if (child === target) return true
    // 子コンテナ内のAutoLayoutも再帰チェック
    if ('children' in child) {
      for (const grandChild of Object.values(child.children) as (MovableObject | AutoLayout)[]) {
        if ('direction' in grandChild && isContainerInAutoLayoutDescendants(target, grandChild as AutoLayout)) {
          return true
        }
      }
    }
  }
  return false
}

export function HierarchyTree() {
  const { workspace, selectedElement, setSelectedElement, focusOnElement } = useFactory()
  const [tree, setTree] = useState<TreeItem[]>([])
  const [edgeItems, setEdgeItems] = useState<TreeItem[]>([])

  // DnD状態
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null)
  const [rootDropSide, setRootDropSide] = useState<'top' | 'bottom' | null>(null)
  const dragItemRef = useRef<TreeItem | null>(null)

  useEffect(() => {
    const rebuild = () => {
      if (!workspace) return

      // workspace.elementsから直接コンテナを取得（containersRef更新タイミングに依存しない）
      const allContainers = workspace.elements.filter(
        (el) => el.type === 'container'
      ) as Container[]
      const containerSet = new Set(allContainers)
      const rootContainers = allContainers.filter(
        (c) => !hasValidSnapParent(c, containerSet) && !hasValidAutoLayoutParent(c)
      )
      const visited = new Set<string>()
      const containerTree = rootContainers.map((c) => containerToTreeItem(c, visited))

      const includedIds = collectAllIds(containerTree)
      const structuralChildIds = collectStructuralChildIds(workspace)
      const standaloneItems = workspace.elements
        .filter(
          (el) => !includedIds.has(el.id) && el.type !== 'autoLayout' && !structuralChildIds.has(el.id)
        )
        .map(elementToTreeItem)
      setTree([...containerTree, ...standaloneItems])

      setEdgeItems(
        workspace.edges.map((e: Edge) => ({
          id: e.id,
          name: `${e.startConnector.name} -> ${e.endConnector.name}`,
          type: 'edge' as const,
          children: [],
          element: e,
        }))
      )
    }

    rebuild()

    if (!workspace) return
    const unsubs = [
      workspace.on('add', rebuild),
      workspace.on('remove', rebuild),
      workspace.on('connect', rebuild),
      workspace.on('disconnect', rebuild),
      workspace.on('update', rebuild),
      workspace.on('nest', rebuild),
      workspace.on('unnest', rebuild),
    ]
    return () => {
      for (const u of unsubs) u()
    }
  }, [workspace])

  const selectedId = selectedElement?.element
    ? (selectedElement.element as { id?: string }).id
    : null

  /**
   * ツリービュー内DnDの実行位置を正規化する。
   * container -> container は並べ替えよりネストを優先し、常に "on" として扱う。
   */
  const resolveDropPosition = useCallback(
    (dragItem: TreeItem, targetItem: TreeItem | null, rawPos: DropPosition): DropPosition => {
      if (!targetItem) return 'on'
      if (dragItem.type === 'container' && targetItem.type === 'container') return 'on'
      return rawPos
    },
    []
  )

  /** ドロップ可能か判定 */
  const isValidDrop = useCallback(
    (dragItem: TreeItem, targetItem: TreeItem | null, pos: DropPosition): boolean => {
      // 自分自身へのドロップは不可
      if (targetItem && dragItem.id === targetItem.id) return false

      // --- connector / autolayout の親コンテナ変更 ---
      if (dragItem.type === 'connector' || dragItem.type === 'autolayout') {
        // Workspace root へドロップすると構造的親から外す（アンネスト）
        if (!targetItem) {
          if (pos !== 'on' || !workspace) return false
          return findSourceContainerInfo(dragItem.element as MovableObject | AutoLayout, workspace) !== null
        }
        // コンテナの上(on)にのみドロップ可能
        if (targetItem.type !== 'container' || pos !== 'on') return false
        // 同じ親コンテナへのドロップは不可
        if (workspace) {
          const info = findSourceContainerInfo(
            dragItem.element as MovableObject | AutoLayout,
            workspace
          )
          if (info && info.container === targetItem.element) return false
        }
        // AutoLayoutの場合、循環参照チェック
        if (dragItem.type === 'autolayout') {
          const layout = dragItem.element as AutoLayout
          const targetContainer = targetItem.element as Container
          if (isContainerInAutoLayoutDescendants(targetContainer, layout)) return false
        }
        return true
      }

      // --- 以下は container のドラッグ ---
      if (dragItem.type !== 'container') return false

      // Workspace root へのドロップ（targetItem === null）は常に可
      if (!targetItem) return true

      // コンテナへの 'on' ドロップ: snap親子設定
      if (targetItem.type === 'container' && pos === 'on') {
        const draggedEl = dragItem.element as MovableObject
        const targetEl = targetItem.element as MovableObject
        if (isAncestorOf(draggedEl, targetEl)) return false
        return true
      }

      // AutoLayout への 'on' ドロップ: insertElement
      if (targetItem.type === 'autolayout' && pos === 'on') {
        const draggedEl = dragItem.element as MovableObject
        const targetLayout = targetItem.element as AutoLayout
        if (targetLayout.parentContainer) {
          const targetEl = targetLayout.parentContainer as unknown as MovableObject
          if (isAncestorOf(draggedEl, targetEl)) return false
        }
        return true
      }

      // before/after はコンテナ間の並べ替え（snap関係設定として扱う）
      if (targetItem.type === 'container' && (pos === 'before' || pos === 'after')) {
        return true
      }

      return false
    },
    [workspace]
  )

  const canDropToRoot = useMemo(() => {
    if (!dragItemId || !dragItemRef.current) return false
    return isValidDrop(dragItemRef.current, null, 'on')
  }, [dragItemId, isValidDrop])

  const droppableNodeIds = useMemo(() => {
    const ids = new Set<string>()
    const dragItem = dragItemRef.current
    if (!dragItemId || !dragItem) return ids

    const walk = (items: TreeItem[]) => {
      for (const item of items) {
        const pos = resolveDropPosition(dragItem, item, 'on')
        if (isValidDrop(dragItem, item, pos)) {
          ids.add(item.id)
        }
        if (item.children.length > 0) {
          walk(item.children)
        }
      }
    }

    walk(tree)
    return ids
  }, [tree, dragItemId, isValidDrop, resolveDropPosition])

  /** DnD: ドラッグ開始 */
  const handleDragStart = useCallback((e: React.DragEvent, item: TreeItem) => {
    if (item.type !== 'container' && item.type !== 'connector' && item.type !== 'autolayout') {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
    setDragItemId(item.id)
    dragItemRef.current = item
  }, [])

  /** DnD: ドラッグオーバー */
  const handleDragOver = useCallback(
    (e: React.DragEvent, item: TreeItem) => {
      e.preventDefault()
      const rawPos = calcDropPosition(e, e.currentTarget as HTMLElement)
      const dragItem = dragItemRef.current
      const pos = dragItem ? resolveDropPosition(dragItem, item, rawPos) : rawPos
      if (dragItem && isValidDrop(dragItem, item, pos)) {
        e.dataTransfer.dropEffect = 'move'
        setDragTargetId(item.id)
        setDropPosition(pos)
        setRootDropSide(null)
      } else {
        e.dataTransfer.dropEffect = 'none'
        setDragTargetId(null)
        setDropPosition(null)
        setRootDropSide(null)
      }
    },
    [isValidDrop, resolveDropPosition]
  )

  /** DnD: ドロップ処理 */
  const handleDrop = useCallback(
    (e: React.DragEvent, targetItem: TreeItem | null) => {
      e.preventDefault()
      if (!workspace || !dragItemRef.current) return

      const dragItem = dragItemRef.current
      const currentTarget = e.currentTarget
      const rawDropPosition: DropPosition =
        targetItem && currentTarget instanceof HTMLElement
          ? calcDropPosition(e, currentTarget)
          : 'on'
      const resolvedDropPosition = resolveDropPosition(dragItem, targetItem, rawDropPosition)

      if (!isValidDrop(dragItem, targetItem, resolvedDropPosition)) return

      // --- connector / autolayout の親コンテナ変更 ---
      if (dragItem.type === 'connector' || dragItem.type === 'autolayout') {
        const child = dragItem.element as MovableObject | AutoLayout
        const info = findSourceContainerInfo(child, workspace)
        if (!info) return
        if (targetItem === null) {
          // Workspace root: 構造的親から外してワールド座標に固定
          workspace.history.execute(new ReparentChildCommand(child, info.container, info.key))
        } else {
          if (targetItem.type !== 'container' || resolvedDropPosition !== 'on') return
          const targetContainer = targetItem.element as Container
          const targetKey = resolveTargetKey(info.key, targetContainer)
          workspace.history.execute(
            new ReparentChildCommand(child, info.container, info.key, targetContainer, targetKey)
          )
        }
        // DnD状態リセット
        setDragItemId(null)
        setDragTargetId(null)
        setDropPosition(null)
        setRootDropSide(null)
        dragItemRef.current = null
        return
      }

      // --- 以下は container のドロップ ---
      if (dragItem.type !== 'container') return

      const draggedEl = dragItem.element as MovableObject & Container
      const commands: import('../../../lib/headless-vpl').Command[] = []

      // 現在の親関係を解除
      if (draggedEl.Parent || draggedEl.parentAutoLayout) {
        commands.push(new DetachCommand(workspace, draggedEl))
      }

      if (targetItem === null) {
        // Workspace root へのドロップ: 親関係解除のみ（上の DetachCommand で完了）
      } else if (targetItem.type === 'container' && resolvedDropPosition === 'on') {
        // コンテナへの 'on' ドロップ: snap親子設定
        const targetEl = targetItem.element as MovableObject & { Children: Set<MovableObject> }
        commands.push(
          new ConnectCommand(
            workspace,
            targetEl as IWorkspaceElement & { Children: Set<MovableObject> },
            draggedEl as IWorkspaceElement & { Parent: unknown }
          )
        )
      } else if (targetItem.type === 'autolayout' && resolvedDropPosition === 'on') {
        // AutoLayout への 'on' ドロップ: insertElement
        const targetLayout = targetItem.element as AutoLayout
        commands.push(new NestCommand(draggedEl, targetLayout, workspace, targetLayout.Children.length))
      } else if (
        targetItem.type === 'container' &&
        (resolvedDropPosition === 'before' || resolvedDropPosition === 'after')
      ) {
        // コンテナの前後にドロップ: 同じ親にsnap接続
        const targetEl = targetItem.element as MovableObject
        if (targetEl.Parent) {
          commands.push(
            new ConnectCommand(
              workspace,
              targetEl.Parent as IWorkspaceElement & { Children: Set<MovableObject> },
              draggedEl as IWorkspaceElement & { Parent: unknown }
            )
          )
        }
      }

      if (commands.length > 0) {
        workspace.history.execute(new BatchCommand(commands))
      }

      // DnD状態リセット
      setDragItemId(null)
      setDragTargetId(null)
      setDropPosition(null)
      setRootDropSide(null)
      dragItemRef.current = null
    },
    [workspace, isValidDrop, resolveDropPosition]
  )

  const handleDragEnd = useCallback(() => {
    setDragItemId(null)
    setDragTargetId(null)
    setDropPosition(null)
    setRootDropSide(null)
    dragItemRef.current = null
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragTargetId(null)
    setDropPosition(null)
  }, [])

  /** Workspace root のDnDハンドラー */
  const handleRootDragOver = useCallback(
    (e: React.DragEvent, side: 'top' | 'bottom') => {
      e.preventDefault()
      if (dragItemRef.current && isValidDrop(dragItemRef.current, null, 'on')) {
        e.dataTransfer.dropEffect = 'move'
        setRootDropSide(side)
        // ツリーノードのターゲットはクリア
        setDragTargetId(null)
        setDropPosition(null)
      } else {
        e.dataTransfer.dropEffect = 'none'
        setRootDropSide(null)
      }
    },
    [isValidDrop]
  )

  const handleRootDrop = useCallback(
    (e: React.DragEvent) => {
      handleDrop(e, null)
    },
    [handleDrop]
  )

  const handleRootDragLeave = useCallback(() => {
    setRootDropSide(null)
  }, [])

  return (
    <div className='factory-hierarchy'>
      <div className='factory-panel-header'>
        <span>Hierarchy</span>
      </div>
      <div className='factory-hierarchy-list'>
        <div
          className={`factory-tree-root ${canDropToRoot ? 'drop-available' : ''} ${rootDropSide === 'top' ? 'drop-target' : ''}`}
          onDragOver={(e) => handleRootDragOver(e, 'top')}
          onDrop={handleRootDrop}
          onDragLeave={handleRootDragLeave}
        >
          <span className='factory-tree-root-label'>Workspace</span>
        </div>
        {tree.map((item) => (
          <TreeNode
            key={item.id}
            item={item}
            depth={1}
            selectedId={selectedId}
            onSelect={(item) => {
              if (item.type === 'container') {
                setSelectedElement({ type: 'container', element: item.element as Container })
                workspace?.selection.deselectAll()
                workspace?.selection.select(item.element as Container)
              } else if (item.type === 'connector') {
                setSelectedElement({ type: 'connector', element: item.element as Connector })
              } else if (item.type === 'autolayout') {
                setSelectedElement({ type: 'autolayout', element: item.element as AutoLayout })
              }
              const el = item.element as { position?: { x: number; y: number } }
              if (el.position) {
                focusOnElement(el as { position: { x: number; y: number } })
              }
            }}
            dragItemId={dragItemId}
            dragTargetId={dragTargetId}
            dropPosition={dragTargetId === item.id ? dropPosition : null}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={(e, targetItem) => handleDrop(e, targetItem)}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            isDragActive={Boolean(dragItemId)}
            droppableIds={droppableNodeIds}
          />
        ))}
        {edgeItems.length > 0 && (
          <>
            <div className='factory-tree-section' style={{ paddingLeft: 8 }}>
              Edges
            </div>
            {edgeItems.map((item) => (
              <TreeNode
                key={item.id}
                item={item}
                depth={2}
                selectedId={selectedId}
                onSelect={(item) => {
                  const edge = item.element as Edge
                  setSelectedElement({ type: 'edge', element: edge })
                  if (edge.startConnector?.position) {
                    focusOnElement(edge.startConnector)
                  }
                }}
                dragItemId={dragItemId}
                dragTargetId={dragTargetId}
                dropPosition={dragTargetId === item.id ? dropPosition : null}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={(e, targetItem) => handleDrop(e, targetItem)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                isDragActive={Boolean(dragItemId)}
                droppableIds={droppableNodeIds}
              />
            ))}
          </>
        )}
        <div
          className={`factory-tree-root-drop-slot ${canDropToRoot ? 'drop-available' : ''} ${rootDropSide === 'bottom' ? 'drop-target' : ''}`}
          onDragOver={(e) => handleRootDragOver(e, 'bottom')}
          onDrop={handleRootDrop}
          onDragLeave={handleRootDragLeave}
        >
          <span className='factory-tree-root-drop-label'>Drop here to unnest</span>
        </div>
      </div>
    </div>
  )
}
