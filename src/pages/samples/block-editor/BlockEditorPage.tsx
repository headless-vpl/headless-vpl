import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DebugPanel } from '../../../components/DebugPanel';
import { SampleLayout } from '../../../components/SampleLayout';
import { VplCanvas } from '../../../components/VplCanvas';
import { useWorkspace } from '../../../hooks/useWorkspace';
import { BlockEditorController } from './controller';
import { BlockView } from './view';

export default function BlockEditorPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const controllerRef = useRef<BlockEditorController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new BlockEditorController();
  }
  const controller = controllerRef.current;
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  const { workspaceRef, containersRef, ready } = useWorkspace(
    svgRef,
    overlayRef,
    canvasRef,
    {
      enableShortcuts: false,
      interactionOverrides: controller.interactionOverrides,
    },
  );

  useEffect(() => {
    if (!ready || !workspaceRef.current) return;
    return controller.mount(workspaceRef.current, containersRef.current);
  }, [controller, ready, workspaceRef, containersRef]);

  return (
    <SampleLayout
      title="Block Editor"
      description="Scratch風ブロックエディター — 縦積みスナップ接続、C-blockネスト、多彩な形状"
      rightPanel={
        <DebugPanel
          workspaceRef={workspaceRef}
          containersRef={containersRef}
          svgRef={svgRef}
          overlayRef={overlayRef}
          showGrid={showGrid}
          onShowGridChange={setShowGrid}
          canvasRef={canvasRef}
        />
      }
    >
      <VplCanvas
        ref={(handle) => {
          if (handle) {
            svgRef.current = handle.svg;
            overlayRef.current = handle.overlay;
            canvasRef.current = handle.canvas;
          }
        }}
        showGrid={showGrid}
      >
        {snapshot.blocks.map((block) => (
          <BlockView
            key={block.id}
            block={block}
            container={controller.getContainer(block.id)}
            cBlockRef={controller.getCBlockRef(block.id)}
            nestedSlots={snapshot.nestedSlots}
          />
        ))}
      </VplCanvas>
    </SampleLayout>
  );
}
