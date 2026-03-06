# ブロック型エディタ

Scratch スタイルのブロック型 VPL を構築する例です。

## 基本構造

ブロック型 VPL では、コネクターを上下に配置してスナップ接続で繋ぎます。

```typescript
import {
  Workspace, Container, Connector, Edge, Position,
  SvgRenderer, InteractionManager, SnapConnection,
  bindWheelZoom,
} from 'headless-vpl'
import { getMouseState } from 'headless-vpl/util/mouse'
import { animate } from 'headless-vpl/util/animate'

const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// ブロック定義
function createBlock(name: string, x: number, y: number) {
  return new Container({
    workspace,
    position: new Position(x, y),
    name,
    width: 160,
    height: 40,
    children: {
      top: new Connector({ position: new Position(80, 0), name: 'top', type: 'input' }),
      bottom: new Connector({ position: new Position(80, -40), name: 'bottom', type: 'output' }),
    },
  })
}

const moveBlock = createBlock('Move', 200, 100)
const turnBlock = createBlock('Turn', 200, 200)
const repeatBlock = createBlock('Repeat', 200, 300)

const containers = [moveBlock, turnBlock, repeatBlock]

// スナップ接続の設定（source/target ペアごとに作成）
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
      snapDistance: 30,
    }))
  }
}

// インタラクション
const canvasEl = svg.parentElement as HTMLElement
const interaction = new InteractionManager({
  workspace,
  canvasElement: canvasEl,
  containers: () => containers,
  snapConnections,
})

const mouse = getMouseState(canvasEl, {
  mousedown: (_bs, mp, ev) => interaction.handlePointerDown(mp, ev),
  mouseup: (_bs, mp) => interaction.handlePointerUp(mp),
})

bindWheelZoom(canvasEl, { workspace })

animate(() => {
  interaction.tick(mouse.mousePosition, mouse.buttonState)
})
```

## ポイント

- コネクターの `type` を `input`（上）/ `output`（下）に設定
- `SnapConnection` の `snapDistance` でスナップ距離を調整
- グループ移動は自動で処理される（親を動かすと子も追従）
