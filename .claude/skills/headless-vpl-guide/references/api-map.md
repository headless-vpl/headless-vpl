# API Map

## Source Of Truth

最初に読む順番:

1. `src/lib/headless-vpl/index.ts`
2. `docs/api-reference.md`
3. `docs/recipes.md`
4. 実装ファイル

## Export Groups (値 export: 62 個)

### Core

- `Workspace` — ワークスペースのルートオブジェクト
  - フィールド: `viewport`, `history`, `selection`, `eventBus`, `elements`, `edges`
  - メソッド: `addElement`, `removeElement`, `addEdge`, `removeEdge`, `on(type, handler)`, `pan`, `panBy`, `zoomAt`, `setScale`, `fitView`
- `Container<T>` — ドラッグ可能なノード。ジェネリクスで構造的子要素を型安全に管理
  - フィールド: `width`, `height`, `widthMode`, `heightMode`, `padding`, `contentGap`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `resizable`, `children`, `color`
  - メソッド: `move`, `applyContentSize`, `addChild`, `removeChild`, `findChildKey`, `refreshAnchoredChildren`, `updateChildren`, `toJSON`
- `Connector` — 入出力接続ポイント。Container の構造的子要素
  - フィールド: `hitRadius` (デフォルト 12), `anchor`, `type`
  - メソッド: `setAnchor`, `refreshAnchor`, `hitTest`, `isAnchored`, `toJSON`
- `Edge` — Connector 間を結ぶ接続線
  - フィールド: `source`, `target`, `edgeType`, `markers`
- `AutoLayout` — 子要素の自動配置。Container の構造的子要素
  - フィールド: `direction`, `gap`, `alignment`, `minWidth`, `minHeight`, `resizesParent`, `Children`, `position`, `parentContainer`, `width`, `height`
  - メソッド: `addElement`, `insertElement`, `removeElement`, `relayout` (位置のみ), `update` (全再計算), `move`, `toJSON`
- `Position` — 2D 座標 (x, y)
- `EventBus` — イベント発行・購読。`on(type, handler) → unsubscribe`, `emit(type, target, data?)`
- `SelectionManager` — 選択状態管理
  - メソッド: `select`, `deselect`, `toggleSelect`, `selectAll`, `deselectAll`, `getSelection`, `isSelected`, `size`
- `History` — Undo/Redo スタック (デフォルト深度 100)
  - メソッド: `execute(command)`, `undo`, `redo`, `canUndo`, `canRedo`, `clear`

### Commands

- `MoveCommand(element, fromX, fromY, toX, toY)` — 要素の移動
- `AddCommand(workspace, element)` — 要素追加
- `RemoveCommand(workspace, element)` — 要素削除（関連 Edge・Parent/Children も処理）
- `ConnectCommand(workspace, parent, child)` — Parent/Children 関係設定
- `DetachCommand(workspace, element)` — snap 関係 + AutoLayout からの除去
- `NestCommand(child, layout, workspace, index)` — AutoLayout へのネスト
- `BatchCommand(commands)` — 複数コマンドをまとめて Undo 可能に
- `ReparentChildCommand(child, sourceContainer, sourceKey, targetContainer?, targetKey?)` — 構造的子要素の親コンテナ変更

### Rendering

- `SvgRenderer` — デバッグ用 SVG ワイヤーフレーム描画。EventBus を購読して自動更新

### Interaction

- `InteractionManager` — drag / pan / marquee / resize / edge building を統合管理
  - config: `InteractionConfig { workspace, canvasElement, containers, connectors?, snapConnections?, nestingZones?, edgeBuilder?, snapToGrid?, gridSize?, onModeChange?, onDragEnd?, onNest?, onUnnest?, onMarqueeUpdate?, onResizeEnd?, onEdgeSelect?, onHover? }`
  - ゲッター: `mode`, `dragContainers`, `marqueeRect`
  - メソッド: `handlePointerDown(screenPos, event)`, `handlePointerUp(screenPos)`, `tick(screenPos, buttonState)`, `setEdgeBuilder`, `setNestingZones`, `setDisableDrag`, `setDisableEdgeBuilder`, `getSelectedEdgeId`, `destroy`
- `EdgeBuilder` — Connector drag でのエッジ作成
  - config: `EdgeBuilderConfig { workspace, hitRadius?, edgeType?, onPreview?, onComplete?, onCancel? }`
  - ゲッター: `active`, `previewPath`, `startConnector`
  - メソッド: `start`, `update`, `complete`, `cancel`
- `isConnectorHit(mousePos, connector, hitRadius?)` — Connector の当たり判定
- `findNearestConnector(mousePos, connectors, hitRadius?)` — 最近の Connector 検索
- `findEdgeAtPoint(worldPos, edges, hitDistance?)` — エッジの当たり判定

### Viewport

