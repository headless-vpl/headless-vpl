# Block Editor Spec

Scratch 風 block editor sample (`/samples/block-editor`) の現在仕様です。ここでは **sample editor が何を保証するか** と **Scratch との差分** を定義します。

## Summary

- Rendering: React DOM overlay + `Container` / `AutoLayout` geometry
- Stack connection: 上下 connector の snap 接続
- C-block nesting: connector ベースの body insertion
- Value inputs: typed slot (`reporter` / `boolean`) + editable inline control
- Dynamic sizing: input 値、nested value block、C-block body content に追従
- Non-goals in this sample: Scratch runtime、sprite/stage execution、`.sb3` 互換

## Supported Editor Behaviors

| Behavior | Status | Notes |
| --- | --- | --- |
| Hat / Stack / Reporter / Boolean / C-block / If-Else / Cap-C 形状 | Implemented | sample 上で描画・ドラッグ可能 |
| 縦積み stack snap | Implemented | top/bottom connector ベース |
| C-block body insertion | Implemented | body entry connector と child bottom connector で判定 |
| Value slot nesting | Implemented | slot ごとに `reporter` / `boolean` を型判定 |
| Inline input editing | Implemented | number / text / dropdown を block state で保持 |
| Dynamic block resize | Implemented | inline value、nested value、body content に追従 |
| Scratch 実行意味論 | Not started | sample は editor のみ |
| Palette / toolbox / category UI | Not started | sample scene に直接配置 |
| Project serialization | Not started | block 定義・scene seed のみ |
| Custom block argument signatures | Partial | `Define` / `Run` block の見た目のみ |
| List watcher / variable monitor UI | Not started | editor geometry のみ |

## Block Catalog Status

| Category | Status | Current sample coverage |
| --- | --- | --- |
| Events | Partial | `When clicked`, `When key pressed`, `Broadcast` |
| Motion | Partial | `Move`, `Turn`, `Go to x/y`, `Glide`, `Change x by` |
| Looks | Partial | `Say`, `Think`, `Set size to`, `Show`, `Hide`, `Switch costume to` |
| Control | Partial | `Wait`, `Repeat`, `Forever`, `If`, `If else`, `Repeat until`, `Wait until` |
| Operators | Partial | `+`, `>`, `and`, `join`, `length of` |
| Sensing | Partial | `Mouse X`, `Touching`, `Key pressed?` |
| Variables | Partial | `Set variable`, `Change variable` |
| Lists | Partial | `Add`, `Delete`, `Item of`, `Length of list` |
| My Blocks | Partial | `Define`, `Run` |
| Sound / Pen / Clone / Extensions | Not started | sample 未収録 |

## Layout Rules

### Inline row

- Block width is `max(base width, inline row width, body width for C-blocks)`.
- Inline row tokens are:
  - block label
  - editable input host
  - typed slot host
  - label token
- Empty inputs reserve width from current input value.
- Filled inputs reserve width/height from the nested value block.
- Parent DOM keeps slot spacers even when a nested block is present, so text flow and geometry stay aligned.

### Typed slots

- `number` / `text` / `dropdown` inputs accept `reporter` blocks only.
- `boolean-slot` inputs accept `boolean` blocks only.
- Slot hit testing uses standard slot `NestingZone`; C-block body uses connector-based insertion.

### C-blocks

- Header height grows when inline content is taller than the default header.
- Body width is at least header content width and grows with nested stack width.
- Body height is the vertical `AutoLayout` content height with a minimum empty-body height.
- `if-else` uses two body layouts separated by a divider gap.
- Bottom connector is anchored to the container bottom after every relayout.

## Progress Notes

- The sample is now suitable as a geometry/reference implementation for Scratch-like editing interactions.
- The remaining major work is breadth and productization, not core layout:
  - more block definitions per category
  - palette/toolbox UX
  - save/load
  - runtime / interpreter
  - custom block parameter authoring
