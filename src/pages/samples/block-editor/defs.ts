import type { AutoLayout, Connector, Container } from '../../../lib/headless-vpl';

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

export const STACK_W = 200;
export const STACK_H = 42;
export const HAT_H = 52;
export const C_W = 220;
export const C_HEADER_H = 40;
export const C_BODY_MIN_H = 40;
export const C_FOOTER_H = 20;
export const C_DIVIDER_H = 28;
export const C_BODY_ENTRY_OFFSET_X = 50;
export const C_BODY_ENTRY_OFFSET_Y = 0;
export const C_BODY_ENTRY_HIT_RADIUS = 8;
export const C_BODY_LAYOUT_OFFSET_X = 16;
export const REPORTER_W = 140;
export const REPORTER_H = 32;
export const CONN_OFFSET_X = 40;
export const INLINE_PADDING_X = 12;
export const INLINE_GAP = 6;
export const INLINE_SLOT_BASE_H = 24;
export const INLINE_HEIGHT_PADDING = 8;
export const BOOLEAN_SLOT_W = 36;
export const BOOLEAN_CONNECTOR_HIT_RADIUS = 12;
export const INPUT_MIN_W = 40;
export const INPUT_TEXT_MIN_W = 64;
export const INPUT_DROPDOWN_MIN_W = 80;
export const INPUT_MAX_W = 180;

export function isCBlockShape(shape: BlockShape): boolean {
  return shape === 'c-block' || shape === 'c-block-else' || shape === 'cap-c';
}

export function isInlineValueShape(shape: BlockShape): boolean {
  return shape === 'reporter' || shape === 'boolean';
}

export function isValueBlockShape(shape: BlockShape): shape is ValueBlockShape {
  return isInlineValueShape(shape);
}

