import { createSlotZone } from '../../../lib/headless-vpl/util/nesting';
import { createSnapConnections } from '../../../lib/headless-vpl/util/snap';
import {
  createConnectorInsertZone,
  isConnectorColliding,
} from '../../../lib/headless-vpl/blocks';
import { NestingZone } from '../../../lib/headless-vpl';
import type {
  Container,
  Position,
  SnapConnection,
  Workspace,
} from '../../../lib/headless-vpl';
import {
  type BlockRegistry,
  type BodyZoneMeta,
  type CBlockRef,
  type CreatedBlock,
  type SlotZoneMeta,
  isValueBlockShape,
} from './defs';
import {
  alignCBlockBodyEntryConnectors,
  detachFromBodyLayoutChain,
  findBodyLayoutForBlock,
  findBodyLayoutHit,
  findCBlockRefForBodyLayout,
  hasPriorityCBlockBodyHit,
  syncBodyLayoutChain,
} from './layout';

function createBooleanSlotZone(
  ws: Workspace,
  block: CreatedBlock,
  registry: BlockRegistry,
  slot: CreatedBlock['slotLayouts'][number],
) {
  return new NestingZone({
    target: block.container,
    layout: slot.layout,
    workspace: ws,
    priority: 150,
    padding: 0,
    validator: (dragged) => {
      if (slot.layout.Children.length > 0) return false;
      const state = registry.blockMap.get(dragged.id);
      return Boolean(state && state.def.shape === 'boolean');
    },
    connectorHit: (dragged) => {
      const draggedBlock = registry.createdMap.get(dragged.id);
      if (!draggedBlock?.valueConnector || !slot.connector) {
        return null;
      }
      return isConnectorColliding(draggedBlock.valueConnector, slot.connector)
        ? 0
        : null;
    },
  });
}

export function registerSnapConnections(
  ws: Workspace,
  created: CreatedBlock[],
  snapConnections: SnapConnection[],
  createdMap: Map<string, CreatedBlock>,
) {
  const connectable = created.filter(
    (block) => block.topConn !== null || block.bottomConn !== null,
  );

  snapConnections.push(
    ...createSnapConnections({
      workspace: ws,
      items: connectable,
      sourceContainer: (block) => (block.topConn ? block.container : null),
      sourcePosition: (block) => block.topConn?.position,
      targetContainer: (block) => (block.bottomConn ? block.container : null),
      targetPosition: (block) => block.bottomConn?.position,
      snapDistance: ({ source, target }) =>
        source.topConn && target.bottomConn
          ? source.topConn.hitRadius + target.bottomConn.hitRadius
          : undefined,
      priority: () => 100,
      validator: ({ source, target }) => () => {
        if (hasPriorityCBlockBodyHit(source, target, createdMap)) {
          return false;
        }
        return (
          target.container.Children.size === 0 ||
          target.container.Children.has(source.container)
        );
      },
    }),
  );
}

export function registerCBlockBodyZones(
  ws: Workspace,
  created: CreatedBlock[],
  registry: BlockRegistry,
  cBlockRefs: CBlockRef[],
  nestingZones: NestingZone[],
  bodyZoneMap: Map<NestingZone, BodyZoneMeta>,
) {
  for (const block of created) {
    if (!block.cBlockRef) continue;
    cBlockRefs.push(block.cBlockRef);

    block.cBlockRef.bodyLayouts.forEach((layout, index) => {
      const bodyEntryConnector = block.cBlockRef?.bodyEntryConnectors[index];
      const zone = createConnectorInsertZone({
        target: block.container,
        layout,
        workspace: ws,
        entryConnector: bodyEntryConnector,
        priority: 200,
        padding: 10,
        accepts: (dragged) => {
          const draggedState = registry.blockMap.get(dragged.id);
          return !(draggedState && isValueBlockShape(draggedState.def.shape));
        },
        getDraggedConnector: (dragged) => registry.createdMap.get(dragged.id)?.topConn,
        getChildConnector: (child) => registry.createdMap.get(child.id)?.bottomConn,
      });

      nestingZones.push(zone);
      bodyZoneMap.set(zone, { bodyEntryConnector });
    });
  }
}

export function registerSlotZones(
  ws: Workspace,
  created: CreatedBlock[],
  registry: BlockRegistry,
  nestingZones: NestingZone[],
  slotZoneMap: Map<NestingZone, SlotZoneMeta>,
) {
  for (const block of created) {
    for (const slot of block.slotLayouts) {
      const { info, layout } = slot;
      const isBooleanSlot =
        info.acceptedShapes.length === 1 && info.acceptedShapes[0] === 'boolean';
      const zone = isBooleanSlot
        ? createBooleanSlotZone(ws, block, registry, slot)
        : createSlotZone({
            target: block.container,
            layout,
            workspace: ws,
            priority: 150,
            occupancy: 'single',
            accepts: (dragged) => {
              const state = registry.blockMap.get(dragged.id);
              return Boolean(
                state &&
                  isValueBlockShape(state.def.shape) &&
                  info.acceptedShapes.includes(state.def.shape),
              );
            },
            centerTolerance: { x: 30, y: 20 },
            padding: 0,
          });

      nestingZones.push(zone);
      slotZoneMap.set(zone, {
        blockId: block.container.id,
        inputIndex: info.inputIndex,
      });
    }
  }
}

