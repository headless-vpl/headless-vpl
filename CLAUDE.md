# Headless VPL — CLAUDE.md

## 1. プロジェクト概要

- **プロジェクト名**: Headless VPL — ビジュアルプログラミング言語を作るための次世代ライブラリ
- **一言説明**: VPLを誰でも簡単に作れるようにするHeadlessライブラリ。たった数行でドラッグ&ドロップ、スナップ、接続線などVPLの基本機能を実装できる。

## 2. Mission / Vision / Values

- **Mission**: VPL開発を民主化する — 「産業発展になるようなVPLのアイデアを個人が持っていても実現できなかった世界」を終わらせる
- **Vision**: 誰でも簡単にVPLを作れる世界 — 自作言語と同じくらい手軽に自作VPLを作れるようにする
- **Values**:
  - **疎結合（Headless）**: Blocklyのようにレールを敷かない。どんなタイプのVPLでも開発可能にする
  - **純粋さ**: バニラTSで書かれ、React/Vue等に依存しない。Honoのような純粋さを持つ
  - **Simple > Easy**: ブラックボックス化を防ぎ、汎用的な開発を可能にする。Easyは短期的、Simpleは長期的に正しい

## 3. 背景と課題

### VPLの需要増大

- **AI分野**: Dify（フローベースVPL）、Make等
- **教育分野**: Scratch 3.0（月間3000万ユーザー）、MakeCode
- **ゲーム開発**: Unreal Engine Blueprint

### 最大の課題：VPL開発のハードルが高すぎる

- VPL開発にはドラッグ&ドロップ、当たり判定、スクロール、状態管理、描画、座標管理…と実装範囲が膨大
- テキスト言語なら文字列に対してパーサーを使うだけだが、VPLはゲーム開発に近い複雑さを持つ
- 既存ライブラリ（Blockly, ReactFlow）は汎用性が低く、理想のUI/UXを実現できない

### 既存ライブラリの限界

| ライブラリ    | 問題点                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| **Blockly**   | 独自描画システム・独自形式に完全に乗る必要がある。JSON/文字列ベースで型安全でない。ブロック型しか作れない |
| **ReactFlow** | Reactに依存。イベント駆動のため処理が非宣言的になる。フロー型しか作れない                                 |

## 4. コア思想：4つの型（フレームワーク）

8年間、数十を超えるVPLに触れてきた結果発見した、**全てのVPLに共通する要素**。
Web開発のMVC、ゲーム開発のシングルトンパターンのような王道的フレームワーク。
**これさえあればどんなVPLでも開発できる。**

### (1) 描画の型

- **レスポンシブ**: 引数や数字の増減に応じてブロックが自動的に伸縮する仕組み
- **レイアウト**: CSSのFlexboxのような要素配置（上下中央揃え、左揃え等）。VPLの形状を決定する

### (2) 接続の型

- **コネクター**: 接続線を繋ぐ元と先にあるポイント（ブロックベースでも仮想的に存在）
- **接続線**: コネクター間を結ぶ線（ブロック型では非表示だがデバッグ時に有用）
- **親子関係**: コネクターと接続線が形成する構造的な関係

### (3) 移動の型

- **DnD（ドラッグ&ドロップ）**: ブロック/ノードのマウスによる移動
- **スナップ**: 近づけると吸い付くようにくっつく機能
- **グループ**: 親を移動すると子も連動して動く

### (4) 入力の型

- **文字列・数字・トグル・スライダー**等
- 最も単純だが、時代とともに新しい入力形式が追加されていく型

## 5. Headlessの意味と設計原則

### Headlessとは

「UIを持たない」「ロジックを自由に変更できる」「改変可能・疎結合」の意。

### 設計原則

1. **フレームワーク非依存**: バニラTSで記述。React/Vue/Svelte等、好きなフロントエンドと組み合わせ可能
2. **Simple > Easy**: ブラックボックスを作らない。学習コストは最小限だが、開発者が全てを理解・制御できる
3. **VPL特化**: ゲーム用ライブラリの流用ではなく、VPL専用のAPI設計
4. **薄く強力なAPI**: 最小限のAPIで最大限の表現力。従来70行が20行に（約70%削減）
5. **デザインは上から被せるだけ**: DOM描画とイベント検知を分離。ワイヤーフレームの上にReact等のDOMを配置する

### コード削減実績

