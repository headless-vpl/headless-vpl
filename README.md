<p align="right">
  日本語 | <a href="./README.en.md">English</a>
</p>

<h1 align="center">Headless VPL</h1>

<p align="center">
  <strong>ビジュアルプログラミング言語を作るための次世代ライブラリ</strong><br>
  ブロック型、フロー型、あるいは全く新しい形 — どんなVPLでも作れる。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/headless-vpl"><img src="https://img.shields.io/npm/v/headless-vpl?style=flat-square&color=cb3837" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/headless-vpl"><img src="https://img.shields.io/npm/dm/headless-vpl?style=flat-square&color=cb3837" alt="npm downloads"></a>
  <a href="https://bundlephobia.com/package/headless-vpl"><img src="https://img.shields.io/bundlephobia/minzip/headless-vpl?style=flat-square&color=6c5ce7" alt="bundle size"></a>
  <a href="https://github.com/headless-vpl/headless-vpl/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/headless-vpl/headless-vpl/ci.yml?branch=main&style=flat-square&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-44cc11?style=flat-square" alt="zero dependencies">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"></a>
</p>

---

## 特徴

🧩 **Headless** — UI を持たない。React、Vue、Svelte、バニラ DOM、何でも使える。

🎯 **VPL 特化** — 汎用キャンバスライブラリではない。VPL のために設計された API。

📦 **Pure TypeScript** — ゼロ依存。完全な型安全。バニラ TS で書かれている。

🔬 **Simple > Easy** — ブラックボックスを作らない。全てを理解し制御できる。

---

## Blockly・ReactFlow との比較

|                | **Headless VPL**                 | **Blockly**            | **ReactFlow**            |
| -------------- | -------------------------------- | ---------------------- | ------------------------ |
| VPL タイプ     | ブロック + フロー + ハイブリッド | ブロックのみ           | フローのみ               |
| フレームワーク | 何でも（バニラ TS）              | なし（独自レンダラー） | React のみ               |
| レンダリング   | 自由（DOM オーバーレイ）         | Blockly レンダラー固定 | React コンポーネント固定 |
| 型安全         | TypeScript ジェネリクス完全対応  | JSON/文字列ベース      | 部分的                   |
| デザイン自由度 | 完全                             | 制限あり               | コンポーネントレベル     |
| API スタイル   | 薄くコンポーザブル               | 大きく独自的           | イベント駆動・暗黙的     |

### コード削減実績

| 機能              | 従来  | Headless VPL | 削減率   |
| ----------------- | ----- | ------------ | -------- |
| レイアウト構築    | 71 行 | 22 行        | **-69%** |
| ドラッグ&ドロップ | 38 行 | 8 行         | **-78%** |
| スタイリング      | 7 行  | 1 行         | **-85%** |

---

## Quick Start

```bash
npm install headless-vpl
```

最小構成 — 2 ノードを作ってエッジで接続:

```typescript
import {
  Workspace,
  Container,
  Connector,
  Edge,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'

// 1. ワークスペース + レンダラー
const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// 2. ノード作成
const nodeA = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'nodeA',
  width: 160,
  height: 60,
  children: {
    output: new Connector({ position: new Position(160, -30), name: 'out', type: 'output' }),
  },
})

const nodeB = new Container({
  workspace,
  position: new Position(400, 50),
  name: 'nodeB',
  width: 160,
  height: 60,
  children: {
    input: new Connector({ position: new Position(0, -30), name: 'in', type: 'input' }),
  },
})

// 3. エッジで接続
new Edge({ start: nodeA.children.output, end: nodeB.children.input, edgeType: 'bezier' })
```

統合インタラクションが必要なら、`headless-vpl/helpers` と `headless-vpl/recipes` を後から足します。

```typescript
import { EdgeBuilder, NestingZone, SnapConnection, bindWheelZoom } from 'headless-vpl/helpers'
import { InteractionManager, bindDefaultShortcuts } from 'headless-vpl/recipes'
import { getMouseState } from 'headless-vpl/utils/mouse'
import { animate } from 'headless-vpl/utils/animate'
```

