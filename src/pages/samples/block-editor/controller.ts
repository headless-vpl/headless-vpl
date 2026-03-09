import type {
  Container,
  InteractionConfig,
  NestingZone,
  SnapConnection,
  Workspace,
} from '../../../lib/headless-vpl';
import { collectConnectedChain } from '../../../lib/headless-vpl/blocks';
import { observeContainerContentSizes } from '../../../lib/headless-vpl/blocks';
import type {
  BlockState,
  BodyZoneMeta,
  CBlockRef,
  CreatedBlock,
  SlotZoneMeta,
} from './defs';
import {
  collectBodyZoneProximityHits,
  registerCBlockBodyZones,
  registerSlotZones,
  registerSnapConnections,
  subscribeCBlockConnectionSync,
  syncBodyZoneProximityHighlights,
} from './interactions';
import {
  alignCBlockBodyEntryConnectors,
  findCBlockRefForBodyLayout,
  isCBlockBodyLayout,
  pullFollowerChainOutOfBodyLayout,
  relayoutBlockAndAncestors,
  relayoutCreatedBlocks,
  syncBodyLayoutChain,
} from './layout';
import {
  buildBlockRegistry,
  buildSampleScene,
  connectInitialScene,
  resetEditorWorkspace,
  seedInitialCBlockNest,
} from './scene';
import {
  collectFrontGroup,
  sortContainersForNestedRender,
} from './ordering';

export type BlockEditorSnapshot = {
  blocks: BlockState[];
  nestedSlots: Record<string, string>;
};

const EMPTY_SNAPSHOT: BlockEditorSnapshot = {
  blocks: [],
  nestedSlots: {},
};

function replaceMap<K, V>(target: Map<K, V>, source: Map<K, V>) {
  target.clear();
  for (const [key, value] of source.entries()) {
    target.set(key, value);
  }
}

function slotKey(blockId: string, inputIndex: number): string {
  return `${blockId}-${inputIndex}`;
}

export class BlockEditorController {
  private readonly listeners = new Set<() => void>();
  private snapshot: BlockEditorSnapshot = EMPTY_SNAPSHOT;

  private workspace: Workspace | null = null;
  private containers: Container[] = [];
  private proximityFrameId = 0;
  private stopConnectionSync: (() => void) | null = null;
  private stopSizeObservers: (() => void) | null = null;

  private readonly createdMap = new Map<string, CreatedBlock>();
  private readonly containerMap = new Map<string, Container>();
  private readonly cBlockRefMap = new Map<string, CBlockRef>();
  private readonly slotZoneMap = new Map<NestingZone, SlotZoneMeta>();
  private readonly bodyZoneMap = new Map<NestingZone, BodyZoneMeta>();
  private readonly activeBodyProximityIds = new Set<string>();

  readonly snapConnections: SnapConnection[] = [];
  readonly nestingZones: NestingZone[] = [];
  readonly cBlockRefs: CBlockRef[] = [];

  private readonly handleNest: NonNullable<InteractionConfig['onNest']> = (
    container,
    zone,
  ) => {
    if (isCBlockBodyLayout(zone.layout, this.cBlockRefs)) {
      syncBodyLayoutChain(zone.layout);
      const owner = findCBlockRefForBodyLayout(zone.layout, this.cBlockRefs);
      if (owner) {
        alignCBlockBodyEntryConnectors(owner);
        relayoutBlockAndAncestors(owner.container.id, this.createdMap);
      } else {
        this.bumpRevision();
      }
    }

    const slotInfo = this.slotZoneMap.get(zone);
    if (slotInfo) {
      relayoutBlockAndAncestors(slotInfo.blockId, this.createdMap);
      this.setNestedSlot(slotInfo.blockId, slotInfo.inputIndex, container.id);
    }

    const emitted = this.syncRenderOrder();
    if (!emitted) {
      this.bumpRevision();
    }
  };

  private readonly handleUnnest: NonNullable<InteractionConfig['onUnnest']> = (
    container,
    zone,
  ) => {
    if (isCBlockBodyLayout(zone.layout, this.cBlockRefs)) {
      pullFollowerChainOutOfBodyLayout(container, zone.layout);
      const owner = findCBlockRefForBodyLayout(zone.layout, this.cBlockRefs);
      if (owner) {
        alignCBlockBodyEntryConnectors(owner);
        relayoutBlockAndAncestors(owner.container.id, this.createdMap);
      } else {
        this.bumpRevision();
      }
    }

    const slotInfo = this.slotZoneMap.get(zone);
    if (slotInfo) {
      relayoutBlockAndAncestors(slotInfo.blockId, this.createdMap);
      this.setNestedSlot(slotInfo.blockId, slotInfo.inputIndex, null);
    }

    const emitted = this.syncRenderOrder();
    if (!emitted) {
      this.bumpRevision();
    }
  };

