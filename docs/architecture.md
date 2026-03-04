# アーキテクチャ

Headless VPL の内部設計と思想を解説するドキュメント。

---

## 4 つの型（フレームワーク）

8 年間、数十を超える VPL に触れてきた結果発見した、**全ての VPL に共通する要素**。
Web 開発の MVC、ゲーム開発のシングルトンパターンのような王道的フレームワーク。

### (1) 描画の型

- **レスポンシブ**: 引数や数字の増減に応じてブロックが自動的に伸縮する仕組み
- **レイアウト**: CSS の Flexbox のような要素配置（上下中央揃え、左揃え等）。VPL の形状を決定する

対応 API: `Container`（`widthMode: 'hug'`）, `AutoLayout`, `SvgRenderer`

### (2) 接続の型

- **コネクター**: 接続線を繋ぐ元と先にあるポイント（ブロックベースでも仮想的に存在）
- **接続線**: コネクター間を結ぶ線（ブロック型では非表示だがデバッグ時に有用）
- **親子関係**: コネクターと接続線が形成する構造的な関係

対応 API: `Connector`, `Edge`, `SnapConnection`

### (3) 移動の型

- **DnD（ドラッグ&ドロップ）**: ブロック/ノードのマウスによる移動
- **スナップ**: 近づけると吸い付くようにくっつく機能
- **グループ**: 親を移動すると子も連動して動く

対応 API: `DragAndDrop`, `SnapConnection`, `InteractionManager`

### (4) 入力の型

- **文字列・数字・トグル・スライダー**等
- 最も単純だが、時代とともに新しい入力形式が追加されていく型

対応 API: フレームワーク非依存 — 開発者が自由に DOM で実装

---

## Headless アーキテクチャ

「UI を持たない」「ロジックを自由に変更できる」「改変可能・疎結合」の意。

### 設計原則

1. **フレームワーク非依存**: バニラ TS で記述。React/Vue/Svelte 等、好きなフロントエンドと組み合わせ可能
2. **Simple > Easy**: ブラックボックスを作らない。開発者が全てを理解・制御できる
3. **VPL 特化**: ゲーム用ライブラリの流用ではなく、VPL 専用の API 設計
4. **薄く強力な API**: 最小限の API で最大限の表現力
5. **デザインは上から被せるだけ**: DOM 描画とイベント検知を分離

### DOM 描画とイベント検知の分離

SVG でワイヤーフレーム（座標・当たり判定用）を描画し、その上にフロントエンドの DOM を被せる。

```
┌─ Canvas ─────────────────────────┐
│  SVG layer (wireframe, invisible)│  ← ヒット検知、デバッグ
│  DOM overlay (your components)   │  ← ユーザーに表示されるUI
└──────────────────────────────────┘
```

`DomSyncHelper` や手動の CSS transform で、Headless 座標系と DOM の位置を同期する。

---

## 単方向データフロー

フロントエンドからのイベントを Headless VPL に渡す構成。内部も単方向に処理が流れる。

```
フロントエンド（React / Vue / vanilla）
  → マウス/キーボードイベント
    → Headless VPL コア（Workspace, Container, Edge）
      → EventBus 通知
        → SvgRenderer（デバッグ用ワイヤーフレーム）
        → 開発者の DOM コンポーネント（本番 UI）
```

---

## 5 つのモジュール

| モジュール | 役割 |
|---|---|
| **Renderer** (`SvgRenderer`) | デバッグ用ワイヤーフレーム描画、仮想座標の計算 |
| **Controller** (`InteractionManager`) | コアエンジン。DnD、パン、マーキー、リサイズ、Edge 作成を統合管理 |
| **I/O** (`getMouseState`, `KeyboardManager`) | フロントエンドからのイベント入力を受け取る疎結合インターフェース |
| **UI Generator** (`AutoLayout`, `Container`) | 宣言的 UI 記法。木構造データから Auto Layout を管理し「仮想座標宣言的 UI」を実現 |
| **History** (`History`, `Command`) | Undo/Redo スタック。コマンドパターンで全操作を記録 |

---

## ソースコード構成

```
src/lib/headless-vpl/
├── core/                          # コアデータ構造・クラス
│   ├── Container.ts               # メインコンテナ（MovableObject 継承、ジェネリクス対応）
│   ├── Connector.ts               # 入出力接続ポイント
│   ├── Edge.ts                    # 接続線（straight / bezier / step / smoothstep）
│   ├── Workspace.ts               # ワークスペースのルートコンテナ
│   ├── AutoLayout.ts              # レイアウト管理（Flexbox ライク）
│   ├── MovableObject.ts           # ドラッグ可能要素の抽象基底クラス
│   ├── Position.ts                # 2D 座標
│   ├── EventBus.ts                # パブリッシュ/サブスクライブイベントシステム
│   ├── SelectionManager.ts        # 選択状態管理
│   ├── History.ts                 # Undo/Redo スタック
│   ├── commands.ts                # 組み込みコマンド群
│   └── types.ts                   # 共通型定義
├── rendering/
│   └── SvgRenderer.ts             # デバッグ用 SVG レンダラー
├── util/                          # ユーティリティ関数
│   ├── interaction.ts             # InteractionManager（統合インタラクション管理）
│   ├── dnd.ts                     # ドラッグ&ドロップ
│   ├── snap.ts                    # スナップ接続（SnapConnection）
│   ├── edgeBuilder.ts             # Edge 作成ビルダー
│   ├── nesting.ts                 # ネスティング（NestingZone）
│   ├── mouse.ts                   # マウス状態トラッキング
│   ├── keyboard.ts                # キーボードショートカット
│   ├── shortcuts.ts               # デフォルトショートカット
│   ├── viewport.ts                # 座標変換（screen ↔ world）
│   ├── edgePath.ts                # Edge パスアルゴリズム
│   ├── marquee.ts                 # マーキー選択
│   ├── clipboard.ts               # コピー/ペースト
│   ├── resize.ts                  # リサイズ処理
│   ├── autoPan.ts                 # オートパン
│   ├── snapToGrid.ts              # グリッドスナップ
│   ├── wheelZoom.ts               # ホイールズーム
│   ├── domSync.ts                 # DOM 同期ヘルパー
│   ├── contentSize.ts             # DOM サイズ監視
│   ├── animate.ts                 # requestAnimationFrame ループ
│   ├── collision_detecion.ts      # AABB 当たり判定
│   ├── distance.ts                # 距離・角度計算
│   ├── domController.ts           # DOM 位置操作
│   └── moveContainersGroup.ts     # コンテナグループ一括移動
└── index.ts                       # 公開 API エクスポート
```

---

## 設計判断チェックリスト

コードを書く前に以下を確認する:

- [ ] **Headless か？** — UI やフレームワーク固有のコードがライブラリ本体に混入していないか
- [ ] **疎結合か？** — 変更が他のモジュールに波及しないか
- [ ] **Simple か？** — Easy に逃げてブラックボックスを作っていないか
- [ ] **4 つの型に沿っているか？** — 描画・接続・移動・入力のどれに該当する変更か明確か
- [ ] **単方向データフローを維持しているか？** — イベント → I/O → Controller → Renderer の流れを壊していないか
- [ ] **VPL 特化か？** — 汎用ゲームライブラリ的な機能になっていないか
- [ ] **薄い API か？** — 最小限のインターフェースで最大限の表現力を提供しているか
- [ ] **型安全か？** — TypeScript の型システムを活用して安全性を担保しているか
- [ ] **フレームワーク非依存か？** — バニラ TS で完結し、React/Vue 等への依存を持ち込んでいないか
