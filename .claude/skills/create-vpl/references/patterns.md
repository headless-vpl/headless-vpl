# Create Patterns

## Choose A Starting Point

| パターン | 基準ファイル | 主な API |
|---|---|---|
| バニラ TS 最小 | `examples/vanilla-ts-minimal/main.ts` | Workspace, SvgRenderer, InteractionManager, bindWheelZoom |
| バニラ TS フロー | `examples/flow-editor/main.ts` | EdgeBuilder, bindDefaultShortcuts, Connector anchor |
| React demo 基本 | `src/hooks/useWorkspace.ts` + `src/components/VplCanvas.tsx` | useWorkspace, DomSyncHelper |
| React Flow 型 | `src/pages/samples/FlowEditor.tsx` | EdgeBuilder, getBezierPath, Connector anchor |
| React Hybrid 型 | `src/pages/samples/HybridEditor.tsx` | SnapConnection + EdgeBuilder 併用 |
| React Blueprint 型 | `src/pages/samples/BlueprintEditor.tsx` | 複数 Connector (multi-pin), getSmoothStepPath |
| React StateMachine | `src/pages/samples/StateMachine.tsx` | 円形ノード, Edge markers |
| React Workflow 型 | `src/pages/samples/WorkflowEditor.tsx` | 横フロー, getSmoothStepPath |
| Block Editor | `src/pages/samples/block-editor/` | BlockStackController, connectStackPairs, NestingZone, createSlotZone |

## Feature Map

| 機能 | 実装ファイル | デモ / サンプル |
|---|---|---|
| Drag / pan / marquee / resize | `src/lib/headless-vpl/util/interaction.ts` | `src/pages/demos/DragAndDrop.tsx` |
| Edge 作成と選択 | `src/lib/headless-vpl/util/edgeBuilder.ts` | `src/pages/demos/EdgeBuilderDemo.tsx`, `src/pages/demos/EdgeTypes.tsx` |
| Snap 接続 | `src/lib/headless-vpl/util/snap.ts` | `src/pages/demos/SnapConnectionDemo.tsx` |
| AutoLayout とネスト | `src/lib/headless-vpl/core/AutoLayout.ts`, `src/lib/headless-vpl/util/nesting.ts` | `src/pages/demos/AutoLayoutDemo.tsx`, `src/pages/demos/NestingDemo.tsx` |
| Block スタック接続 | `src/lib/headless-vpl/blocks/stack.ts`, `src/lib/headless-vpl/blocks/connect.ts` | `src/pages/samples/block-editor/controller.ts`, `src/pages/samples/block-editor/interactions.ts` |
| Block DOM サイズ監視 | `src/lib/headless-vpl/blocks/dom.ts` | `src/pages/samples/block-editor/layout.ts` |
| DOM 同期 | `src/lib/headless-vpl/util/domSync.ts` | `src/hooks/useWorkspace.ts` |
| History / delete / copy-paste | `src/lib/headless-vpl/core/commands.ts`, `src/lib/headless-vpl/util/shortcuts.ts` | `src/pages/demos/UndoRedoDemo.tsx`, `src/pages/demos/CopyPasteDemo.tsx` |
| ビューポート / ズーム | `src/lib/headless-vpl/util/viewport.ts`, `src/lib/headless-vpl/util/wheelZoom.ts` | `src/pages/demos/ZoomPanDemo.tsx` |
| 選択 / マーキー | `src/lib/headless-vpl/util/marquee.ts` | `src/pages/demos/SelectionDemo.tsx` |
| リサイズ | `src/lib/headless-vpl/util/resize.ts` | `src/pages/demos/ResizeDemo.tsx` |
| グリッドスナップ | `src/lib/headless-vpl/util/snapToGrid.ts` | (useWorkspace の gridSize オプション) |
| コンテンツサイズ監視 | `src/lib/headless-vpl/util/contentSize.ts` | (DomSyncHelper 内部で利用) |

## useWorkspace (React)

