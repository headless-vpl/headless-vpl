import type { Dispatch, SetStateAction } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useFactoryActions } from '../hooks/factory/useFactoryWorkspace'
import type AutoLayout from '../lib/headless-vpl/core/AutoLayout'
import type Edge from '../lib/headless-vpl/core/Edge'
import type { MovableObject } from '../lib/headless-vpl/core/MovableObject'
import type { Connector, Container, EdgeType, Workspace } from '../lib/headless-vpl/primitives'
import type { InteractionManager } from '../lib/headless-vpl/recipes'
import type { FactoryProject } from '../lib/headless-vpl/util/factorySerializer'

export type ToolMode = 'select' | 'move' | 'connect'

export type PlacementMode =
  | { type: 'none' }
  | { type: 'container'; variant: string; color?: string; width?: number; height?: number }
  | { type: 'connector'; connectorType: 'input' | 'output' }
  | { type: 'edge'; edgeType: EdgeType; startConnector?: Connector }
  | { type: 'autolayout'; direction: 'horizontal' | 'vertical'; gap?: number }

export type SelectedElement =
  | { type: 'container'; element: Container }
  | { type: 'connector'; element: Connector }
  | { type: 'autolayout'; element: AutoLayout }
  | { type: 'edge'; element: Edge }
  | null

export type SelectionBounds = { x: number; y: number; width: number; height: number } | null
export type AutosaveState = 'idle' | 'saved' | 'error'

type FactoryContextValue = {
  workspace: Workspace | null
  containers: Container[]
  connectors: Connector[]
  interaction: InteractionManager | null
  selectedElement: SelectedElement
  setSelectedElement: (el: SelectedElement) => void
  selectionItems: MovableObject[]
  selectionBounds: SelectionBounds
  selectionPath: string[]
  placementMode: PlacementMode
  setPlacementMode: (mode: PlacementMode) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  showDebugSvg: boolean
  setShowDebugSvg: (v: boolean) => void
  zoom: number
  elementCount: number
  edgeCount: number
  selectedCount: number
  toolMode: ToolMode
  setToolMode: (mode: ToolMode) => void
  revision: number
  expandedNodeIds: Set<string>
  setNodeExpanded: (id: string, expanded: boolean) => void
  hiddenIds: Set<string>
  lockedIds: Set<string>
  isHidden: (id: string) => boolean
  isLocked: (id: string) => boolean
  toggleHidden: (id: string) => void
  toggleLocked: (id: string) => void
  autosaveState: AutosaveState
  focusOnElement: (element: { position: { x: number; y: number } }) => void
  applyProjectUi: (project: FactoryProject) => void
  syncState: () => void
  actions: ReturnType<typeof useFactoryActions>
}

const FactoryContext = createContext<FactoryContextValue | null>(null)