  readonly interactionOverrides: Partial<InteractionConfig> = {
    snapConnections: this.snapConnections,
    nestingZones: this.nestingZones,
    onNest: this.handleNest,
    onUnnest: this.handleUnnest,
    onContainerPointerDown: (container) => {
      this.bringChainToFront(container.id);
    },
  };

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  getContainer(blockId: string): Container | undefined {
    return this.createdMap.get(blockId)?.container;
  }

  getCreatedBlock(blockId: string): CreatedBlock | undefined {
    return this.createdMap.get(blockId);
  }

  getCBlockRef(blockId: string): CBlockRef | undefined {
    return this.cBlockRefMap.get(blockId);
  }

  updateInputValue(blockId: string, inputIndex: number, value: string): void {
    const block = this.createdMap.get(blockId);
    if (!block) return;
    if (block.state.inputValues[inputIndex] === value) return;
    block.state.inputValues[inputIndex] = value;
    relayoutBlockAndAncestors(blockId, this.createdMap);
    this.bumpRevision();
  }

  reset(): void {
    if (!this.workspace) return;
    const workspace = this.workspace;
    const containers = this.containers;
    this.unmount(workspace);
    this.workspace = workspace;
    this.containers = containers;
    this.rebuildScene(workspace, containers);
  }

  mount(workspace: Workspace, containers: Container[]): () => void {
    if (this.workspace === workspace) {
      return () => this.unmount(workspace);
    }

    this.unmount();
    this.workspace = workspace;
    this.containers = containers;
    this.rebuildScene(workspace, containers);

    return () => this.unmount(workspace);
  }

  private rebuildScene(workspace: Workspace, containers: Container[]): void {
    this.containers = containers;

    if (this.proximityFrameId) {
      cancelAnimationFrame(this.proximityFrameId);
      this.proximityFrameId = 0;
    }
    this.stopConnectionSync?.();
    this.stopConnectionSync = null;
    this.stopSizeObservers?.();
    this.stopSizeObservers = null;

    resetEditorWorkspace(
      workspace,
      this.containers,
      this.snapConnections,
      this.nestingZones,
      this.cBlockRefs,
      this.createdMap,
      this.slotZoneMap,
      this.bodyZoneMap,
      () => this.setNestedSlots({}),
    );
    this.resetCaches();

    const scene = buildSampleScene(workspace, this.containers);
    const registry = buildBlockRegistry(scene.created);
    replaceMap(this.createdMap, registry.createdMap);
    replaceMap(this.containerMap, registry.containerMap);

    registerSnapConnections(
      workspace,
      scene.created,
      this.snapConnections,
      this.createdMap,
    );
    relayoutCreatedBlocks(scene.created);
    registerCBlockBodyZones(
      workspace,
      scene.created,
      registry,
      this.cBlockRefs,
      this.nestingZones,
      this.bodyZoneMap,
    );
    this.rebuildCBlockRefMap();
    registerSlotZones(
      workspace,
      scene.created,
      registry,
      this.nestingZones,
      this.slotZoneMap,
    );

    connectInitialScene(workspace, this.snapConnections, [
      [scene.move1, scene.flag],
      [scene.turn1, scene.move1],
      [scene.say1, scene.turn1],
      [scene.repeat1, scene.say1],
      [scene.if1, scene.keyPress],
    ]);
    seedInitialCBlockNest(scene.repeat1, [scene.moveInRepeat, scene.turnInRepeat]);

    this.syncRenderOrder();
    this.stopConnectionSync = subscribeCBlockConnectionSync(
      workspace,
      this.containerMap,
      this.cBlockRefs,
      () => {
        relayoutCreatedBlocks(Array.from(this.createdMap.values()));
        this.syncRenderOrder();
        this.bumpRevision();
      },
    );
    this.stopSizeObservers = observeContainerContentSizes({
      items: scene.created,
      getContainer: (block) => block.container,
      resolveElement: (block) =>
        document.getElementById(`node-${block.state.id}`) as HTMLElement | null,
    });
    this.startProximityLoop();
  }

