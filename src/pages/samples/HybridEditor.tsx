import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  EdgeBuilder,
  SnapConnection,
  computeConnectorSnapDistance,
} from '../../lib/headless-vpl/helpers'
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
  type GraphSceneModel,
} from './shared/graphShowcase'

const STORAGE_KEY = 'headless-vpl-showcase-hybrid-editor'
const exampleData = getExampleByPath('/samples/hybrid-editor')
const showcaseEntry = getShowcaseMatrixEntry('/samples/hybrid-editor')

function createBlockNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('hybrid-node'),
    kind: 'block',
    name: 'Block Step',
    color: '#7c3aed',
    x,
    y,
    width: 176,
    height: 52,
    data: { note: 'executes with data input' },
    pins: [
      { id: 'top', name: 'Top', type: 'input', dataType: 'stack', anchor: createSideAnchor('top') },
      { id: 'bottom', name: 'Bottom', type: 'output', dataType: 'stack', anchor: createSideAnchor('bottom') },
      { id: 'data-in', name: 'Data', type: 'input', dataType: 'data', anchor: createSideAnchor('right') },
    ],
  }
}

function createDataNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('hybrid-node'),
    kind: 'data',
    name: 'Data Source',
    color: '#3b82f6',
    x,
    y,
    width: 132,
    height: 48,
    data: { value: '42' },
    pins: [
      { id: 'out', name: 'Out', type: 'output', dataType: 'data', anchor: createSideAnchor('right') },
    ],
  }
}

function createInitialScene(): GraphSceneModel {
  const start = { ...createBlockNode(60, 60), name: 'Start', color: '#22c55e' }
  const condition = { ...createBlockNode(60, 140), name: 'If Condition', color: '#f59e0b' }
  const execute = { ...createBlockNode(60, 220), name: 'Execute', color: '#7c3aed' }
  const variable = { ...createDataNode(360, 80), name: 'Variable X', data: { value: 'user.score' } }
  const constant = { ...createDataNode(360, 200), name: 'Constant 42', color: '#06b6d4', data: { value: '42' } }

  return {
    version: 1,
    nodes: [start, condition, execute, variable, constant],
    edges: [
      {
        id: createGraphSceneId('hybrid-edge'),
        fromNodeId: variable.id,
        fromPinId: 'out',
        toNodeId: condition.id,
        toPinId: 'data-in',
        edgeType: 'bezier',
      },
      {
        id: createGraphSceneId('hybrid-edge'),
        fromNodeId: constant.id,
        fromPinId: 'out',
        toNodeId: execute.id,
        toPinId: 'data-in',
        edgeType: 'bezier',
      },
    ],
  }
}

function loadScene(): GraphSceneModel {
  return loadShowcaseState(STORAGE_KEY, createInitialScene())
}

function getNodeData(node: GraphNodeModel, key: string): string {
  return String(node.data?.[key] ?? '')
}

