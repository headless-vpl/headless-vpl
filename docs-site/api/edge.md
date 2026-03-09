# Edge

コネクター間の接続線。4 種のパスアルゴリズムをサポートします。

## コンストラクタ

```typescript
new Edge({
  start: nodeA.children.output,
  end: nodeB.children.input,
  edgeType: 'bezier',
})
```

## オプション

| プロパティ | 型 | デフォルト | 説明 |
|-----------|---|-----------|------|
| `start` | `Connector` | 必須 | 始点コネクター |
| `end` | `Connector` | 必須 | 終点コネクター |
| `edgeType` | `EdgeType` | `'bezier'` | パスアルゴリズム |
| `label` | `string?` | — | パス中間点のテキストラベル |
| `markerStart` | `EdgeMarker?` | — | 始点の矢印マーカー |
| `markerEnd` | `EdgeMarker?` | — | 終点の矢印マーカー |

## プロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `startConnector` | `Connector` | 起点コネクター |
| `endConnector` | `Connector` | 終点コネクター |

## メソッド

| メソッド | 説明 |
|----------|------|
| `computePath()` | `{ path: string, labelPosition: IPosition }` を返す |
| `getLabelPosition()` | ラベル配置の中間点（`computePath().labelPosition` のショートハンド） |

## EdgeType

| 型 | 説明 |
|----|------|
| `'straight'` | 直線 |
| `'bezier'` | ベジェ曲線（3次） |
| `'step'` | 直角折れ線 |
| `'smoothstep'` | 角丸の折れ線 |

## パスユーティリティ

Edge の内部で使われるパス生成関数は個別にインポートできます:

```typescript
import {
  getStraightPath,
  getBezierPath,
  getStepPath,
  getSmoothStepPath,
} from 'headless-vpl/primitives'

const { path, labelPosition } = getBezierPath(
  { x: 0, y: 0 },
  { x: 200, y: 100 }
)
```