  unmount(expectedWorkspace?: Workspace): void {
    if (expectedWorkspace && this.workspace !== expectedWorkspace) {
      return;
    }

    const workspace = this.workspace;

    if (this.proximityFrameId) {
      cancelAnimationFrame(this.proximityFrameId);
      this.proximityFrameId = 0;
    }

    if (workspace) {
      syncBodyZoneProximityHighlights(
        workspace,
        this.activeBodyProximityIds,
        new Map(),
      );
    } else {
      this.activeBodyProximityIds.clear();
    }

    this.stopConnectionSync?.();
    this.stopConnectionSync = null;
    this.stopSizeObservers?.();
    this.stopSizeObservers = null;

    if (workspace) {
      resetEditorWorkspace(
        workspace,
        this.containers,
        this.snapConnections,
        this.nestingZones,
        this.cBlockRefs,
        this.createdMap,
        this.slotZoneMap,
        this.bodyZoneMap,
        () => this.setNestedSlots({}),
      );
    } else {
      this.snapConnections.length = 0;
      this.nestingZones.length = 0;
      this.cBlockRefs.length = 0;
      this.createdMap.clear();
      this.slotZoneMap.clear();
      this.bodyZoneMap.clear();
    }

    this.resetCaches();
    this.workspace = null;
    this.containers = [];
    this.setBlocks([]);
  }

  private startProximityLoop(): void {
    const tick = () => {
      if (this.workspace) {
        const nextHits = collectBodyZoneProximityHits(
          this.bodyZoneMap,
          this.createdMap,
        );
        syncBodyZoneProximityHighlights(
          this.workspace,
          this.activeBodyProximityIds,
          nextHits,
        );
      }
      this.proximityFrameId = requestAnimationFrame(tick);
    };

    this.proximityFrameId = requestAnimationFrame(tick);
  }

  private rebuildCBlockRefMap(): void {
    this.cBlockRefMap.clear();
    for (const ref of this.cBlockRefs) {
      this.cBlockRefMap.set(ref.container.id, ref);
    }
  }

  private resetCaches(): void {
    this.containerMap.clear();
    this.cBlockRefMap.clear();
    this.activeBodyProximityIds.clear();
  }

  private syncRenderOrder(): boolean {
    return this.applyRenderOrder(sortContainersForNestedRender(this.containers));
  }

  private applyRenderOrder(nextContainers: Container[]): boolean {
    const nextBlocks = nextContainers.flatMap((container) => {
      const state = this.createdMap.get(container.id)?.state;
      return state ? [state] : [];
    });

    const containersChanged =
      nextContainers.length !== this.containers.length ||
      nextContainers.some((container, index) => container !== this.containers[index]);
    const blocksChanged =
      nextBlocks.length !== this.snapshot.blocks.length ||
      nextBlocks.some((block, index) => block !== this.snapshot.blocks[index]);

    if (!containersChanged && !blocksChanged) {
      return false;
    }

    this.containers.splice(0, this.containers.length, ...nextContainers);
    this.setBlocks(nextBlocks);
    return true;
  }

  private setBlocks(blocks: BlockState[]): void {
    this.snapshot = {
      ...this.snapshot,
      blocks,
    };
    this.emit();
  }

  private setNestedSlots(nestedSlots: Record<string, string>): void {
    this.snapshot = {
      ...this.snapshot,
      nestedSlots,
    };
    this.emit();
  }

  private setNestedSlot(
    blockId: string,
    inputIndex: number,
    containerId: string | null,
  ): void {
    const key = slotKey(blockId, inputIndex);
    const current = this.snapshot.nestedSlots[key];

    if (containerId === null) {
      if (!current) return;
      const next = { ...this.snapshot.nestedSlots };
      delete next[key];
      this.setNestedSlots(next);
      return;
    }

    if (current === containerId) return;
    this.setNestedSlots({
      ...this.snapshot.nestedSlots,
      [key]: containerId,
    });
  }

  private bumpRevision(): void {
    this.snapshot = {
      ...this.snapshot,
    };
    this.emit();
  }

  private bringChainToFront(blockId: string): void {
    const root = this.containerMap.get(blockId);
    if (!root || this.containers.length === 0 || this.snapshot.blocks.length === 0) {
      return;
    }

    const chain = collectConnectedChain(root);
    const group = collectFrontGroup(this.containers, chain);
    const groupIds = new Set(group.map((container) => container.id));
    if (groupIds.size === 0) {
      return;
    }

    const nextContainers = this.containers.filter(
      (container) => !groupIds.has(container.id),
    );
    nextContainers.push(...group);
    this.applyRenderOrder(nextContainers);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
