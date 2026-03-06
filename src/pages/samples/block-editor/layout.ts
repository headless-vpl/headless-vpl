import { BlockStackController, findConnectorInsertHit } from '../../../lib/headless-vpl/blocks';
import type { AutoLayout, Connector, Container } from '../../../lib/headless-vpl';
import {
  type BodyLayoutHit,
  type CBlockRef,
  type CreatedBlock,
  C_HEADER_H,
  C_W,
  getBlockSize,
  inputWidth,
  estimateTextWidth,
  isCBlockShape,
  isInlineValueShape,
} from './defs';

const blockStack = new BlockStackController();

export function findBodyLayoutForBlock(
  blockContainer: Container,
  cBlockRefs: CBlockRef[],
): AutoLayout | null {
  for (const ref of cBlockRefs) {
    for (const layout of ref.bodyLayouts) {
      if (layout.Children.includes(blockContainer)) {
        return layout;
      }
    }
  }
  return null;
}

export function reattachContainerToParent(
  container: Container,
  expectedParent: Container | null,
) {
  blockStack.reattach(container, expectedParent);
}

export function normalizeContainerChain(containers: Container[]) {
  blockStack.normalize(containers);
}

export function detachFromBodyLayoutChain(layout: AutoLayout, container: Container) {
  blockStack.detachFromLayout(layout, container);
}

export function syncBodyLayoutChain(layout: AutoLayout) {
  blockStack.syncLayout(layout);
}

export function isCBlockBodyLayout(layout: AutoLayout, cBlockRefs: CBlockRef[]): boolean {
  for (const ref of cBlockRefs) {
    if (ref.bodyLayouts.includes(layout)) return true;
  }
  return false;
}

export function pullFollowerChainOutOfBodyLayout(root: Container, layout: AutoLayout) {
  blockStack.pullFollowerChainOutOfLayout(root, layout);
}

export function findBodyLayoutHit(
  dragged: Container,
  bodyLayout: AutoLayout | undefined,
  bodyEntryConnector: Connector | undefined,
  createdMap: Map<string, CreatedBlock>,
): BodyLayoutHit | null {
  const draggedBlock = createdMap.get(dragged.id);
  if (!draggedBlock?.topConn || !bodyLayout) return null;

  const hit = findConnectorInsertHit({
    dragged,
    layout: bodyLayout,
    entryConnector: bodyEntryConnector,
    getDraggedConnector: () => draggedBlock.topConn,
    getChildConnector: (child) => createdMap.get(child.id)?.bottomConn,
  });

  if (!hit) return null;

  return {
    insertIndex: hit.insertIndex,
    targetConnector: hit.targetConnector,
    draggedBlock,
  };
}

