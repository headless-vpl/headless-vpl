import {
  Connector,
  Container,
  Edge,
  EdgeBuilder,
  InteractionManager,
  Position,
  SvgRenderer,
  Workspace,
  bindDefaultShortcuts,
  bindWheelZoom,
} from 'headless-vpl'
import { animate } from 'headless-vpl/util/animate'
import { getMouseState } from 'headless-vpl/util/mouse'

const workspace = new Workspace()
const svg = document.querySelector('#workspace') as SVGSVGElement
new SvgRenderer(svg, workspace)

// フローノード作成関数
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

// ノード作成
const start = createFlowNode('Start', 100, 200)
const processA = createFlowNode('Process A', 400, 100)
const processB = createFlowNode('Process B', 400, 300)
const end = createFlowNode('End', 700, 200)

// エッジで接続
new Edge({ start: start.children.output, end: processA.children.input, edgeType: 'bezier' })
new Edge({ start: start.children.output, end: processB.children.input, edgeType: 'bezier' })
new Edge({ start: processA.children.output, end: end.children.input, edgeType: 'bezier' })
new Edge({ start: processB.children.output, end: end.children.input, edgeType: 'bezier' })

const containers = [start, processA, processB, end]
const allConnectors = containers.flatMap((c) => [c.children.input, c.children.output])

// ドラッグで Edge 作成
const edgeBuilder = new EdgeBuilder({
  workspace,
  connectors: () => allConnectors,
  edgeType: 'bezier',
})

// インタラクション
const canvasEl = svg.parentElement as HTMLElement

const interaction = new InteractionManager({
  workspace,
  canvasElement: canvasEl,
  containers: () => containers,
  connectors: () => allConnectors,
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
