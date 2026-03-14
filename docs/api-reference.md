# API リファレンス

Headless VPL の全 API を網羅するリファレンスです。

---

## コア

### `Workspace`

全 VPL 要素のルートコンテナ。ビューポート、選択、履歴、イベントを管理する。

```typescript
const workspace = new Workspace()
```

| プロパティ | 型 | 説明 |
|---|---|---|
| `eventBus` | `EventBus` | イベントシステム |
| `viewport` | `Viewport` | パン/ズーム状態 `{ x, y, scale }` |
| `selection` | `SelectionManager` | 選択状態マネージャー |
| `history` | `History` | Undo/Redo 履歴スタック |
| `elements` | `readonly IWorkspaceElement[]` | 登録済み全要素 |
| `edges` | `readonly IEdge[]` | 登録済み全エッジ |

| メソッド | 説明 |
|---|---|
| `addElement(element)` | 要素を登録（Container/Connector のコンストラクタで自動呼出） |
| `addEdge(edge)` | エッジを登録（Edge コンストラクタで自動呼出） |
| `removeElement(element)` | 要素を登録解除 |
| `removeEdge(edge)` | エッジを登録解除 |
| `removeContainer(element)` | コンテナと関連エッジの削除、親子関係のクリア、選択解除を一括実行 |
| `on(type, handler)` | イベントを購読。購読解除関数を返す |
| `pan(x, y)` | ビューポート位置を設定 |
| `panBy(dx, dy)` | ビューポートをデルタ分パン |
| `zoomAt(screenX, screenY, newScale)` | スクリーン座標を中心にズーム |
| `setScale(scale)` | ズームスケールを直接設定 |
| `fitView(canvasWidth, canvasHeight, padding?)` | 全要素をビューに収める（padding デフォルト: 50） |

---

### `Container<T>`

主要な構成要素。コネクター、AutoLayout、子要素を型付きで保持する矩形要素。

```typescript
const node = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'myNode',
  color: 'blue',
  width: 200,
  height: 80,
  widthMode: 'hug',
  heightMode: 'fixed',
  padding: { top: 10, right: 10, bottom: 10, left: 10 },
  minWidth: 50,
  maxWidth: 500,
  resizable: true,
  children: {
    input: new Connector({ position: new Position(0, -40), name: 'in', type: 'input' }),
    output: new Connector({ position: new Position(200, -40), name: 'out', type: 'output' }),
  },
})

// 型付きアクセス
node.children.input  // Connector 型
```

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `color` | `string` | `'red'` | ワイヤーフレーム色 |
| `width` | `number` | `100` | ワールド単位の幅 |
| `height` | `number` | `100` | ワールド単位の高さ |
| `widthMode` | `SizingMode` | `'fixed'` | `'fixed'` / `'hug'`（コンテンツにフィット）/ `'fill'` |
| `heightMode` | `SizingMode` | `'fixed'` | 同上 |
| `padding` | `Padding` | `{0,0,0,0}` | 内部パディング |
| `minWidth` / `maxWidth` | `number` | `0` / `Infinity` | サイズ制約 |
| `minHeight` / `maxHeight` | `number` | `0` / `Infinity` | サイズ制約 |
| `resizable` | `boolean` | `false` | リサイズハンドル有効化 |
| `children` | `T` | `{}` | 型付き子要素マップ |
| `selected` | `boolean` | `false` | 選択状態（MovableObject から継承） |
| `Parent` | `MovableObject \| null` | `null` | スナップ接続の親 |
| `Children` | `Set<MovableObject>` | `new Set()` | スナップ接続の子 |

| メソッド | 説明 |
|---|---|
| `move(x, y)` | 絶対位置に移動（子要素も更新） |
| `setColor(color)` | ワイヤーフレーム色を変更 |
| `updateChildren()` | 子要素の位置を再計算 |
| `applyContentSize(w, h)` | コンテンツベースのサイズを適用（hug モード用） |
| `toJSON()` | プレーンオブジェクトにシリアライズ |

---

### `MovableObject`（抽象クラス）

ドラッグ可能な全要素の基底クラス。`Container` と `Connector` が継承。

| プロパティ | 型 | 説明 |
|---|---|---|
| `id` | `string` (readonly) | 一意な識別子（自動生成） |
| `position` | `Position` | 現在位置 |
| `name` | `string` | 表示名 |
| `type` | `string` | 要素種別 |
| `selected` | `boolean` | 選択中かどうか |
| `Parent` | `MovableObject \| null` | スナップ階層の親 |
| `Children` | `Set<MovableObject>` | スナップ階層の子 |
| `workspace` | `Workspace` | 所属ワークスペース |

