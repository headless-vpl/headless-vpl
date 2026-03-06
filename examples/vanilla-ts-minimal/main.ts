import {
  Connector,
  Container,
  Edge,
  InteractionManager,
  Position,
  SvgRenderer,
  Workspace,
  bindWheelZoom,
} from 'headless-vpl'
import { animate } from 'headless-vpl/util/animate'
import { getMouseState } from 'headless-vpl/util/mouse'

// ワークスペース + レンダラー
const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// ノード作成
const nodeA = new Container({
  workspace,
  position: new Position(100, 100),
  name: 'nodeA',
  width: 160,
  height: 60,
  children: {
    output: new Connector({ position: new Position(160, -30), name: 'out', type: 'output' }),
  },
})

const nodeB = new Container({
  workspace,
  position: new Position(400, 100),
  name: 'nodeB',
  width: 160,
  height: 60,
  children: {
    input: new Connector({ position: new Position(0, -30), name: 'in', type: 'input' }),
  },
})

// エッジで接続
new Edge({ start: nodeA.children.output, end: nodeB.children.input, edgeType: 'bezier' })

// インタラクション
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

bindWheelZoom(canvasEl, { workspace })

animate(() => {
  interaction.tick(mouse.mousePosition, mouse.buttonState)
})
