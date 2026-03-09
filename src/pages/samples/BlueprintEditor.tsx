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
  rebuildGraphScene,
  type GraphEdgeModel,
  type GraphNodeModel,
  type GraphPinModel,
  type GraphSceneModel,
} from './shared/graphShowcase'

const STORAGE_KEY = 'headless-vpl-showcase-blueprint-editor'
const exampleData = getExampleByPath('/samples/blueprint')
const showcaseEntry = getShowcaseMatrixEntry('/samples/blueprint')

function blueprintPin(
  id: string,
  name: string,
  type: 'input' | 'output',
  lane: number,
  dataType: string
): GraphPinModel {
  const baseY = 44 + lane * 28
  return {
    id,
    name,
    type,
    dataType,
    anchor:
      type === 'input'
        ? { target: 'parent', origin: 'top-left', offset: { x: 0, y: baseY } }
        : { target: 'parent', origin: 'top-right', offset: { x: 0, y: baseY } },
  }
}

function createBranchNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('blueprint-node'),
    kind: 'branch',
    name: 'Branch',
    color: '#2563eb',
    x,
    y,
    width: 220,
    height: 132,
    data: { condition: true },
    pins: [
      blueprintPin('exec-in', 'Exec', 'input', 0, 'exec'),
      blueprintPin('condition', 'Condition', 'input', 1, 'boolean'),
      blueprintPin('true', 'True', 'output', 0, 'exec'),
      blueprintPin('false', 'False', 'output', 1, 'exec'),
    ],
  }
}

function createPrintNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('blueprint-node'),
    kind: 'print',
    name: 'Print String',
    color: '#059669',
    x,
    y,
    width: 230,
    height: 116,
    data: { text: 'Hello world' },
    pins: [
      blueprintPin('exec-in', 'Exec', 'input', 0, 'exec'),
      blueprintPin('text', 'String', 'input', 1, 'string'),
      blueprintPin('exec-out', 'Exec Out', 'output', 0, 'exec'),
    ],
  }
}

function createValueNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('blueprint-node'),
    kind: 'value',
    name: 'Get Variable',
    color: '#7c3aed',
    x,
    y,
    width: 190,
    height: 88,
    data: { color: '#dc2626' },
    pins: [blueprintPin('value', 'Value', 'output', 0, 'color')],
  }
}

function createEventNode(x: number, y: number): GraphNodeModel {
  return {
    id: createGraphSceneId('blueprint-node'),
    kind: 'event',
    name: 'Begin Play',
    color: '#dc2626',
    x,
    y,
    width: 190,
    height: 88,
    pins: [blueprintPin('exec', 'Exec', 'output', 0, 'exec')],
  }
}

function createInitialScene(): GraphSceneModel {
  const begin = createEventNode(48, 80)
  const branch = createBranchNode(320, 48)
  const print = createPrintNode(620, 40)
  const setter = {
    ...createPrintNode(620, 200),
    id: createGraphSceneId('blueprint-node'),
    kind: 'setter',
    name: 'Set Actor Hidden',
    color: '#0f766e',
    data: { text: 'false' },
    pins: [
      blueprintPin('exec-in', 'Exec', 'input', 0, 'exec'),
      blueprintPin('hidden', 'Hidden', 'input', 1, 'boolean'),
      blueprintPin('exec-out', 'Exec Out', 'output', 0, 'exec'),
    ],
  }
  const variable = createValueNode(68, 250)

  return {
    version: 1,
    nodes: [begin, branch, print, setter, variable],
    edges: [
      {
        id: createGraphSceneId('blueprint-edge'),
        fromNodeId: begin.id,
        fromPinId: 'exec',
        toNodeId: branch.id,
        toPinId: 'exec-in',
        edgeType: 'smoothstep',
      },
      {
        id: createGraphSceneId('blueprint-edge'),
        fromNodeId: branch.id,
        fromPinId: 'true',
        toNodeId: print.id,
        toPinId: 'exec-in',
        edgeType: 'smoothstep',
      },
      {
        id: createGraphSceneId('blueprint-edge'),
        fromNodeId: branch.id,
        fromPinId: 'false',
        toNodeId: setter.id,
        toPinId: 'exec-in',
        edgeType: 'smoothstep',
      },
      {
        id: createGraphSceneId('blueprint-edge'),
        fromNodeId: variable.id,
        fromPinId: 'value',
        toNodeId: branch.id,
        toPinId: 'condition',
        edgeType: 'smoothstep',
      },
    ],
  }
}

function loadScene(): GraphSceneModel {
  return loadShowcaseState(STORAGE_KEY, createInitialScene())
}

function getNodeValue(node: GraphNodeModel, key: string): string {
  return String(node.data?.[key] ?? '')
}