| メソッド | 説明 |
|---|---|
| `move(x, y)` | 位置を移動し `'move'` イベントを発行 |
| `update()` | `'update'` イベントを発行 |
| `toJSON()` | `{ id, type, name, position, selected }` にシリアライズ |

---

### `Connector`

コンテナ上の入力/出力接続ポイント。

```typescript
const connector = new Connector({
  workspace,           // Container の子として追加する場合は省略可
  position: new Position(0, -30),  // 親コンテナからの相対位置
  name: 'input1',
  type: 'input',       // 'input' | 'output'
})
```

コネクター位置は親コンテナからの相対座標。親が移動するとコネクターも追従する。

---

### `Edge`

2 つのコネクター間の接続線。

```typescript
const edge = new Edge({
  start: nodeA.children.output,
  end: nodeB.children.input,
  edgeType: 'bezier',              // 'straight' | 'bezier' | 'step' | 'smoothstep'
  label: 'data flow',
  markerStart: { type: 'none' },
  markerEnd: { type: 'arrowClosed', color: '#333', size: 10 },
})
```

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `edgeType` | `EdgeType` | `'straight'` | パスアルゴリズム |
| `label` | `string?` | — | パス中間点のテキストラベル |
| `markerStart` | `EdgeMarker?` | — | 始点の矢印マーカー |
| `markerEnd` | `EdgeMarker?` | — | 終点の矢印マーカー |
| `startConnector` | `Connector` | — | 起点コネクター |
| `endConnector` | `Connector` | — | 終点コネクター |

| メソッド | 説明 |
|---|---|
| `computePath()` | `{ path: string, labelPosition: IPosition }` を返す |
| `getLabelPosition()` | `computePath().labelPosition` のショートハンド |

---

### `AutoLayout`

子コンテナの自動レイアウトマネージャー（CSS Flexbox に相当）。

```typescript
const layout = new AutoLayout({
  position: new Position(10, 10),
  direction: 'horizontal',  // 'horizontal' | 'vertical'
  gap: 10,
  alignment: 'center',      // 'start' | 'center' | 'end'
  containers: [childA, childB, childC],
})

// Container の子として使用
const parent = new Container({
  workspace,
  position: new Position(0, 0),
  name: 'layoutParent',
  widthMode: 'hug',
  heightMode: 'fixed',
  height: 100,
  padding: { top: 10, right: 10, bottom: 10, left: 10 },
  children: { layout },
})
```

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | レイアウト方向 |
| `gap` | `number` | `10` | 子要素間のスペース |
| `alignment` | `'start' \| 'center' \| 'end'` | `'center'` | 交差軸の配置 |
| `Children` | `Container[]` | `[]` | レイアウト内の子要素 |

| メソッド | 説明 |
|---|---|
| `insertElement(child, index?)` | 子要素を挿入 |
| `removeElement(child)` | 子要素を除去 |
| `update()` | レイアウトを再計算 |

---

### `Position`

2D 座標。

```typescript
const pos = new Position(100, 200)
pos.setPosition(150, 250)
pos.getPosition() // { x: 150, y: 250 }
```

---

## イベントシステム

### `EventBus`

ワークスペースの状態変更をパブリッシュ/サブスクライブするイベントシステム。

```typescript
// 購読（購読解除関数を返す）
const unsub = workspace.eventBus.on('move', (event) => {
  console.log(event.target, event.data)
})

// 購読解除
unsub()
```

| イベント型 | 発行タイミング |
|---|---|
| `move` | 要素の位置変更 |
| `connect` | 2 つの要素がスナップ接続 |
| `disconnect` | スナップ接続が解除 |
| `add` | 要素がワークスペースに追加 |
| `remove` | 要素がワークスペースから削除 |
| `update` | 要素のプロパティ変更 |
| `pan` | ビューポートがパン |
| `zoom` | ビューポートがズーム |
| `select` | 要素が選択 |
| `deselect` | 要素の選択解除 |
| `nest` | 要素が AutoLayout にネスト |
| `unnest` | 要素が AutoLayout からアンネスト |
| `proximity` | 要素がスナップ距離内に接近 |
| `proximity-end` | 要素がスナップ距離外に離脱 |

---

### `SelectionManager`

選択状態をイベント通知付きで管理。