function cloneSet(setter: Dispatch<SetStateAction<Set<string>>>, id: string): void {
  setter((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

function computeSelectionBounds(selection: readonly MovableObject[]): SelectionBounds {
  if (selection.length === 0) return null

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const item of selection) {
    const width = 'width' in item ? item.width : 0
    const height = 'height' in item ? item.height : 0
    minX = Math.min(minX, item.position.x)
    minY = Math.min(minY, item.position.y)
    maxX = Math.max(maxX, item.position.x + width)
    maxY = Math.max(maxY, item.position.y + height)
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

function computeSelectionPath(selected: SelectedElement): string[] {
  if (!selected) return []
  if (selected.type === 'edge') {
    return [selected.element.startConnector.name, selected.element.endConnector.name]
  }

  const path: string[] = []
  const element = selected.element as MovableObject & { parentAutoLayout?: AutoLayout | null }
  let currentLayout = element.parentAutoLayout ?? null
  let currentParent = 'Parent' in element ? element.Parent : null

  path.unshift(selected.element.name || selected.element.id)

  while (currentLayout) {
    path.unshift(currentLayout.name || currentLayout.id)
    currentParent = currentLayout.parentContainer ?? currentParent
    currentLayout = currentLayout.parentContainer?.parentAutoLayout ?? null
  }

  while (currentParent) {
    path.unshift(currentParent.name || currentParent.id)
    currentParent = currentParent.Parent
  }

  return path
}

export function FactoryProvider({
  workspace,
  containers,
  connectors,
  interaction,
  containersRef,
  connectorsRef,
  children,
}: {
  workspace: Workspace | null
  containers: Container[]
  connectors: Connector[]
  interaction: InteractionManager | null
  containersRef: React.RefObject<Container[]> | null
  connectorsRef: React.RefObject<Connector[]> | null
  children: React.ReactNode
}) {
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null)
  const [placementMode, setPlacementMode] = useState<PlacementMode>({ type: 'none' })
  const [showGrid, setShowGrid] = useState(true)
  const [showDebugSvg, setShowDebugSvg] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [elementCount, setElementCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)
  const [selectedCount, setSelectedCount] = useState(0)
  const [revision, setRevision] = useState(0)
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [selectionItems, setSelectionItems] = useState<MovableObject[]>([])
  const [selectionBounds, setSelectionBounds] = useState<SelectionBounds>(null)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set(['workspace']))
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle')

  const getUiSnapshot = useCallback(
    () => ({
      expandedNodeIds,
      hiddenIds,
      lockedIds,
    }),
    [expandedNodeIds, hiddenIds, lockedIds]
  )

  const syncState = useCallback(() => {
    if (!workspace) return
    const selection = workspace.selection.getSelection().slice()
    setZoom(Math.round(workspace.viewport.scale * 100))
    setSelectedCount(workspace.selection.size)
    setElementCount(containersRef?.current.length ?? containers.length)
    setEdgeCount(workspace.edges.length)
    setSelectionItems(selection)
    setSelectionBounds(computeSelectionBounds(selection))
    setRevision((r) => r + 1)
  }, [workspace, containers, containersRef])

  const applyProjectUi = useCallback((project: FactoryProject) => {
    setExpandedNodeIds(new Set(project.ui.expandedNodeIds))
    setHiddenIds(new Set(project.ui.hiddenIds))
    setLockedIds(new Set(project.ui.lockedIds))
    setAutosaveState('saved')
  }, [])

  const baseActions = useFactoryActions(
    workspace,
    containersRef,
    connectorsRef,
    syncState,
    getUiSnapshot
  )

  const focusOnElement = useCallback(
    (element: { position: { x: number; y: number } }) => {
      if (!workspace) return
      const canvasEl = document.querySelector('.factory-canvas-area')
      if (!canvasEl) return
      const rect = canvasEl.getBoundingClientRect()
      workspace.pan(
        rect.width / 2 - element.position.x * workspace.viewport.scale,
        rect.height / 2 - element.position.y * workspace.viewport.scale
      )
    },
    [workspace]
  )

  const actions = useMemo(() => {
    return {
      ...baseActions,
      importProject(raw: string) {
        const result = baseActions.importProject(raw)
        if (result.project) applyProjectUi(result.project)
        return result
      },
      loadFromStorage() {
        const result = baseActions.loadFromStorage()
        if (result.project) applyProjectUi(result.project)
        return result
      },
      saveToStorage() {
        baseActions.saveToStorage()
        setAutosaveState('saved')
      },
    }
  }, [baseActions, applyProjectUi])

  useEffect(() => {
    if (!workspace) return
    syncState()

    const unsubs = [
      workspace.on('zoom', syncState),
      workspace.on('pan', syncState),
      workspace.on('select', (event) => {
        syncState()
        const target = event.target as MovableObject | undefined
        if (target && 'color' in target) {
          setSelectedElement({ type: 'container', element: target as Container })
        } else if (target && 'hitRadius' in target) {
          setSelectedElement({ type: 'connector', element: target as Connector })
        }
      }),
      workspace.on('deselect', () => {
        syncState()
        if (workspace.selection.size === 0) {
          setSelectedElement(null)
        }
      }),
      workspace.on('move', syncState),
      workspace.on('add', syncState),
      workspace.on('remove', () => {
        syncState()
        setSelectedElement(null)
      }),
      workspace.on('update', syncState),
      workspace.on('connect', syncState),
      workspace.on('disconnect', syncState),
      workspace.on('nest', syncState),
      workspace.on('unnest', syncState),
    ]

    return () => {
      for (const unsubscribe of unsubs) unsubscribe()
    }
  }, [workspace, syncState])

  useEffect(() => {
    if (!workspace || revision === 0) return
    setAutosaveState('idle')
    const timer = window.setTimeout(() => {
      try {
        actions.saveToStorage()
      } catch {
        setAutosaveState('error')
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [workspace, revision, actions])

  const selectionPath = useMemo(() => computeSelectionPath(selectedElement), [selectedElement])

  return (
    <FactoryContext.Provider
      value={{
        workspace,
        containers,
        connectors,
        interaction,
        selectedElement,
        setSelectedElement,
        selectionItems,
        selectionBounds,
        selectionPath,
        placementMode,
        setPlacementMode,
        showGrid,
        setShowGrid,
        showDebugSvg,
        setShowDebugSvg,
        zoom,
        elementCount,
        edgeCount,
        selectedCount,
        toolMode,
        setToolMode,
        revision,
        expandedNodeIds,
        setNodeExpanded: (id, expanded) => {
          setExpandedNodeIds((prev) => {
            const next = new Set(prev)
            if (expanded) next.add(id)
            else next.delete(id)
            return next
          })
        },
        hiddenIds,
        lockedIds,
        isHidden: (id) => hiddenIds.has(id),
        isLocked: (id) => lockedIds.has(id),
        toggleHidden: (id) => cloneSet(setHiddenIds, id),
        toggleLocked: (id) => cloneSet(setLockedIds, id),
        autosaveState,
        focusOnElement,
        applyProjectUi,
        syncState,
        actions,
      }}
    >
      {children}
    </FactoryContext.Provider>
  )
}

export function useFactory(): FactoryContextValue {
  const ctx = useContext(FactoryContext)
  if (!ctx) throw new Error('useFactory must be used within FactoryProvider')
  return ctx
}
