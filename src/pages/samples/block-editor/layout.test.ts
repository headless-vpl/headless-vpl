import { describe, expect, it } from 'vitest';

import Workspace from '../../../lib/headless-vpl/core/Workspace';
import type { CreatedBlock } from './types';
import { BLOCK_DEFS, C_HEADER_H, getBlockSize } from './blocks';
import { registerSlotZones } from './connections';
import { relayoutSlotsAndFitBlock, syncBodyLayoutChain } from './layout';
import { buildBlockRegistry } from './sample-scene';
import { createBlock } from './factory';

function centerBlockOnSlot(target: CreatedBlock, inputIndex: number, dragged: CreatedBlock) {
  const slot = target.slotLayouts.find((item) => item.info.inputIndex === inputIndex);
  if (!slot) throw new Error(`slot ${inputIndex} not found`);
  const abs = slot.layout.absolutePosition;
  dragged.container.move(
    abs.x + slot.layout.width / 2 - dragged.container.width / 2,
    abs.y + slot.layout.height / 2 - dragged.container.height / 2,
  );
}

function alignBooleanBlockOnSlot(
  target: CreatedBlock,
  inputIndex: number,
  dragged: CreatedBlock,
) {
  const slot = target.slotLayouts.find((item) => item.info.inputIndex === inputIndex);
  if (!slot?.connector) throw new Error(`boolean slot ${inputIndex} not found`);
  if (!dragged.valueConnector) throw new Error(`block ${dragged.container.id} is not boolean`);

  const dx = slot.connector.position.x - dragged.valueConnector.position.x;
  const dy = slot.connector.position.y - dragged.valueConnector.position.y;
  dragged.container.move(
    dragged.container.position.x + dx,
    dragged.container.position.y + dy,
  );
}

function offsetBooleanBlockFromSlot(
  target: CreatedBlock,
  inputIndex: number,
  dragged: CreatedBlock,
  offsetX: number,
) {
  alignBooleanBlockOnSlot(target, inputIndex, dragged);
  dragged.container.move(
    dragged.container.position.x + offsetX,
    dragged.container.position.y,
  );
}

describe('block editor relayout', () => {
  it('stack block expands when an inline numeric value grows', () => {
    const ws = new Workspace();
    const block = createBlock(ws, BLOCK_DEFS[2], 0, 0);

    relayoutSlotsAndFitBlock(block);
    const initialWidth = block.container.width;

    block.state.inputValues[0] = '12345678901234567890';
    relayoutSlotsAndFitBlock(block);

    expect(block.container.width).toBeGreaterThan(initialWidth);
  });

  it('boolean blocks with nested reporter inputs grow to fit both arguments', () => {
    const ws = new Workspace();
    const predicate = createBlock(ws, BLOCK_DEFS[19], 0, 0);
    const leftReporter = createBlock(ws, BLOCK_DEFS[18], 0, 0);
    const rightReporter = createBlock(ws, BLOCK_DEFS[20], 0, 0);

    relayoutSlotsAndFitBlock(leftReporter);
    relayoutSlotsAndFitBlock(rightReporter);

    predicate.slotLayouts[0]?.layout.insertElement(leftReporter.container, 0);
    predicate.slotLayouts[1]?.layout.insertElement(rightReporter.container, 0);
    relayoutSlotsAndFitBlock(predicate);

    expect(predicate.container.width).toBeGreaterThan(getBlockSize(predicate.state.def.shape).w);
    expect(predicate.container.height).toBeGreaterThan(getBlockSize(predicate.state.def.shape).h);
  });

  it('if blocks grow header/body and keep bottom connector anchored', () => {
    const ws = new Workspace();
    const ifBlock = createBlock(ws, BLOCK_DEFS[14], 100, 100);
    const condition = createBlock(ws, BLOCK_DEFS[28], 0, 0);
    const nestedStack = createBlock(ws, BLOCK_DEFS[6], 0, 0);

    relayoutSlotsAndFitBlock(condition);
    relayoutSlotsAndFitBlock(nestedStack);

    ifBlock.slotLayouts[0]?.layout.insertElement(condition.container, 0);
    relayoutSlotsAndFitBlock(ifBlock);

    const headerHeight = ifBlock.container.padding.top;
    expect(headerHeight).toBeGreaterThanOrEqual(C_HEADER_H);
    expect(ifBlock.container.width).toBeGreaterThan(getBlockSize(ifBlock.state.def.shape).w);

    ifBlock.cBlockRef?.bodyLayouts[0].insertElement(nestedStack.container, 0);
    syncBodyLayoutChain(ifBlock.cBlockRef?.bodyLayouts[0]!);
    relayoutSlotsAndFitBlock(ifBlock);

    expect(ifBlock.container.height).toBeGreaterThan(getBlockSize(ifBlock.state.def.shape).h);
    expect(ifBlock.bottomConn?.position.y).toBe(ifBlock.container.position.y + ifBlock.container.height);
  });

  it('if blocks keep their minimum height when the body is empty', () => {
    const ws = new Workspace();
    const ifBlock = createBlock(ws, BLOCK_DEFS[14], 100, 100);
    const nestedStack = createBlock(ws, BLOCK_DEFS[6], 0, 0);
    const minimumHeight = getBlockSize(ifBlock.state.def.shape).h;

    relayoutSlotsAndFitBlock(ifBlock);
    expect(ifBlock.container.height).toBeGreaterThanOrEqual(minimumHeight);

    ifBlock.cBlockRef?.bodyLayouts[0].insertElement(nestedStack.container, 0);
    syncBodyLayoutChain(ifBlock.cBlockRef?.bodyLayouts[0]!);
    relayoutSlotsAndFitBlock(ifBlock);

    ifBlock.cBlockRef?.bodyLayouts[0].removeElement(nestedStack.container);
    syncBodyLayoutChain(ifBlock.cBlockRef?.bodyLayouts[0]!);
    relayoutSlotsAndFitBlock(ifBlock);

    expect(ifBlock.container.height).toBeGreaterThanOrEqual(minimumHeight);
    expect(ifBlock.bottomConn?.position.y).toBe(ifBlock.container.position.y + ifBlock.container.height);
  });
});