export default function BlueprintEditor() {
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
            if (!start.dataType || !end.dataType) return
            if (start.dataType !== end.dataType) return

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
                    id: createGraphSceneId('blueprint-edge'),
                    fromNodeId: start.nodeId,
                    fromPinId: start.pinId,
                    toNodeId: end.nodeId,
                    toPinId: end.pinId,
                    edgeType: 'smoothstep',
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

  const updateNodeData = useCallback((nodeId: string, key: string, value: string | boolean) => {
    setScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                [key]: value,
              },
            }
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
      const baseX = selectedNode?.x ?? 160 + scene.nodes.length * 12
      const baseY = selectedNode?.y ?? 120 + scene.nodes.length * 12
      const node =
        templateId === 'branch'
          ? createBranchNode(baseX + 40, baseY + 40)
          : templateId === 'print'
            ? createPrintNode(baseX + 40, baseY + 40)
            : createValueNode(baseX + 40, baseY + 40)
      setScene((current) => ({ ...current, nodes: [...current.nodes, node] }))
      setSelectedNodeId(node.id)
      setSelectedEdgeId(null)
    },
    [scene.nodes.length, selectedNode]
  )

  const duplicateSelected = useCallback(() => {
    if (!selectedNode) return
    const duplicate: GraphNodeModel = {
      ...selectedNode,
      id: createGraphSceneId('blueprint-node'),
      x: selectedNode.x + 36,
      y: selectedNode.y + 36,
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
      // Ignore invalid sample imports.
    }
  }, [])

  const selectionCard = useMemo<ShowcaseSelectionCard | null>(() => {
    if (selectedNode) {
      const fields: ShowcaseSelectionCard['fields'] = [
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          value: selectedNode.name,
          onChange: (value) => updateNode(selectedNode.id, { name: value }),
        },
        {
          key: 'color',
          label: 'Header',
          type: 'color',
          value: selectedNode.color,
          onChange: (value) => updateNode(selectedNode.id, { color: value }),
        },
      ]

      if (selectedNode.kind === 'branch') {
        fields.push({
          key: 'condition',
          label: 'Condition',
          type: 'toggle',
          value: Boolean(selectedNode.data?.condition),
          onChange: (value) => updateNodeData(selectedNode.id, 'condition', value),
        })
      }

      if (selectedNode.kind === 'print' || selectedNode.kind === 'setter') {
        fields.push({
          key: 'text',
          label: 'Input Value',
          type: 'text',
          value: getNodeValue(selectedNode, 'text'),
          onChange: (value) => updateNodeData(selectedNode.id, 'text', value),
        })
      }

      if (selectedNode.kind === 'value') {
        fields.push({
          key: 'color-value',
          label: 'Output Color',
          type: 'color',
          value: getNodeValue(selectedNode, 'color'),
          onChange: (value) => updateNodeData(selectedNode.id, 'color', value),
        })
      }

      return {
        title: selectedNode.name,
        subtitle: `Selected ${selectedNode.kind} node`,
        fields,
      }
    }

    if (selectedEdge) {
      return {
        title: selectedEdge.label || 'Transition',
        subtitle: 'Selected edge',
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
      title='Blueprint Editor'
      description='multi-pin graph editor with typed pins, inspector editing, and persisted scene state'
      rightPanel={
        <ShowcaseRightPanel
          entry={showcaseEntry}
          selection={selectionCard}
          stats={[
            { label: 'Nodes', value: scene.nodes.length },
            { label: 'Edges', value: scene.edges.length },
            { label: 'Selection', value: selectedNodeId || selectedEdgeId || 'none' },
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
        onExport={() => downloadShowcaseJson('blueprint-editor-scene.json', scene)}
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
        {scene.nodes.map((node) => {
          const inputPins = node.pins.filter((pin) => pin.type === 'input')
          const outputPins = node.pins.filter((pin) => pin.type === 'output')

          return (
            <div
              key={node.id}
              id={`node-${node.id}`}
              className={`node-blueprint ${selectedNodeId === node.id ? 'selected' : ''}`}
              style={{ width: node.width, height: node.height }}
            >
              <div
                className='px-3 py-1.5 text-xs font-semibold text-white'
                style={{ background: node.color }}
              >
                {node.name}
              </div>
              <div className='flex flex-1 justify-between px-2 py-2 text-[11px]'>
                <div className='flex flex-col gap-1.5'>
                  {inputPins.map((pin) => (
                    <div key={pin.id} className='flex items-center gap-1.5'>
                      <div
                        className='h-2 w-2 rounded-full border border-zinc-600'
                        style={{ background: pin.dataType === 'exec' ? '#ffffff' : '#dc2626' }}
                      />
                      <span className='text-zinc-500 dark:text-zinc-400'>{pin.name}</span>
                    </div>
                  ))}
                </div>
                <div className='flex flex-col gap-1.5 items-end'>
                  {outputPins.map((pin) => (
                    <div key={pin.id} className='flex items-center gap-1.5'>
                      {pin.dataType === 'color' && (
                        <span
                          className='showcase-swatch'
                          style={{ background: getNodeValue(node, 'color') }}
                        />
                      )}
                      <span className='text-zinc-500 dark:text-zinc-400'>{pin.name}</span>
                      <div
                        className='h-2 w-2 rounded-full border border-zinc-600'
                        style={{
                          background:
                            pin.dataType === 'exec'
                              ? '#ffffff'
                              : pin.dataType === 'color'
                                ? getNodeValue(node, 'color')
                                : '#ec4899',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className='showcase-node-footer'>
                {node.kind === 'branch' && (
                  <span className={`showcase-badge ${node.data?.condition ? 'active' : ''}`}>
                    {node.data?.condition ? 'Condition: true' : 'Condition: false'}
                  </span>
                )}
                {(node.kind === 'print' || node.kind === 'setter') && (
                  <span className='showcase-inline-copy'>{getNodeValue(node, 'text')}</span>
                )}
              </div>
            </div>
          )
        })}
      </VplCanvas>
    </SampleLayout>
  )
}
