import {
  AutoLayout,
  Connector,
  Container,
} from '../../../lib/headless-vpl';
import type { Workspace } from '../../../lib/headless-vpl';
import type {
  BlockDef,
  CBlockRef,
  CreatedBlock,
  SlotLayoutRef,
} from './types';
import {
  BOOLEAN_CONNECTOR_HIT_RADIUS,
  C_BODY_ENTRY_HIT_RADIUS,
  C_BODY_ENTRY_OFFSET_X,
  C_BODY_ENTRY_OFFSET_Y,
  C_BODY_LAYOUT_OFFSET_X,
  C_DIVIDER_H,
  C_FOOTER_H,
  C_HEADER_H,
  C_W,
  CONN_OFFSET_X,
  SHAPE_CONFIGS,
  computeSlotPositions,
  createInitialInputValues,
} from './blocks';

export function createBlock(
  ws: Workspace,
  def: BlockDef,
  x: number,
  y: number,
): CreatedBlock {
  const shape = SHAPE_CONFIGS[def.shape];
  const { w, h } = shape.size;
  const isCBlock = !!shape.bodies;
  const state = {
    id: '',
    def,
    inputValues: createInitialInputValues(def.inputs),
  };

  // --- Connectors ---
  const topConn = shape.connectors.top
    ? new Connector({ position: [CONN_OFFSET_X, 0], name: 'top', type: 'input' })
    : null;

  const bottomConn = shape.connectors.bottom
    ? new Connector({ name: 'bottom', type: 'output',
        anchor: { target: 'parent', origin: 'bottom-left', offset: [CONN_OFFSET_X, 0] } })
    : null;

  const valueConnector = shape.connectors.value
    ? new Connector({ name: 'value', type: 'output', hitRadius: BOOLEAN_CONNECTOR_HIT_RADIUS,
        anchor: { target: 'parent', origin: 'center-right' } })
    : null;

  const children: Record<string, Connector | AutoLayout> = {};
  if (topConn) children.top = topConn;
  if (bottomConn) children.bottom = bottomConn;
  if (valueConnector) children.value = valueConnector;

  // --- Body layouts（C-block系のみ） ---
  const bodyLayouts: AutoLayout[] = [];
  const bodyEntryConnectors: Connector[] = [];
  if (shape.bodies) {
    let bodyY = C_HEADER_H;
    for (let i = 0; i < shape.bodies.length; i += 1) {
      const bodyKey = `body${i + 1}`;
      const entryKey = `bodyEntry${i + 1}`;

      const layout = new AutoLayout({
        position: [C_BODY_LAYOUT_OFFSET_X, bodyY],
        direction: 'vertical', gap: 0, alignment: 'start',
        minWidth: C_W - 32, minHeight: shape.bodies[i].minHeight,
      });
      children[bodyKey] = layout;
      bodyLayouts.push(layout);

      const entry = new Connector({
        name: `body-entry-${i + 1}`, type: 'input', hitRadius: C_BODY_ENTRY_HIT_RADIUS,
        anchor: { target: bodyKey, origin: 'top-left', offset: [C_BODY_ENTRY_OFFSET_X, C_BODY_ENTRY_OFFSET_Y] },
      });
      children[entryKey] = entry;
      bodyEntryConnectors.push(entry);

      bodyY += shape.bodies[i].minHeight + C_DIVIDER_H;
    }
  }

  // --- Slot layouts ---
  const slotPositions = computeSlotPositions(def, state.inputValues);
  const slotLayouts: SlotLayoutRef[] = [];
  for (const slot of slotPositions) {
    const slotLayout = new AutoLayout({
      position: [slot.x, slot.y],
      direction: 'horizontal', gap: 0, alignment: 'center',
      minWidth: slot.w, minHeight: slot.h, resizesParent: false,
    });
    children[`slot${slot.inputIndex}`] = slotLayout;

    const isBooleanSlot = slot.acceptedShapes.length === 1 && slot.acceptedShapes[0] === 'boolean';
    const slotConnector = isBooleanSlot
      ? new Connector({ name: `slot-connector-${slot.inputIndex}`, type: 'input',
          hitRadius: BOOLEAN_CONNECTOR_HIT_RADIUS, anchor: { target: slotLayout, origin: 'center-right' } })
      : null;

    if (slotConnector) children[`slotConnector${slot.inputIndex}`] = slotConnector;
    slotLayouts.push({ info: slot, layout: slotLayout, connector: slotConnector });
  }

  // --- Container ---
  const container = new Container({
    workspace: ws, position: [x, y],
    name: def.name || def.inputs.map((i) => (i.type === 'label' ? i.text : '')).join(' ').trim() || 'block',
    color: def.color, width: w, height: h,
    widthMode: 'hug', heightMode: 'hug',
    padding: isCBlock ? { top: C_HEADER_H, bottom: C_FOOTER_H, left: 16, right: 16 } : undefined,
    minWidth: w, minHeight: h,
    contentGap: def.shape === 'c-block-else' ? C_DIVIDER_H : undefined,
    children,
  });
  state.id = container.id;

  let cBlockRef: CBlockRef | null = null;
  if (isCBlock) {
    cBlockRef = { container, bodyLayouts, bodyEntryConnectors, bottomConnector: bottomConn };
  }

  return { container, topConn, bottomConn, cBlockRef, slotLayouts, valueConnector, state };
}
