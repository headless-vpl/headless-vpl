# Demo Map

## Demos (11 個)

各デモは単一機能にフォーカスした学習用ページ。ルーティングは `src/main.tsx`。

| ファイル | ルート | 主な使用 API | 難易度 |
|---|---|---|---|
| `src/pages/demos/DragAndDrop.tsx` | `demos/drag-and-drop` | InteractionManager, Container, SvgRenderer | 入門 |
| `src/pages/demos/EdgeTypes.tsx` | `demos/edge-types` | Edge, getStraightPath/getBezierPath/getStepPath/getSmoothStepPath, findEdgeAtPoint | 入門 |
| `src/pages/demos/EdgeBuilderDemo.tsx` | `demos/edge-builder` | EdgeBuilder, Connector, isConnectorHit | 初級 |
| `src/pages/demos/SnapConnectionDemo.tsx` | `demos/snap-connection` | SnapConnection, createSnapConnections, childOnly/parentOnly/either | 初級 |
| `src/pages/demos/AutoLayoutDemo.tsx` | `demos/auto-layout` | AutoLayout, NestingZone, nestContainer/unnestContainer | 中級 |
| `src/pages/demos/NestingDemo.tsx` | `demos/nesting` | NestingZone, createSlotZone, isInsideContainer | 中級 |
| `src/pages/demos/SelectionDemo.tsx` | `demos/selection` | SelectionManager, createMarqueeRect, getElementsInMarquee | 初級 |
| `src/pages/demos/ZoomPanDemo.tsx` | `demos/zoom-pan` | bindWheelZoom, screenToWorld/worldToScreen, Viewport | 初級 |
| `src/pages/demos/ResizeDemo.tsx` | `demos/resize` | detectResizeHandle, beginResize, applyResize | 初級 |
| `src/pages/demos/UndoRedoDemo.tsx` | `demos/undo-redo` | History, MoveCommand/AddCommand/RemoveCommand, bindDefaultShortcuts | 初級 |
| `src/pages/demos/CopyPasteDemo.tsx` | `demos/copy-paste` | copyElements, pasteElements, calculatePastePositions | 初級 |

## Samples (6 個)

製品に近い構成の完全なエディタ実装。

| ファイル | ルート | パターン | 主な使用 API | 難易度 |
|---|---|---|---|---|
| `src/pages/samples/FlowEditor.tsx` | `samples/flow-editor` | Flow | EdgeBuilder, getBezierPath, Connector anchor | 中級 |
| `src/pages/samples/HybridEditor.tsx` | `samples/hybrid-editor` | Hybrid | SnapConnection (control flow) + EdgeBuilder (data flow) | 上級 |
| `src/pages/samples/BlueprintEditor.tsx` | `samples/blueprint` | Blueprint | 複数 Connector (multi-pin), getSmoothStepPath, 色分け | 中級 |
| `src/pages/samples/StateMachine.tsx` | `samples/state-machine` | StateMachine | 円形ノード, Edge markers (arrow), transition label | 中級 |
| `src/pages/samples/WorkflowEditor.tsx` | `samples/workflow` | Workflow | 横フロー (Dify/Make 風), getSmoothStepPath | 中級 |
| `src/pages/samples/block-editor/` | `samples/block-editor` | Block | BlockStackController, connectStackPairs, observeContainerContentSizes, NestingZone, createSlotZone | 上級 |

### Block Editor の分割構成

`src/pages/samples/block-editor/` は以下のファイルに分割:

- `BlockEditorPage.tsx` — React ページコンポーネント
- `defs.ts` — ブロック定義
- `scene.ts` — シーン構築
- `controller.ts` — BlockStackController を使ったスタック管理
- `interactions.ts` — InteractionManager のセットアップ
- `layout.ts` — レイアウト同期
- `view.tsx` — 描画コンポーネント

## Examples (2 個)

ライブラリ利用者向けの外部プロジェクト用テンプレート。

| ディレクトリ | 説明 |
|---|---|
| `examples/vanilla-ts-minimal/` | 最小の 2 ノード + bezier Edge |
| `examples/flow-editor/` | EdgeBuilder + bindDefaultShortcuts を使ったフローエディタ |

## Tools (1 個)

| ファイル | ルート | 説明 |
|---|---|---|
| `src/pages/tools/Factory.tsx` | `tools/factory` | Blockly Block Factory 風の構築ツール入口 |

## When To Use Which

- 単一機能の実装説明 → demo を使う
- 製品に近い構成 → sample を使う
- README や外部利用者向けスニペット → examples を使う
- 新規 demo / sample 追加時 → `src/main.tsx` にルートを追加し、`src/pages/Home.tsx` にリンクを追加する
