import {
  AutoLayout,
  Connector,
  Container,
  Position,
} from '../../../lib/headless-vpl';
import type { NestingZone, SnapConnection, Workspace } from '../../../lib/headless-vpl';
import { connectStackPairs } from '../../../lib/headless-vpl/blocks';
import {
  type BlockRegistry,
  type BodyZoneMeta,
  type CBlockRef,
  type CreatedBlock,
  type SampleScene,
  type SlotLayoutRef,
  type SlotZoneMeta,
  BLOCK_DEFS,
  BOOLEAN_CONNECTOR_HIT_RADIUS,
  C_BODY_ENTRY_HIT_RADIUS,
  C_BODY_ENTRY_OFFSET_X,
  C_BODY_ENTRY_OFFSET_Y,
  C_BODY_LAYOUT_OFFSET_X,
  C_BODY_MIN_H,
  C_DIVIDER_H,
  C_FOOTER_H,
  C_HEADER_H,
  C_W,
  CONN_OFFSET_X,
  computeSlotPositions,
  createInitialInputValues,
  getBlockSize,
  hasBottomConnector,
  hasTopConnector,
  isCBlockShape,
} from './defs';
import {
  alignCBlockBodyEntryConnectors,
  syncBodyLayoutChain,
} from './layout';

export function createBlock(
  ws: Workspace,
  def: (typeof BLOCK_DEFS)[number],
  x: number,
  y: number,
): CreatedBlock {
  const { w, h } = getBlockSize(def.shape);
  const isCBlock = isCBlockShape(def.shape);
  const state = {
    id: '',
    def,
    inputValues: createInitialInputValues(def.inputs),
  };

  const topConn = hasTopConnector(def.shape)
    ? new Connector({
        position: new Position(CONN_OFFSET_X, 0),
        name: 'top',
        type: 'input',
        hitRadius: 12,
      })
    : null;

  const bottomConn = hasBottomConnector(def.shape)
    ? new Connector({
        name: 'bottom',
        type: 'output',
        hitRadius: 12,
        anchor: {
          target: 'parent',
          origin: 'bottom-left',
          offset: { x: CONN_OFFSET_X, y: 0 },
        },
      })
    : null;

  const valueConnector =
    def.shape === 'boolean'
      ? new Connector({
          name: 'value',
          type: 'output',
          hitRadius: BOOLEAN_CONNECTOR_HIT_RADIUS,
          anchor: {
            target: 'parent',
            origin: 'center-right',
          },
        })
      : null;

  const children: Record<string, Connector | AutoLayout> = {};
  if (topConn) children.top = topConn;
  if (bottomConn) children.bottom = bottomConn;
  if (valueConnector) children.value = valueConnector;

  const bodyLayouts: AutoLayout[] = [];
  const bodyEntryConnectors: Connector[] = [];
  if (isCBlock) {
    const bodyLayout1 = new AutoLayout({
      position: new Position(C_BODY_LAYOUT_OFFSET_X, C_HEADER_H),
      direction: 'vertical',
      gap: 0,
      alignment: 'start',
      containers: [],
      minWidth: C_W - 32,
      minHeight: C_BODY_MIN_H,
    });
    children.body1 = bodyLayout1;
    bodyLayouts.push(bodyLayout1);

    const bodyEntry1 = new Connector({
      name: 'body-entry-1',
      type: 'input',
      hitRadius: C_BODY_ENTRY_HIT_RADIUS,
      anchor: {
        target: 'body1',
        origin: 'top-left',
        offset: {
          x: C_BODY_ENTRY_OFFSET_X,
          y: C_BODY_ENTRY_OFFSET_Y,
        },
      },
    });
    children.bodyEntry1 = bodyEntry1;
    bodyEntryConnectors.push(bodyEntry1);

    if (def.shape === 'c-block-else') {
      const bodyLayout2 = new AutoLayout({
        position: new Position(
          C_BODY_LAYOUT_OFFSET_X,
          C_HEADER_H + C_BODY_MIN_H + C_DIVIDER_H,
        ),
        direction: 'vertical',
        gap: 0,
        alignment: 'start',
        containers: [],
        minWidth: C_W - 32,
        minHeight: C_BODY_MIN_H,
      });
      children.body2 = bodyLayout2;
      bodyLayouts.push(bodyLayout2);

      const bodyEntry2 = new Connector({
        name: 'body-entry-2',
        type: 'input',
        hitRadius: C_BODY_ENTRY_HIT_RADIUS,
        anchor: {
          target: 'body2',
          origin: 'top-left',
          offset: {
            x: C_BODY_ENTRY_OFFSET_X,
            y: C_BODY_ENTRY_OFFSET_Y,
          },
        },
      });
      children.bodyEntry2 = bodyEntry2;
      bodyEntryConnectors.push(bodyEntry2);
    }
  }

  const slotPositions = computeSlotPositions(def, state.inputValues);
  const slotLayouts: SlotLayoutRef[] = [];
  for (const slot of slotPositions) {
    const slotLayout = new AutoLayout({
      position: new Position(slot.x, slot.y),
      direction: 'horizontal',
      gap: 0,
      alignment: 'center',
      containers: [],
      minWidth: slot.w,
      minHeight: slot.h,
      resizesParent: false,
    });
    children[`slot${slot.inputIndex}`] = slotLayout;

    const slotConnector =
      slot.acceptedShapes.length === 1 && slot.acceptedShapes[0] === 'boolean'
        ? new Connector({
            name: `slot-connector-${slot.inputIndex}`,
            type: 'input',
            hitRadius: BOOLEAN_CONNECTOR_HIT_RADIUS,
            anchor: {
              target: slotLayout,
              origin: 'center-right',
            },
          })
        : null;

    if (slotConnector) {
      children[`slotConnector${slot.inputIndex}`] = slotConnector;
    }

    slotLayouts.push({ info: slot, layout: slotLayout, connector: slotConnector });
  }

  const container = new Container({
    workspace: ws,
    position: new Position(x, y),
    name:
      def.name ||
      def.inputs
        .map((input) => (input.type === 'label' ? input.text : ''))
        .join(' ')
        .trim() ||
      'block',
    color: def.color,
    width: w,
    height: h,
    widthMode: 'hug',
    heightMode: 'hug',
    padding: isCBlock
      ? { top: C_HEADER_H, bottom: C_FOOTER_H, left: 16, right: 16 }
      : undefined,
    minWidth: w,
    minHeight: h,
    contentGap: def.shape === 'c-block-else' ? C_DIVIDER_H : undefined,
    children,
  });
  state.id = container.id;

  let cBlockRef: CBlockRef | null = null;
  if (isCBlock) {
    cBlockRef = {
      container,
      bodyLayouts,
      bodyEntryConnectors,
      bottomConnector: bottomConn,
    };
    alignCBlockBodyEntryConnectors(cBlockRef);
  }

  return {
    container,
    topConn,
    bottomConn,
    cBlockRef,
    slotLayouts,
    valueConnector,
    state,
  };
}

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
