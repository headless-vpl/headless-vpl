import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { DebugPanel } from '../../../components/DebugPanel'
import { SampleLayout } from '../../../components/SampleLayout'
import { VplCanvas } from '../../../components/VplCanvas'
import {
  ShowcaseRightPanel,
  ShowcaseToolbar,
} from '../../../components/showcase/ShowcasePanels'
import { downloadShowcaseJson } from '../../../components/showcase/showcaseUtils'
import { getExampleByPath } from '../../../data/examplesData'
import { getShowcaseMatrixEntry } from '../../../data/showcaseMatrix'
import { useRecipeWorkspace } from '../../../hooks/workspace/useRecipeWorkspace'
import { BlockEditorController } from './controller'
import { BlockView } from './view'

const exampleData = getExampleByPath('/samples/block-editor')
const showcaseEntry = getShowcaseMatrixEntry('/samples/block-editor')

export default function BlockEditorPage() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const controllerRef = useRef<BlockEditorController | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = new BlockEditorController()
  }
  const controller = controllerRef.current
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )

  const { workspaceRef, containersRef, ready } = useRecipeWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: false,
      interactionOverrides: controller.interactionOverrides,
    },
  )

  useEffect(() => {
    if (!ready || !workspaceRef.current) return
    return controller.mount(workspaceRef.current, containersRef.current)
  }, [controller, ready, workspaceRef, containersRef])

  if (!showcaseEntry) {
    return null
  }

  return (
    <SampleLayout
      title='Block Editor'
      description='Scratch-like block editor with typed slots, C-block nesting, and a tracked support matrix'
      rightPanel={
        <ShowcaseRightPanel
          entry={showcaseEntry}
          stats={[
            { label: 'Blocks', value: snapshot.blocks.length },
            { label: 'Nested Slots', value: Object.keys(snapshot.nestedSlots).length },
            { label: 'Scripts', value: snapshot.blocks.filter((block) => block.def.shape === 'hat').length },
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
        onExport={() => downloadShowcaseJson('block-editor-snapshot.json', snapshot)}
        onReset={() => controller.reset()}
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
        {snapshot.blocks.map((block, index) => (
          <BlockView
            key={block.id}
            block={block}
            container={controller.getContainer(block.id)}
            createdBlock={controller.getCreatedBlock(block.id)}
            cBlockRef={controller.getCBlockRef(block.id)}
            zIndex={index + 1}
            nestedSlots={snapshot.nestedSlots}
            onInputValueChange={controller.updateInputValue.bind(controller)}
          />
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