```typescript
const sel = workspace.selection

sel.select(container)                    // 1 つ選択
sel.toggleSelect(container)              // 選択をトグル
sel.selectAll(workspace.elements as MovableObject[])  // 全選択
sel.deselectAll()                        // 選択解除
sel.getSelection()                       // readonly MovableObject[]
sel.isSelected(container)                // boolean
sel.size                                 // number
```

各 `select` / `deselect` は `element.selected` を設定し、対応するイベントを発行する。

---

## 履歴（Undo/Redo）

### `History` & `Command`

コマンドパターンによる Undo/Redo システム。

```typescript
interface Command {
  execute(): void
  undo(): void
}

const history = workspace.history

history.execute(command)   // 実行 + Undo スタックに追加
history.undo()             // Undo スタックから Pop → Redo に Push
history.redo()             // Redo スタックから Pop → Undo に Push
history.canUndo            // boolean
history.canRedo            // boolean
history.clear()            // 両スタックをクリア
```

### 組み込みコマンド

```typescript
import {
  MoveCommand, AddCommand, RemoveCommand,
  ConnectCommand, DetachCommand, NestCommand,
  ReparentChildCommand, BatchCommand
} from 'headless-vpl/primitives'
```

| コマンド | 説明 |
|---|---|
| `MoveCommand(element, fromX, fromY, toX, toY)` | 要素の移動を記録 |
| `AddCommand(workspace, element)` | 要素の追加を記録 |
| `RemoveCommand(workspace, element)` | 要素の削除を記録（関連エッジも処理） |
| `ConnectCommand(workspace, parent, child)` | Parent/Children 接続を記録 |
| `DetachCommand(workspace, element)` | 要素を親から切り離す（Parent/Children 解除） |
| `NestCommand(child, layout, workspace, index)` | AutoLayout へのネストを記録 |
| `ReparentChildCommand(child, sourceContainer, sourceKey, targetContainer?, targetKey?)` | 子要素を別のコンテナに移動（ソースから除去 → ターゲットに追加） |
| `BatchCommand(commands)` | 複数コマンドを 1 つにまとめる（Undo は逆順） |

---

## レンダリング

### `SvgRenderer`

デバッグ用ワイヤーフレームレンダラー。EventBus を購読し、SVG で全要素を描画する。

```typescript
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)
```

SVG 要素の生成ルール：
- **Container** → `<rect>` （ストロークとフィル）
- **Connector** → `<circle>`
- **Edge** → `<g>` 内に `<path>` + オプションの `<text>` ラベル + マーカー
- **AutoLayout** → `<rect>` アウトライン

ビューポート変換（パン/ズーム）と選択の視覚フィードバック（破線ストローク）を処理する。

---

## ユーティリティ

### `InteractionManager`

VPL のインタラクション状態を統合管理するステートマシン。DnD、パン、マーキー選択、リサイズ、Edge 作成を 3 メソッド（`handlePointerDown` / `handlePointerUp` / `tick`）で制御する。

```typescript
import { InteractionManager } from 'headless-vpl/recipes'
import { getMouseState } from 'headless-vpl/utils/mouse'
import { animate } from 'headless-vpl/utils/animate'

const interaction = new InteractionManager({
  workspace,
  canvasElement: canvasEl,
  containers: () => containers,
  connectors: () => allConnectors,
  snapConnections: [snapConn],
  nestingZones: zones,
  edgeBuilder,
  snapToGrid: () => useGrid,
  gridSize: 24,
  onModeChange: (mode, prev) => { /* カーソル変更等 */ },
  onDragEnd: (containers, commands) => { /* UI 同期 */ },
  onNest: (container, zone) => { /* ネスト後処理 */ },
  onUnnest: (container, zone) => { /* アンネスト後処理 */ },
  onMarqueeUpdate: (rect) => { /* マーキー矩形 SVG 更新 */ },
  onResizeEnd: (container, command) => { /* リサイズ完了 */ },
  onEdgeSelect: (edgeId) => { /* Edge ハイライト */ },
  onHover: (container) => { /* ホバー中のコンテナ（null でホバー解除） */ },
})

// マウスイベントの接続
const mouse = getMouseState(canvasEl, {
  mousedown: (_bs, mp, ev) =>
    interaction.handlePointerDown(mp, { button: ev.button, shiftKey: ev.shiftKey, target: ev.target }),
  mouseup: (_bs, mp) => interaction.handlePointerUp(mp),
})

// アニメーションループ
animate(() => {
  interaction.tick(mouse.mousePosition, mouse.buttonState)
})

// クリーンアップ
interaction.destroy()
```

