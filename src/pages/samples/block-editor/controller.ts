import type {
  Container,
  InteractionConfig,
  NestingZone,
  SnapConnection,
  Workspace,
} from '../../../lib/headless-vpl';
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
      }
      this.bumpRevision();
    }

    const slotInfo = this.slotZoneMap.get(zone);
    if (slotInfo) {
      relayoutBlockAndAncestors(slotInfo.blockId, this.createdMap);
      this.setNestedSlot(slotInfo.blockId, slotInfo.inputIndex, container.id);
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
      }
      this.bumpRevision();
    }

    const slotInfo = this.slotZoneMap.get(zone);
    if (slotInfo) {
      relayoutBlockAndAncestors(slotInfo.blockId, this.createdMap);
      this.setNestedSlot(slotInfo.blockId, slotInfo.inputIndex, null);
    }
  };

  readonly interactionOverrides: Partial<InteractionConfig> = {
    snapConnections: this.snapConnections,
    nestingZones: this.nestingZones,
    onNest: this.handleNest,
    onUnnest: this.handleUnnest,
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

  getCBlockRef(blockId: string): CBlockRef | undefined {
    return this.cBlockRefMap.get(blockId);
  }

  mount(workspace: Workspace, containers: Container[]): () => void {
    if (this.workspace === workspace) {
      return () => this.unmount(workspace);
    }

    this.unmount();
    this.workspace = workspace;
    this.containers = containers;

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

    this.setBlocks(scene.created.map((block) => block.state));
    this.stopConnectionSync = subscribeCBlockConnectionSync(
      workspace,
      this.containerMap,
      this.cBlockRefs,
      () => this.bumpRevision(),
    );
    this.stopSizeObservers = observeContainerContentSizes({
      items: scene.created,
      getContainer: (block) => block.container,
      resolveElement: (block) =>
        document.getElementById(`node-${block.state.id}`) as HTMLElement | null,
    });
    this.startProximityLoop();

    return () => this.unmount(workspace);
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

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