describe('block editor slot typing', () => {
  it('boolean slots use connector overlap while reporter slots keep center hit testing', () => {
    const ws = new Workspace();
    const ifBlock = createBlock(ws, BLOCK_DEFS[14], 100, 100);
    const moveBlock = createBlock(ws, BLOCK_DEFS[2], 100, 200);
    const reporter = createBlock(ws, BLOCK_DEFS[18], 0, 0);
    const predicate = createBlock(ws, BLOCK_DEFS[19], 0, 0);

    const created = [ifBlock, moveBlock, reporter, predicate];
    for (const block of created) {
      relayoutSlotsAndFitBlock(block);
    }

    const registry = buildBlockRegistry(created);
    const nestingZones = [];
    const slotZoneMap = new Map();
    registerSlotZones(ws, created, registry, nestingZones, slotZoneMap);

    const booleanSlotZone = Array.from(slotZoneMap.entries()).find(
      ([, meta]) => meta.blockId === ifBlock.container.id && meta.inputIndex === 0,
    )?.[0];
    const reporterSlotZone = Array.from(slotZoneMap.entries()).find(
      ([, meta]) => meta.blockId === moveBlock.container.id && meta.inputIndex === 0,
    )?.[0];

    if (!booleanSlotZone || !reporterSlotZone) {
      throw new Error('slot zones not found');
    }

    centerBlockOnSlot(ifBlock, 0, reporter);
    expect(booleanSlotZone.detectHover([reporter.container])).toBeNull();

    offsetBooleanBlockFromSlot(ifBlock, 0, predicate, 28);
    expect(booleanSlotZone.detectHover([predicate.container])).toBeNull();

    alignBooleanBlockOnSlot(ifBlock, 0, predicate);
    expect(booleanSlotZone.detectHover([predicate.container])).toBe(predicate.container);

    centerBlockOnSlot(moveBlock, 0, predicate);
    expect(reporterSlotZone.detectHover([predicate.container])).toBeNull();

    centerBlockOnSlot(moveBlock, 0, reporter);
    expect(reporterSlotZone.detectHover([reporter.container])).toBe(reporter.container);
  });
});
