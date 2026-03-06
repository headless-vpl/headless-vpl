import { useCallback, useEffect, useRef, useState } from 'react'
import { ResizeHandle } from './ResizeHandle'
import { Palette } from './palette/Palette'
import { HierarchyTree } from './hierarchy/HierarchyTree'
import { FactoryCanvas } from './canvas/FactoryCanvas'
import { CodePanel } from './code/CodePanel'
import { PropertyInspector } from './inspector/PropertyInspector'
import { StatusBar } from './StatusBar'
import { ContextMenu } from './ContextMenu'
import { useFactory } from '../../contexts/FactoryContext'

const LEFT_MIN = 180
const LEFT_MAX = 400
const RIGHT_MIN = 380
const RIGHT_MAX = 600
const HIERARCHY_MIN = 140
const HIERARCHY_MAX = 300
const CENTER_SPLIT_MIN = 150

type FactoryLayoutProps = {
  onWorkspaceReady: Parameters<typeof FactoryCanvas>[0]['onWorkspaceReady']
}

export function FactoryLayout({ onWorkspaceReady }: FactoryLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(260)
  const [rightWidth, setRightWidth] = useState(420)
  const [hierarchyWidth, setHierarchyWidth] = useState(180)
  const [centerSplit, setCenterSplit] = useState(0.55)
  const layoutRef = useRef<HTMLDivElement>(null)

  const { workspace, selectedCount, actions, syncState } = useFactory()

  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((w) => Math.max(LEFT_MIN, Math.min(LEFT_MAX, w + delta)))
  }, [])

  const handleRightResize = useCallback((delta: number) => {
    setRightWidth((w) => Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, w - delta)))
  }, [])

  const handleHierarchyResize = useCallback((delta: number) => {
    setHierarchyWidth((w) => Math.max(HIERARCHY_MIN, Math.min(HIERARCHY_MAX, w + delta)))
  }, [])

  const handleCenterSplitResize = useCallback((delta: number) => {
    setCenterSplit((prev) => {
      const containerEl = document.querySelector('.factory-center')
      if (!containerEl) return prev
      const totalHeight = containerEl.getBoundingClientRect().height
      const newRatio = prev + delta / totalHeight
      return Math.max(0.2, Math.min(0.85, newRatio))
    })
  }, [])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace - 選択削除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
        e.preventDefault()
        actions.deleteSelected()
      }

      // Ctrl+D - 複製
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        actions.duplicateSelected()
      }

      // Ctrl+S - 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        actions.saveToStorage()
      }

      // Ctrl+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
        workspace?.history.undo()
        syncState()
      }

      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
        workspace?.history.redo()
        syncState()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [workspace, actions, syncState])

  const contextMenuItems = [
    {
      label: 'Duplicate',
      shortcut: 'Ctrl+D',
      action: () => actions.duplicateSelected(),
      disabled: selectedCount === 0,
    },
    {
      label: 'Delete',
      shortcut: 'Del',
      action: () => actions.deleteSelected(),
      disabled: selectedCount === 0,
    },
    { separator: true as const },
    {
      label: 'Save to LocalStorage',
      shortcut: 'Ctrl+S',
      action: () => actions.saveToStorage(),
    },
  ]

  return (
    <div className='factory-layout' ref={layoutRef}>
      {/* 左パネル */}
      <div className='factory-left' style={{ width: leftWidth }}>
        <Palette />
      </div>

      <ResizeHandle direction='horizontal' onResize={handleLeftResize} />

      {/* 中央パネル */}
      <div className='factory-center'>
        <div className='factory-center-canvas' style={{ flex: `${centerSplit} 1 0%` }}>
          <FactoryCanvas onWorkspaceReady={onWorkspaceReady} />
        </div>
        <ResizeHandle direction='vertical' onResize={handleCenterSplitResize} />
        <div className='factory-center-code' style={{ flex: `${1 - centerSplit} 1 0%`, minHeight: CENTER_SPLIT_MIN }}>
          <CodePanel />
        </div>
      </div>

      <ResizeHandle direction='horizontal' onResize={handleRightResize} />

      {/* 右パネル */}
      <div className='factory-right' style={{ width: rightWidth }}>
        <div className='factory-right-hierarchy' style={{ width: hierarchyWidth }}>
          <HierarchyTree />
        </div>
        <ResizeHandle direction='horizontal' onResize={handleHierarchyResize} />
        <div className='factory-right-inspector'>
          <PropertyInspector />
        </div>
      </div>

      {/* ステータスバー */}
      <StatusBar />

      {/* コンテキストメニュー */}
      <ContextMenu items={contextMenuItems} targetRef={layoutRef} />
    </div>
  )
}
