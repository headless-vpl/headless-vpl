<p align="right">
  <a href="./README.md">日本語</a> | English
</p>

<h1 align="center">Headless VPL</h1>

<p align="center">
  <strong>Build any Visual Programming Language — block-based, flow-based, or something entirely new.</strong><br>
  A next-generation library for creating Visual Programming Languages.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/headless-vpl"><img src="https://img.shields.io/npm/v/headless-vpl?style=flat-square&color=cb3837" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/headless-vpl"><img src="https://img.shields.io/npm/dm/headless-vpl?style=flat-square&color=cb3837" alt="npm downloads"></a>
  <a href="https://bundlephobia.com/package/headless-vpl"><img src="https://img.shields.io/bundlephobia/minzip/headless-vpl?style=flat-square&color=6c5ce7" alt="bundle size"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-44cc11?style=flat-square" alt="zero dependencies">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"></a>
</p>

---

## Features

🧩 **Headless** — No built-in UI. Use React, Vue, Svelte, or vanilla DOM.
🎯 **VPL-specialized** — Not a generic canvas library. Purpose-built APIs for visual programming.
📦 **Pure TypeScript** — Zero runtime dependencies. Full type safety.
🔬 **Simple > Easy** — Transparent internals you can understand and control.

---

## Why Headless VPL?

| | **Headless VPL** | **Blockly** | **ReactFlow** |
|---|---|---|---|
| VPL types | Block + Flow + Hybrid | Block only | Flow only |
| Framework | Any (vanilla TS) | None (own renderer) | React only |
| Rendering | You own it (DOM overlay) | Locked to Blockly renderer | Locked to React components |
| Type safety | Full TypeScript generics | JSON/string-based | Partial |
| Design freedom | Complete | Limited customization | Component-level only |
| API surface | Thin, composable functions | Large, opinionated | Event-driven, implicit |

### Code Reduction

| Feature | Before | Headless VPL | Reduction |
|---|---|---|---|
| Layout construction | 71 lines | 22 lines | **-69%** |
| Drag & Drop | 38 lines | 8 lines | **-78%** |
| Styling | 7 lines | 1 line | **-85%** |

---

## Quick Start

```bash
npm install headless-vpl
```

Minimal example — two draggable nodes connected by an edge:

```typescript
import {
  Workspace,
  Container,
  Connector,
  Edge,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'

// 1. Create workspace + renderer
const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// 2. Create nodes
const nodeA = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'nodeA',
  width: 160, height: 60,
  children: {
    output: new Connector({ position: new Position(160, -30), name: 'out', type: 'output' }),
  },
})

const nodeB = new Container({
  workspace,
  position: new Position(400, 50),
  name: 'nodeB',
  width: 160, height: 60,
  children: {
    input: new Connector({ position: new Position(0, -30), name: 'in', type: 'input' }),
  },
})

// 3. Connect with edge
new Edge({ start: nodeA.children.output, end: nodeB.children.input, edgeType: 'bezier' })

```

Add helpers and recipes only when you want higher-level behavior:

```typescript
import { EdgeBuilder, NestingZone, SnapConnection, bindWheelZoom } from 'headless-vpl/helpers'
import { InteractionManager, bindDefaultShortcuts } from 'headless-vpl/recipes'
import { getMouseState } from 'headless-vpl/utils/mouse'
import { animate } from 'headless-vpl/utils/animate'
```

### Recommended Import Tiers

- `headless-vpl/primitives` for low-level core building blocks
- `headless-vpl/helpers` for opt-in convenience helpers
- `headless-vpl/recipes` for integrated setup/orchestration
- `headless-vpl/blocks` for block-editor helpers
- `headless-vpl/utils/*` for mouse / animation-loop I/O helpers

---

## Core Concepts: The Four Patterns

Every VPL can be decomposed into four universal patterns:

| Pattern | What it covers | Headless VPL API |
|---|---|---|
| **Rendering** | Responsive sizing, auto layout | `Container`, `AutoLayout`, `SvgRenderer` |
| **Connection** | Connectors, edges, parent-child | `Connector`, `Edge`, `SnapConnection` |
| **Movement** | Drag & drop, snap, group move | `DragAndDrop`, `NestingZone`, `SnapConnection` |
| **Input** | Text, numbers, toggles, sliders | Your own DOM (framework-agnostic) |

### Unidirectional Data Flow

```
Frontend (React / Vue / vanilla)
  → Mouse/Keyboard events
    → Headless VPL core (Workspace, Containers, Edges)
      → EventBus notifications
        → SvgRenderer (debug wireframe)
        → Your DOM components (production UI)
```

