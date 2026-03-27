import type { Container } from '../../../lib/headless-vpl';
import type { NestingZone, SnapConnection, Workspace } from '../../../lib/headless-vpl';
import { connectStackPairs } from '../../../lib/headless-vpl/blocks';
import type {
  BlockRegistry,
  BodyZoneMeta,
  CBlockRef,
  CreatedBlock,
  SampleScene,
  SlotZoneMeta,
} from './types';
import { BLOCK_DEFS } from './blocks';
import { createBlock } from './factory';
import {
  alignCBlockBodyEntryConnectors,
  syncBodyLayoutChain,
} from './layout';

export function resetEditorWorkspace(
  ws: Workspace,
  containers: Container[],
  snapConnections: SnapConnection[],
  nestingZones: NestingZone[],
  cBlockRefs: CBlockRef[],
  createdMap: Map<string, CreatedBlock>,
  slotZoneMap: Map<NestingZone, SlotZoneMeta>,
  bodyZoneMap: Map<NestingZone, BodyZoneMeta>,
  clearNestedSlots: () => void,
) {
  for (const edge of Array.from(ws.edges)) {
    ws.removeEdge(edge);
  }
  for (const element of Array.from(ws.elements)) {
    ws.removeElement(element);
  }

  containers.length = 0;
  snapConnections.length = 0;
  nestingZones.length = 0;
  cBlockRefs.length = 0;
  createdMap.clear();
  slotZoneMap.clear();
  bodyZoneMap.clear();
  clearNestedSlots();
}

export function buildSampleScene(ws: Workspace, containers: Container[]): SampleScene {
  const created: CreatedBlock[] = [];
  const make = (defIndex: number, x: number, y: number): CreatedBlock => {
    const block = createBlock(ws, BLOCK_DEFS[defIndex], x, y);
    created.push(block);
    containers.push(block.container);
    return block;
  };

  const flag = make(0, 60, 30);
  const move1 = make(2, 60, 92);
  const turn1 = make(3, 60, 134);
  const say1 = make(6, 60, 176);
  const repeat1 = make(12, 60, 228);

  const moveInRepeat = make(2, 76, 268);
  const turnInRepeat = make(3, 76, 310);

  const keyPress = make(1, 340, 30);
  const if1 = make(14, 340, 92);
  make(16, 340, 222);

  make(13, 580, 30);
  make(11, 580, 160);
  make(7, 580, 210);
  make(15, 580, 270);
  make(9, 580, 470);
  make(10, 580, 520);
  make(5, 580, 570);
  make(4, 580, 620);
  make(8, 580, 670);
  make(17, 580, 720);

  make(18, 580, 780);
  make(19, 580, 820);
  make(21, 580, 860);
  make(20, 580, 900);
  make(22, 580, 940);
  make(23, 860, 30);
  make(24, 860, 92);
  make(25, 860, 144);
  make(26, 860, 204);
  make(27, 860, 274);
  make(28, 860, 334);
  make(29, 860, 394);
  make(30, 860, 454);
  make(31, 860, 514);
  make(32, 860, 584);
  make(33, 860, 654);
  make(34, 860, 714);
  make(35, 860, 774);

  return {
    created,
    flag,
    move1,
    turn1,
    say1,
    repeat1,
    moveInRepeat,
    turnInRepeat,
    keyPress,
    if1,
  };
}

export function buildBlockRegistry(created: CreatedBlock[]): BlockRegistry {
  const blockMap = new Map<string, CreatedBlock['state']>();
  const createdMap = new Map<string, CreatedBlock>();
  const containerMap = new Map<string, Container>();

  for (const block of created) {
    blockMap.set(block.container.id, block.state);
    createdMap.set(block.container.id, block);
    containerMap.set(block.container.id, block.container);
  }

  return { blockMap, createdMap, containerMap };
}

export function connectInitialScene(
  ws: Workspace,
  snapConnections: SnapConnection[],
  pairs: Array<[CreatedBlock, CreatedBlock]>,
) {
  connectStackPairs({ workspace: ws, snapConnections, pairs });
}

export function seedInitialCBlockNest(
  cBlock: CreatedBlock,
  nestedBlocks: CreatedBlock[],
) {
  if (!cBlock.cBlockRef) return;

  const bodyLayout = cBlock.cBlockRef.bodyLayouts[0];
  nestedBlocks.forEach((block, index) => {
    bodyLayout.insertElement(block.container, index);
  });
  syncBodyLayoutChain(bodyLayout);
  bodyLayout.update();
  alignCBlockBodyEntryConnectors(cBlock.cBlockRef);
}
