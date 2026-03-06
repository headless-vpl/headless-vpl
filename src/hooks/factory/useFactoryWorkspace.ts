import { useCallback } from 'react'
import {
  Container,
  Connector,
  Edge,
  Position,
  RemoveCommand,
} from '../../lib/headless-vpl'
import type { Workspace } from '../../lib/headless-vpl'

const STORAGE_KEY = 'headless-vpl-factory-project'

type ProjectData = {
  containers: Record<string, unknown>[]
  edges: Record<string, unknown>[]
}

export function useFactoryActions(
  workspace: Workspace | null,
  containersRef: React.RefObject<Container[]> | null,
  connectorsRef: React.RefObject<Connector[]> | null,
  syncState: () => void,
) {
  const addContainer = useCallback(
    (opts: { x: number; y: number; name?: string; color?: string; width?: number; height?: number }) => {
      if (!workspace || !containersRef || !connectorsRef) return
      const W = opts.width ?? 140
      const H = opts.height ?? 55
      const left = new Connector({ position: new Position(0, -H / 2), name: 'in', type: 'input' })
      const right = new Connector({ position: new Position(W, -H / 2), name: 'out', type: 'output' })
      const c = new Container({
        workspace,
        position: new Position(opts.x, opts.y),
        name: opts.name ?? `Node ${containersRef.current.length + 1}`,
        color: opts.color ?? '#3b82f6',
        width: W,
        height: H,
        children: { left, right },
      })
      containersRef.current.push(c)
      connectorsRef.current.push(left, right)
      syncState()
      return c
    },
    [workspace, containersRef, connectorsRef, syncState]
  )

  const deleteSelected = useCallback(() => {
    if (!workspace || !containersRef) return
    const sel = workspace.selection.getSelection().slice()
    for (const s of sel) {
      workspace.history.execute(new RemoveCommand(workspace, s))
      const i = containersRef.current.indexOf(s as Container)
      if (i >= 0) containersRef.current.splice(i, 1)
    }
    syncState()
  }, [workspace, containersRef, syncState])

  const duplicateSelected = useCallback(() => {
    if (!workspace || !containersRef || !connectorsRef) return
    const sel = workspace.selection.getSelection().slice()
    for (const s of sel) {
      const c = s as Container
      if (!('width' in c)) continue
      addContainer({
        x: c.position.x + 20,
        y: c.position.y + 20,
        name: `${c.name} (copy)`,
        color: c.color,
        width: c.width,
        height: c.height,
      })
    }
  }, [workspace, containersRef, connectorsRef, addContainer])

  const loadTemplate = useCallback(
    (templateId: string) => {
      if (!workspace || !containersRef || !connectorsRef) return

      // 既存要素をクリア
      while (containersRef.current.length > 0) {
        const c = containersRef.current.pop()!
        workspace.removeContainer(c)
      }
      connectorsRef.current.length = 0

      const templates: Record<string, () => void> = {
        'flow-node': () => {
          const n1 = addContainer({ x: 60, y: 100, name: 'Start', color: '#3b82f6' })!
          const n2 = addContainer({ x: 280, y: 100, name: 'Process', color: '#10b981' })!
          const n3 = addContainer({ x: 500, y: 100, name: 'End', color: '#f43f5e' })!

          const c1out = Object.values(n1.children).find((c) => 'hitRadius' in c && c.type === 'output') as Connector
          const c2in = Object.values(n2.children).find((c) => 'hitRadius' in c && c.type === 'input') as Connector
          const c2out = Object.values(n2.children).find((c) => 'hitRadius' in c && c.type === 'output') as Connector
          const c3in = Object.values(n3.children).find((c) => 'hitRadius' in c && c.type === 'input') as Connector

          if (c1out && c2in) new Edge({ start: c1out, end: c2in, edgeType: 'bezier' })
          if (c2out && c3in) new Edge({ start: c2out, end: c3in, edgeType: 'bezier' })
        },
        'scratch-block': () => {
          addContainer({ x: 60, y: 60, name: 'When Flag Clicked', color: '#eab308', width: 180, height: 52 })
          addContainer({ x: 60, y: 130, name: 'Move 10 Steps', color: '#3b82f6', width: 160, height: 42 })
          addContainer({ x: 60, y: 190, name: 'Turn 90', color: '#3b82f6', width: 140, height: 42 })
        },
        'blueprint-node': () => {
          const n1 = addContainer({ x: 60, y: 100, name: 'Event Tick', color: '#e53e3e', width: 160, height: 80 })!
          const n2 = addContainer({ x: 320, y: 80, name: 'Get Actor Location', color: '#2b6cb0', width: 180, height: 80 })!
          const n3 = addContainer({ x: 600, y: 100, name: 'Print String', color: '#38a169', width: 160, height: 80 })!

          const c1out = Object.values(n1.children).find((c) => 'hitRadius' in c && c.type === 'output') as Connector
          const c2in = Object.values(n2.children).find((c) => 'hitRadius' in c && c.type === 'input') as Connector
          const c2out = Object.values(n2.children).find((c) => 'hitRadius' in c && c.type === 'output') as Connector
          const c3in = Object.values(n3.children).find((c) => 'hitRadius' in c && c.type === 'input') as Connector

          if (c1out && c2in) new Edge({ start: c1out, end: c2in, edgeType: 'smoothstep' })
          if (c2out && c3in) new Edge({ start: c2out, end: c3in, edgeType: 'smoothstep' })
        },
      }

      const loader = templates[templateId]
      if (loader) loader()
      syncState()
    },
    [workspace, containersRef, connectorsRef, addContainer, syncState]
  )

  const saveToStorage = useCallback(() => {
    if (!workspace) return
    const data: ProjectData = {
      containers: containersRef?.current.map((c) => c.toJSON()) ?? [],
      edges: workspace.edges.map((e) => e.toJSON()),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [workspace, containersRef])

  const loadFromStorage = useCallback((): boolean => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    try {
      JSON.parse(raw)
      // TODO: 将来的にJSONからの復元を実装
      return true
    } catch {
      return false
    }
  }, [])

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    addContainer,
    deleteSelected,
    duplicateSelected,
    loadTemplate,
    saveToStorage,
    loadFromStorage,
    clearStorage,
  }
}
