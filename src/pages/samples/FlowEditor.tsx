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

const exampleData = getExampleByPath('/samples/flow-editor')
const showcaseEntry = getShowcaseMatrixEntry('/samples/flow-editor')
const STORAGE_KEY = 'headless-vpl-showcase-flow-editor'

function createFlowPin(
  id: string,
  name: string,
  type: 'input' | 'output',
  side: 'left' | 'right'
): GraphPinModel {
  return {
    id,
    name,
    type,
    dataType: 'flow',
    anchor: createSideAnchor(side),
  }
}

function createActionNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('flow-node'),
    kind: 'action',
    name: 'Action',
    color: '#3b82f6',
    x,
    y,
    width: 160,
    height: 64,
    pins: [
      createFlowPin('in', 'In', 'input', 'left'),
      createFlowPin('out', 'Out', 'output', 'right'),
    ],
  }
}

function createBranchNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('flow-node'),
    kind: 'branch',
    name: 'Branch',
    color: '#f59e0b',
    x,
    y,
    width: 180,
    height: 72,
    pins: [
      createFlowPin('in', 'In', 'input', 'left'),
      {
        ...createFlowPin('yes', 'Yes', 'output', 'right'),
        anchor: createSideAnchor('right', -14),
      },
      {
        ...createFlowPin('no', 'No', 'output', 'right'),
        anchor: createSideAnchor('right', 14),
      },
    ],
  }
}

function createTerminalNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('flow-node'),
    kind: 'terminal',
    name: 'Done',
    color: '#10b981',
    x,
    y,
    width: 150,
    height: 60,
    pins: [createFlowPin('in', 'In', 'input', 'left')],
  }
}

function createInitialScene(): GraphSceneModel {
  const start = {
    ...createActionNode(60, 100),
    name: 'Start',
    color: '#22c55e',
  }
  const review = {
    ...createBranchNode(300, 84),
    name: 'Review',
  }
  const publish = {
    ...createActionNode(580, 40),
    name: 'Publish',
    color: '#8b5cf6',
  }
  const rework = {
    ...createActionNode(580, 160),
    name: 'Rework',
    color: '#06b6d4',
  }
  const done = createTerminalNode(840, 100)

  return {
    version: 1,
    nodes: [start, review, publish, rework, done],
    edges: [
      {
        id: createGraphSceneId('flow-edge'),
        fromNodeId: start.id,
        fromPinId: 'out',
        toNodeId: review.id,
        toPinId: 'in',
        edgeType: 'bezier',
      },
      {
        id: createGraphSceneId('flow-edge'),
        fromNodeId: review.id,
        fromPinId: 'yes',
        toNodeId: publish.id,
        toPinId: 'in',
        edgeType: 'bezier',
        label: 'approved',
      },
      {
        id: createGraphSceneId('flow-edge'),
        fromNodeId: review.id,
        fromPinId: 'no',
        toNodeId: rework.id,
        toPinId: 'in',
        edgeType: 'bezier',
        label: 'needs work',
      },
      {
        id: createGraphSceneId('flow-edge'),
        fromNodeId: publish.id,
        fromPinId: 'out',
        toNodeId: done.id,
        toPinId: 'in',
        edgeType: 'bezier',
      },
      {
        id: createGraphSceneId('flow-edge'),
        fromNodeId: rework.id,
        fromPinId: 'out',
        toNodeId: done.id,
        toPinId: 'in',
        edgeType: 'bezier',
      },
    ],
  }
}

function loadInitialScene(): GraphSceneModel {
  return loadShowcaseState(STORAGE_KEY, createInitialScene())
}

function getViewportDropPoint(
  workspace: ReturnType<typeof useRecipeWorkspace>['workspaceRef'],
  count: number
) {
  const ws = workspace.current
  if (!ws) {
    return { x: 120 + count * 16, y: 120 + count * 16 }
  }

  return {
    x: -ws.viewport.x / ws.viewport.scale + 140 + count * 12,
    y: -ws.viewport.y / ws.viewport.scale + 120 + count * 12,
  }
}

