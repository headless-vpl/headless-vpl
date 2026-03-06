# Getting Started

## インストール

```bash
npm install headless-vpl
```

## 最小構成

ドラッグ可能な 2 ノードをエッジで接続する最小構成です。

```typescript
import {
  Workspace,
  Container,
  Connector,
  Edge,
  Position,
  SvgRenderer,
  InteractionManager,
  bindWheelZoom,
  bindDefaultShortcuts,
} from 'headless-vpl'
import { getMouseState } from 'headless-vpl/util/mouse'
import { animate } from 'headless-vpl/util/animate'

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

// 4. インタラクション
const canvasEl = svg.parentElement as HTMLElement
const containers = [nodeA, nodeB]

const interaction = new InteractionManager({
  workspace,
  canvasElement: canvasEl,
  containers: () => containers,
})

const mouse = getMouseState(canvasEl, {
  mousedown: (_bs, mp, ev) => interaction.handlePointerDown(mp, ev),
  mouseup: (_bs, mp) => interaction.handlePointerUp(mp),
})

// 5. ホイールズーム + キーボードショートカット
bindWheelZoom(canvasEl, { workspace })
bindDefaultShortcuts({ workspace, element: document.body, containers: () => containers })

// 6. アニメーションループ
animate(() => {
  interaction.tick(mouse.mousePosition, mouse.buttonState)
})
```

## 次のステップ

- [コアコンセプト](./core-concepts.md) — 4 つの型を理解する
- [Headless アーキテクチャ](./headless-architecture.md) — DOM 分離の仕組み
- [API リファレンス](/api/workspace) — 全 API の詳細
