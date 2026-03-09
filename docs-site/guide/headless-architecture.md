# Headless アーキテクチャ

## Headless とは

「UI を持たない」「ロジックを自由に変更できる」「改変可能・疎結合」の意味です。

Headless VPL は **DOM 描画とイベント検知を分離** しています。SVG でワイヤーフレーム（座標・当たり判定用）を描画し、その上に React 等の DOM を被せます。

```
┌─ Canvas ─────────────────────────┐
│  SVG layer (wireframe, invisible)│  ← ヒット検知、デバッグ
│  DOM overlay (your components)   │  ← ユーザーに見える UI
└──────────────────────────────────┘
```

## なぜ Headless なのか

### ReactFlow との比較

ReactFlow は実際の UI とイベント検知が **同じコンポーネント** で行われます。デザインを変えるにはコンポーネントの内部を理解する必要があります。

Headless VPL では SVG レイヤーが当たり判定を担当し、開発者は好きなフレームワークで好きな見た目を **上から被せるだけ** です。

### Blockly との比較

Blockly は独自の描画システムを持ち、独自形式に完全に乗る必要があります。

Headless VPL はレンダリングに一切制約を設けません。

## DomSyncHelper

`DomSyncHelper` は helper 層にあり、Headless VPL の座標系と DOM 要素の位置を自動同期できます。

```typescript
const domSync = new DomSyncHelper({
  workspace,
  overlayElement: document.querySelector('#dom-overlay') as HTMLElement,
  resolveElement: (c) => document.getElementById(`node-${c.id}`),
})

// アニメーションループ内で呼ぶ
animate(() => {
  domSync.syncAll(containers)
})
```

## 5 つのモジュール

| モジュール | 役割 |
|-----------|------|
| **Renderer** | デバッグ用ワイヤーフレーム描画、仮想座標の計算 |
| **Controller** | コアエンジン。DnD、イベント管理、I/O 管理等の全体制御 |
| **I/O** | フロントエンドからのイベント入力を受け取る疎結合なインターフェース |
| **UI Generator** | 宣言的 UI 記法システム |
| **Type Generator** | 木構造データから TypeScript 型情報を自動生成 |