| 型 `InteractionMode` | 説明 |
|---|---|
| `'idle'` | 待機状態 |
| `'panning'` | 中ボタンでキャンバスをパン中 |
| `'dragging'` | コンテナをドラッグ中 |
| `'marquee'` | 範囲選択中 |
| `'resizing'` | コンテナをリサイズ中 |
| `'edgeBuilding'` | コネクターから Edge を作成中 |

| プロパティ/メソッド | 説明 |
|---|---|
| `mode` | 現在の `InteractionMode` |
| `dragContainers` | ドラッグ中のコンテナ群 |
| `marqueeRect` | マーキー矩形（`'marquee'` モード以外は `null`） |
| `getSelectedEdgeId()` | 選択中の Edge ID |
| `handlePointerDown(screenPos, event)` | mousedown 時に呼ぶ |
| `handlePointerUp(screenPos)` | mouseup 時に呼ぶ |
| `tick(screenPos, buttonState)` | 毎フレーム呼ぶ |
| `destroy()` | 状態リセット |

---

### `DragAndDrop`

コンテナのドラッグ&ドロップ。

```typescript
import { DragAndDrop } from 'headless-vpl/util/dnd'

// アニメーションループ内で毎フレーム呼ぶ
dragContainers = DragAndDrop(
  containers,            // 全ドラッグ可能コンテナ
  worldDelta,            // { x, y } ワールド座標での移動量
  mouseState,            // { buttonState, mousePosition } ワールド座標
  dragEligible,          // mousedown がコンテナ上だったか
  currentDragContainers, // 現在ドラッグ中のコンテナ群
  allowMultiple,         // 複数ドラッグ許可（デフォルト: false）
  callback,              // フレームごとのコールバック（省略可）
)
```

---

### `SnapConnection`

スナップ接続を管理する高レベル API。

```typescript
import { SnapConnection, childOnly, parentOnly, either } from 'headless-vpl/helpers'

const connection = new SnapConnection({
  source: childNode,
  sourcePosition: childNode.children.connectorTop.position,
  target: parentNode,
  targetPosition: parentNode.children.connectorBottom.position,
  workspace,
  snapDistance: 50,       // デフォルト: 50
  strategy: childOnly,   // childOnly | parentOnly | either
  validator: () => true,  // ConnectionValidator（省略可）
})

// 毎フレーム呼ぶ
connection.tick(mouseState, dragContainers)

// mousedown 時に再スナップを許可
connection.unlock()
```

**スナップ戦略:**

| 戦略 | スナップ条件 |
|---|---|
| `childOnly` | 子（source）が親に向かってドラッグされた時 |
| `parentOnly` | 親（target）が子に向かってドラッグされた時 |
| `either` | どちらかがドラッグされた時 |

---

### `createSnapConnections`

複数アイテムから `SnapConnection` を一括生成するヘルパー。ペアごとの接続条件・距離・戦略をコールバックで柔軟に指定できる。

```typescript
import { createSnapConnections } from 'headless-vpl/helpers'

const connections = createSnapConnections({
  workspace,
  items: blocks,
  sourceContainer: (b) => b.container,
  sourcePosition: (b) => b.topConn?.position ?? null,
  targetContainer: (b) => b.container,
  targetPosition: (b) => b.bottomConn?.position ?? null,
  canConnect: ({ source, target }) => source !== target,
  snapDistance: () => 50,
  strategy: () => childOnly,
})

// 毎フレーム tick する
connections.forEach((c) => c.tick(mouseState, dragContainers))
```

`CreateSnapConnectionsConfig<T>` の各フィールド:

| フィールド | 型 | 説明 |
|---|---|---|
| `workspace` | `Workspace` | 必須 |
| `items` | `readonly T[]` | ペア生成元の配列 |
| `sourceContainer` | `(item: T) => Container \| null` | source 側のコンテナを返す |
| `sourcePosition` | `(item: T) => Position \| null` | source 側の接続位置 |
| `targetContainer` | `(item: T) => Container \| null` | target 側のコンテナを返す |
| `targetPosition` | `(item: T) => Position \| null` | target 側の接続位置 |
| `canConnect?` | `({ source, target }) => boolean` | 接続可否フィルタ |
| `snapDistance?` | `({ source, target }) => number \| undefined` | ペアごとのスナップ距離 |
| `strategy?` | `({ source, target }) => SnapStrategy \| undefined` | ペアごとの戦略 |
| `validator?` | `({ source, target }) => ConnectionValidator \| undefined` | ペアごとのバリデータ |
| `priority?` | `({ source, target }) => number \| undefined` | ペアごとの優先度 |