export default function FlowEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [scene, setScene] = useState<GraphSceneModel>(loadInitialScene)
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
          if (!nodeId) continue
          moved.set(nodeId, { x: container.position.x, y: container.position.y })
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
      createEdgeBuilder: (workspace, _svgEl, previewPath) =>
        new EdgeBuilder({
          workspace,
          edgeType: 'bezier',
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
            if (start.dataType && end.dataType && start.dataType !== end.dataType) return

            setScene((current) => {
              const duplicate = current.edges.some(
                (edge) =>
                  edge.fromNodeId === start.nodeId &&
                  edge.fromPinId === start.pinId &&
                  edge.toNodeId === end.nodeId &&
                  edge.toPinId === end.pinId
              )
              if (duplicate) return current
              return {
                ...current,
                edges: [
                  ...current.edges,
                  {
                    id: createGraphSceneId('flow-edge'),
                    fromNodeId: start.nodeId,
                    fromPinId: start.pinId,
                    toNodeId: end.nodeId,
                    toPinId: end.pinId,
                    edgeType: 'bezier',
                  },
                ],
              }
            })
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

    syncSelection()
    const unsubSelect = ws.on('select', syncSelection)
    const unsubDeselect = ws.on('deselect', syncSelection)
    return () => {
      unsubSelect()
      unsubDeselect()
    }
  }, [workspaceRef, ready])

  const selectedNode = scene.nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = scene.edges.find((edge) => edge.id === selectedEdgeId) ?? null

  const updateNode = useCallback((nodeId: string, patch: Partial<GraphNodeModel>) => {
    setScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
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
      const dropPoint = getViewportDropPoint(workspaceRef, scene.nodes.length)
      const node =
        templateId === 'branch'
          ? createBranchNode(dropPoint.x, dropPoint.y)
          : templateId === 'terminal'
            ? createTerminalNode(dropPoint.x, dropPoint.y)
            : createActionNode(dropPoint.x, dropPoint.y)
      setScene((current) => ({ ...current, nodes: [...current.nodes, node] }))
      setSelectedNodeId(node.id)
      setSelectedEdgeId(null)
    },
    [scene.nodes.length, workspaceRef]
  )

  const duplicateSelected = useCallback(() => {
    if (!selectedNode) return
    const duplicated: GraphNodeModel = {
      ...selectedNode,
      id: createGraphSceneId('flow-node'),
      x: selectedNode.x + 36,
      y: selectedNode.y + 36,
      name: `${selectedNode.name} Copy`,
    }
    setScene((current) => ({ ...current, nodes: [...current.nodes, duplicated] }))
    setSelectedNodeId(duplicated.id)
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
      // Ignore malformed imports for the sample.
    }
  }, [])

  const selectionCard = useMemo<ShowcaseSelectionCard | null>(() => {
    if (selectedNode) {
      return {
        title: selectedNode.name,
        subtitle: `Selected ${selectedNode.kind} node`,
        fields: [
          {
            key: 'name',
            label: 'Name',
            type: 'text',
            value: selectedNode.name,
            onChange: (value) => updateNode(selectedNode.id, { name: value }),
          },
          {
            key: 'color',
            label: 'Color',
            type: 'color',
            value: selectedNode.color,
            onChange: (value) => updateNode(selectedNode.id, { color: value }),
          },
          {
            key: 'width',
            label: 'Width',
            type: 'number',
            value: selectedNode.width,
            onChange: (value) => updateNode(selectedNode.id, { width: Number(value) || 120 }),
          },
        ],
      }
    }

    if (selectedEdge) {
      return {
        title: selectedEdge.label || 'Flow Edge',
        subtitle: 'Selected edge',
        fields: [
          {
            key: 'label',
            label: 'Label',
            type: 'text',
            value: selectedEdge.label ?? '',
            onChange: (value) => updateEdge(selectedEdge.id, { label: value }),
          },
          {
            key: 'edgeType',
            label: 'Style',
            type: 'select',
            value: selectedEdge.edgeType ?? 'bezier',
            options: [
              { label: 'Bezier', value: 'bezier' },
              { label: 'Smoothstep', value: 'smoothstep' },
              { label: 'Step', value: 'step' },
              { label: 'Straight', value: 'straight' },
            ],
            onChange: (value) =>
              updateEdge(selectedEdge.id, {
                edgeType: value as GraphEdgeModel['edgeType'],
              }),
          },
        ],
      }
    }

    return null
  }, [selectedEdge, selectedNode, updateEdge, updateNode])

  if (!showcaseEntry) {
    return null
  }

  return (
    <SampleLayout
      title='Flow Editor'
      description='typed graph editor with palette, persistence, inspector, and drag-created edges'
      rightPanel={
        <ShowcaseRightPanel
          entry={showcaseEntry}
          selection={selectionCard}
          stats={[
            { label: 'Nodes', value: scene.nodes.length },
            { label: 'Edges', value: scene.edges.length },
            { label: 'Selected', value: selectedNodeId || selectedEdgeId || 'none' },
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
        onExport={() => downloadShowcaseJson('flow-editor-scene.json', scene)}
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
            className={`node-flow ${selectedNodeId === node.id ? 'selected' : ''}`}
            style={{
              width: node.width,
              height: node.height,
              borderColor: node.color,
              boxShadow:
                selectedNodeId === node.id ? `0 0 0 2px ${node.color}40` : undefined,
            }}
          >
            <span className='node-label'>{node.name}</span>
            <span className='showcase-node-caption'>{node.kind}</span>
          </div>
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
