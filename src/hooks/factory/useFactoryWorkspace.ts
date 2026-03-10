import type { RefObject } from 'react'
import { useCallback } from 'react'
import {
  BatchCommand,
  Connector,
  Container,
  DetachCommand,
  Edge,
  MoveCommand,
  MoveManyCommand,
  Position,
  RemoveCommand,
} from '../../lib/headless-vpl'
import type { Workspace } from '../../lib/headless-vpl'
import {
  deserializeFactoryProject,
  serializeFactoryProject,
  type FactoryProject,
} from '../../lib/headless-vpl/util/factorySerializer'

const STORAGE_KEY = 'headless-vpl-factory-project'

export type FactoryUiSnapshot = {
  expandedNodeIds?: Iterable<string>
  hiddenIds?: Iterable<string>
  lockedIds?: Iterable<string>
}

export type FactoryProjectResult = {
  ok: boolean
  warnings: string[]
  project?: FactoryProject
  error?: string
}

type AddContainerOptions = {
  x: number
  y: number
  name?: string
  color?: string
  width?: number
  height?: number
}

function readProject(raw: string): FactoryProjectResult {
  try {
    const parsed = JSON.parse(raw) as FactoryProject
    if (parsed.version !== 1) {
      return { ok: false, warnings: [], error: `Unsupported project version: ${parsed.version}` }
    }
    return { ok: true, warnings: [], project: parsed }
  } catch {
    return { ok: false, warnings: [], error: 'Invalid project JSON' }
  }
}