---

### `EdgeBuilder`

コネクターからドラッグして Edge を作成するビルダー。DOM 操作を行わない Headless 設計。

```typescript
import { isConnectorHit, findNearestConnector, findEdgeAtPoint } from 'headless-vpl/primitives'
import { EdgeBuilder } from 'headless-vpl/helpers'

const edgeBuilder = new EdgeBuilder({
  workspace,
  edgeType: 'bezier',
  hitRadius: 16,
  onPreview: (path, from, to) => { /* SVG プレビューパスを更新 */ },
  onComplete: (edge) => { /* Edge 作成完了 */ },
  onCancel: () => { /* キャンセル処理 */ },
})

// コネクターからドラッグ開始
edgeBuilder.start(connector)

// マウス移動ごとにプレビュー更新
edgeBuilder.update(mousePos)

// ターゲットコネクターにドロップして完了
edgeBuilder.complete(targetConnector)

// または キャンセル
edgeBuilder.cancel()
```

**ヘルパー関数:**

```typescript
// コネクターのヒット判定
isConnectorHit(mousePos, connector, hitRadius?)  // boolean

// 最も近いコネクターを検索
findNearestConnector(mousePos, connectors, hitRadius?)  // { connector, distance } | null

// ワールド座標で Edge のヒットテスト
findEdgeAtPoint(worldPos, edges, hitDistance?)  // Edge | null
```

---

### `NestingZone`

AutoLayout へのネスト領域の状態管理クラス。

```typescript
import {
  NestingZone,
  nestContainer,
  unnestContainer,
  isInsideContainer,
} from 'headless-vpl/helpers'

const zone = new NestingZone({
  target: parentContainer,
  layout: parentContainer.children.autoLayout,
  workspace,
  validator: (dragged) => dragged !== parentContainer,  // 省略可
  padding: 5,
})

// 毎フレーム呼ぶ — ホバー検出
zone.detectHover(dragContainers)

// ホバー中のコンテナを取得
zone.hovered     // Container | null
zone.insertIndex // number

// ネスト/アンネスト実行
zone.nest(container, index?)
zone.unnest(container)

// ネスト済みか判定
zone.isNested(container)  // boolean
```

**スタンドアロン関数:**

```typescript
// コンテナがターゲット内にあるか判定
isInsideContainer(dragged, target, padding?)  // boolean

// AutoLayout に子を追加（イベント発火付き）
nestContainer(child, layout, workspace, index?)

// AutoLayout から子を除去（イベント発火付き）
unnestContainer(child, layout, workspace)  // boolean
```

---

### `createSlotZone`

`NestingZone` の簡易ファクトリ。スロット（C-block body のような挿入領域）を 1 行で作成する。

```typescript
import { createSlotZone } from 'headless-vpl/helpers'

const zone = createSlotZone({
  target: parentContainer,
  layout: parentContainer.children.bodyLayout,
  workspace,
  validator: (dragged) => dragged.name !== 'fixed',
  padding: 5,
})
```

`SlotZoneConfig` は `NestingZoneConfig` と同じフィールドを持つ。

---

### `DomSyncHelper`

Container の位置を DOM 要素に同期するヘルパー。ビューポート変換とグリッド背景も更新する。

```typescript
import { DomSyncHelper } from 'headless-vpl/helpers'

const domSync = new DomSyncHelper({
  workspace,
  overlayElement: domOverlay,    // DOM オーバーレイ要素
  canvasElement: canvasDiv,      // キャンバス要素（グリッド背景用、省略可）
  gridSize: 24,                  // グリッドサイズ（デフォルト: 24）
  resolveElement: (container) => document.getElementById(`node-${container.id}`),
})

// 毎フレーム呼ぶ
domSync.syncAll(containers)

// 個別同期
domSync.syncViewport()
domSync.syncOne(container)
```

---

### `bindWheelZoom`

ホイールによるズームをバインドする。

```typescript
import { bindWheelZoom } from 'headless-vpl/helpers'

const cleanup = bindWheelZoom(canvasElement, {
  workspace,
  minScale: 0.1,    // デフォルト: 0.1
  maxScale: 5,      // デフォルト: 5
  factor: 0.1,      // デフォルト: 0.1
  onChange: () => { /* UI 同期 */ },
})

// クリーンアップ
cleanup()
```

---

### `bindDefaultShortcuts`

標準キーボードショートカットをバインドする。