export function estimateTextWidth(text: string): number {
  return text.length * 7.5;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getInputDefaultValue(input: InputDef): string | null {
  switch (input.type) {
    case 'number':
    case 'text':
    case 'dropdown':
      return String(input.default);
    case 'boolean-slot':
    case 'label':
      return null;
  }
}

export function createInitialInputValues(inputs: InputDef[]): Record<number, string> {
  const values: Record<number, string> = {};
  for (let index = 0; index < inputs.length; index += 1) {
    const value = getInputDefaultValue(inputs[index]);
    if (value !== null) {
      values[index] = value;
    }
  }
  return values;
}

export function getInputValue(
  input: InputDef,
  blockState: Pick<BlockState, 'inputValues'>,
  index: number,
): string {
  return blockState.inputValues[index] ?? getInputDefaultValue(input) ?? '';
}

export function getAcceptedValueShapes(input: InputDef): ValueBlockShape[] {
  switch (input.type) {
    case 'boolean-slot':
      return ['boolean'];
    case 'number':
    case 'text':
    case 'dropdown':
      return ['reporter'];
    case 'label':
      return [];
  }
}

export function inputWidth(input: InputDef, value?: string): number {
  switch (input.type) {
    case 'number': {
      const text = value ?? String(input.default);
      const minWidth = input.minWidth ?? INPUT_MIN_W;
      const maxWidth = input.maxWidth ?? 120;
      return clamp(Math.ceil(estimateTextWidth(text || '0') + 22), minWidth, maxWidth);
    }
    case 'text': {
      const text = value ?? input.default;
      const minWidth = input.minWidth ?? INPUT_TEXT_MIN_W;
      const maxWidth = input.maxWidth ?? INPUT_MAX_W;
      return clamp(Math.ceil(estimateTextWidth(text || ' ') + 22), minWidth, maxWidth);
    }
    case 'dropdown': {
      const text = value ?? input.default;
      const widestOption = input.options.reduce((max, option) => {
        return Math.max(max, estimateTextWidth(option));
      }, estimateTextWidth(text));
      const minWidth = input.minWidth ?? INPUT_DROPDOWN_MIN_W;
      const maxWidth = input.maxWidth ?? INPUT_MAX_W;
      return clamp(Math.ceil(widestOption + 30), minWidth, maxWidth);
    }
    case 'boolean-slot':
      return input.minWidth ?? BOOLEAN_SLOT_W;
    case 'label':
      return estimateTextWidth(input.text);
  }
}

export function computeSlotPositions(
  def: BlockDef,
  inputValues: Record<number, string> = createInitialInputValues(def.inputs),
): SlotInfo[] {
  let cursor =
    INLINE_PADDING_X + estimateTextWidth(def.name) + (def.name ? INLINE_GAP : 0);
  const blockH = def.shape === 'hat' ? HAT_H : isCBlockShape(def.shape) ? C_HEADER_H : STACK_H;
  const slotY = (blockH - INLINE_SLOT_BASE_H) / 2;
  const slots: SlotInfo[] = [];

  for (let i = 0; i < def.inputs.length; i += 1) {
    const input = def.inputs[i];
    const w = inputWidth(input, inputValues[i]);
    if (input.type !== 'label') {
      slots.push({
        inputIndex: i,
        x: cursor,
        y: slotY,
        w,
        h: INLINE_SLOT_BASE_H,
        acceptedShapes: getAcceptedValueShapes(input),
      });
    }
    cursor += w + INLINE_GAP;
  }

  return slots;
}

export function hasTopConnector(shape: BlockShape): boolean {
  return shape !== 'hat' && !isInlineValueShape(shape);
}

export function hasBottomConnector(shape: BlockShape): boolean {
  return shape !== 'cap-c' && !isInlineValueShape(shape);
}

export function getBlockSize(shape: BlockShape): { w: number; h: number } {
  switch (shape) {
    case 'hat':
      return { w: STACK_W, h: HAT_H };
    case 'reporter':
      return { w: REPORTER_W, h: REPORTER_H };
    case 'boolean':
      return { w: REPORTER_W, h: REPORTER_H };
    case 'c-block':
      return { w: C_W, h: C_HEADER_H + C_BODY_MIN_H + C_FOOTER_H };
    case 'c-block-else':
      return {
        w: C_W,
        h: C_HEADER_H + C_BODY_MIN_H + C_DIVIDER_H + C_BODY_MIN_H + C_FOOTER_H,
      };
    default:
      return { w: STACK_W, h: STACK_H };
  }
}

export const BLOCK_DEFS: BlockDef[] = [
  { name: 'When 🏴 clicked', shape: 'hat', color: '#FFBF00', inputs: [] },
  {
    name: 'When',
    shape: 'hat',
    color: '#FFBF00',
    inputs: [
      {
        type: 'dropdown',
        default: 'space',
        options: ['space', 'up arrow', 'down arrow', 'right arrow', 'left arrow', 'any'],
      },
      { type: 'label', text: 'key pressed' },
    ],
  },
  {
    name: 'Move',
    shape: 'stack',
    color: '#4C97FF',
    inputs: [
      { type: 'number', default: 10 },
      { type: 'label', text: 'steps' },
    ],
  },
  {
    name: 'Turn ↻',
    shape: 'stack',
    color: '#4C97FF',
    inputs: [
      { type: 'number', default: 15 },
      { type: 'label', text: 'degrees' },
    ],
  },
  {
    name: 'Go to x:',
    shape: 'stack',
    color: '#4C97FF',
    inputs: [
      { type: 'number', default: 0 },
      { type: 'label', text: 'y:' },
      { type: 'number', default: 0 },
    ],
  },
  {
    name: 'Glide',
    shape: 'stack',
    color: '#4C97FF',
    inputs: [
      { type: 'number', default: 1 },
      { type: 'label', text: 'secs to x:' },
      { type: 'number', default: 0 },
      { type: 'label', text: 'y:' },
      { type: 'number', default: 0 },
    ],
  },
  {
    name: 'Say',
    shape: 'stack',
    color: '#9966FF',
    inputs: [
      { type: 'text', default: 'Hello!' },
      { type: 'label', text: 'for' },
      { type: 'number', default: 2 },
      { type: 'label', text: 'seconds' },
    ],
  },
  {
    name: 'Think',
    shape: 'stack',
    color: '#9966FF',
    inputs: [{ type: 'text', default: 'Hmm...' }],
  },
  {
    name: 'Set size to',
    shape: 'stack',
    color: '#9966FF',
    inputs: [
      { type: 'number', default: 100 },
      { type: 'label', text: '%' },
    ],
  },
  { name: 'Show', shape: 'stack', color: '#9966FF', inputs: [] },
  { name: 'Hide', shape: 'stack', color: '#9966FF', inputs: [] },
  {
    name: 'Wait',
    shape: 'stack',
    color: '#FFAB19',
    inputs: [
      { type: 'number', default: 1 },
      { type: 'label', text: 'seconds' },
    ],
  },
  {
    name: 'Repeat',
    shape: 'c-block',
    color: '#FFAB19',
    inputs: [{ type: 'number', default: 10 }],
  },
  { name: 'Forever', shape: 'cap-c', color: '#FFAB19', inputs: [] },
  {
    name: 'If',
    shape: 'c-block',
    color: '#FFAB19',
    inputs: [{ type: 'boolean-slot' }, { type: 'label', text: 'then' }],
  },
  {
    name: 'If',
    shape: 'c-block-else',
    color: '#FFAB19',
    inputs: [{ type: 'boolean-slot' }, { type: 'label', text: 'then' }],
  },
  {
    name: 'Set',
    shape: 'stack',
    color: '#FF8C1A',
    inputs: [
      {
        type: 'dropdown',
        default: 'my variable',
        options: ['my variable', 'score', 'timer'],
      },
      { type: 'label', text: 'to' },
      { type: 'number', default: 0 },
    ],
  },
  {
    name: 'Change',
    shape: 'stack',
    color: '#FF8C1A',
    inputs: [
      {
        type: 'dropdown',
        default: 'my variable',
        options: ['my variable', 'score', 'timer'],
      },
      { type: 'label', text: 'by' },
      { type: 'number', default: 1 },
    ],
  },
  {
    name: '',
    shape: 'reporter',
    color: '#59C059',
    inputs: [
      { type: 'number', default: 0 },
      { type: 'label', text: '+' },
      { type: 'number', default: 0 },
    ],
  },
  {
    name: '',
    shape: 'boolean',
    color: '#59C059',
    inputs: [
      { type: 'number', default: 0 },
      { type: 'label', text: '>' },
      { type: 'number', default: 0 },
    ],
  },
  {
    name: 'Join',
    shape: 'reporter',
    color: '#59C059',
    inputs: [
      { type: 'text', default: 'hello' },
      { type: 'text', default: 'world' },
    ],
  },
  { name: 'Mouse X', shape: 'reporter', color: '#5CB1D6', inputs: [] },
  {
    name: 'Touching',
    shape: 'boolean',
    color: '#5CB1D6',
    inputs: [
      {
        type: 'dropdown',
        default: 'mouse-pointer',
        options: ['mouse-pointer', 'edge', 'Sprite1'],
      },
    ],
  },
  {
    name: 'Broadcast',
    shape: 'stack',
    color: '#FFBF00',
    inputs: [
      {
        type: 'dropdown',
        default: 'message1',
        options: ['message1', 'game-over', 'reset'],
      },
    ],
  },
  {
    name: 'Change x by',
    shape: 'stack',
    color: '#4C97FF',
    inputs: [{ type: 'number', default: 10 }],
  },
  {
    name: 'Switch costume to',
    shape: 'stack',
    color: '#9966FF',
    inputs: [
      {
        type: 'dropdown',
        default: 'costume1',
        options: ['costume1', 'costume2', 'costume3'],
      },
    ],
  },
  {
    name: 'Repeat until',
    shape: 'c-block',
    color: '#FFAB19',
    inputs: [{ type: 'boolean-slot' }],
  },
  {
    name: 'Wait until',
    shape: 'stack',
    color: '#FFAB19',
    inputs: [{ type: 'boolean-slot' }],
  },
  {
    name: '',
    shape: 'boolean',
    color: '#59C059',
    inputs: [
      { type: 'boolean-slot' },
      { type: 'label', text: 'and' },
      { type: 'boolean-slot' },
    ],
  },
  {
    name: 'Length of',
    shape: 'reporter',
    color: '#59C059',
    inputs: [{ type: 'text', default: 'hello' }],
  },
  {
    name: 'Key',
    shape: 'boolean',
    color: '#5CB1D6',
    inputs: [
      {
        type: 'dropdown',
        default: 'space',
        options: ['space', 'up arrow', 'down arrow', 'right arrow', 'left arrow', 'any'],
      },
      { type: 'label', text: 'pressed?' },
    ],
  },
  {
    name: 'Add',
    shape: 'stack',
    color: '#FF661A',
    inputs: [
      { type: 'text', default: 'thing' },
      { type: 'label', text: 'to' },
      {
        type: 'dropdown',
        default: 'my list',
        options: ['my list', 'inventory', 'path'],
      },
    ],
  },
  {
    name: 'Delete',
    shape: 'stack',
    color: '#FF661A',
    inputs: [
      { type: 'number', default: 1 },
      { type: 'label', text: 'of' },
      {
        type: 'dropdown',
        default: 'my list',
        options: ['my list', 'inventory', 'path'],
      },
    ],
  },
  {
    name: 'Item',
    shape: 'reporter',
    color: '#FF661A',
    inputs: [
      { type: 'number', default: 1 },
      { type: 'label', text: 'of' },
      {
        type: 'dropdown',
        default: 'my list',
        options: ['my list', 'inventory', 'path'],
      },
    ],
  },
  {
    name: 'Length of',
    shape: 'reporter',
    color: '#FF661A',
    inputs: [
      {
        type: 'dropdown',
        default: 'my list',
        options: ['my list', 'inventory', 'path'],
      },
    ],
  },
  {
    name: 'Define',
    shape: 'hat',
    color: '#FF6680',
    inputs: [{ type: 'text', default: 'my block' }],
  },
  {
    name: 'Run',
    shape: 'stack',
    color: '#FF6680',
    inputs: [{ type: 'text', default: 'my block' }],
  },
];
