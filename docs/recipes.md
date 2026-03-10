# レシピ集

Headless VPL を使った各種 VPL のコード例。

---

## ブロック型 VPL（Scratch スタイル）

縦積みブロックをスナップ接続で繋げる。

```typescript
import { Workspace, Container, Connector, Position, SvgRenderer } from 'headless-vpl/primitives'
import { SnapConnection, childOnly } from 'headless-vpl/helpers'

const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// ブロック定義
const blockA = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'Move 10 steps',
  width: 200,
  height: 60,
  children: {
    top: new Connector({ position: new Position(50, 0), name: 'top', type: 'input' }),
    bottom: new Connector({ position: new Position(50, -60), name: 'bottom', type: 'output' }),
  },
})

const blockB = new Container({
  workspace,
  position: new Position(100, 200),
  name: 'Turn 15 degrees',
  width: 200,
  height: 60,
  children: {
    top: new Connector({ position: new Position(50, 0), name: 'top', type: 'input' }),
    bottom: new Connector({ position: new Position(50, -60), name: 'bottom', type: 'output' }),
  },
})

// blockB の top を blockA の bottom にスナップ
const connection = new SnapConnection({
  source: blockB,
  sourcePosition: blockB.children.top.position,
  target: blockA,
  targetPosition: blockA.children.bottom.position,
  workspace,
  strategy: childOnly,
})
```

---

## フロー型 VPL（ReactFlow スタイル）

水平フローをベジェ曲線で接続する。

```typescript
import {
  Workspace,
  Container,
  Connector,
  Edge,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'

const workspace = new Workspace()
new SvgRenderer(document.querySelector('#workspace') as SVGSVGElement, workspace)

const start = new Container({
  workspace,
  position: new Position(50, 100),
  name: 'Start',
  width: 140,
  height: 50,
  children: {
    out: new Connector({ position: new Position(140, -25), name: 'out', type: 'output' }),
  },
})

const process = new Container({
  workspace,
  position: new Position(300, 100),
  name: 'Process',
  width: 140,
  height: 50,
  children: {
    in: new Connector({ position: new Position(0, -25), name: 'in', type: 'input' }),
    out: new Connector({ position: new Position(140, -25), name: 'out', type: 'output' }),
  },
})

const end = new Container({
  workspace,
  position: new Position(550, 100),
  name: 'End',
  width: 140,
  height: 50,
  children: {
    in: new Connector({ position: new Position(0, -25), name: 'in', type: 'input' }),
  },
})

new Edge({ start: start.children.out, end: process.children.in, edgeType: 'bezier' })
new Edge({
  start: process.children.out,
  end: end.children.in,
  edgeType: 'bezier',
  label: 'result',
  markerEnd: { type: 'arrowClosed' },
})
```

---

## ハイブリッド型 VPL（ブロック + フロー）

ブロック型の縦積みスナップとフロー型のエッジ接続を組み合わせた VPL。

