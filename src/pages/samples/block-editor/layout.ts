import {
  BlockStackController,
  collectConnectedChain,
  findConnectorInsertHit,
} from '../../../lib/headless-vpl/blocks';
import type { AutoLayout, Connector, Container } from '../../../lib/headless-vpl';
import {
  type BodyLayoutHit,
  type CBlockRef,
  type CreatedBlock,
  C_HEADER_H,
  C_BODY_MIN_H,
  C_W,
  INLINE_GAP,
  INLINE_HEIGHT_PADDING,
  INLINE_PADDING_X,
  getBlockSize,
  getInputValue,
  inputWidth,
  estimateTextWidth,
  isCBlockShape,
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

function syncDetachedStackFollowers(root: Container): void {
  const chain = collectConnectedChain(root);
  if (chain.length < 2) return;

  let anchor = chain[0];
  for (let i = 1; i < chain.length; i += 1) {
    const follower = chain[i];
    if (follower.parentAutoLayout) break;
    follower.move(anchor.position.x, anchor.position.y + anchor.height);
    anchor = follower;
  }
}

export function relayoutSlotsAndFitBlock(block: CreatedBlock): void {
  const { def, inputValues } = block.state;
  const isCBlock = isCBlockShape(def.shape);
  const baseSize = getBlockSize(def.shape);
  const slotByIndex = new Map(block.slotLayouts.map((slot) => [slot.info.inputIndex, slot]));

  let maxInlineHeight = 0;
  for (const slot of block.slotLayouts) {
    const input = def.inputs[slot.info.inputIndex];
    const baseWidth = inputWidth(input, getInputValue(input, block.state, slot.info.inputIndex));
    slot.info.w = baseWidth;
    slot.layout.minWidth = baseWidth;
    slot.layout.minHeight = slot.info.h;
    slot.layout.update();
    maxInlineHeight = Math.max(maxInlineHeight, Math.max(slot.info.h, slot.layout.height));
  }

  const baseHeaderHeight = isCBlock ? C_HEADER_H : baseSize.h;
  const headerHeight = Math.ceil(
    Math.max(baseHeaderHeight, maxInlineHeight > 0 ? maxInlineHeight + INLINE_HEIGHT_PADDING : 0),
  );

  let cursor = INLINE_PADDING_X + estimateTextWidth(def.name) + (def.name ? INLINE_GAP : 0);

  for (let i = 0; i < def.inputs.length; i += 1) {
    const input = def.inputs[i];
    const baseWidth = inputWidth(input, inputValues[i]);

    if (input.type === 'label') {
      cursor += baseWidth + INLINE_GAP;
      continue;
    }

    const slot = slotByIndex.get(i);
    if (!slot) {
      cursor += baseWidth + INLINE_GAP;
      continue;
    }

    const usedWidth = Math.max(baseWidth, slot.layout.width);
    const usedHeight = Math.max(slot.info.h, slot.layout.height);
    slot.layout.position.x = cursor;
    slot.layout.position.y = (headerHeight - usedHeight) / 2;
    slot.layout.relayout();
    cursor += usedWidth + INLINE_GAP;
  }

  const requiredWidth = Math.max(
    baseSize.w,
    Math.ceil(cursor + INLINE_PADDING_X - (def.inputs.length > 0 ? INLINE_GAP : 0)),
  );
  const requiredHeight = Math.max(baseSize.h, headerHeight);

  if (isCBlock) {
    const container = block.container;
    container.minWidth = C_W;
    container.padding.top = headerHeight;

    const innerMinWidth = Math.max(
      C_W - container.padding.left - container.padding.right,
      requiredWidth - container.padding.left - container.padding.right,
    );

    if (block.cBlockRef) {
      const minimumBodyHeight =
        block.cBlockRef.bodyLayouts.length * C_BODY_MIN_H +
        container.contentGap * Math.max(0, block.cBlockRef.bodyLayouts.length - 1);
      container.minHeight = Math.max(
        baseSize.h,
        container.padding.top + minimumBodyHeight + container.padding.bottom,
      );

      for (let i = 0; i < block.cBlockRef.bodyLayouts.length; i += 1) {
        const layout = block.cBlockRef.bodyLayouts[i];
        layout.position.x = container.padding.left;
        if (i === 0) layout.position.y = container.padding.top;
        layout.minWidth = innerMinWidth;
        layout.minHeight = C_BODY_MIN_H;
      }

      let contentWidth = innerMinWidth;
      for (const layout of block.cBlockRef.bodyLayouts) {
        layout.update();
        contentWidth = Math.max(contentWidth, layout.width);
      }
      container.applyContentSize(contentWidth, minimumBodyHeight);
      alignCBlockBodyEntryConnectors(block.cBlockRef);
    } else {
      container.minHeight = Math.max(
        baseSize.h,
        container.padding.top + C_BODY_MIN_H + container.padding.bottom,
      );
      const changed =
        container.width !== requiredWidth || container.height !== requiredHeight;
      container.width = requiredWidth;
      container.height = requiredHeight;
      if (changed) {
        container.update();
        container.parentAutoLayout?.update();
      }
    }
  } else {
    const container = block.container;
    container.minWidth = baseSize.w;
    container.minHeight = baseSize.h;
    const changed =
      container.width !== requiredWidth || container.height !== requiredHeight;
    container.width = requiredWidth;
    container.height = requiredHeight;
    if (changed) {
      container.update();
      container.parentAutoLayout?.update();
    }
  }

  if (!block.container.parentAutoLayout) {
    syncDetachedStackFollowers(block.container);
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
