# Getting Started

## インストール

```bash
npm install headless-vpl
```

## 最小構成

まずは primitives だけで 2 ノードを作り、エッジで接続する最小構成です。

```typescript
import {
  Workspace,
  Container,
  Connector,
  Edge,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'

// 1. ワークスペース + レンダラー
const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// 2. ノード作成
const nodeA = new Container({
  workspace,
  position: new Position(100, 50),
  name: 'nodeA',
  width: 160,
  height: 60,
  children: {
    output: new Connector({ position: new Position(160, -30), name: 'out', type: 'output' }),
  },
})

const nodeB = new Container({
  workspace,
  position: new Position(400, 50),
  name: 'nodeB',
  width: 160,
  height: 60,
  children: {
    input: new Connector({ position: new Position(0, -30), name: 'in', type: 'input' }),
  },
})

// 3. エッジで接続
new Edge({ start: nodeA.children.output, end: nodeB.children.input, edgeType: 'bezier' })
```

インタラクションを追加したくなったら、次の層を足します。

```typescript
import { EdgeBuilder, NestingZone, SnapConnection, bindWheelZoom } from 'headless-vpl/helpers'
import { InteractionManager, bindDefaultShortcuts } from 'headless-vpl/recipes'
import { getMouseState } from 'headless-vpl/utils/mouse'
import { animate } from 'headless-vpl/utils/animate'
```

## 次のステップ

- [コアコンセプト](./core-concepts.md) — 4 つの型を理解する
- [Headless アーキテクチャ](./headless-architecture.md) — DOM 分離の仕組み
- [API リファレンス](/api/workspace) — 全 API の詳細