export function subscribeCBlockConnectionSync(
  ws: Workspace,
  containerMap: Map<string, Container>,
  cBlockRefs: CBlockRef[],
  onBodyLayoutChange?: () => void,
) {
  const unsubConnect = ws.eventBus.on('connect', (event) => {
    const parentId = event.data?.parent as string | undefined;
    const childId = event.data?.child as string | undefined;
    if (!parentId || !childId) return;

    const parentContainer = containerMap.get(parentId);
    const childContainer = containerMap.get(childId);
    if (!parentContainer || !childContainer) return;

    const layout = findBodyLayoutForBlock(parentContainer, cBlockRefs);
    if (!layout) return;

    if (layout.Children.includes(childContainer)) {
      syncBodyLayoutChain(layout);
      const owner = findCBlockRefForBodyLayout(layout, cBlockRefs);
      if (owner) {
        alignCBlockBodyEntryConnectors(owner);
      }
      onBodyLayoutChange?.();
      return;
    }

    const prevLayout = findBodyLayoutForBlock(childContainer, cBlockRefs);
    if (prevLayout && prevLayout !== layout) {
      detachFromBodyLayoutChain(prevLayout, childContainer);
      prevLayout.removeElement(childContainer);
      syncBodyLayoutChain(prevLayout);
      const prevOwner = findCBlockRefForBodyLayout(prevLayout, cBlockRefs);
      if (prevOwner) {
        alignCBlockBodyEntryConnectors(prevOwner);
      }
      onBodyLayoutChange?.();
    }

    const parentIndex = layout.Children.indexOf(parentContainer);
    layout.insertElement(childContainer, parentIndex + 1);
    syncBodyLayoutChain(layout);
    const owner = findCBlockRefForBodyLayout(layout, cBlockRefs);
    if (owner) {
      alignCBlockBodyEntryConnectors(owner);
    }
    onBodyLayoutChange?.();
  });

  const unsubDisconnect = ws.eventBus.on('disconnect', (event) => {
    const childId = event.data?.child as string | undefined;
    if (!childId) return;

    const childContainer = containerMap.get(childId);
    if (!childContainer) return;

    const layout = findBodyLayoutForBlock(childContainer, cBlockRefs);
    if (!layout) return;

    detachFromBodyLayoutChain(layout, childContainer);
    layout.removeElement(childContainer);
    syncBodyLayoutChain(layout);
    const owner = findCBlockRefForBodyLayout(layout, cBlockRefs);
    if (owner) {
      alignCBlockBodyEntryConnectors(owner);
    }
    onBodyLayoutChange?.();
  });

  return () => {
    unsubConnect();
    unsubDisconnect();
  };
}

export function collectBodyZoneProximityHits(
  bodyZoneMap: Map<NestingZone, BodyZoneMeta>,
  createdMap: Map<string, CreatedBlock>,
): Map<
  string,
  {
    source: Container;
    sourcePosition: Position;
    targetPosition: Position;
    snapDistance: number;
  }
> {
  const hits = new Map<
    string,
    {
      source: Container;
      sourcePosition: Position;
      targetPosition: Position;
      snapDistance: number;
    }
  >();

  for (const [zone, meta] of bodyZoneMap.entries()) {
    const dragged = zone.hovered;
    if (!dragged) continue;

    const hit = findBodyLayoutHit(
      dragged,
      zone.layout,
      meta.bodyEntryConnector,
      createdMap,
    );
    if (!hit?.draggedBlock.topConn) continue;

    const sourceConnector = hit.draggedBlock.topConn;
    const targetConnector = hit.targetConnector;
    const connectionId = `body-hit:${sourceConnector.id}:${targetConnector.id}`;
    hits.set(connectionId, {
      source: dragged,
      sourcePosition: sourceConnector.position,
      targetPosition: targetConnector.position,
      snapDistance: sourceConnector.hitRadius + targetConnector.hitRadius,
    });
  }

  return hits;
}

export function syncBodyZoneProximityHighlights(
  ws: Workspace,
  activeIds: Set<string>,
  nextHits: Map<
    string,
    {
      source: Container;
      sourcePosition: Position;
      targetPosition: Position;
      snapDistance: number;
    }
  >,
): void {
  for (const connectionId of Array.from(activeIds)) {
    if (nextHits.has(connectionId)) continue;
    ws.eventBus.emit('proximity-end', ws, { connectionId });
    activeIds.delete(connectionId);
  }

  for (const [connectionId, hit] of nextHits.entries()) {
    if (activeIds.has(connectionId)) continue;
    ws.eventBus.emit('proximity', hit.source, {
      connectionId,
      sourcePosition: hit.sourcePosition,
      targetPosition: hit.targetPosition,
      snapDistance: hit.snapDistance,
    });
    activeIds.add(connectionId);
  }
}
