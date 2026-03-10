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

const STORAGE_KEY = 'headless-vpl-showcase-workflow-editor'
const exampleData = getExampleByPath('/samples/workflow')
const showcaseEntry = getShowcaseMatrixEntry('/samples/workflow')

function workflowPin(id: string, type: 'input' | 'output'): GraphPinModel {
  return {
    id,
    name: type === 'input' ? 'In' : 'Out',
    type,
    dataType: 'step',
    anchor: createSideAnchor(type === 'input' ? 'left' : 'right'),
  }
}

function createWorkflowNode(
  kind: string,
  name: string,
  icon: string,
  color: string,
  x: number,
  y: number
): GraphNodeModel {
  return {
    id: createGraphSceneId('workflow-node'),
    kind,
    name,
    color,
    x,
    y,
    width: 180,
    height: 86,
    data: {
      icon,
      status: 'idle',
      retries: 0,
    },
    pins: [workflowPin('in', 'input'), workflowPin('out', 'output')],
  }
}

function createInitialScene(): GraphSceneModel {
  const input = createWorkflowNode('io', 'HTTP Input', '⬇', '#3b82f6', 40, 100)
  const llm = createWorkflowNode('llm', 'LLM', '🧠', '#8b5cf6', 280, 32)
  const kb = createWorkflowNode('kb', 'Knowledge Base', '📚', '#06b6d4', 280, 192)
  const merge = createWorkflowNode('merge', 'Merge', '🔀', '#f59e0b', 540, 100)
  const template = createWorkflowNode('template', 'Template', '📝', '#ec4899', 780, 100)
  const output = createWorkflowNode('io', 'HTTP Output', '⬆', '#22c55e', 1020, 100)

  return {
    version: 1,
    nodes: [input, llm, kb, merge, template, output],
    edges: [
      {
        id: createGraphSceneId('workflow-edge'),
        fromNodeId: input.id,
        fromPinId: 'out',
        toNodeId: llm.id,
        toPinId: 'in',
        edgeType: 'step',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('workflow-edge'),
        fromNodeId: input.id,
        fromPinId: 'out',
        toNodeId: kb.id,
        toPinId: 'in',
        edgeType: 'step',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('workflow-edge'),
        fromNodeId: llm.id,
        fromPinId: 'out',
        toNodeId: merge.id,
        toPinId: 'in',
        edgeType: 'step',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('workflow-edge'),
        fromNodeId: kb.id,
        fromPinId: 'out',
        toNodeId: merge.id,
        toPinId: 'in',
        edgeType: 'step',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('workflow-edge'),
        fromNodeId: merge.id,
        fromPinId: 'out',
        toNodeId: template.id,
        toPinId: 'in',
        edgeType: 'step',
        markerEnd: { type: 'arrowClosed' },
      },
      {
        id: createGraphSceneId('workflow-edge'),
        fromNodeId: template.id,
        fromPinId: 'out',
        toNodeId: output.id,
        toPinId: 'in',
        edgeType: 'step',
        markerEnd: { type: 'arrowClosed' },
      },
    ],
  }
}

function loadScene(): GraphSceneModel {
  return loadShowcaseState(STORAGE_KEY, createInitialScene())
}

function getWorkflowValue(node: GraphNodeModel, key: string): string {
  return String(node.data?.[key] ?? '')
}