```typescript
import { bindDefaultShortcuts } from 'headless-vpl/recipes'

const kb = bindDefaultShortcuts({
  workspace,
  element: document.body,
  containers: () => allContainers,
  onChange: () => { /* UI 同期 */ },
  onDelete: (selected) => { /* 削除処理 */ },
  paste: {
    factory: (json, position) => {
      return new Container({ workspace, position: new Position(position.x, position.y), ... })
    },
    offset: { x: 40, y: 40 },
    onPaste: (pasted) => { /* 追加処理 */ },
  },
})

// 追加バインドが可能
kb.bind({ key: 'g', handler: () => { /* グリッドトグル */ } })

// クリーンアップ
kb.destroy()
```

**デフォルトショートカット:**

| キー | 動作 |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | コピー |
| `Ctrl+V` | ペースト |
| `Ctrl+A` | 全選択 |
| `Delete` / `Backspace` | 削除 |

---

### `observeContentSize`

DOM 要素のリサイズを監視し、Container のサイズを自動同期する。

```typescript
import { observeContentSize } from 'headless-vpl/helpers'

const cleanup = observeContentSize(domElement, container)

// 監視停止
cleanup()
```

`ResizeObserver` で DOM 要素の `offsetWidth` / `offsetHeight` を監視し、`min/max` 制約を適用して `container.update()` を呼ぶ。

---

### マウス

```typescript
import { getMousePosition, getMouseState, getPositionDelta } from 'headless-vpl/utils/mouse'

// 要素に対するマウス位置をトラッキング
const position = getMousePosition(element)  // mutable IPosition

// 位置 + ボタン状態をコールバック付きでトラッキング
const mouse = getMouseState(element, {
  mousedown: (state, position, event) => { /* ... */ },
  mouseup: (state, position, event) => { /* ... */ },
})
mouse.buttonState    // { leftButton: 'down' | 'up', middleButton: 'down' | 'up' }
mouse.mousePosition  // IPosition

// フレーム間デルタを計算
const delta = getPositionDelta(currentPos, previousPos)  // { x, y }
```

---

### ビューポート

```typescript
import { screenToWorld, worldToScreen } from 'headless-vpl/primitives'

const worldPos = screenToWorld(screenPos, workspace.viewport)
const screenPos = worldToScreen(worldPos, workspace.viewport)
```

---

### Edge パス

4 つのパスアルゴリズム：

```typescript
import {
  getStraightPath,      // 直線
  getBezierPath,        // 3 次ベジェ曲線
  getStepPath,          // 直角ステップ
  getSmoothStepPath,    // 角丸ステップ（borderRadius パラメータ）
} from 'headless-vpl'

const { path, labelPosition } = getBezierPath(startPos, endPos)
// path: SVG パス文字列
// labelPosition: ラベル配置用の中間点
```

---

### マーキー選択

```typescript
import {
  createMarqueeRect,
  getElementsInMarquee,
  getElementsInScreenMarquee,
} from 'headless-vpl/primitives'

// 2 つのドラッグ点から正規化された矩形を作成
const rect = createMarqueeRect(startPos, endPos)

// マーキー内の要素を検索（ワールド座標）
const hits = getElementsInMarquee(elements, rect, 'partial')  // 'full' | 'partial'

// スクリーン座標版（viewport 経由で自動変換）
const hits = getElementsInScreenMarquee(elements, screenStart, screenEnd, viewport, 'partial')
```

要素は `{ id, position, width, height }` を実装する必要がある。

---

### グリッドスナップ

```typescript
import { snapToGrid, snapDeltaToGrid } from 'headless-vpl/primitives'

const snapped = snapToGrid({ x: 37, y: 52 }, 24)         // { x: 36, y: 48 }
const snappedDelta = snapDeltaToGrid({ x: 5, y: 3 }, 24) // デルタをグリッドに丸める
```

---

### クリップボード

```typescript
import { copyElements, pasteElements, calculatePastePositions } from 'headless-vpl/helpers'

// 選択要素をクリップボードデータにコピー
const data = copyElements(selectedElements)

// ファクトリ関数でペースト
const newElements = pasteElements(data, (json, position) => {
  return new Container({
    workspace,
    position: new Position(position.x, position.y),
    name: json.name as string,
    width: json.width as number,
    height: json.height as number,
  })
}, { x: 40, y: 40 })  // 元位置からのオフセット

// ペースト位置のみ計算（ファクトリを使わない場合）
const positions = calculatePastePositions(data, { x: 40, y: 40 })
// => IPosition[] — 各要素のペースト先座標
```