### 推奨 import 階層

- `headless-vpl/primitives` — 低レベルのコア building blocks
- `headless-vpl/helpers` — 任意で組み合わせる便利 helper
- `headless-vpl/recipes` — 統合済みの高水準セットアップ
- `headless-vpl/blocks` — block editor 向け helper
- `headless-vpl/utils/*` — マウスや animation loop などの補助 I/O

---

## コアコンセプト: 4 つの型

全ての VPL は 4 つの普遍的パターンに分解できる:

| パターン | 内容                                      | 対応 API                                              |
| -------- | ----------------------------------------- | ----------------------------------------------------- |
| **描画** | レスポンシブサイジング、オートレイアウト  | `Container`, `AutoLayout`, `SvgRenderer`              |
| **接続** | コネクター、エッジ、親子関係              | `Connector`, `Edge`, `SnapConnection`                 |
| **移動** | ドラッグ&ドロップ、スナップ、グループ移動 | `DragAndDrop`, `NestingZone`, `SnapConnection`        |
| **入力** | テキスト、数字、トグル、スライダー        | 開発者の DOM（フレームワーク非依存）                  |

### 単方向データフロー

```
フロントエンド（React / Vue / vanilla）
  → マウス/キーボードイベント
    → Headless VPL コア（Workspace, Container, Edge）
      → EventBus 通知
        → SvgRenderer（デバッグ用ワイヤーフレーム）
        → 開発者の DOM コンポーネント（本番 UI）
```

### Headless アーキテクチャ

SVG ワイヤーフレームでヒット検知とデバッグを行い、実際の UI は DOM を上に被せるだけ:

```
┌─ Canvas ─────────────────────────┐
│  SVG layer (wireframe, invisible)│  ← ヒット検知、デバッグ
│  DOM overlay (your components)   │  ← ユーザーに見える UI
└──────────────────────────────────┘
```

`DomSyncHelper` で Headless 座標系と DOM 位置を自動同期。

---

## 主要 API

> 全 API の詳細は [docs/api-reference.md](./docs/api-reference.md) を参照。

### Primitive