export function hasPriorityCBlockBodyHit(
  sourceBlock: CreatedBlock,
  targetBlock: CreatedBlock,
  createdMap: Map<string, CreatedBlock>,
): boolean {
  if (!sourceBlock.topConn || !targetBlock.cBlockRef) return false;

  for (let i = 0; i < targetBlock.cBlockRef.bodyLayouts.length; i += 1) {
    const layout = targetBlock.cBlockRef.bodyLayouts[i];
    const bodyEntryConnector = targetBlock.cBlockRef.bodyEntryConnectors[i];
    if (
      findBodyLayoutHit(
        sourceBlock.container,
        layout,
        bodyEntryConnector,
        createdMap,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function alignCBlockBodyEntryConnectors(cBlockRef: CBlockRef): void {
  cBlockRef.container.refreshAnchoredChildren();
}

export function findCBlockRefForBodyLayout(
  layout: AutoLayout,
  cBlockRefs: CBlockRef[],
): CBlockRef | null {
  for (const ref of cBlockRefs) {
    if (ref.bodyLayouts.includes(layout)) return ref;
  }
  return null;
}

export function relayoutSlotsAndFitBlock(block: CreatedBlock): void {
  const { def } = block.state;
  const isCBlock = isCBlockShape(def.shape);
  const isInlineValue = isInlineValueShape(def.shape);
  if (!isCBlock && !isInlineValue) return;

  if (block.slotLayouts.length === 0) {
    if (isCBlock && block.cBlockRef) {
      alignCBlockBodyEntryConnectors(block.cBlockRef);
    }
    return;
  }

  const SLOT_PADDING_X = 12;
  const SLOT_GAP = 6;
  const SLOT_BASE_H = 24;

  for (const { layout } of block.slotLayouts) {
    layout.update();
  }

  const slotByIndex = new Map(block.slotLayouts.map((slot) => [slot.info.inputIndex, slot]));
  const baseHeaderHeight = isCBlock ? C_HEADER_H : getBlockSize(def.shape).h;

  let headerHeight = baseHeaderHeight;
  for (const { layout } of block.slotLayouts) {
    const usedHeight = Math.max(SLOT_BASE_H, layout.height);
    headerHeight = Math.max(headerHeight, usedHeight + 8);
  }
  headerHeight = Math.ceil(headerHeight);

  let cursor = SLOT_PADDING_X + estimateTextWidth(def.name) + (def.name ? SLOT_GAP : 0);

  for (let i = 0; i < def.inputs.length; i += 1) {
    const input = def.inputs[i];
    const baseWidth = inputWidth(input);

    if (input.type === 'label') {
      cursor += baseWidth + SLOT_GAP;
      continue;
    }

    const slot = slotByIndex.get(i);
    if (!slot) {
      cursor += baseWidth + SLOT_GAP;
      continue;
    }

    const usedWidth = Math.max(baseWidth, slot.layout.width);
    const usedHeight = Math.max(SLOT_BASE_H, slot.layout.height);
    slot.layout.position.x = cursor;
    slot.layout.position.y = (headerHeight - usedHeight) / 2;
    slot.layout.relayout();
    cursor += usedWidth + SLOT_GAP;
  }

  const requiredWidth = Math.max(
    getBlockSize(def.shape).w,
    Math.ceil(cursor + SLOT_PADDING_X - SLOT_GAP),
  );

  if (isCBlock) {
    const container = block.container;
    container.widthMode = 'hug';
    container.minWidth = C_W;
    container.padding.top = headerHeight;

    if (!block.cBlockRef) {
      container.width = requiredWidth;
      container.update();
      container.parentAutoLayout?.update();
      return;
    }

    const innerWidth = Math.max(
      C_W - container.padding.left - container.padding.right,
      requiredWidth - container.padding.left - container.padding.right,
    );

    for (let i = 0; i < block.cBlockRef.bodyLayouts.length; i += 1) {
      const layout = block.cBlockRef.bodyLayouts[i];
      layout.position.x = container.padding.left;
      if (i === 0) layout.position.y = container.padding.top;
      layout.minWidth = innerWidth;
    }

    block.cBlockRef.bodyLayouts[0]?.update();
    alignCBlockBodyEntryConnectors(block.cBlockRef);
    return;
  }

  const container = block.container;
  container.widthMode = 'hug';
  container.heightMode = 'hug';
  container.minWidth = getBlockSize(def.shape).w;
  container.minHeight = getBlockSize(def.shape).h;
  const requiredHeight = Math.max(container.minHeight, Math.ceil(headerHeight));

  if (container.width !== requiredWidth || container.height !== requiredHeight) {
    container.width = requiredWidth;
    container.height = requiredHeight;
    container.update();
    container.parentAutoLayout?.update();
  }
}

export function relayoutCreatedBlocks(created: CreatedBlock[]) {
  for (const block of created) {
    relayoutSlotsAndFitBlock(block);
  }
}

export function relayoutBlockAndAncestors(
  startBlockId: string,
  createdMap: Map<string, CreatedBlock>,
): void {
  const visited = new Set<string>();
  let current = createdMap.get(startBlockId) ?? null;

  while (current && !visited.has(current.container.id)) {
    visited.add(current.container.id);
    relayoutSlotsAndFitBlock(current);
    const parentContainer = current.container.parentAutoLayout?.parentContainer;
    current = parentContainer ? createdMap.get(parentContainer.id) ?? null : null;
  }
}