---

### キーボード

```typescript
import { KeyboardManager } from 'headless-vpl/helpers'

const keyboard = new KeyboardManager(document.body)

keyboard.bind({
  key: 'z',
  modifiers: ['ctrl'],          // 'ctrl' は Ctrl と Cmd の両方にマッチ
  handler: () => workspace.history.undo(),
})

keyboard.bind({
  key: 'z',
  modifiers: ['ctrl', 'shift'],
  handler: () => workspace.history.redo(),
})

// 解除
keyboard.unbind('z', ['ctrl'])
keyboard.destroy()
```

---

### オートパン

```typescript
import { computeAutoPan } from 'headless-vpl/helpers'

const result = computeAutoPan(
  mousePos,       // スクリーン座標
  canvasBounds,   // { x, y, width, height }
  isDragging,     // ドラッグ中のみアクティブ
  40,             // threshold（端からの px、デフォルト: 40）
  10,             // speed（px/フレーム、デフォルト: 10）
)

if (result.active) {
  workspace.panBy(result.dx, result.dy)
}
```

---

### リサイズ

```typescript
import { detectResizeHandle, beginResize, applyResize } from 'headless-vpl/helpers'

// mousedown 時: リサイズハンドル上かチェック
const handle = detectResizeHandle(worldMousePos, container, 8)  // handleSize

if (handle) {
  const state = beginResize(handle, worldMousePos, container)

  // リサイズ中の各フレーム:
  const bounds = applyResize(worldMousePos, state, {
    minWidth: 50, maxWidth: 500,
    minHeight: 50, maxHeight: 300,
  })

  container.move(bounds.x, bounds.y)
  container.width = bounds.width
  container.height = bounds.height
  container.update()
}
```

ハンドル方向: `'n'` | `'s'` | `'e'` | `'w'` | `'ne'` | `'nw'` | `'se'` | `'sw'`

---

### アニメーション

```typescript
import { animate } from 'headless-vpl/utils/animate'

animate((deltaTime, frame) => {
  // deltaTime: 前フレームからの経過ミリ秒
  // frame: インクリメントカウンター
})
```

---

### 当たり判定

```typescript
import { isCollision } from 'headless-vpl/util/collision_detection'

const hit = isCollision(container, worldMousePos)  // AABB 点-矩形テスト
```

---

### 距離 & 角度

```typescript
import { getDistance, getAngle } from 'headless-vpl/primitives'

getDistance(pointA, pointB)  // ユークリッド距離
getAngle(pointA, pointB)    // ラジアン角度（atan2）
```

---

### DOM Controller

```typescript
import { DomController } from 'headless-vpl/util/domController'

const ctrl = new DomController('#my-node')  // CSS セレクタ
ctrl.move(100, 200)         // CSS transform で絶対位置を設定
ctrl.moveBy(10, 5)          // 相対移動
ctrl.getPosition()          // { x, y }
```

---

## Block Helpers

ブロック型 VPL（Scratch スタイル）を構築するための高レベルヘルパー群。

### `BlockStackController`

ブロックスタックの親子関係とレイアウト整合性を管理するコントローラー。

```typescript
import { BlockStackController } from 'headless-vpl/blocks'

const stackCtrl = new BlockStackController()

// ドラッグ後に親子関係を再アタッチ
stackCtrl.reattach(container, expectedParent)

// コンテナ群の親子チェーンを正規化
stackCtrl.normalize(containers)

// AutoLayout の並びをスタック接続に同期
stackCtrl.syncLayout(layout)

// レイアウトからコンテナを切り離す
stackCtrl.detachFromLayout(layout, container)

// root 以降の接続チェーンをレイアウトから引き抜く
stackCtrl.pullFollowerChainOutOfLayout(root, layout)
```

---

### `collectConnectedChain`

ルートコンテナから `Children` を辿り、接続されたチェーン（ブロックスタック）を配列で返す。

```typescript
import { collectConnectedChain } from 'headless-vpl/blocks'

const chain = collectConnectedChain(rootBlock)
// => [rootBlock, child1, child2, ...]
```

---

### `connectStackPairs`

ブロック群の上下コネクターを自動ペアリングし、`SnapConnection` を一括生成する。

```typescript
import { connectStackPairs } from 'headless-vpl/blocks'

connectStackPairs({
  workspace,
  items: blocks,         // StackConnectable[] — { container, topConn, bottomConn }
  connections,           // SnapConnection[] — 結果がここに push される
  snapDistance: 50,
  strategy: childOnly,
})
```

