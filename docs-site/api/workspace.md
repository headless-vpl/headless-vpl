# Workspace

ルートコンテナ。ビューポート・選択・履歴・イベントを管理します。

## コンストラクタ

```typescript
const workspace = new Workspace()
```

## プロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `eventBus` | `EventBus` | イベントシステム |
| `viewport` | `Viewport` | `{ x, y, scale }` |
| `selection` | `SelectionManager` | 選択状態管理 |
| `history` | `History` | Undo/Redo 履歴 |
| `elements` | `readonly IWorkspaceElement[]` | 登録済み要素 |
| `edges` | `readonly IEdge[]` | 登録済みエッジ |

## メソッド

### `addElement(element)`

要素をワークスペースに追加します。`add` イベントが発行されます。

### `removeElement(element)`

要素をワークスペースから削除します。`remove` イベントが発行されます。

### `addEdge(edge)` / `removeEdge(edge)`

エッジの追加・削除。

### `removeContainer(element)`

コンテナを削除します。関連する Edge の自動削除、Parent/Children 関係のクリア、子要素の再帰削除を行います。

### `on(type, handler)`

イベントを購読します。購読解除関数を返します。

```typescript
const unsub = workspace.on('move', (event) => {
  console.log(event.target)
})
unsub() // 購読解除
```

### `pan(x, y)` / `panBy(dx, dy)`

ビューポートのパン。

### `zoomAt(screenX, screenY, newScale)`

指定したスクリーン座標を中心にズーム。

### `setScale(scale)`

スケールを設定。

### `fitView(canvasWidth, canvasHeight, padding?)`

全要素が収まるようにビューポートを自動調整します。`scale` は 1.0 を上限とします。

## イベント

| イベント | 説明 |
|---------|------|
| `move` | 要素が移動した |
| `add` | 要素が追加された |
| `remove` | 要素が削除された |
| `connect` | コネクターが接続された |
| `disconnect` | コネクターが切断された |
| `update` | 要素が更新された |
| `pan` | ビューポートがパンした |
| `zoom` | ビューポートがズームした |
| `select` | 要素が選択された |
| `deselect` | 要素の選択が解除された |
| `nest` | ネストされた |
| `unnest` | ネスト解除された |
