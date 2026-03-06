# Connector

入出力接続ポイント。Container の子要素として配置し、Edge で接続します。

## コンストラクタ

```typescript
const connector = new Connector({
  position: new Position(0, -30),
  name: 'input',
  type: 'input',
})
```

## オプション

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `position` | `Position` | Container からの相対位置 |
| `name` | `string` | 名前 |
| `type` | `'input' \| 'output'` | 入力または出力 |

## 使用例

```typescript
const node = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'myNode',
  width: 200,
  height: 80,
  children: {
    input: new Connector({ position: new Position(0, -40), name: 'in', type: 'input' }),
    output: new Connector({ position: new Position(200, -40), name: 'out', type: 'output' }),
  },
})
```