---

### `observeContainerContentSizes`

複数コンテナの DOM 要素サイズを一括監視し、Container のサイズに同期する。`observeContentSize` の複数要素版。

```typescript
import { observeContainerContentSizes } from 'headless-vpl/blocks'

const cleanup = observeContainerContentSizes({
  items: blocks,
  container: (b) => b.container,
  resolveElement: (b) => document.getElementById(`block-${b.container.id}`),
})

// 監視停止
cleanup()
```

---

## 型一覧

| 型 | 説明 |
|---|---|
| `IWorkspaceElement` | ワークスペース要素のインターフェース |
| `IEdge` | エッジのインターフェース |
| `IPosition` | `{ x: number, y: number }` |
| `Viewport` | `{ x: number, y: number, scale: number }` |
| `VplEvent` | イベントオブジェクト `{ type, target, data? }` |
| `VplEventType` | `'move' \| 'connect' \| 'disconnect' \| 'add' \| 'remove' \| 'update' \| 'pan' \| 'zoom' \| 'select' \| 'deselect' \| 'nest' \| 'unnest' \| 'proximity' \| 'proximity-end'` |
| `SizingMode` | `'fixed' \| 'hug' \| 'fill'` |
| `Padding` | `{ top, right, bottom, left }` |
| `EdgeType` | `'straight' \| 'bezier' \| 'step' \| 'smoothstep'` |
| `MarkerType` | `'arrow' \| 'arrowClosed' \| 'none'` |
| `EdgeMarker` | `{ type: MarkerType, color?: string, size?: number }` |
| `ResizeHandleDirection` | `'n' \| 's' \| 'e' \| 'w' \| 'ne' \| 'nw' \| 'se' \| 'sw'` |
| `Command` | `{ execute(): void, undo(): void }` |
| `EdgePathResult` | `{ path: string, labelPosition: IPosition }` |
| `MarqueeRect` | `{ x, y, width, height }` |
| `MarqueeMode` | `'full' \| 'partial'` |
| `MarqueeElement` | `{ id, position, width, height }` |
| `ClipboardData` | `{ elements: Record<string, unknown>[] }` |
| `KeyBinding` | `{ key, modifiers?, handler }` |
| `CanvasBounds` | `{ x, y, width, height }` |
| `AutoPanResult` | `{ dx, dy, active }` |
| `ResizableElement` | `{ position, width, height, minWidth?, maxWidth?, minHeight?, maxHeight? }` |
| `ResizeState` | `{ handle, startMousePos, startBounds }` |
| `ConnectionValidator` | `() => boolean` |
| `SnapStrategy` | `(source, target, dragContainers) => boolean` |
| `SnapConnectionConfig` | `SnapConnection` コンストラクタの設定オブジェクト |
| `EdgeBuilderConfig` | `EdgeBuilder` コンストラクタの設定オブジェクト |
| `ConnectorAnchor` | コネクターのアンカー位置情報 |
| `ConnectorAnchorOrigin` | アンカー原点の型 |
| `ConnectorAnchorTarget` | アンカーターゲットの型 |
| `ConnectorHitDetector` | コネクターヒット判定のカスタム関数型 |
| `SlotZoneConfig` | `createSlotZone` の設定オブジェクト |
| `NestingValidator` | `(dragged: Container) => boolean` |
| `NestingZoneConfig` | `NestingZone` コンストラクタの設定オブジェクト |
| `CreateSnapConnectionsConfig` | `createSnapConnections` の設定オブジェクト |
| `SnapConnectionConfig` | `SnapConnection` コンストラクタの設定オブジェクト |
| `WheelZoomConfig` | `bindWheelZoom` の設定オブジェクト |
| `DefaultShortcutsConfig` | `bindDefaultShortcuts` の設定オブジェクト |
| `DomSyncConfig` | `DomSyncHelper` コンストラクタの設定オブジェクト |
| `InteractionMode` | `'idle' \| 'panning' \| 'dragging' \| 'marquee' \| 'resizing' \| 'edgeBuilding'` |
| `InteractionConfig` | `InteractionManager` コンストラクタの設定オブジェクト |
| `ConnectStackPairsConfig` | `connectStackPairs` の設定オブジェクト |
| `StackConnectable` | `{ container, topConn, bottomConn }` — ブロックスタック接続の入力型 |
| `ObserveContainerContentSizesConfig` | `observeContainerContentSizes` の設定オブジェクト |