export function useFactoryActions(
  workspace: Workspace | null,
  containersRef: RefObject<Container[]> | null,
  connectorsRef: RefObject<Connector[]> | null,
  syncState: () => void,
  getUiSnapshot?: () => FactoryUiSnapshot
) {
  const addContainer = useCallback(
    (opts: AddContainerOptions) => {
      if (!workspace || !containersRef || !connectorsRef) return
      const width = opts.width ?? 140
      const height = opts.height ?? 55
      const left = new Connector({
        position: new Position(0, -height / 2),
        name: 'in',
        type: 'input',
      })
      const right = new Connector({
        position: new Position(width, -height / 2),
        name: 'out',
        type: 'output',
      })
      const container = new Container({
        workspace,
        position: new Position(opts.x, opts.y),
        name: opts.name ?? `Node ${containersRef.current.length + 1}`,
        color: opts.color ?? '#3b82f6',
        width,
        height,
        children: { left, right },
      })
      containersRef.current.push(container)
      connectorsRef.current.push(left, right)
      syncState()
      return container
    },
    [workspace, containersRef, connectorsRef, syncState]
  )

  const createEmpty = useCallback(
    (x: number, y: number) => addContainer({ x, y, name: 'Empty', color: '#64748b', width: 120, height: 48 }),
    [addContainer]
  )

  const deleteSelected = useCallback(() => {
    if (!workspace || !containersRef || !connectorsRef) return
    const selection = workspace.selection.getSelection().slice()
    for (const item of selection) {
      workspace.history.execute(new RemoveCommand(workspace, item))
      const containerIndex = containersRef.current.indexOf(item as Container)
      if (containerIndex >= 0) containersRef.current.splice(containerIndex, 1)
      const connectorIndex = connectorsRef.current.indexOf(item as Connector)
      if (connectorIndex >= 0) connectorsRef.current.splice(connectorIndex, 1)
    }
    syncState()
  }, [workspace, containersRef, connectorsRef, syncState])

  const duplicateSelected = useCallback(() => {
    if (!workspace || !containersRef || !connectorsRef) return
    const selection = workspace.selection.getSelection().slice()
    const created: Container[] = []
    for (const item of selection) {
      const container = item as Container
      if (!('width' in container) || !('color' in container)) continue
      const copy = addContainer({
        x: container.position.x + 24,
        y: container.position.y + 24,
        name: `${container.name} (copy)`,
        color: container.color,
        width: container.width,
        height: container.height,
      })
      if (copy) {
        copy.widthMode = container.widthMode
        copy.heightMode = container.heightMode
        copy.padding = { ...container.padding }
        copy.minWidth = container.minWidth
        copy.maxWidth = container.maxWidth
        copy.minHeight = container.minHeight
        copy.maxHeight = container.maxHeight
        copy.resizable = container.resizable
        copy.contentGap = container.contentGap
        copy.update()
        created.push(copy)
      }
    }
    if (created.length > 0) {
      workspace.selection.deselectAll()
      for (const container of created) workspace.selection.select(container)
      syncState()
    }
  }, [workspace, containersRef, connectorsRef, addContainer, syncState])

  const moveSelectionBy = useCallback(
    (dx: number, dy: number) => {
      if (!workspace) return
      const moves = workspace.selection
        .getSelection()
        .map(
          (item) =>
            new MoveCommand(
              item,
              item.position.x,
              item.position.y,
              item.position.x + dx,
              item.position.y + dy
            )
        )
      if (moves.length === 0) return
      workspace.history.execute(new MoveManyCommand(moves))
      syncState()
    },
    [workspace, syncState]
  )

  const detachSelected = useCallback(() => {
    if (!workspace) return
    const selection = workspace.selection.getSelection().filter(
      (item) => item instanceof Container && (item.Parent || item.parentAutoLayout)
    ) as Container[]
    if (selection.length === 0) return
    workspace.history.execute(
      new BatchCommand(selection.map((container) => new DetachCommand(workspace, container)))
    )
    syncState()
  }, [workspace, syncState])

  const frameSelection = useCallback(() => {
    if (!workspace) return
    const canvasEl = document.querySelector('.factory-canvas-area')
    if (!canvasEl) return
    const rect = canvasEl.getBoundingClientRect()
    const selection = workspace.selection.getSelection()
    const positioned = selection.filter((item) => 'position' in item)
    if (positioned.length === 0) {
      workspace.fitView(rect.width, rect.height)
      syncState()
      return
    }

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const item of positioned) {
      const width = 'width' in item ? item.width : 0
      const height = 'height' in item ? item.height : 0
      minX = Math.min(minX, item.position.x)
      minY = Math.min(minY, item.position.y)
      maxX = Math.max(maxX, item.position.x + width)
      maxY = Math.max(maxY, item.position.y + height)
    }

    const boundsWidth = Math.max(1, maxX - minX)
    const boundsHeight = Math.max(1, maxY - minY)
    const padding = 72
    const scale = Math.min(
      1.5,
      (rect.width - padding * 2) / boundsWidth,
      (rect.height - padding * 2) / boundsHeight
    )
    workspace.setScale(Math.max(0.1, Math.min(3, scale)))
    workspace.pan(
      rect.width / 2 - (minX + boundsWidth / 2) * workspace.viewport.scale,
      rect.height / 2 - (minY + boundsHeight / 2) * workspace.viewport.scale
    )
    syncState()
  }, [workspace, syncState])

  const loadTemplate = useCallback(
    (templateId: string) => {
      if (!workspace || !containersRef || !connectorsRef) return
      const uiSnapshot = getUiSnapshot?.() ?? {}
      const templates: Record<string, () => void> = {
        'flow-node': () => {
          const start = addContainer({ x: 60, y: 100, name: 'Start', color: '#3b82f6' })
          const process = addContainer({ x: 280, y: 100, name: 'Process', color: '#10b981' })
          const end = addContainer({ x: 500, y: 100, name: 'End', color: '#f43f5e' })
          if (!start || !process || !end) return
          const startOut = Object.values(start.children).find(
            (child) => 'hitRadius' in child && child.type === 'output'
          ) as Connector
          const processIn = Object.values(process.children).find(
            (child) => 'hitRadius' in child && child.type === 'input'
          ) as Connector
          const processOut = Object.values(process.children).find(
            (child) => 'hitRadius' in child && child.type === 'output'
          ) as Connector
          const endIn = Object.values(end.children).find(
            (child) => 'hitRadius' in child && child.type === 'input'
          ) as Connector
          new Edge({ start: startOut, end: processIn, edgeType: 'bezier' })
          new Edge({ start: processOut, end: endIn, edgeType: 'bezier' })
        },
        'scratch-block': () => {
          addContainer({ x: 60, y: 60, name: 'When Flag Clicked', color: '#eab308', width: 180, height: 52 })
          addContainer({ x: 60, y: 130, name: 'Move 10 Steps', color: '#3b82f6', width: 160, height: 42 })
          addContainer({ x: 60, y: 190, name: 'Turn 90', color: '#3b82f6', width: 140, height: 42 })
        },
        'blueprint-node': () => {
          const eventTick = addContainer({ x: 60, y: 100, name: 'Event Tick', color: '#e53e3e', width: 160, height: 80 })
          const location = addContainer({ x: 320, y: 80, name: 'Get Actor Location', color: '#2b6cb0', width: 180, height: 80 })
          const print = addContainer({ x: 600, y: 100, name: 'Print String', color: '#38a169', width: 160, height: 80 })
          if (!eventTick || !location || !print) return
          const tickOut = Object.values(eventTick.children).find(
            (child) => 'hitRadius' in child && child.type === 'output'
          ) as Connector
          const locationIn = Object.values(location.children).find(
            (child) => 'hitRadius' in child && child.type === 'input'
          ) as Connector
          const locationOut = Object.values(location.children).find(
            (child) => 'hitRadius' in child && child.type === 'output'
          ) as Connector
          const printIn = Object.values(print.children).find(
            (child) => 'hitRadius' in child && child.type === 'input'
          ) as Connector
          new Edge({ start: tickOut, end: locationIn, edgeType: 'smoothstep' })
          new Edge({ start: locationOut, end: printIn, edgeType: 'smoothstep' })
        },
      }

      const emptyProject = {
        version: 1 as const,
        viewport: { x: 0, y: 0, scale: 1 },
        containers: [],
        connectors: [],
        autoLayouts: [],
        edges: [],
        ui: {
          expandedNodeIds: [...(uiSnapshot.expandedNodeIds ?? [])],
          hiddenIds: [],
          lockedIds: [],
        },
      }
      deserializeFactoryProject({
        project: emptyProject,
        workspace,
        containersRef,
        connectorsRef,
      })

      templates[templateId]?.()
      syncState()
    },
    [workspace, containersRef, connectorsRef, addContainer, syncState, getUiSnapshot]
  )

  const exportProject = useCallback(() => {
    if (!workspace) return null
    const project = serializeFactoryProject(workspace, getUiSnapshot?.())
    return JSON.stringify(project, null, 2)
  }, [workspace, getUiSnapshot])

  const importProject = useCallback(
    (raw: string): FactoryProjectResult => {
      if (!workspace || !containersRef || !connectorsRef) {
        return { ok: false, warnings: [], error: 'Workspace is not ready' }
      }
      const result = readProject(raw)
      if (!result.ok || !result.project) return result
      const restored = deserializeFactoryProject({
        project: result.project,
        workspace,
        containersRef,
        connectorsRef,
      })
      syncState()
      return {
        ok: true,
        warnings: restored.warnings,
        project: result.project,
      }
    },
    [workspace, containersRef, connectorsRef, syncState]
  )

  const saveToStorage = useCallback(() => {
    const raw = exportProject()
    if (!raw) return
    localStorage.setItem(STORAGE_KEY, raw)
  }, [exportProject])

  const loadFromStorage = useCallback((): FactoryProjectResult => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ok: false, warnings: [], error: 'No saved project' }
    return importProject(raw)
  }, [importProject])

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    addContainer,
    createEmpty,
    deleteSelected,
    duplicateSelected,
    moveSelectionBy,
    detachSelected,
    frameSelection,
    loadTemplate,
    exportProject,
    importProject,
    saveToStorage,
    loadFromStorage,
    clearStorage,
  }
}
