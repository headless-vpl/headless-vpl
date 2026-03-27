// ブロック接続・ゾーン登録・近接判定
import { createSlotZone } from '../../../lib/headless-vpl/util/nesting';
import { createStackSnapConnections } from '../../../lib/headless-vpl/util/snap';
import {
  createConnectorInsertZone,
  isConnectorColliding,
} from '../../../lib/headless-vpl/blocks';
import { NestingZone } from '../../../lib/headless-vpl';
import type {
  Container,
  SnapConnection,
  Workspace,
} from '../../../lib/headless-vpl';
import type { ProximityHit } from '../../../lib/headless-vpl/blocks';
import type {
  BlockRegistry,
  BodyZoneMeta,
  CBlockRef,
  CreatedBlock,
  SlotZoneMeta,
} from './types';
import { isValueBlockShape } from './blocks';
import {
  findBodyLayoutHit,
  hasPriorityCBlockBodyHit,
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
    ...createStackSnapConnections({
      workspace: ws,
      items: connectable,
      getContainer: (block) => block.container,
      getTopConnector: (block) => block.topConn,
      getBottomConnector: (block) => block.bottomConn,
      priority: 100,
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

export function collectBodyZoneProximityHits(
  bodyZoneMap: Map<NestingZone, BodyZoneMeta>,
  createdMap: Map<string, CreatedBlock>,
): Map<string, ProximityHit> {
  const hits = new Map<string, ProximityHit>();

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

