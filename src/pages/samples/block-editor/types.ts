// ブロックエディタの型定義
import type { AutoLayout, Connector, Container, Position } from '../../../lib/headless-vpl';

export type BlockShape =
  | 'hat'
  | 'stack'
  | 'c-block'
  | 'c-block-else'
  | 'cap-c'
  | 'reporter'
  | 'boolean';

export type ValueBlockShape = 'reporter' | 'boolean';

export type InputDef =
  | {
      type: 'number';
      default: number;
      minWidth?: number;
      maxWidth?: number;
    }
  | {
      type: 'text';
      default: string;
      minWidth?: number;
      maxWidth?: number;
    }
  | {
      type: 'dropdown';
      default: string;
      options: string[];
      minWidth?: number;
      maxWidth?: number;
    }
  | {
      type: 'boolean-slot';
      minWidth?: number;
      maxWidth?: number;
    }
  | { type: 'label'; text: string };

export type BlockDef = {
  name: string;
  shape: BlockShape;
  color: string;
  inputs: InputDef[];
};

export type BlockState = {
  id: string;
  def: BlockDef;
  inputValues: Record<number, string>;
};

export type CBlockRef = {
  container: Container;
  bodyLayouts: AutoLayout[];
  bodyEntryConnectors: Connector[];
  bottomConnector: Connector | null;
};

export type SlotInfo = {
  inputIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  acceptedShapes: ValueBlockShape[];
};

export type SlotLayoutRef = {
  info: SlotInfo;
  layout: AutoLayout;
  connector: Connector | null;
};

export type CreatedBlock = {
  container: Container;
  topConn: Connector | null;
  bottomConn: Connector | null;
  cBlockRef: CBlockRef | null;
  slotLayouts: SlotLayoutRef[];
  valueConnector: Connector | null;
  state: BlockState;
};

export type BlockRegistry = {
  blockMap: Map<string, BlockState>;
  createdMap: Map<string, CreatedBlock>;
  containerMap: Map<string, Container>;
};

export type SlotZoneMeta = {
  blockId: string;
  inputIndex: number;
};

export type BodyZoneMeta = {
  bodyEntryConnector: Connector | undefined;
};

export type BodyLayoutHit = {
  insertIndex: number;
  targetConnector: Connector;
  draggedBlock: CreatedBlock;
};

export type SampleScene = {
  created: CreatedBlock[];
  flag: CreatedBlock;
  move1: CreatedBlock;
  turn1: CreatedBlock;
  say1: CreatedBlock;
  repeat1: CreatedBlock;
  moveInRepeat: CreatedBlock;
  turnInRepeat: CreatedBlock;
  keyPress: CreatedBlock;
  if1: CreatedBlock;
};

export type ShapeConfig = {
  size: { w: number; h: number };
  connectors: { top: boolean; bottom: boolean; value?: boolean };
  bodies?: { minHeight: number }[];
};

export type ProximityHit = {
  source: Container;
  sourcePosition: Position;
  targetPosition: Position;
  snapDistance: number;
};
