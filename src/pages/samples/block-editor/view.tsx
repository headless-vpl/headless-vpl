import type { Container } from '../../../lib/headless-vpl';
import {
  type BlockState,
  type CBlockRef,
  type InputDef,
  C_BODY_MIN_H,
  C_HEADER_H,
  C_W,
  REPORTER_H,
  REPORTER_W,
  STACK_W,
  isCBlockShape,
} from './defs';

export function InputField({ input }: { input: InputDef }) {
  switch (input.type) {
    case 'number':
      return <input type="number" defaultValue={input.default} />;
    case 'text':
      return <input type="text" defaultValue={input.default} />;
    case 'dropdown':
      return (
        <select defaultValue={input.default}>
          {input.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case 'boolean-slot':
      return <span className="scratch-boolean-slot" />;
    case 'label':
      return (
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}>
          {input.text}
        </span>
      );
  }
}

export function BlockView({
  block,
  container,
  cBlockRef,
  nestedSlots,
}: {
  block: BlockState;
  container?: Container;
  cBlockRef?: CBlockRef;
  nestedSlots?: Record<string, string>;
}) {
  const { def } = block;
  const bg = def.color;
  const ns = nestedSlots ?? {};

  const renderInputs = () =>
    def.inputs.map((input, index) =>
      ns[`${block.id}-${index}`] ? null : <InputField key={index} input={input} />,
    );

  if (def.shape === 'reporter' || def.shape === 'boolean') {
    const className = def.shape === 'reporter' ? 'scratch-reporter' : 'scratch-boolean';
    return (
      <div
        id={`node-${block.id}`}
        className={`scratch-block ${className}`}
        style={{
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
        style={{ background: bg, minWidth: STACK_W }}
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
        style={{ background: bg, minWidth: C_W }}
      >
        <div
          className="scratch-c-header"
          style={{ height: cBlockRef?.container.padding.top ?? C_HEADER_H }}
        >
          {def.name && <span>{def.name}</span>}
          {renderInputs()}
        </div>
        {Array.from({ length: bodyCount }).map((_, bodyIndex) => (
          <div key={bodyIndex}>
            <div
              className={`scratch-c-body${
                cBlockRef && cBlockRef.bodyLayouts[bodyIndex]?.Children.length > 0
                  ? ' has-children'
                  : ''
              }`}
              style={{ minHeight: C_BODY_MIN_H }}
            />
            {bodyIndex === 0 && def.shape === 'c-block-else' && (
              <div className="scratch-c-divider">else</div>
            )}
          </div>
        ))}
        <div className="scratch-c-footer" />
      </div>
    );
  }

  return (
    <div
      id={`node-${block.id}`}
      className="scratch-block scratch-stack"
      style={{ background: bg, minWidth: STACK_W }}
    >
      {def.name && <span>{def.name}</span>}
      {renderInputs()}
    </div>
  );
}
