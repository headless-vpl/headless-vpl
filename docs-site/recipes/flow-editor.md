# フロー型エディタ

ReactFlow スタイルのフロー型 VPL を構築する例です。

## 基本構造

```typescript
import {
  Workspace, Container, Connector, Edge, Position,
  SvgRenderer, InteractionManager, EdgeBuilder,
  bindWheelZoom, bindDefaultShortcuts,
} from 'headless-vpl'
import { getMouseState } from 'headless-vpl/util/mouse'
import { animate } from 'headless-vpl/util/animate'

const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// ノード定義
function createFlowNode(name: string, x: number, y: number) {
  return new Container({
    workspace,
    position: new Position(x, y),
    name,
    width: 200,
    height: 80,
    children: {
      input: new Connector({ position: new Position(0, -40), name: 'in', type: 'input' }),
      output: new Connector({ position: new Position(200, -40), name: 'out', type: 'output' }),
    },
  })
}

const start = createFlowNode('Start', 100, 100)
const process = createFlowNode('Process', 400, 100)
const end = createFlowNode('End', 700, 100)

// エッジで接続
new Edge({ start: start.children.output, end: process.children.input, edgeType: 'bezier' })
new Edge({ start: process.children.output, end: end.children.input, edgeType: 'bezier' })

const containers = [start, process, end]
const connectors = [
  start.children.input, start.children.output,
  process.children.input, process.children.output,
  end.children.input, end.children.output,
]

// ドラッグで Edge 作成
const edgeBuilder = new EdgeBuilder({
  workspace,
  edgeType: 'bezier',
  onPreview: (path) => { /* SVG プレビュー更新 */ },
  onComplete: (edge) => { /* Edge 作成完了 */ },
})

// インタラクション
const canvasEl = svg.parentElement as HTMLElement
const interaction = new InteractionManager({
  workspace,
  canvasElement: canvasEl,
  containers: () => containers,
  connectors: () => connectors,
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

## DOM オーバーレイ

SVG レイヤーの上に React / Vue / vanilla DOM を被せてカスタム UI を実現:

```typescript
import { DomSyncHelper } from 'headless-vpl'

const domSync = new DomSyncHelper({
  workspace,
  overlayElement: document.querySelector('#dom-overlay') as HTMLElement,
  resolveElement: (c) => document.getElementById(`node-${c.id}`),
})

animate(() => {
  interaction.tick(mouse.mousePosition, mouse.buttonState)
  domSync.syncAll(containers)
})
```