```typescript
// config
type UseWorkspaceConfig = {
  interactionOverrides?: Partial<InteractionConfig>
  enableDomSync?: boolean      // デフォルト true
  enableShortcuts?: boolean    // デフォルト true
  gridSize?: number
  onTick?: () => void
  onPaste?: (pasted: Container[]) => void
}

// return
{
  workspaceRef: React.MutableRefObject<Workspace | null>
  containersRef: React.MutableRefObject<Container[]>
  connectorsRef: React.MutableRefObject<Connector[]>
  interactionRef: React.MutableRefObject<InteractionManager | null>
  ready: boolean
  getWorkspace: () => Workspace | null
  getContainers: () => Container[]
  getConnectors: () => Connector[]
}
```

## InteractionManager セットアップ

### バニラ TS

```typescript
import { getMouseState } from 'headless-vpl/util/mouse'
import { animate } from 'headless-vpl/util/animate'

const interaction = new InteractionManager({
  workspace,
  canvasElement: canvas,
  containers: () => containers,
  connectors: () => connectors,      // EdgeBuilder 利用時
  snapConnections,                     // Snap 利用時
  nestingZones,                        // ネスト利用時
  edgeBuilder,                         // Edge 作成利用時
})

canvas.addEventListener('pointerdown', (e) => {
  interaction.handlePointerDown(
    { x: e.clientX, y: e.clientY },
    { button: e.button, shiftKey: e.shiftKey, target: e.target }
  )
})
canvas.addEventListener('pointerup', (e) => {
  interaction.handlePointerUp({ x: e.clientX, y: e.clientY })
})

animate(() => {
  const mouse = getMouseState(canvas)
  interaction.tick({ x: mouse.x, y: mouse.y }, mouse)
})
```

### React (useWorkspace 経由)

```typescript
const { workspaceRef, containersRef, connectorsRef, interactionRef, ready } = useWorkspace({
  interactionOverrides: {
    snapConnections,
    nestingZones,
    edgeBuilder,
    onDragEnd: (containers, commands) => { /* ... */ },
  },
  onTick: () => { /* 毎フレーム処理 */ },
})
```

## Current API Notes

### Core クラス主要フィールド

- `Container`: `width`, `height`, `widthMode` (`'fixed' | 'hug'`), `heightMode`, `padding`, `contentGap`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `resizable`, `children` (ジェネリクス), `color`
- `Connector`: `hitRadius` (デフォルト 12), `anchor` (`ConnectorAnchor | null`), `type`
- `AutoLayout`: `direction` (`'horizontal' | 'vertical'`), `gap`, `alignment` (`'start' | 'center' | 'end'`), `minWidth`, `minHeight`, `resizesParent`, `Children` (ネストされたコンテナ配列)
- `Workspace`: `viewport`, `history`, `selection`, `eventBus`, `elements`, `edges`
- `SelectionManager`: `select`, `deselect`, `toggleSelect`, `selectAll`, `deselectAll`, `getSelection`, `isSelected`, `size`
- `History`: `execute(command)`, `undo`, `redo`, `canUndo`, `canRedo`, `clear`

### Commands

- `MoveCommand(element, fromX, fromY, toX, toY)`
- `AddCommand(workspace, element)` / `RemoveCommand(workspace, element)`
- `ConnectCommand(workspace, parent, child)` / `DetachCommand(workspace, element)`
- `NestCommand(child, layout, workspace, index)` / `BatchCommand(commands)`
- `ReparentChildCommand(child, sourceContainer, sourceKey, targetContainer?, targetKey?)`

### SnapConnection

- `createSnapConnections<T>(config)` で一括生成
- `childOnly` / `parentOnly` / `either` がプリセット SnapStrategy
- `tick(mouseState, dragContainers)` を animate ループで呼ぶ

### NestingZone

- `NestingZone` (直接 new) または `createSlotZone(config)` で生成
- `detectHover(dragContainers)` を tick で呼び、`nest` / `unnest` で確定

## Hit Testing Policy

- 通常の AutoLayout ネストは領域判定ベース (`isInsideContainer`, `computeInsertIndex`)
- Snap や body/slot 挿入のような特例は Connector ベースで扱う
- C-block body は `NestingZone` + `createSlotZone` を優先。内部的には `blocks/zones.ts` も使われる

## Documentation Snippets

- README / docs 用スニペットは current example から縮約する
- 個人環境の絶対パスを書かない
