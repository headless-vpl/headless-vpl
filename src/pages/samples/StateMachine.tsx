import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EdgeBuilder } from '../../lib/headless-vpl/helpers'
import type { InteractionConfig } from '../../lib/headless-vpl/recipes'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import {
  ShowcaseRightPanel,
  ShowcaseToolbar,
  type ShowcaseSelectionCard,
} from '../../components/showcase/ShowcasePanels'
import {
  downloadShowcaseJson,
  loadShowcaseState,
  saveShowcaseState,
} from '../../components/showcase/showcaseUtils'
import { getExampleByPath } from '../../data/examplesData'
import { getShowcaseMatrixEntry } from '../../data/showcaseMatrix'
import { useRecipeWorkspace } from '../../hooks/workspace/useRecipeWorkspace'
import {
  createGraphSceneId,
  createSideAnchor,
  rebuildGraphScene,
  type GraphEdgeModel,
  type GraphNodeModel,
  type GraphPinModel,
  type GraphSceneModel,
} from './shared/graphShowcase'

const STORAGE_KEY = 'headless-vpl-showcase-state-machine'
const exampleData = getExampleByPath('/samples/state-machine')
const showcaseEntry = getShowcaseMatrixEntry('/samples/state-machine')

function statePins(size: number): GraphPinModel[] {
  return [
    { id: 'left', name: 'Left', type: 'input', dataType: 'transition', anchor: createSideAnchor('left') },
    { id: 'right', name: 'Right', type: 'output', dataType: 'transition', anchor: createSideAnchor('right') },
    { id: 'top', name: 'Top', type: 'input', dataType: 'transition', anchor: createSideAnchor('top') },
    { id: 'bottom', name: 'Bottom', type: 'output', dataType: 'transition', anchor: createSideAnchor('bottom') },
  ]
}

function createStateNode(
  kind: 'initial' | 'normal' | 'final',
  name: string,
  color: string,
  x: number,
  y: number
): GraphNodeModel {
  const size = 84
  return {
    id: createGraphSceneId('state-node'),
    kind,
    name,
    color,
    x,
    y,
    width: size,
    height: size,
    data: { active: kind === 'initial' },
    pins: statePins(size),
  }
}

function createInitialScene(): GraphSceneModel {
  const idle = createStateNode('initial', 'Idle', '#22c55e', 60, 120)
  const loading = createStateNode('normal', 'Loading', '#3b82f6', 260, 40)
  const active = createStateNode('normal', 'Active', '#8b5cf6', 260, 220)
  const error = createStateNode('normal', 'Error', '#ef4444', 480, 40)
  const done = createStateNode('final', 'Done', '#f59e0b', 480, 220)

  return {
    version: 1,
    nodes: [idle, loading, active, error, done],
    edges: [
      {
        id: createGraphSceneId('state-edge'),
        fromNodeId: idle.id,
        fromPinId: 'right',
        toNodeId: loading.id,
        toPinId: 'left',
        edgeType: 'smoothstep',
        label: 'load',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('state-edge'),
        fromNodeId: idle.id,
        fromPinId: 'bottom',
        toNodeId: active.id,
        toPinId: 'top',
        edgeType: 'smoothstep',
        label: 'start',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('state-edge'),
        fromNodeId: loading.id,
        fromPinId: 'right',
        toNodeId: error.id,
        toPinId: 'left',
        edgeType: 'smoothstep',
        label: 'fail',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('state-edge'),
        fromNodeId: loading.id,
        fromPinId: 'bottom',
        toNodeId: active.id,
        toPinId: 'top',
        edgeType: 'smoothstep',
        label: 'ready',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('state-edge'),
        fromNodeId: active.id,
        fromPinId: 'right',
        toNodeId: done.id,
        toPinId: 'left',
        edgeType: 'smoothstep',
        label: 'complete',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('state-edge'),
        fromNodeId: error.id,
        fromPinId: 'bottom',
        toNodeId: idle.id,
        toPinId: 'top',
        edgeType: 'smoothstep',
        label: 'retry',
        markerEnd: { type: 'arrowClosed' },
      },
    ],
  }
}

function loadScene(): GraphSceneModel {
  return loadShowcaseState(STORAGE_KEY, createInitialScene())
}