### Headless Architecture

SVG wireframe handles hit-testing and debugging. Your actual UI is a DOM layer on top:

```
┌─ Canvas ─────────────────────────┐
│  SVG layer (wireframe, invisible)│  ← hit detection, debug
│  DOM overlay (your components)   │  ← what users see
└──────────────────────────────────┘
```

Use `DomSyncHelper` to automatically sync headless coordinates with DOM positions.

---

## API Overview

> Full details at [docs/api-reference.md](./docs/api-reference.md).

### Core

| API | Description |
|---|---|
| [`Workspace`](./docs/api-reference.md#workspace) | Root container. Manages viewport, selection, history, events |
| [`Container<T>`](./docs/api-reference.md#containert) | Primary building block with typed children |
| [`Connector`](./docs/api-reference.md#connector) | Input/output connection point |
| [`Edge`](./docs/api-reference.md#edge) | Connection line with 4 path algorithms |
| [`AutoLayout`](./docs/api-reference.md#autolayout) | CSS Flexbox-like automatic layout |

```typescript
const node = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'myNode',
  width: 200, height: 80,
  widthMode: 'hug',
  children: {
    input: new Connector({ position: new Position(0, -40), name: 'in', type: 'input' }),
    output: new Connector({ position: new Position(200, -40), name: 'out', type: 'output' }),
  },
})
node.children.input  // Fully typed
```

### Events

| API | Description |
|---|---|
| [`EventBus`](./docs/api-reference.md#eventbus) | Publish/subscribe event system |
| [`SelectionManager`](./docs/api-reference.md#selectionmanager) | Selection state management |

```typescript
const unsub = workspace.on('move', (event) => console.log(event.target))
workspace.selection.select(node)
workspace.selection.deselectAll()
```

### History

| API | Description |
|---|---|
| [`History`](./docs/api-reference.md#history--command) | Undo/redo stack |
| [`MoveCommand`](./docs/api-reference.md#組み込みコマンド) | Record moves |
| [`AddCommand`](./docs/api-reference.md#組み込みコマンド) / [`RemoveCommand`](./docs/api-reference.md#組み込みコマンド) | Record add/remove |
| [`ConnectCommand`](./docs/api-reference.md#組み込みコマンド) | Record connections |
| [`DetachCommand`](./docs/api-reference.md#組み込みコマンド) | Record detachment |
| [`NestCommand`](./docs/api-reference.md#組み込みコマンド) | Record nesting |
| [`ReparentChildCommand`](./docs/api-reference.md#組み込みコマンド) | Record child reparenting |
| [`BatchCommand`](./docs/api-reference.md#組み込みコマンド) | Batch multiple commands |

```typescript
workspace.history.execute(new MoveCommand(element, 0, 0, 100, 100))
workspace.history.undo()
workspace.history.redo()
```

### Rendering

| API | Description |
|---|---|
| [`SvgRenderer`](./docs/api-reference.md#svgrenderer) | Debug SVG wireframe renderer |

```typescript
new SvgRenderer(svgElement, workspace)
```

### Helpers

| API | Description |
|---|---|
| [`SnapConnection`](./docs/api-reference.md#snapconnection) / [`createSnapConnections`](./docs/api-reference.md#createsnapconnections) | Snap connection manager / batch creation |
| [`EdgeBuilder`](./docs/api-reference.md#edgebuilder) | Build edges by dragging |
| [`NestingZone`](./docs/api-reference.md#nestingzone) / [`createSlotZone`](./docs/api-reference.md#createslotzone) | Nesting into AutoLayout |
| [`DomSyncHelper`](./docs/api-reference.md#domsynchelper) | Container → DOM position sync |
| [`bindWheelZoom`](./docs/api-reference.md#bindwheelzoom) | Wheel zoom binding |
| [`bindDefaultShortcuts`](./docs/api-reference.md#binddefaultshortcuts) | Default keyboard shortcuts |
| [`observeContentSize`](./docs/api-reference.md#observecontentsize) | Auto-sync DOM size → Container |
| [`KeyboardManager`](./docs/api-reference.md#キーボード) | Custom key bindings |
| [`computeAutoPan`](./docs/api-reference.md#オートパン) | Auto-pan on edge drag |
| [`detectResizeHandle`](./docs/api-reference.md#リサイズ) | Resize handle detection |
| [`createMarqueeRect`](./docs/api-reference.md#マーキー選択) | Marquee box selection |
| [`snapToGrid`](./docs/api-reference.md#グリッドスナップ) | Grid snapping |
| [`copyElements`](./docs/api-reference.md#クリップボード) / [`pasteElements`](./docs/api-reference.md#クリップボード) / [`calculatePastePositions`](./docs/api-reference.md#クリップボード) | Copy/paste |
| [`screenToWorld`](./docs/api-reference.md#ビューポート) / [`worldToScreen`](./docs/api-reference.md#ビューポート) | Coordinate transforms |
| [`getStraightPath`](./docs/api-reference.md#edge-パス) / [`getBezierPath`](./docs/api-reference.md#edge-パス) / [`getStepPath`](./docs/api-reference.md#edge-パス) / [`getSmoothStepPath`](./docs/api-reference.md#edge-パス) | Edge path algorithms |
 
### Recipes / Blocks

| API | Description |
|---|---|
| [`InteractionManager`](./docs/api-reference.md#interactionmanager) | High-level orchestrator for DnD, pan, marquee, resize, and edge creation |
| [`bindDefaultShortcuts`](./docs/api-reference.md#binddefaultshortcuts) | Default keyboard shortcut recipe |
| [`BlockStackController`](./docs/api-reference.md#blockstackcontroller) / [`collectConnectedChain`](./docs/api-reference.md#collectconnectedchain) / [`connectStackPairs`](./docs/api-reference.md#connectstackpairs) | Block-type VPL helpers |
| [`observeContainerContentSizes`](./docs/api-reference.md#observecontainercontentsizes) | Batch DOM size observation for containers |

```typescript
// Recipe-layer integration
const interaction = new InteractionManager({
  workspace,
  canvasElement: canvasEl,
  containers: () => containers,
  connectors: () => connectors,
  snapConnections: [snapConn],
  nestingZones: zones,
  edgeBuilder,
})
```

---

## Types

> Full list at [docs/api-reference.md](./docs/api-reference.md#型一覧).

| Type | Description |
|---|---|
| `IWorkspaceElement` | Workspace element interface |
| `IEdge` | Edge interface |
| `IPosition` | `{ x: number, y: number }` |
| `Viewport` | `{ x: number, y: number, scale: number }` |
| `VplEvent` | `{ type, target, data? }` |
| `VplEventType` | `'move' \| 'connect' \| 'disconnect' \| 'nest' \| 'unnest' \| 'proximity' \| ...` |
| `SizingMode` | `'fixed' \| 'hug' \| 'fill'` |
| `Padding` | `{ top, right, bottom, left }` |
| `EdgeType` | `'straight' \| 'bezier' \| 'step' \| 'smoothstep'` |
| `Command` | `{ execute(): void, undo(): void }` |
| `InteractionMode` | `'idle' \| 'panning' \| 'dragging' \| 'marquee' \| 'resizing' \| 'edgeBuilding'` |
| `ConnectionValidator` | `() => boolean` |
| `SnapStrategy` | `(source, target, dragContainers) => boolean` |

---

## Recipes

See [docs/recipes.md](./docs/recipes.md) for code examples:

- [Block-type VPL (Scratch-style)](./docs/recipes.md#ブロック型-vplscratch-スタイル)
- [Flow-type VPL (ReactFlow-style)](./docs/recipes.md#フロー型-vplreactflow-スタイル)
- [Hybrid VPL (Block + Flow)](./docs/recipes.md#ハイブリッド型-vplブロック--フロー)
- [Nesting (Slots)](./docs/recipes.md#ネスティングスロット入れ子)
- [InteractionManager Full Setup](./docs/recipes.md#interactionmanager-統合セットアップ)

---

## Claude Code Skills

This project includes [Claude Code](https://claude.com/claude-code) skills (slash commands) to assist development.

| Command | Description | Example |
|---|---|---|
| `/create-vpl` | Generate VPL code using headless-vpl based on requirements | `/create-vpl A Scratch-like block VPL` |
| `/headless-vpl-guide` | Answer questions about the library's API and architecture | `/headless-vpl-guide How to set up DnD` |
| `/debug-vpl` | Diagnose common problems and provide solutions | `/debug-vpl Drag is not working` |

---

## Development

```bash
bun install && bun run dev     # Start dev server
bun run build                  # Production build
bun run build:lib              # Library build
bun run test                   # Run tests
bun run lint                   # Lint
bun run typecheck              # Type check
bun run docs:dev               # Start docs site
```

---

## License

MIT
