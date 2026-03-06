# Troubleshooting

## Drag, Pan, Selection

対応デモ: `demos/drag-and-drop`, `demos/selection`

- まず `src/lib/headless-vpl/util/interaction.ts` を読む。
- React demo なら `src/hooks/useWorkspace.ts` で以下を確認する。
  - `containers: () => containersRef.current`
  - `getMouseState(...)` (未 export: `src/lib/headless-vpl/util/mouse.ts`)
  - `interaction.handlePointerDown(screenPos, { button, shiftKey, target })`
  - `interaction.handlePointerUp(screenPos)`
  - `animate(() => interaction.tick(screenPos, buttonState))` (未 export: `src/lib/headless-vpl/util/animate.ts`)
- UI 要素上のクリックは `input, textarea, select, button, .toolbar, .status-bar` で無視される。
- 中ボタンは pan に使われる。
- `useWorkspace` デバッグポイント:
  - `interactionOverrides` に渡した値が正しいか
  - `ready` が true になっているか
  - `containersRef.current` が最新のコンテナ配列を返しているか

## DOM Sync

対応デモ: (各 React demo で使用)

- `src/lib/headless-vpl/util/domSync.ts` を確認する。
- node DOM の id は `node-${container.id}` を前提にしている。
- overlay transform は `translate(...) scale(...)` で同期される。
- hug / resizable のサイズ反映は `syncOne` に依存する。
- React demo では `enableDomSync !== false` かを確認する。
- `DomSyncConfig` の `resolveElement` が正しい DOM 要素を返しているか。

## Edge Builder, Connectors, Edge Selection

対応デモ: `demos/edge-builder`, `demos/edge-types`

- `src/lib/headless-vpl/util/edgeBuilder.ts`
- `src/pages/demos/EdgeBuilderDemo.tsx`
- `src/pages/demos/EdgeTypes.tsx`

確認ポイント:

- `connectors: () => connectorsRef.current` が `InteractionManager` に渡っているか
- `edgeBuilder` を config か `setEdgeBuilder(...)` で設定しているか
- connector の `type` と位置が正しいか
- preview path を独自管理している場合、`onPreview` / `onCancel` / `onComplete` が整合しているか
- `EdgeBuilderConfig` の型: `{ workspace, hitRadius?, edgeType?, onPreview?, onComplete?, onCancel? }`

## Snap Connection

対応デモ: `demos/snap-connection`

- `src/lib/headless-vpl/util/snap.ts`
- `src/pages/demos/SnapConnectionDemo.tsx`

確認ポイント:

- `snapConnections` が `InteractionManager` に渡っているか
- `sourcePosition` / `targetPosition` に connector の `position` を使っているか
- `strategy` が `childOnly` / `parentOnly` / `either` の意図と合っているか
- `validator` が常に false を返していないか
- detach / proximity の挙動を見たいときは `proximity` と `proximity-end` イベントを見る

## AutoLayout And Generic Nesting

対応デモ: `demos/auto-layout`, `demos/nesting`

- `src/lib/headless-vpl/core/AutoLayout.ts`
- `src/lib/headless-vpl/util/nesting.ts`
- `src/pages/demos/AutoLayoutDemo.tsx`
- `src/pages/demos/NestingDemo.tsx`

確認ポイント:

- 通常ネストは領域判定ベース。中心点が effective layout 範囲に入るかを見る。
- 並び順の崩れは `computeInsertIndex` と `layout.direction` を確認する。
- 親サイズの追従は `resizesParent` と `applyContentSize(...)` を確認する。
- `update()` と `relayout()` を混同しない。
  - `relayout()` — 位置のみ更新（親伝搬なし）
  - `update()` — 全再計算（サイズ変更含む）

## Block Editor Specific

対応サンプル: `samples/block-editor`

- `src/pages/samples/block-editor/controller.ts`
- `src/pages/samples/block-editor/interactions.ts`
- `src/pages/samples/block-editor/layout.ts`
- `src/pages/samples/block-editor/scene.ts`
- `src/lib/headless-vpl/blocks/stack.ts`
- `src/lib/headless-vpl/blocks/connect.ts`
- `src/lib/headless-vpl/blocks/dom.ts`

確認ポイント:

- C-block body は通常ネストではなく `NestingZone` + `createSlotZone` を使う
  - 内部的には `blocks/zones.ts` の `createConnectorInsertZone` / `findConnectorInsertHit` も使われるが未 export
- slot は `createSlotZone(config)` を使う（`occupancy: 'single' | 'multiple'`）
- stack 親子関係は `BlockStackController` が正規化する
- body layout 変更後は `syncBodyLayoutChain(...)` と `alignCBlockBodyEntryConnectors(...)` を見る
- follower chain を外に出す処理は `pullFollowerChainOutOfBodyLayout(...)`
- `connectStackPairs` で topConn/bottomConn のスナップ接続を管理
- `observeContainerContentSizes` で DOM→Container サイズの自動同期

## History, Delete, Copy/Paste

対応デモ: `demos/undo-redo`, `demos/copy-paste`

- `src/lib/headless-vpl/core/commands.ts`
- `src/lib/headless-vpl/util/shortcuts.ts`
- `src/pages/demos/UndoRedoDemo.tsx`
- `src/pages/demos/CopyPasteDemo.tsx`

確認ポイント:

- Undo/Redo は `workspace.history.execute(...)` を通しているか
- Delete は `bindDefaultShortcuts` の `onDelete` 実装を確認する
- paste は `factory(json, position)` が現在の node shape と一致しているか
- selection が paste 後に更新されているか

## Removed Or Stale Assumptions

- `docs-site/` 前提で追わない。現在の public docs は `docs/` と README。
- block editor は単一ファイルではなく `src/pages/samples/block-editor/` に分割されている。
- 現在は `blocks/*` helper があるので、古い手動実装を前提にしない。
- `blocks/zones.ts` は存在するが index.ts から未 export。内部利用のみ。