| 機能              | 従来 | Headless VPL | 削減率 |
| ----------------- | ---- | ------------ | ------ |
| レイアウト構築    | 71行 | 22行         | 69%    |
| ドラッグ&ドロップ | 38行 | 8行          | 78%    |
| スタイリング      | 7行  | 1行          | 85%    |

## 6. 技術アーキテクチャ

### 単方向データフロー

フロントエンドからのイベントをHeadless VPLに渡す構成。内部も単方向に処理が流れる。
アーキテクチャそのものが美しく、デバッグがしやすい。

```
フロントエンド（React / Vue / vanilla）
  → マウス/キーボードイベント
    → Headless VPL コア（Workspace, Container, Edge）
      → EventBus 通知
        → SvgRenderer（デバッグ用ワイヤーフレーム）
        → 開発者のDOMコンポーネント（本番UI）
```

### 5つのモジュール

| モジュール         | 役割                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Renderer** (`SvgRenderer`) | デバッグ用ワイヤーフレーム描画、仮想座標の計算                      |
| **Controller** (`InteractionManager`) | コアエンジン。DnD、パン、マーキー、リサイズ、Edge作成を統合管理 |
| **I/O** (`getMouseState`, `KeyboardManager`) | フロントエンドからのイベント入力を受け取る疎結合インターフェース |
| **UI Generator** (`AutoLayout`, `Container`) | 宣言的UI記法。木構造データからAuto Layoutを管理し「仮想座標宣言的UI」を実現 |
| **History** (`History`, `Command`) | Undo/Redoスタック。コマンドパターンで全操作を記録               |

### DOM描画とイベント検知の分離

- ReactFlowは実際のUIとイベント検知が同じコンポーネントで行われる
- Headless VPLではSVGでワイヤーフレーム（座標・当たり判定用）を描画し、その上にReact等のDOMを被せる
- フロントエンドライブラリを自由に使いながら、見た目を完全にカスタマイズ可能

## 7. ソースコード構成

```
src/lib/headless-vpl/
├── core/                          # コアデータ構造・クラス
│   ├── Container.ts               # メインコンテナ（MovableObject継承、ジェネリクス対応）
│   ├── Connector.ts               # 入出力接続ポイント
│   ├── Edge.ts                    # 接続線（straight / bezier / step / smoothstep）
│   ├── Workspace.ts               # ワークスペースのルートコンテナ
│   ├── AutoLayout.ts              # レイアウト管理（Flexboxライク）
│   ├── MovableObject.ts           # ドラッグ可能要素の抽象基底クラス
│   ├── Position.ts                # 2D座標
│   ├── EventBus.ts                # パブリッシュ/サブスクライブイベントシステム
│   ├── SelectionManager.ts        # 選択状態管理
│   ├── History.ts                 # Undo/Redoスタック
│   ├── commands.ts                # 組み込みコマンド群
│   └── types.ts                   # 共通型定義
├── rendering/
│   └── SvgRenderer.ts             # デバッグ用SVGレンダラー
├── util/                          # ユーティリティ関数
│   ├── interaction.ts             # InteractionManager（統合インタラクション管理）
│   ├── dnd.ts                     # ドラッグ&ドロップ（内部ユーティリティ）
│   ├── snap.ts                    # スナップ接続（SnapConnection）
│   ├── edgeBuilder.ts             # Edge作成ビルダー
│   ├── nesting.ts                 # ネスティング（NestingZone）
│   ├── mouse.ts                   # マウス状態トラッキング
│   ├── keyboard.ts                # キーボードショートカット
│   ├── shortcuts.ts               # デフォルトショートカット
│   ├── viewport.ts                # 座標変換（screen ↔ world）
│   ├── edgePath.ts                # Edgeパスアルゴリズム
│   ├── marquee.ts                 # マーキー選択
│   ├── clipboard.ts               # コピー/ペースト
│   ├── resize.ts                  # リサイズ処理
│   ├── autoPan.ts                 # オートパン
│   ├── snapToGrid.ts              # グリッドスナップ
│   ├── wheelZoom.ts               # ホイールズーム
│   ├── domSync.ts                 # DOM同期ヘルパー
│   ├── contentSize.ts             # DOMサイズ監視
│   ├── animate.ts                 # requestAnimationFrameループ
│   ├── collision_detecion.ts      # AABB当たり判定
│   ├── distance.ts                # 距離・角度計算
│   ├── domController.ts           # DOM位置操作
│   └── moveContainersGroup.ts     # コンテナグループ一括移動
├── blocks/                        # ブロック型VPLヘルパー
│   ├── stack.ts                   # BlockStackController
│   ├── connect.ts                 # スタック接続ヘルパー
│   ├── dom.ts                     # DOMサイズ監視
│   └── zones.ts                   # 挿入ゾーン（内部利用）
└── index.ts                       # 公開APIエクスポート
```