| API                                                  | 説明                                                     |
| ---------------------------------------------------- | -------------------------------------------------------- |
| [`Workspace`](./docs/api-reference.md#workspace)     | ルートコンテナ。ビューポート・選択・履歴・イベントを管理 |
| [`Container<T>`](./docs/api-reference.md#containert) | 主要構成要素。コネクターや AutoLayout を型付きで保持     |
| [`Connector`](./docs/api-reference.md#connector)     | 入出力接続ポイント                                       |
| [`Edge`](./docs/api-reference.md#edge)               | コネクター間の接続線。4 種のパスアルゴリズム             |
| [`AutoLayout`](./docs/api-reference.md#autolayout)   | CSS Flexbox ライクな自動レイアウト                       |

```typescript
// ノードの定義
const node = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'myNode',
  width: 200,
  height: 80,
  widthMode: 'hug', // コンテンツにフィット
  children: {
    input: new Connector({ position: new Position(0, -40), name: 'in', type: 'input' }),
    output: new Connector({ position: new Position(200, -40), name: 'out', type: 'output' }),
  },
})
node.children.input // 型安全にアクセス
```

### イベント

| API                                                            | 説明                                        |
| -------------------------------------------------------------- | ------------------------------------------- |
| [`EventBus`](./docs/api-reference.md#eventbus)                 | パブリッシュ/サブスクライブイベントシステム |
| [`SelectionManager`](./docs/api-reference.md#selectionmanager) | 選択状態管理                                |

```typescript
const unsub = workspace.on('move', (event) => console.log(event.target))
workspace.selection.select(node)
workspace.selection.deselectAll()
```

### 履歴

| API                                                                                                                    | 説明                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| [`History`](./docs/api-reference.md#history--command)                                                                  | Undo/Redo スタック     |
| [`MoveCommand`](./docs/api-reference.md#組み込みコマンド)                                                              | 移動記録               |
| [`AddCommand`](./docs/api-reference.md#組み込みコマンド) / [`RemoveCommand`](./docs/api-reference.md#組み込みコマンド) | 追加/削除記録          |
| [`ConnectCommand`](./docs/api-reference.md#組み込みコマンド)                                                           | 接続記録               |
| [`DetachCommand`](./docs/api-reference.md#組み込みコマンド)                                                            | 切り離し記録           |
| [`NestCommand`](./docs/api-reference.md#組み込みコマンド)                                                              | ネスト記録             |
| [`ReparentChildCommand`](./docs/api-reference.md#組み込みコマンド)                                                     | 子要素の移動記録       |
| [`BatchCommand`](./docs/api-reference.md#組み込みコマンド)                                                             | 複数コマンドをまとめる |

```typescript
workspace.history.execute(new MoveCommand(element, 0, 0, 100, 100))
workspace.history.undo()
workspace.history.redo()
```

### レンダリング

| API                                                  | 説明                                      |
| ---------------------------------------------------- | ----------------------------------------- |
| [`SvgRenderer`](./docs/api-reference.md#svgrenderer) | デバッグ用 SVG ワイヤーフレームレンダラー |

```typescript
new SvgRenderer(svgElement, workspace)
```

### Helper

| API                                                                                                                  | 説明                                               |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [`SnapConnection`](./docs/api-reference.md#snapconnection) / [`createSnapConnections`](./docs/api-reference.md#createsnapconnections) | スナップ接続管理・一括生成       |
| [`EdgeBuilder`](./docs/api-reference.md#edgebuilder)                                                                 | ドラッグで Edge を作成                             |
| [`NestingZone`](./docs/api-reference.md#nestingzone) / [`createSlotZone`](./docs/api-reference.md#createslotzone)    | AutoLayout へのネスト管理                          |
| [`DomSyncHelper`](./docs/api-reference.md#domsynchelper)                                                             | Container → DOM 位置同期                           |
| [`bindWheelZoom`](./docs/api-reference.md#bindwheelzoom)                                                             | ホイールズーム                                     |
| [`bindDefaultShortcuts`](./docs/api-reference.md#binddefaultshortcuts)                                               | 標準キーボードショートカット                       |
| [`observeContentSize`](./docs/api-reference.md#observecontentsize)                                                   | DOM サイズ → Container 自動同期                    |
| [`KeyboardManager`](./docs/api-reference.md#キーボード)                                                              | カスタムキーバインド                               |
| [`computeAutoPan`](./docs/api-reference.md#オートパン)                                                               | 端ドラッグ時の自動パン                             |
| [`detectResizeHandle`](./docs/api-reference.md#リサイズ)                                                             | リサイズハンドル検出・適用                         |
| [`createMarqueeRect`](./docs/api-reference.md#マーキー選択)                                                          | マーキー範囲選択                                   |
| [`snapToGrid`](./docs/api-reference.md#グリッドスナップ)                                                             | グリッドスナップ                                   |
| [`copyElements`](./docs/api-reference.md#クリップボード) / [`pasteElements`](./docs/api-reference.md#クリップボード) / [`calculatePastePositions`](./docs/api-reference.md#クリップボード) | コピー/ペースト |
| [`getStraightPath`](./docs/api-reference.md#edge-パス) / [`getBezierPath`](./docs/api-reference.md#edge-パス) / [`getStepPath`](./docs/api-reference.md#edge-パス) / [`getSmoothStepPath`](./docs/api-reference.md#edge-パス) | Edge パスアルゴリズム |
| [`screenToWorld`](./docs/api-reference.md#ビューポート) / [`worldToScreen`](./docs/api-reference.md#ビューポート)    | 座標変換                                           |

### Recipe / Block

| API | 説明 |
| --- | --- |
| [`InteractionManager`](./docs/api-reference.md#interactionmanager) | DnD・パン・マーキー・リサイズ・Edge 作成をまとめる高水準 orchestrator |
| [`bindDefaultShortcuts`](./docs/api-reference.md#binddefaultshortcuts) | 標準キーボードショートカットの recipe |
| [`BlockStackController`](./docs/api-reference.md#blockstackcontroller) / [`collectConnectedChain`](./docs/api-reference.md#collectconnectedchain) / [`connectStackPairs`](./docs/api-reference.md#connectstackpairs) | block editor 向け helper |
| [`observeContainerContentSizes`](./docs/api-reference.md#observecontainercontentsizes) | 複数コンテナの DOM サイズ一括監視 |

```typescript
// recipe 層で統合する場合
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

## 型一覧

> 全量は [docs/api-reference.md](./docs/api-reference.md#型一覧) を参照。

| 型                    | 説明                                                                             |
| --------------------- | -------------------------------------------------------------------------------- |
| `IWorkspaceElement`   | ワークスペース要素のインターフェース                                             |
| `IEdge`               | エッジのインターフェース                                                         |
| `IPosition`           | `{ x: number, y: number }`                                                       |
| `Viewport`            | `{ x: number, y: number, scale: number }`                                        |
| `VplEvent`            | `{ type, target, data? }`                                                        |
| `VplEventType`        | `'move' \| 'connect' \| 'disconnect' \| 'nest' \| 'unnest' \| 'proximity' \| ...` |
| `SizingMode`          | `'fixed' \| 'hug' \| 'fill'`                                                     |
| `Padding`             | `{ top, right, bottom, left }`                                                   |
| `EdgeType`            | `'straight' \| 'bezier' \| 'step' \| 'smoothstep'`                               |
| `Command`             | `{ execute(): void, undo(): void }`                                              |
| `InteractionMode`     | `'idle' \| 'panning' \| 'dragging' \| 'marquee' \| 'resizing' \| 'edgeBuilding'` |
| `ConnectionValidator` | `() => boolean`                                                                  |
| `SnapStrategy`        | `(source, target, dragContainers) => boolean`                                    |

---

## レシピ

各種 VPL のコード例は [docs/recipes.md](./docs/recipes.md) を参照。

- [ブロック型 VPL（Scratch スタイル）](./docs/recipes.md#ブロック型-vplscratch-スタイル)
- [フロー型 VPL（ReactFlow スタイル）](./docs/recipes.md#フロー型-vplreactflow-スタイル)
- [ハイブリッド型 VPL（ブロック + フロー）](./docs/recipes.md#ハイブリッド型-vplブロック--フロー)
- [ネスティング（スロット/入れ子）](./docs/recipes.md#ネスティングスロット入れ子)
- [InteractionManager 統合セットアップ](./docs/recipes.md#interactionmanager-統合セットアップ)

---

## Claude Code スキル

[Claude Code](https://claude.com/claude-code) を使った開発を支援するスキル（スラッシュコマンド）を同梱しています。

| コマンド              | 説明                                                  | 使用例                                     |
| --------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `/create-vpl`         | 要件に基づいて headless-vpl を使った VPL コードを生成 | `/create-vpl Scratchのようなブロック型VPL` |
| `/headless-vpl-guide` | ライブラリの API・アーキテクチャに関する質問に回答    | `/headless-vpl-guide DnDの設定方法`        |
| `/debug-vpl`          | 典型的な問題の診断と解決策を提示                      | `/debug-vpl ドラッグが動かない`            |

---

## ドキュメント

- [API リファレンス](./docs/api-reference.md) — 全 API の詳細リファレンス
- [アーキテクチャ](./docs/architecture.md) — 内部設計と思想
- [レシピ](./docs/recipes.md) — 各種 VPL のコード例

---

## 開発

```bash
bun install && bun run dev     # 開発サーバー起動
bun run build                  # プロダクションビルド
bun run build:lib              # ライブラリビルド
bun run test                   # テスト実行
bun run lint                   # リント
bun run typecheck              # 型チェック
bun run docs:dev               # ドキュメントサイト起動
```

---

## コントリビューション

コントリビューションを歓迎しています！詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

---

## ライセンス

MIT