- `screenToWorld(screen, viewport)` — スクリーン → ワールド座標変換
- `worldToScreen(world, viewport)` — ワールド → スクリーン座標変換
- `bindWheelZoom(element, config)` — ホイールズーム。クリーンアップ関数を返す
  - config: `WheelZoomConfig { workspace, minScale?, maxScale?, factor?, onChange? }`
- `computeAutoPan(mousePos, bounds, isDragging, threshold?, speed?)` — 自動パン計算

### Shortcuts

- `bindDefaultShortcuts(config)` — Ctrl+Z/Shift+Z/C/V, Delete, Ctrl+A をバインド。KeyboardManager を返す
  - config: `DefaultShortcutsConfig { workspace, element, containers, onChange?, onDelete?, paste? }`
- `KeyboardManager` — カスタムキーバインド管理
  - メソッド: `bind(binding)`, `unbind(key, modifiers?)`, `destroy`

### Snap

- `SnapConnection` — 2 つの Container 間のスナップ接続
  - フィールド: `id`, `source`, `target`, `sourcePosition`, `targetPosition`, `workspace`, `snapDistance`, `strategy`, `validator?`, `priority`, `locked`, `destroyed`
  - メソッド: `tick(mouseState, dragContainers)`, `lock`, `unlock`, `destroy`, `forceSnap`
- `createSnapConnections<T>(config)` — アイテム配列から SnapConnection 一括生成
  - config: `CreateSnapConnectionsConfig<T> { workspace, items, sourceContainer, sourcePosition, targetContainer, targetPosition, canConnect?, snapDistance?, strategy?, validator?, priority? }`
- `childOnly` / `parentOnly` / `either` — SnapStrategy プリセット

### Nesting

- `NestingZone` — ドロップゾーン。Container + AutoLayout の組
  - フィールド: `target`, `layout`, `workspace`, `validator?`, `padding`, `priority`
  - ゲッター: `hovered`, `insertIndex`
  - メソッド: `detectHover`, `nest`, `unnest`, `clearHover`, `isNested`
- `createSlotZone(config)` — 単一占有/複数占有のスロットゾーン作成
  - config: `SlotZoneConfig { target, layout, workspace, accepts?, occupancy?, centerTolerance?, padding?, priority? }`
- `nestContainer(child, layout, workspace, index?)` — ネスト実行
- `unnestContainer(child, layout, workspace)` — アンネスト実行
- `isInsideContainer(dragged, target, padding?)` — 領域判定

### Edge Path

- `getStraightPath(start, end)` — 直線パス
- `getBezierPath(start, end)` — ベジェパス
- `getStepPath(start, end)` — ステップパス
- `getSmoothStepPath(start, end, borderRadius?)` — 角丸ステップパス
- 全て `EdgePathResult { path, labelPosition }` を返す

### Selection / Marquee

- `createMarqueeRect(start, end)` — マーキー矩形作成
- `getElementsInMarquee(elements, marquee, mode?)` — マーキー内要素取得
- `getElementsInScreenMarquee(elements, screenStart, screenEnd, viewport, mode?)` — スクリーン座標版

### Clipboard

- `copyElements(elements)` — `ClipboardData` 作成
- `calculatePastePositions(data, offset?)` — ペースト位置計算
- `pasteElements(data, factory, offset?)` — ファクトリでペースト実行

### Resize

- `detectResizeHandle(mousePos, element, handleSize?)` — リサイズハンドル検出
- `beginResize(handle, mousePos, element)` — リサイズ開始
- `applyResize(mousePos, state, constraints?)` — リサイズ適用

### Grid

- `snapToGrid(position, gridSize)` — グリッドスナップ
- `snapDeltaToGrid(delta, gridSize)` — デルタのグリッドスナップ

### DOM

- `DomSyncHelper` — DOM 要素の位置・サイズ同期
  - config: `DomSyncConfig { workspace, overlayElement, canvasElement?, gridSize?, resolveElement }`
  - メソッド: `syncAll(containers)`, `syncViewport`, `syncOne(container)`
- `observeContentSize(element, container)` — ResizeObserver で DOM→Container サイズ同期。クリーンアップ関数を返す

### Block Helpers

- `BlockStackController` — ブロックスタックの正規化・管理
  - メソッド: `reattach`, `normalize`, `syncLayout`, `detachFromLayout`, `pullFollowerChainOutOfLayout`
- `collectConnectedChain(root)` — Parent→Children 連鎖を辿って配列化
- `connectStackPairs(config)` — topConn/bottomConn を合わせてスナップ接続
  - config: `ConnectStackPairsConfig<T> { workspace, snapConnections, pairs }`
- `observeContainerContentSizes(config)` — 複数コンテナの DOM→ サイズ一括監視
  - config: `ObserveContainerContentSizesConfig<T> { items, getContainer, resolveElement }`

### Distance

- `getDistance(p1, p2)` — 2 点間距離
- `getAngle(p1, p2)` — 2 点間角度