### 公開API（カテゴリ別）

**コア**: `Workspace`, `Container`, `Connector`, `Edge`, `AutoLayout`, `Position`, `EventBus`, `SelectionManager`, `History`

**コマンド**: `MoveCommand`, `AddCommand`, `RemoveCommand`, `ConnectCommand`, `DetachCommand`, `NestCommand`, `ReparentChildCommand`, `BatchCommand`

**レンダリング**: `SvgRenderer`

**インタラクション**: `InteractionManager`, `SnapConnection`, `createSnapConnections`, `EdgeBuilder`, `NestingZone`, `createSlotZone`, `DomSyncHelper`

**ユーティリティ**: `bindWheelZoom`, `bindDefaultShortcuts`, `KeyboardManager`, `observeContentSize`, `computeAutoPan`, `detectResizeHandle`, `beginResize`, `applyResize`, `createMarqueeRect`, `getElementsInMarquee`, `snapToGrid`, `snapDeltaToGrid`, `copyElements`, `pasteElements`, `calculatePastePositions`, `screenToWorld`, `worldToScreen`, `isConnectorHit`, `findNearestConnector`, `findEdgeAtPoint`, `isInsideContainer`, `nestContainer`, `unnestContainer`, `getDistance`, `getAngle`, `getStraightPath`, `getBezierPath`, `getStepPath`, `getSmoothStepPath`

**ブロックヘルパー**: `BlockStackController`, `collectConnectedChain`, `connectStackPairs`, `observeContainerContentSizes`

## 8. 斬新さ・差別化ポイント

### 1. 宣言的UI + 型安全（vs Blockly: JSON/文字列型）

- Blocklyはブロック構造をJSON管理、引数指定は文字列 → エラーが出ない、構造がわかりにくい
- Headless VPLはFlutterのような宣言的UIベース → 可読性・カスタマイズ性・保守性に優れる

### 2. Headlessアーキテクチャ（デザインは上から被せるだけ）

- DOM描画とイベント検知が完全に分離
- フロントエンドライブラリを自由に選択してデザインをカスタマイズ可能
- 仮想座標のデバッグも容易

### 3. 強力な型システム（TypeScript自動型生成）

- コンテナの構造からTypeScript型情報を動的に自動生成
- 自分が設定したプロパティや構造を型安全に扱える
- Blocklyは全て文字列のため、引数の数が間違っていてもエラーが出ない

### 4. AIとの相性の良さ

- 完全なTypeScriptで型情報が豊富
- `InteractionManager`を使うだけでDnDが実現できる等、AIが理解しやすいAPI
- v0 + shadcn/uiのように、少ないトークンでハイクオリティなVPLを生成可能

### 5. ブロック型・フロー型の両方を作れる

- BlocklyやReactFlowは片方しか作れないが、Headless VPLはどちらも作れる
- ブロック型とフロー型を混合した全く新しいVPLも作れる

## 9. 期待される効果

1. **全く新しいVPLの誕生**: ブロック型×フロー型の混合など、従来3ヶ月かかった開発が1日で可能に
2. **AI・産業分野の発展**: 個人開発でもDifyやMakeのようなプロダクトが作れるようになる
3. **自作VPL界隈の活性化**: 自作言語界隈のようにVPL自作が活発になる。パーサーやジェネレーターのようなツールとしての役割

## 10. 開発における判断基準

コードを書く前に以下を確認する：

### 設計判断チェックリスト