export default function HybridEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [scene, setScene] = useState<GraphSceneModel>(loadScene)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const snapConnectionsRef = useRef<SnapConnection[]>([])

  const containerToNodeIdRef = useRef<Map<string, string>>(new Map())
  const nodeToContainerRef = useRef<Map<string, { id: string; top?: { x: number; y: number } }>>(new Map())
  const edgeToWorkspaceRef = useRef<Map<string, string>>(new Map())
  const connectorMetaRef = useRef<Map<string, { nodeId: string; pinId: string; type: 'input' | 'output'; dataType?: string }>>(new Map())

  const interactionOverrides = useMemo<Partial<InteractionConfig>>(
    () => ({
      snapConnections: snapConnectionsRef.current,
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
            if (start.dataType !== 'data' || end.dataType !== 'data') return
            setScene((current) => ({
              ...current,
              edges: [
                ...current.edges,
                {
                  id: createGraphSceneId('hybrid-edge'),
                  fromNodeId: start.nodeId,
                  fromPinId: start.pinId,
                  toNodeId: end.nodeId,
                  toPinId: end.pinId,
                  edgeType: 'bezier',
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
    nodeToContainerRef.current = new Map(
      Array.from(build.nodeToContainer.entries()).map(([nodeId, container]) => [nodeId, { id: container.id }])
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

    snapConnectionsRef.current.length = 0
    const blockNodes = scene.nodes.filter((node) => node.kind === 'block')
    for (const sourceNode of blockNodes) {
      const sourceContainer = build.nodeToContainer.get(sourceNode.id)
      if (!sourceContainer) continue
      for (const targetNode of blockNodes) {
        if (sourceNode.id === targetNode.id) continue
        const targetContainer = build.nodeToContainer.get(targetNode.id)
        if (!targetContainer) continue
        const sourceTop = sourceContainer.children.top
        const targetBottom = targetContainer.children.bottom
        if (!sourceTop || !targetBottom) continue
        snapConnectionsRef.current.push(
          new SnapConnection({
            source: sourceContainer,
            sourcePosition: sourceTop.position,
            target: targetContainer,
            targetPosition: targetBottom.position,
            workspace: workspaceRef.current,
            snapDistance: computeConnectorSnapDistance(sourceTop, targetBottom),
          })
        )
      }
    }
  }, [ready, scene, workspaceRef, containersRef, connectorsRef])

  useEffect(() => {
    const ws = workspaceRef.current
    if (!ready || !ws) return

    ws.selection.deselectAll()
    if (!selectedNodeId) return

    const containerId = nodeToContainerRef.current.get(selectedNodeId)?.id
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

  const updateNodeData = useCallback((nodeId: string, key: string, value: string) => {
    setScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, [key]: value } } : node
      ),
    }))
  }, [])

  const addTemplate = useCallback(
    (templateId: string) => {
      const x = (selectedNode?.x ?? 120) + 44
      const y = (selectedNode?.y ?? 120) + 44
      const node =
        templateId === 'data' ? createDataNode(x + 120, y) : createBlockNode(x, y)
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
      id: createGraphSceneId('hybrid-node'),
      x: selectedNode.x + 40,
      y: selectedNode.y + 40,
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
      // Ignore invalid imports for showcase mode.
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
            key: 'value',
            label: selectedNode.kind === 'data' ? 'Value' : 'Note',
            type: 'text',
            value: getNodeData(selectedNode, selectedNode.kind === 'data' ? 'value' : 'note'),
            onChange: (value) =>
              updateNodeData(selectedNode.id, selectedNode.kind === 'data' ? 'value' : 'note', value),
          },
        ],
      }
    }
    if (selectedEdge) {
      return {
        title: selectedEdge.label || 'Data Edge',
        subtitle: 'Selected data connection',
        fields: [],
      }
    }
    return null
  }, [selectedEdge, selectedNode, updateNode, updateNodeData])

  if (!showcaseEntry) {
    return null
  }

  return (
    <SampleLayout
      title='Hybrid Editor'
      description='mixed stack and data-flow workspace with scene persistence and inspector-backed editing'
      rightPanel={
        <ShowcaseRightPanel
          entry={showcaseEntry}
          selection={selectionCard}
          stats={[
            { label: 'Nodes', value: scene.nodes.length },
            { label: 'Data Edges', value: scene.edges.length },
            { label: 'Stack Nodes', value: scene.nodes.filter((node) => node.kind === 'block').length },
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
        onExport={() => downloadShowcaseJson('hybrid-editor-scene.json', scene)}
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
        {scene.nodes.map((node) =>
          node.kind === 'block' ? (
            <div
              key={node.id}
              id={`node-${node.id}`}
              className={`node-scratch ${selectedNodeId === node.id ? 'selected' : ''}`}
              style={{
                width: node.width,
                height: node.height,
                background: `linear-gradient(135deg, ${node.color}, ${node.color}cc)`,
              }}
            >
              <div className='flex flex-col items-center gap-1'>
                <span style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600, fontSize: '13px' }}>
                  {node.name}
                </span>
                <span className='showcase-inline-copy showcase-inline-copy-inverse'>
                  {getNodeData(node, 'note')}
                </span>
              </div>
            </div>
          ) : (
            <div
              key={node.id}
              id={`node-${node.id}`}
              className={`node-flow ${selectedNodeId === node.id ? 'selected' : ''}`}
              style={{ width: node.width, height: node.height, borderColor: node.color }}
            >
              <span className='node-label'>{node.name}</span>
              <span className='showcase-node-caption'>{getNodeData(node, 'value')}</span>
            </div>
          )
        )}
      </VplCanvas>
    </SampleLayout>
  )
}