export default function WorkflowEditor() {
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
          edgeType: 'step',
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
                  id: createGraphSceneId('workflow-edge'),
                  fromNodeId: start.nodeId,
                  fromPinId: start.pinId,
                  toNodeId: end.nodeId,
                  toPinId: end.pinId,
                  edgeType: 'step',
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

  const updateNode = useCallback((nodeId: string, patch: Partial<GraphNodeModel>) => {
    setScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    }))
  }, [])

  const updateNodeData = useCallback((nodeId: string, key: string, value: string | number) => {
    setScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, [key]: value } }
          : node
      ),
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
      const x = (selectedNode?.x ?? 140) + 40
      const y = (selectedNode?.y ?? 120) + 40
      const node =
        templateId === 'llm'
          ? createWorkflowNode('llm', 'LLM Step', '🧠', '#8b5cf6', x, y)
          : templateId === 'merge'
            ? createWorkflowNode('merge', 'Merge Step', '🔀', '#f59e0b', x, y)
            : createWorkflowNode('io', 'HTTP Step', '⬇', '#3b82f6', x, y)
      setScene((current) => ({ ...current, nodes: [...current.nodes, node] }))
      setSelectedNodeId(node.id)
      setSelectedEdgeId(null)
    },
    [selectedNode]
  )

  const duplicateSelected = useCallback(() => {
    if (!selectedNode) return
    const duplicate: GraphNodeModel = {
      ...selectedNode,
      id: createGraphSceneId('workflow-node'),
      x: selectedNode.x + 44,
      y: selectedNode.y + 44,
      name: `${selectedNode.name} Copy`,
      data: { ...selectedNode.data },
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
      // Ignore invalid imports in showcase mode.
    }
  }, [])

  const selectionCard = useMemo<ShowcaseSelectionCard | null>(() => {
    if (selectedNode) {
      return {
        title: selectedNode.name,
        subtitle: `Selected ${selectedNode.kind} step`,
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
            label: 'Accent',
            type: 'color',
            value: selectedNode.color,
            onChange: (value) => updateNode(selectedNode.id, { color: value }),
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            value: getWorkflowValue(selectedNode, 'status'),
            options: [
              { label: 'Idle', value: 'idle' },
              { label: 'Running', value: 'running' },
              { label: 'Ready', value: 'ready' },
              { label: 'Error', value: 'error' },
            ],
            onChange: (value) => updateNodeData(selectedNode.id, 'status', value),
          },
          {
            key: 'retries',
            label: 'Retries',
            type: 'number',
            value: Number(selectedNode.data?.retries ?? 0),
            onChange: (value) => updateNodeData(selectedNode.id, 'retries', Number(value) || 0),
          },
        ],
      }
    }

    if (selectedEdge) {
      return {
        title: selectedEdge.label || 'Workflow Edge',
        subtitle: 'Selected route',
        fields: [
          {
            key: 'label',
            label: 'Label',
            type: 'text',
            value: selectedEdge.label ?? '',
            onChange: (value) => updateEdge(selectedEdge.id, { label: value }),
          },
        ],
      }
    }

    return null
  }, [selectedEdge, selectedNode, updateEdge, updateNode, updateNodeData])

  if (!showcaseEntry) {
    return null
  }

  return (
    <SampleLayout
      title='Workflow Editor'
      description='AI workflow builder with inspector, status metadata, and persisted step templates'
      rightPanel={
        <ShowcaseRightPanel
          entry={showcaseEntry}
          selection={selectionCard}
          stats={[
            { label: 'Steps', value: scene.nodes.length },
            { label: 'Routes', value: scene.edges.length },
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
        onExport={() => downloadShowcaseJson('workflow-editor-scene.json', scene)}
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
            className={`node-workflow ${selectedNodeId === node.id ? 'selected' : ''}`}
            style={{
              width: node.width,
              height: node.height,
              borderColor: node.color,
              boxShadow: selectedNodeId === node.id ? `0 0 0 2px ${node.color}33` : undefined,
            }}
          >
            <span style={{ fontSize: '20px' }}>{getWorkflowValue(node, 'icon')}</span>
            <span className='text-xs font-medium text-zinc-600 dark:text-zinc-300'>{node.name}</span>
            <div className='showcase-node-footer'>
              <span className={`showcase-badge showcase-status-pill-${getWorkflowValue(node, 'status')}`}>
                {getWorkflowValue(node, 'status')}
              </span>
              <span className='showcase-inline-copy'>retry {getWorkflowValue(node, 'retries')}</span>
            </div>
          </div>
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