```typescript
import {
  Workspace,
  Container,
  Connector,
  Edge,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'
import { SnapConnection, childOnly } from 'headless-vpl/helpers'

const workspace = new Workspace()
new SvgRenderer(document.querySelector('#workspace') as SVGSVGElement, workspace)

// ブロック型エリア（縦積み）
const blockA = new Container({
  workspace,
  position: new Position(50, 50),
  name: 'Initialize',
  width: 200,
  height: 60,
  children: {
    top: new Connector({ position: new Position(50, 0), name: 'top', type: 'input' }),
    bottom: new Connector({ position: new Position(50, -60), name: 'bottom', type: 'output' }),
    dataOut: new Connector({ position: new Position(200, -30), name: 'dataOut', type: 'output' }),
  },
})

const blockB = new Container({
  workspace,
  position: new Position(50, 170),
  name: 'Execute',
  width: 200,
  height: 60,
  children: {
    top: new Connector({ position: new Position(50, 0), name: 'top', type: 'input' }),
    bottom: new Connector({ position: new Position(50, -60), name: 'bottom', type: 'output' }),
    dataIn: new Connector({ position: new Position(200, -30), name: 'dataIn', type: 'input' }),
  },
})

// 縦積みスナップ（ブロック型）
new SnapConnection({
  source: blockB,
  sourcePosition: blockB.children.top.position,
  target: blockA,
  targetPosition: blockA.children.bottom.position,
  workspace,
  strategy: childOnly,
})

// データフロー接続（フロー型）
const dataNode = new Container({
  workspace,
  position: new Position(400, 100),
  name: 'Config',
  width: 140,
  height: 50,
  children: {
    in: new Connector({ position: new Position(0, -25), name: 'in', type: 'input' }),
  },
})

new Edge({
  start: blockA.children.dataOut,
  end: dataNode.children.in,
  edgeType: 'bezier',
  label: 'config',
  markerEnd: { type: 'arrowClosed' },
})
```

---

## ネスティング（スロット/入れ子）

AutoLayout と NestingZone で Scratch のようなスロット（値ブロックの埋め込み）を実現する。

```typescript
import {
  Workspace,
  Container,
  AutoLayout,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'
import { NestingZone, observeContentSize } from 'headless-vpl/helpers'

const workspace = new Workspace()
new SvgRenderer(document.querySelector('#workspace') as SVGSVGElement, workspace)

// スロット付き親ブロック
const parentBlock = new Container({
  workspace,
  position: new Position(50, 50),
  name: 'say',
  color: '#7c3aed',
  width: 200,
  height: 60,
  children: {
    slot: new AutoLayout({
      position: new Position(60, 10),
      direction: 'horizontal',
      gap: 0,
      alignment: 'center',
      containers: [],
      minWidth: 30,
      minHeight: 40,
    }),
  },
})

// ネスト可能な値ブロック
const valueBlock = new Container({
  workspace,
  position: new Position(300, 50),
  name: 'hello',
  color: '#f97316',
  width: 80,
  height: 30,
})

// NestingZone: ドラッグでスロットに入れ子
const zone = new NestingZone({
  target: parentBlock,
  layout: parentBlock.children.slot,
  workspace,
  validator: (dragged) => dragged !== parentBlock,
  padding: 5,
})

// DOM 要素のリサイズを監視して Container サイズを自動同期
const cleanup = observeContentSize(
  document.getElementById('parent-block')!,
  parentBlock,
)
```

---

## InteractionManager 統合セットアップ

全インタラクション（DnD、パン、マーキー選択、リサイズ、Edge 作成、ネスティング）を InteractionManager で一元管理する。