- [ ] **Headlessか？** — UIやフレームワーク固有のコードがライブラリ本体に混入していないか
- [ ] **疎結合か？** — 変更が他のモジュールに波及しないか。レールを敷いていないか
- [ ] **Simpleか？** — Easyに逃げてブラックボックスを作っていないか。開発者が理解・制御できるか
- [ ] **4つの型に沿っているか？** — 描画・接続・移動・入力のどれに該当する変更か明確か
- [ ] **単方向データフローを維持しているか？** — イベント → I/O → Controller → Renderer の流れを壊していないか
- [ ] **VPL特化か？** — 汎用ゲームライブラリ的な機能になっていないか。VPLに必要な機能か
- [ ] **薄いAPIか？** — 最小限のインターフェースで最大限の表現力を提供しているか
- [ ] **型安全か？** — TypeScriptの型システムを活用して安全性を担保しているか
- [ ] **フレームワーク非依存か？** — バニラTSで完結し、React/Vue等への依存を持ち込んでいないか
- [ ] **コード量は削減されているか？** — ユーザーの記述量を最小限にできているか

### 迷ったときの優先順位

1. **Simple > Easy** — 短期的な便利さよりも長期的な理解しやすさ
2. **疎結合 > 密結合** — 機能追加よりも分離性
3. **VPL特化 > 汎用** — 何でもできるより、VPLにとって最高であること
4. **型安全 > 動的** — 文字列やanyよりもTypeScriptの型を活用
5. **薄いAPI > 厚いAPI** — 機能を隠すよりも、開発者に制御を委ねる

## 11. サイトUIデザイン仕様

Factory UIを基準とした統一デザインシステム。サイト全体（Home, Examples, Header等）に適用する。

### テーマ変数（`src/index.css`）

| 変数 | ライト | ダーク | 用途 |
|------|--------|--------|------|
| `--color-bg` | `#ffffff` | `#000000` | ページ背景 |
| `--color-surface` | `#ffffff` | `#0a0a0a` | カード・パネル背景 |
| `--color-surface-raised` | `#f4f4f5` | `#171717` | 浮き上がった要素・ボタン背景 |
| `--color-text` | `#09090b` | `#ededed` | メインテキスト |
| `--color-text-secondary` | `#71717a` | `#888888` | サブテキスト |
| `--color-border` | `#e4e4e7` | `#1a1a1a` | ボーダー（主要） |
| `--color-border-subtle` | `#d4d4d8` | `#2a2a2a` | ボーダー（微細） |

### デザイン原則

1. **ソリッドボーダー**: 半透明ボーダー（`rgba`, `border-white/5` 等）を使わない。`var(--color-border)` または `border-zinc-200 dark:border-zinc-800` を使う
2. **モノクロ基調 + 単一アクセント**: アクセントカラーは `#3b82f6`（blue-500）のみ。多色装飾は避ける
3. **背景は2段階**: `var(--color-surface)` と `var(--color-surface-raised)` のみ。半透明背景（`rgba(255,255,255,0.03)` 等）は使わない
4. **過剰な装飾を避ける**: glow、text-shadow、グラデーションボーダー常時表示は不要。hover時のグラデーションボーダーは許容
5. **ハイコントラスト**: ライト/ダークどちらでもボーダー・ボタンがくっきり見えること

### コンポーネント別ルール

#### カード（`.glass-card`）
```css
background: var(--color-surface);
border: 1px solid var(--color-border);
```
- `backdrop-filter: blur()` は不要
- ライト/ダーク個別上書き不要（テーマ変数で自動対応）

#### ボタン
- **プライマリ（CTA）**: `bg-zinc-900 text-white` / `dark:bg-white dark:text-black` — 背景と反転する高コントラスト
- **セカンダリ（アウトライン）**: `border border-zinc-300 dark:border-zinc-700` — ボーダーのみ
- **ツールバー系**: `bg-[var(--color-surface-raised)] border border-[var(--color-border)]`

#### タブ・フィルター
- **アクティブ**: `bg-zinc-900 text-white dark:bg-white dark:text-black`（プライマリボタンと同じ反転スタイル）
- **非アクティブ**: `text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white`

#### ヘッダー
- ボーダー: `border-zinc-200 dark:border-zinc-800`（半透明禁止）
- 背景: `bg-white/60 dark:bg-black/60 backdrop-blur-xl`（背景のみ半透明許容）

#### テーブル
- ヘッダー行・データ行のボーダー: `border-zinc-200 dark:border-zinc-800`
- 半透明ボーダー（`border-white/[0.03]`）は禁止

#### セクション区切り
- シンプルな実線: `bg-zinc-200 dark:bg-zinc-800` の `h-px` div、または `<hr className='border-zinc-200 dark:border-zinc-800' />`
- グラデーション区切り線は使わない