## Type Exports (37 個)

### core/types.ts

- `IWorkspaceElement` — Workspace に追加可能な要素のインターフェース
- `IEdge` — Edge のインターフェース
- `VplEvent` — イベントオブジェクト `{ type, target, data? }`
- `VplEventType` — `'move' | 'connect' | 'disconnect' | 'add' | 'remove' | 'update' | 'pan' | 'zoom' | 'select' | 'deselect' | 'nest' | 'unnest' | 'proximity' | 'proximity-end'`
- `Viewport` — `{ x, y, scale }`
- `SizingMode` — `'fixed' | 'hug'`
- `Padding` — `{ top, right, bottom, left }`
- `EdgeType` — エッジの種別
- `MarkerType` — マーカーの種別
- `EdgeMarker` — エッジ端のマーカー設定
- `ResizeHandleDirection` — `'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'`

### core/Position.ts

- `IPosition` — `{ x: number; y: number }`

### core/Connector.ts

- `ConnectorAnchor` — `{ target, origin?, offset? }`
- `ConnectorAnchorOrigin` — `'top-left' | 'top-center' | ... | 'bottom-right'`
- `ConnectorAnchorTarget` — `'parent' | string | Container | AutoLayout`

### core/History.ts

- `Command` — `{ execute(): void; undo(): void }`

### util/edgePath.ts

- `EdgePathResult` — `{ path: string; labelPosition: IPosition }`

### util/marquee.ts

- `MarqueeRect` — `{ x, y, width, height }`
- `MarqueeMode` — `'full' | 'partial'`
- `MarqueeElement` — `{ id, position, width, height }`

### util/clipboard.ts

- `ClipboardData` — `{ elements: Record<string, unknown>[] }`

### util/keyboard.ts

- `KeyBinding` — `{ key, modifiers?, handler }`

### util/autoPan.ts

- `CanvasBounds` — `{ x, y, width, height }`
- `AutoPanResult` — `{ dx, dy, active }`

### util/resize.ts

- `ResizableElement` — リサイズ対象の型
- `ResizeState` — `{ handle, startMousePos, startBounds }`

### util/edgeBuilder.ts

- `EdgeBuilderConfig` — EdgeBuilder の設定型

### util/nesting.ts

- `ConnectorHitDetector` — `(dragged, layout) => number | null`
- `NestingValidator` — `(dragged) => boolean`
- `NestingZoneConfig` — NestingZone の設定型
- `SlotZoneConfig` — createSlotZone の設定型

### util/wheelZoom.ts

- `WheelZoomConfig` — bindWheelZoom の設定型

### util/shortcuts.ts

- `DefaultShortcutsConfig` — bindDefaultShortcuts の設定型

### util/domSync.ts

- `DomSyncConfig` — DomSyncHelper の設定型

### util/interaction.ts

- `InteractionMode` — `'idle' | 'panning' | 'dragging' | 'marquee' | 'resizing' | 'edgeBuilding'`
- `InteractionConfig` — InteractionManager の設定型

### blocks/connect.ts

- `ConnectStackPairsConfig` — connectStackPairs の設定型
- `StackConnectable` — `{ container, topConn, bottomConn }`

### blocks/dom.ts

- `ObserveContainerContentSizesConfig` — observeContainerContentSizes の設定型

### util/snap.ts

- `ConnectionValidator` — スナップ時のバリデーション関数型
- `CreateSnapConnectionsConfig` — createSnapConnections の設定型
- `SnapConnectionConfig` — SnapConnection の設定型
- `SnapStrategy` — `(source, target, dragContainers) => boolean`

## 未 export の内部ユーティリティ

以下は `index.ts` から export されていないが、バニラ TS で直接利用する場面がある:

- `animate` — `src/lib/headless-vpl/util/animate.ts` (requestAnimationFrame ループ)
- `getMouseState` — `src/lib/headless-vpl/util/mouse.ts` (マウスボタン状態)

## Canonical Setup Files

- バニラ最小例: `examples/vanilla-ts-minimal/main.ts`
- バニラのフロー例: `examples/flow-editor/main.ts`
- React の共通初期化: `src/hooks/useWorkspace.ts`
  - config: `UseWorkspaceConfig { interactionOverrides?, enableDomSync?, enableShortcuts?, gridSize?, onTick?, onPaste? }`
  - return: `{ workspaceRef, containersRef, connectorsRef, interactionRef, ready, getWorkspace, getContainers, getConnectors }`
- demo routes: `src/main.tsx`
- demo / sample index: `src/pages/Home.tsx`

## Hit Testing Policy

- 通常の AutoLayout ネストは領域判定ベース
- Snap や特例ネストは Connector ベース
- C-block body や slot は `NestingZone` + `createSlotZone` を利用
- ブロックエディタ内部では `blocks/zones.ts` の未 export ヘルパー (`createConnectorInsertZone` 等) も使われる
