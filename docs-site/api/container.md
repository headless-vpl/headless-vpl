# Container\<T\>

主要構成要素。コネクターや AutoLayout を型付きで保持します。

## コンストラクタ

```typescript
const node = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'myNode',
  width: 200,
  height: 80,
  widthMode: 'hug',
  children: {
    input: new Connector({ position: new Position(0, -40), name: 'in', type: 'input' }),
    output: new Connector({ position: new Position(200, -40), name: 'out', type: 'output' }),
  },
})
```

## オプション

| プロパティ | 型 | デフォルト | 説明 |
|-----------|---|-----------|------|
| `workspace` | `Workspace` | 必須 | 所属するワークスペース |
| `position` | `Position` | 必須 | 初期位置 |
| `name` | `string` | 必須 | 名前 |
| `color` | `string` | `'red'` | ワイヤーフレーム色 |
| `width` | `number` | `100` | 幅 |
| `height` | `number` | `100` | 高さ |
| `widthMode` | `SizingMode` | `'fixed'` | 幅のサイジングモード |
| `heightMode` | `SizingMode` | `'fixed'` | 高さのサイジングモード |
| `padding` | `Partial<Padding>` | `{0,0,0,0}` | 内部パディング |
| `minWidth` / `maxWidth` | `number` | `0` / `Infinity` | サイズ制約 |
| `minHeight` / `maxHeight` | `number` | `0` / `Infinity` | サイズ制約 |
| `resizable` | `boolean` | `false` | リサイズハンドル有効化 |
| `children` | `T` | `{}` | 子要素（型安全） |
| `Parent` | `MovableObject \| null` | `null` | スナップ接続の親 |
| `Children` | `Set<MovableObject>` | `new Set()` | スナップ接続の子 |

## メソッド

| メソッド | 説明 |
|----------|------|
| `move(x, y)` | 絶対位置に移動（子要素も更新） |
| `setColor(color)` | ワイヤーフレーム色を変更 |
| `updateChildren()` | 子要素の位置を再計算 |
| `applyContentSize(w, h)` | コンテンツベースのサイズを適用（hug モード用） |
| `toJSON()` | プレーンオブジェクトにシリアライズ |

## 型安全な children アクセス

```typescript
const node = new Container({
  // ...
  children: {
    input: new Connector({ /* ... */ }),
    output: new Connector({ /* ... */ }),
  },
})

// 型安全にアクセス
node.children.input   // Connector 型
node.children.output  // Connector 型
```

## SizingMode

| モード | 説明 |
|--------|------|
| `'fixed'` | 固定サイズ |
| `'hug'` | コンテンツにフィット |
| `'fill'` | 親にフィル |