export default function StateMachine() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [scene, setScene] = useState<GraphSceneModel>(loadScene)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const containerToNodeIdRef = useRef<Map<string, string>>(new Map())
  const nodeToContainerIdRef = useRef<Map<string, string>>(new Map())
  const edgeToWorkspaceRef = useRef<Map<string, string>>(new Map())
  const connectorMetaRef = useRef<Map<string, { nodeId: string; pinId: string; type: 'input' | 'output'; dataType?: string }>>(new Map())

  const interactionOverrides = useMemo<Partial<InteractionConfig>>(
    () => ({
      onDragEnd: (containers) => {
        const moved = new Map<string, { x: number; y: number }>()
        for (const container of containers) {
          const nodeId = containerToNodeIdRef.current.get(container.id)
          if (nodeId) {
            moved.set(nodeId, { x: container.position.x, y: container.position.y })
          }
        }
        if (moved.size === 0) return
        setScene((current) => ({
          ...current,
          nodes: current.nodes.map((node) => {
            const next = moved.get(node.id)
            return next ? { ...node, x: next.x, y: next.y } : node
          }),
        }))
      },
      onEdgeSelect: (workspaceEdgeId) => {
        if (!workspaceEdgeId) {
          setSelectedEdgeId(null)
          return
        }
        for (const [edgeId, mappedId] of edgeToWorkspaceRef.current.entries()) {
          if (mappedId === workspaceEdgeId) {
            setSelectedEdgeId(edgeId)
            setSelectedNodeId(null)
            return
          }
        }
      },
    }),
    []
  )

  const { workspaceRef, containersRef, connectorsRef, ready } = useRecipeWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: false,
      interactionOverrides,
      resolveDomElement: (container) => {
        const nodeId = containerToNodeIdRef.current.get(container.id)
        return nodeId ? document.getElementById(`node-${nodeId}`) : null
      },
      createEdgeBuilder: (workspace, _svg, previewPath) =>
        new EdgeBuilder({
          workspace,
          edgeType: 'smoothstep',
          onPreview: (path) => {
            previewPath.setAttribute('d', path)
            previewPath.setAttribute('display', 'block')
          },
          onComplete: (workspaceEdge) => {
            previewPath.setAttribute('display', 'none')
            workspace.removeEdge(workspaceEdge)
            const start = connectorMetaRef.current.get(workspaceEdge.startConnector.id)
            const end = connectorMetaRef.current.get(workspaceEdge.endConnector.id)
            if (!start || !end) return
            if (start.nodeId === end.nodeId) return
            if (start.type !== 'output' || end.type !== 'input') return
            setScene((current) => ({
              ...current,
              edges: [
                ...current.edges,
                {
                  id: createGraphSceneId('state-edge'),
                  fromNodeId: start.nodeId,
                  fromPinId: start.pinId,
                  toNodeId: end.nodeId,
                  toPinId: end.pinId,
                  edgeType: 'smoothstep',
                  label: 'event',
                  markerEnd: { type: 'arrowClosed' },
                },
              ],
            }))
          },
          onCancel: () => {
            previewPath.setAttribute('display', 'none')
          },
        }),
    }
  )

  useEffect(() => {
    saveShowcaseState(STORAGE_KEY, scene)
  }, [scene])

  useEffect(() => {
    if (!ready || !workspaceRef.current) return
    const build = rebuildGraphScene(workspaceRef.current, scene, containersRef, connectorsRef)
    containerToNodeIdRef.current = new Map(
      Array.from(build.nodeToContainer.entries()).map(([nodeId, container]) => [container.id, nodeId])
    )
    nodeToContainerIdRef.current = new Map(
      Array.from(build.nodeToContainer.entries()).map(([nodeId, container]) => [nodeId, container.id])
    )
    edgeToWorkspaceRef.current = build.edgeToWorkspace
    connectorMetaRef.current = new Map(
      Array.from(build.connectorMeta.entries()).map(([connectorId, meta]) => [
        connectorId,
        {
          nodeId: meta.nodeId,
          pinId: meta.pinId,
          type: meta.pin.type,
          dataType: meta.pin.dataType,
        },
      ])
    )
  }, [ready, scene, workspaceRef, containersRef, connectorsRef])

  useEffect(() => {
    const ws = workspaceRef.current
    if (!ready || !ws) return

    ws.selection.deselectAll()
    if (!selectedNodeId) return

    const containerId = nodeToContainerIdRef.current.get(selectedNodeId)
    const selected = containersRef.current.find((container) => container.id === containerId)
    if (selected) {
      ws.selection.select(selected)
    }
  }, [ready, scene, selectedNodeId, workspaceRef, containersRef])

  useEffect(() => {
    const ws = workspaceRef.current
    if (!ws) return
    const syncSelection = () => {
      const selected = ws.selection.getSelection()[0]
      if (!selected) {
        setSelectedNodeId(null)
        return
      }
      const nodeId = containerToNodeIdRef.current.get(selected.id)
      setSelectedNodeId(nodeId ?? null)
      if (nodeId) {
        setSelectedEdgeId(null)
      }
    }

    const unsubSelect = ws.on('select', syncSelection)
    const unsubDeselect = ws.on('deselect', syncSelection)
    syncSelection()
    return () => {
      unsubSelect()
      unsubDeselect()
    }
  }, [workspaceRef, ready])

  const selectedNode = scene.nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = scene.edges.find((edge) => edge.id === selectedEdgeId) ?? null

  const activeStateId = scene.nodes.find((node) => Boolean(node.data?.active))?.id ?? null
  const initialCount = scene.nodes.filter((node) => node.kind === 'initial').length
  const finalCount = scene.nodes.filter((node) => node.kind === 'final').length

  const updateNode = useCallback((nodeId: string, patch: Partial<GraphNodeModel>) => {
    setScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    }))
  }, [])

  const updateNodeKind = useCallback((nodeId: string, nextKind: string) => {
    setScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              kind: nextKind,
              data: {
                ...node.data,
                active: nextKind === 'initial' ? true : node.data?.active,
              },
            }
          : node
      ),
    }))
  }, [])

  const setActiveState = useCallback((nodeId: string) => {
    setScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          active: node.id === nodeId,
        },
      })),
    }))
  }, [])

  const updateEdge = useCallback((edgeId: string, patch: Partial<GraphEdgeModel>) => {
    setScene((current) => ({
      ...current,
      edges: current.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
    }))
  }, [])

  const addTemplate = useCallback(
    (templateId: string) => {
      const x = (selectedNode?.x ?? 160) + 44
      const y = (selectedNode?.y ?? 120) + 44
      const node =
        templateId === 'initial'
          ? createStateNode('initial', 'Initial', '#22c55e', x, y)
          : templateId === 'final'
            ? createStateNode('final', 'Final', '#f59e0b', x, y)
            : createStateNode('normal', 'State', '#3b82f6', x, y)
      setScene((current) => ({
        ...current,
        nodes: templateId === 'initial'
          ? current.nodes.map((existing) => ({
              ...existing,
              data: { ...existing.data, active: false },
            })).concat(node)
          : [...current.nodes, node],
      }))
      setSelectedNodeId(node.id)
      setSelectedEdgeId(null)
    },
    [selectedNode]
  )

  const duplicateSelected = useCallback(() => {
    if (!selectedNode) return
    const duplicate: GraphNodeModel = {
      ...selectedNode,
      id: createGraphSceneId('state-node'),
      x: selectedNode.x + 40,
      y: selectedNode.y + 40,
      name: `${selectedNode.name} Copy`,
      data: { ...selectedNode.data, active: false },
    }
    setScene((current) => ({ ...current, nodes: [...current.nodes, duplicate] }))
    setSelectedNodeId(duplicate.id)
  }, [selectedNode])

  const deleteSelection = useCallback(() => {
    if (selectedEdgeId) {
      setScene((current) => ({
        ...current,
        edges: current.edges.filter((edge) => edge.id !== selectedEdgeId),
      }))
      setSelectedEdgeId(null)
      return
    }
    if (!selectedNodeId) return
    setScene((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== selectedNodeId),
      edges: current.edges.filter(
        (edge) => edge.fromNodeId !== selectedNodeId && edge.toNodeId !== selectedNodeId
      ),
    }))
    setSelectedNodeId(null)
  }, [selectedEdgeId, selectedNodeId])

  const importScene = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as GraphSceneModel
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return
      setScene(parsed)
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
    } catch {
      // Ignore invalid imports for the sample.
    }
  }, [])

  const selectionCard = useMemo<ShowcaseSelectionCard | null>(() => {
    if (selectedNode) {
      return {
        title: selectedNode.name,
        subtitle: `Selected ${selectedNode.kind} state`,
        fields: [
          {
            key: 'name',
            label: 'Name',
            type: 'text',
            value: selectedNode.name,
            onChange: (value) => updateNode(selectedNode.id, { name: value }),
          },
          {
            key: 'kind',
            label: 'Kind',
            type: 'select',
            value: selectedNode.kind,
            options: [
              { label: 'Initial', value: 'initial' },
              { label: 'Normal', value: 'normal' },
              { label: 'Final', value: 'final' },
            ],
            onChange: (value) => updateNodeKind(selectedNode.id, value),
          },
          {
            key: 'color',
            label: 'Color',
            type: 'color',
            value: selectedNode.color,
            onChange: (value) => updateNode(selectedNode.id, { color: value }),
          },
          {
            key: 'active',
            label: 'Active',
            type: 'toggle',
            value: Boolean(selectedNode.data?.active),
            onChange: () => setActiveState(selectedNode.id),
          },
        ],
      }
    }

    if (selectedEdge) {
      return {
        title: selectedEdge.label || 'Transition',
        subtitle: 'Selected transition',
        fields: [
          {
            key: 'label',
            label: 'Event',
            type: 'text',
            value: selectedEdge.label ?? '',
            onChange: (value) => updateEdge(selectedEdge.id, { label: value }),
          },
        ],
      }
    }

    return null
  }, [selectedEdge, selectedNode, setActiveState, updateEdge, updateNode, updateNodeKind])

  if (!showcaseEntry) {
    return null
  }

  return (
    <SampleLayout
      title='State Machine'
      description='validated state graph with transition editing, active-state simulation, and persisted scenes'
      rightPanel={
        <ShowcaseRightPanel
          entry={showcaseEntry}
          selection={selectionCard}
          stats={[
            { label: 'States', value: scene.nodes.length },
            { label: 'Transitions', value: scene.edges.length },
            { label: 'Initial', value: initialCount },
            { label: 'Final', value: finalCount },
            { label: 'Active', value: activeStateId ?? 'none' },
          ]}
        >
          <DebugPanel
            workspaceRef={workspaceRef}
            containersRef={containersRef}
            svgRef={svgRef}
            overlayRef={overlayRef}
            showGrid={showGrid}
            onShowGridChange={setShowGrid}
            canvasRef={canvasRef}
          />
        </ShowcaseRightPanel>
      }
      longDescription={exampleData?.longDescription}
      codeSnippet={exampleData?.codeSnippet}
    >
      <ShowcaseToolbar
        templates={showcaseEntry.templates}
        onAddTemplate={addTemplate}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelection}
        onExport={() => downloadShowcaseJson('state-machine-scene.json', scene)}
        onImport={importScene}
        onReset={() => {
          setScene(createInitialScene())
          setSelectedNodeId(null)
          setSelectedEdgeId(null)
        }}
      />
      <VplCanvas
        ref={(handle) => {
          if (handle) {
            svgRef.current = handle.svg
            overlayRef.current = handle.overlay
            canvasRef.current = handle.canvas
          }
        }}
        showGrid={showGrid}
        height='calc(100% - 52px)'
      >
        {scene.nodes.map((node) => (
          <div
            key={node.id}
            id={`node-${node.id}`}
            className={`node-state ${selectedNodeId === node.id ? 'selected' : ''}`}
            style={{
              width: node.width,
              height: node.height,
              borderColor: node.color,
              borderWidth: node.kind === 'final' ? '3px' : '2px',
              borderStyle: node.kind === 'final' ? 'double' : 'solid',
              boxShadow: node.data?.active ? `0 0 0 6px ${node.color}24` : undefined,
            }}
          >
            <span>{node.name}</span>
            <span className='showcase-state-kind'>{node.kind}</span>
          </div>
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
