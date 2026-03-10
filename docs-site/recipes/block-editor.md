# ブロック型エディタ

Scratch スタイルのブロック型 VPL を構築する例です。

## 現在の対応状況

- sample 専用仕様と対応マトリクス: [Block Editor Spec](./block-editor-spec.md)
- Showcase 全体の進捗一覧: [Showcase Roadmap](./showcase-roadmap.md)
- 現在の sample は editor / layout 実装が中心で、Scratch runtime 互換は含みません。
- 最新版では inline input の可変幅、typed value slot、C-block body relayout を sample 仕様として固定しています。

## 基本構造

ブロック型 VPL では、コネクターを上下に配置してスナップ接続で繋ぎます。

```typescript
import {
  Workspace,
  Container,
  Connector,
  Edge,
  Position,
  SvgRenderer,
} from 'headless-vpl/primitives'
import { SnapConnection, bindWheelZoom } from 'headless-vpl/helpers'
import { InteractionManager } from 'headless-vpl/recipes'
import { getMouseState } from 'headless-vpl/utils/mouse'
import { animate } from 'headless-vpl/utils/animate'

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
