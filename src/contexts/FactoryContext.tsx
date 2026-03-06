import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useFactoryActions } from '../hooks/factory/useFactoryWorkspace'
import type { Connector, Container, InteractionManager, Workspace } from '../lib/headless-vpl'
import type { EdgeType } from '../lib/headless-vpl'
import type AutoLayout from '../lib/headless-vpl/core/AutoLayout'
import type Edge from '../lib/headless-vpl/core/Edge'
import type { MovableObject } from '../lib/headless-vpl/core/MovableObject'

export type ToolMode = 'move' | 'preview'

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

type FactoryContextValue = {
  workspace: Workspace | null
  containers: Container[]
  connectors: Connector[]
  interaction: InteractionManager | null
  selectedElement: SelectedElement
  setSelectedElement: (el: SelectedElement) => void
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
  focusOnElement: (element: { position: { x: number; y: number } }) => void
  syncState: () => void
  actions: ReturnType<typeof useFactoryActions>
}

const FactoryContext = createContext<FactoryContextValue | null>(null)

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
  const [toolMode, setToolMode] = useState<ToolMode>('preview')

  const syncState = useCallback(() => {
    if (!workspace) return
    setZoom(Math.round(workspace.viewport.scale * 100))
    setSelectedCount(workspace.selection.size)
    setElementCount(containersRef?.current.length ?? containers.length)
    setEdgeCount(workspace.edges.length)
    setRevision((r) => r + 1)
  }, [workspace, containers, containersRef])

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

  const actions = useFactoryActions(workspace, containersRef, connectorsRef, syncState)

  useEffect(() => {
    if (!workspace) return
    syncState()

    const unsubs = [
      workspace.on('zoom', syncState),
      workspace.on('pan', syncState),
      workspace.on('select', (ev) => {
        syncState()
        const target = ev.target as MovableObject | undefined
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
      for (const u of unsubs) u()
    }
  }, [workspace, syncState])

  return (
    <FactoryContext.Provider
      value={{
        workspace,
        containers,
        connectors,
        interaction,
        selectedElement,
        setSelectedElement,
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
        focusOnElement,
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
