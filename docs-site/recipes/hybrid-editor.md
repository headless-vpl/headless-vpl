# ハイブリッド型エディタ

ブロック型とフロー型を組み合わせた全く新しい VPL を構築する例です。これは Headless VPL ならではの機能です。

## 現在の対応状況

- sample には inspector、scene persistence、mixed palette を追加済みです。
- Showcase 全体の進捗一覧: [Showcase Roadmap](./showcase-roadmap.md)

## コンセプト

- ブロック同士は **スナップ** で上下に結合（Scratch スタイル）
- ブロックグループ間は **エッジ** で接続（ReactFlow スタイル）

```typescript
import {
  Workspace,
  Container,
  Connector,
  Edge,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'
import { EdgeBuilder, SnapConnection, bindWheelZoom } from 'headless-vpl/helpers'
import { InteractionManager, bindDefaultShortcuts } from 'headless-vpl/recipes'
import { getMouseState } from 'headless-vpl/utils/mouse'
import { animate } from 'headless-vpl/utils/animate'

const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// ハイブリッドブロック: 上下にスナップ用、左右にフロー用コネクター
function createHybridBlock(name: string, x: number, y: number) {
  return new Container({
    workspace,
    position: new Position(x, y),
    name,
    width: 180,
    height: 50,
    children: {
      top: new Connector({ position: new Position(90, 0), name: 'top', type: 'input' }),
      bottom: new Connector({ position: new Position(90, -50), name: 'bottom', type: 'output' }),
      flowIn: new Connector({ position: new Position(0, -25), name: 'flowIn', type: 'input' }),
      flowOut: new Connector({ position: new Position(180, -25), name: 'flowOut', type: 'output' }),
    },
  })
}

const blockA1 = createHybridBlock('A1', 100, 100)
const blockA2 = createHybridBlock('A2', 100, 160)
const blockB1 = createHybridBlock('B1', 400, 100)

const containers = [blockA1, blockA2, blockB1]

// スナップ接続（上下 — source/target ペアごとに作成）
const snapConnections: SnapConnection[] = []
for (const src of containers) {
  for (const tgt of containers) {
    if (src === tgt || !src.children.top || !tgt.children.bottom) continue
    snapConnections.push(new SnapConnection({
      source: src,
      sourcePosition: src.children.top.position,
      target: tgt,
      targetPosition: tgt.children.bottom.position,
      workspace,
      snapDistance: 25,
    }))
  }
}

// フロー接続用コネクター
const flowConnectors = containers.flatMap(c => [c.children.flowIn, c.children.flowOut])

const edgeBuilder = new EdgeBuilder({
  workspace,
  edgeType: 'bezier',
  onPreview: (path) => { /* SVG プレビュー更新 */ },
  onComplete: (edge) => { /* Edge 作成完了 */ },
})

// フローエッジ
new Edge({ start: blockA1.children.flowOut, end: blockB1.children.flowIn, edgeType: 'bezier' })

// インタラクション
const canvasEl = svg.parentElement as HTMLElement
const interaction = new InteractionManager({
  workspace,
  canvasElement: canvasEl,
  containers: () => containers,
  connectors: () => flowConnectors,
  snapConnections,
  edgeBuilder,
})

const mouse = getMouseState(canvasEl, {
  mousedown: (_bs, mp, ev) => interaction.handlePointerDown(mp, ev),
  mouseup: (_bs, mp) => interaction.handlePointerUp(mp),
})

bindWheelZoom(canvasEl, { workspace })
bindDefaultShortcuts({ workspace, element: document.body, containers: () => containers })

animate(() => {
  interaction.tick(mouse.mousePosition, mouse.buttonState)
})
```

## Headless VPL だからできること

- Blockly ではブロック型しか作れない
- ReactFlow ではフロー型しか作れない
- **Headless VPL では両方を組み合わせた全く新しい VPL が作れる**