```typescript
import {
  Workspace,
  Container,
  Connector,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'
import {
  EdgeBuilder,
  NestingZone,
  SnapConnection,
  childOnly,
  DomSyncHelper,
  bindWheelZoom,
} from 'headless-vpl/helpers'
import { InteractionManager, bindDefaultShortcuts } from 'headless-vpl/recipes'
import { getMouseState } from 'headless-vpl/utils/mouse'
import { animate } from 'headless-vpl/utils/animate'

// 1. ワークスペース + レンダラー
const workspace = new Workspace()
const svgEl = document.querySelector('#workspace') as SVGSVGElement
const canvasEl = svgEl.parentElement as HTMLElement
new SvgRenderer(svgEl, workspace)

// 2. コンテナとコネクター（省略可: ここに VPL 要素を定義）
const containers: Container[] = []
const connectors: Connector[] = []

// 3. EdgeBuilder
const edgeBuilder = new EdgeBuilder({
  workspace,
  edgeType: 'bezier',
  onPreview: (path) => { /* SVG プレビュー更新 */ },
  onComplete: (edge) => { /* Edge 作成完了処理 */ },
  onCancel: () => { /* キャンセル処理 */ },
})

// 4. InteractionManager
const interaction = new InteractionManager({
  workspace,
  canvasElement: canvasEl,
  containers: () => containers,
  connectors: () => connectors,
  edgeBuilder,
  snapToGrid: () => false,
  gridSize: 24,
  onModeChange: (mode) => {
    canvasEl.style.cursor =
      mode === 'dragging' || mode === 'panning' ? 'grabbing' :
      mode === 'edgeBuilding' ? 'crosshair' : ''
  },
  onDragEnd: () => { /* UI 同期 */ },
})

// 5. マウスイベント接続
const mouse = getMouseState(canvasEl, {
  mousedown: (_bs, mp, ev) => {
    if (ev.button === 1) ev.preventDefault()
    interaction.handlePointerDown(mp, ev)
  },
  mouseup: (_bs, mp) => interaction.handlePointerUp(mp),
})

// 6. ホイールズーム
const cleanupZoom = bindWheelZoom(canvasEl, { workspace })

// 7. キーボードショートカット
const kb = bindDefaultShortcuts({
  workspace,
  element: document.body,
  containers: () => containers,
})

// 8. DOM 同期
const domOverlay = document.querySelector('#dom-overlay') as HTMLElement
const domSync = new DomSyncHelper({
  workspace,
  overlayElement: domOverlay,
  canvasElement: canvasEl,
  resolveElement: (c) => document.getElementById(`node-${c.id}`),
})

// 9. アニメーションループ
animate(() => {
  interaction.tick(mouse.mousePosition, mouse.buttonState)
  domSync.syncAll(containers)
})

// 10. クリーンアップ
// interaction.destroy()
// cleanupZoom()
// kb.destroy()
```

---

## AutoLayout によるレスポンシブレイアウト

Container 内に AutoLayout を配置し、`widthMode: 'hug'` で中身に合わせて自動伸縮する。

```typescript
import { Workspace, Container, AutoLayout, Position, SvgRenderer } from 'headless-vpl'

const workspace = new Workspace()
new SvgRenderer(document.querySelector('#workspace') as SVGSVGElement, workspace)

const parent = new Container({
  workspace,
  position: new Position(50, 50),
  name: 'AutoLayout Demo',
  color: 'orange',
  widthMode: 'hug',       // 子要素に合わせて幅を自動調整
  heightMode: 'fixed',
  height: 100,
  padding: { top: 10, right: 10, bottom: 10, left: 10 },
  minWidth: 100,
  children: {
    layout: new AutoLayout({
      position: new Position(10, 10),
      direction: 'horizontal',
      gap: 10,
      alignment: 'center',
      containers: [
        new Container({ name: 'A', color: 'purple', width: 40, height: 40 }),
        new Container({ name: 'B', color: 'purple', width: 60, height: 50 }),
        new Container({ name: 'C', color: 'purple', width: 40, height: 40 }),
      ],
    }),
  },
})
```

---

## Undo/Redo の統合

MoveCommand と BatchCommand で移動を記録し、Undo/Redo をサポートする。

```typescript
import { MoveCommand, BatchCommand, RemoveCommand } from 'headless-vpl'

// ドラッグ完了時に移動を記録
function onDragEnd(containers: Container[]) {
  const commands = containers
    .filter(c => dragStarts.has(c.id))
    .map(c => {
      const start = dragStarts.get(c.id)!
      return new MoveCommand(c, start.x, start.y, c.position.x, c.position.y)
    })

  if (commands.length > 0) {
    workspace.history.execute(new BatchCommand(commands))
  }
}

// 選択要素の削除（Undo 対応）
function deleteSelected() {
  const selected = workspace.selection.getSelection().slice()
  for (const element of selected) {
    workspace.history.execute(new RemoveCommand(workspace, element))
  }
}

// キーボードショートカット
workspace.history.undo()  // Ctrl+Z
workspace.history.redo()  // Ctrl+Shift+Z
```
