import type { Container } from '../../../lib/headless-vpl';
import {
  type BlockState,
  type CBlockRef,
  type CreatedBlock,
  type InputDef,
  C_BODY_MIN_H,
  C_FOOTER_H,
  C_HEADER_H,
  C_W,
  INLINE_SLOT_BASE_H,
  REPORTER_H,
  REPORTER_W,
  STACK_W,
  getBlockSize,
  getInputValue,
  inputWidth,
  isCBlockShape,
} from './defs';

function InlineToken({
  block,
  input,
  index,
  createdBlock,
  nestedSlots,
  onInputValueChange,
}: {
  block: BlockState;
  input: InputDef;
  index: number;
  createdBlock?: CreatedBlock;
  nestedSlots: Record<string, string>;
  onInputValueChange?: (blockId: string, inputIndex: number, value: string) => void;
}) {
  if (input.type === 'label') {
    return <span className="scratch-label-token">{input.text}</span>;
  }

  const slot = createdBlock?.slotLayouts.find((item) => item.info.inputIndex === index);
  const slotWidth = Math.max(
    slot?.layout.width ?? 0,
    slot?.info.w ?? inputWidth(input, getInputValue(input, block, index)),
  );
  const slotHeight = Math.max(slot?.layout.height ?? 0, slot?.info.h ?? INLINE_SLOT_BASE_H);
  const isNested = Boolean(nestedSlots[`${block.id}-${index}`]);
  const hostStyle = { width: slotWidth, height: slotHeight };

  if (isNested) {
    return (
      <span
        className="scratch-slot-host scratch-slot-spacer scratch-slot-filled"
        style={hostStyle}
      />
    );
  }

  switch (input.type) {
    case 'number':
      return (
        <span className="scratch-slot-host" style={hostStyle}>
          <input
            type="text"
            inputMode="numeric"
            value={getInputValue(input, block, index)}
            onChange={(event) =>
              onInputValueChange?.(block.id, index, event.currentTarget.value)
            }
            style={{ width: slotWidth }}
          />
        </span>
      );
    case 'text':
      return (
        <span className="scratch-slot-host" style={hostStyle}>
          <input
            type="text"
            value={getInputValue(input, block, index)}
            onChange={(event) =>
              onInputValueChange?.(block.id, index, event.currentTarget.value)
            }
            style={{ width: slotWidth }}
          />
        </span>
      );
    case 'dropdown':
      return (
        <span className="scratch-slot-host" style={hostStyle}>
          <select
            value={getInputValue(input, block, index)}
            onChange={(event) =>
              onInputValueChange?.(block.id, index, event.currentTarget.value)
            }
            style={{ width: slotWidth }}
          >
            {input.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </span>
      );
    case 'boolean-slot':
      return (
        <span className="scratch-slot-host scratch-slot-boolean" style={hostStyle}>
          <span className="scratch-boolean-slot" />
        </span>
      );
  }
}

export function BlockView({
  block,
  container,
  createdBlock,
  cBlockRef,
  zIndex,
  nestedSlots,
  onInputValueChange,
}: {
  block: BlockState;
  container?: Container;
  createdBlock?: CreatedBlock;
  cBlockRef?: CBlockRef;
  zIndex?: number;
  nestedSlots?: Record<string, string>;
  onInputValueChange?: (blockId: string, inputIndex: number, value: string) => void;
}) {
  const { def } = block;
  const bg = def.color;
  const ns = nestedSlots ?? {};
  const blockStyle = { zIndex };

  const renderInputs = () =>
    def.inputs.map((input, index) => (
      <InlineToken
        key={index}
        block={block}
        input={input}
        index={index}
        createdBlock={createdBlock}
        nestedSlots={ns}
        onInputValueChange={onInputValueChange}
      />
    ));

  if (def.shape === 'reporter' || def.shape === 'boolean') {
    const className = def.shape === 'reporter' ? 'scratch-reporter' : 'scratch-boolean';
    return (
      <div
        id={`node-${block.id}`}
        className={`scratch-block ${className}`}
        style={{
          ...blockStyle,
          background: bg,
          minWidth: REPORTER_W,
          minHeight: container?.minHeight ?? REPORTER_H,
        }}
      >
        {def.name && <span>{def.name}</span>}
        {renderInputs()}
      </div>
    );
  }

  if (def.shape === 'hat') {
    return (
      <div
        id={`node-${block.id}`}
        className="scratch-block scratch-hat"
        style={{ ...blockStyle, background: bg, minWidth: STACK_W }}
      >
        {def.name && <span>{def.name}</span>}
        {renderInputs()}
      </div>
    );
  }

  if (isCBlockShape(def.shape)) {
    const bodyCount = def.shape === 'c-block-else' ? 2 : 1;
    return (
      <div
        id={`node-${block.id}`}
        className="scratch-block scratch-c-block"
        style={{
          ...blockStyle,
          background: bg,
          minWidth: C_W,
          minHeight: container?.minHeight ?? getBlockSize(def.shape).h,
        }}
      >
        <div
          className="scratch-c-header"
          style={{ height: cBlockRef?.container.padding.top ?? C_HEADER_H }}
        >
          {def.name && <span>{def.name}</span>}
          {renderInputs()}
        </div>
        {Array.from({ length: bodyCount }).map((_, bodyIndex) => {
          const bodyLayout = cBlockRef?.bodyLayouts[bodyIndex];
          return (
            <div key={bodyIndex}>
              <div
                className={`scratch-c-body${
                  bodyLayout && bodyLayout.Children.length > 0 ? ' has-children' : ''
                }`}
                style={{ height: Math.max(bodyLayout?.height ?? 0, C_BODY_MIN_H) }}
              />
              {bodyIndex === 0 && def.shape === 'c-block-else' && (
                <div className="scratch-c-divider">else</div>
              )}
            </div>
          );
        })}
        <div
          className="scratch-c-footer"
          style={{ height: cBlockRef?.container.padding.bottom ?? C_FOOTER_H }}
        />
      </div>
    );
  }

  return (
    <div
      id={`node-${block.id}`}
      className="scratch-block scratch-stack"
      style={{ ...blockStyle, background: bg, minWidth: STACK_W }}
    >
      {def.name && <span>{def.name}</span>}
      {renderInputs()}
    </div>
  );
}
