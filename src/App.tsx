import { useEffect } from 'react'
import { Workspace, Position, Connector, Edge, Container } from './lib/headless-vpl'
import { getMousePosition, getPositionDelta, getMouseState } from './lib/headless-vpl/util/mouse'
import { isCollision } from './lib/headless-vpl/util/collision_detecion'
import { animate } from './lib/headless-vpl/util/animate'
import { handleDragAndDropMulti } from './lib/headless-vpl/util/dnd'

function App() {
  useEffect(() => {
    const workspace = new Workspace('#workspace')
    const workspaceElement = workspace.getWorkspace()

    const edge = new Edge({
      workspace,
      start: new Position(100, 100),
      end: new Position(100, 100),
    })

    const edge2 = new Edge({
      workspace,
      start: new Position(100, 100),
      end: new Position(100, 100),
    })

    const container = new Container({
      workspace,
      position: new Position(100, 100),
      name: 'container',
      color: 'red',
      width: 200,
      height: 70,
      children: {
        connectorTop: new Connector({
          workspace,
          position: new Position(50, 0),
          name: 'connectorTop',
          type: 'input',
        }),
        connectorBottom: new Connector({
          workspace,
          position: new Position(50, -70),
          name: 'connectorBottom',
          type: 'output',
        }),
      },
    })

    const container2 = new Container({
      workspace,
      position: new Position(100, 0),
      name: 'container',
      color: 'red',
      width: 200,
      height: 70,
      children: {
        connectorTop: new Connector({
          workspace,
          position: new Position(50, 0),
          name: 'connectorTop',
          type: 'input',
        }),
        connectorBottom: new Connector({
          workspace,
          position: new Position(50, -70),
          name: 'connectorBottom',
          type: 'output',
        }),
      },
    })

    const container3 = new Container({
      workspace,
      position: new Position(200, 220),
      name: 'container',
      color: 'blue',
      width: 200,
      height: 70,
      children: {
        connectorLeft: new Connector({
          workspace,
          position: new Position(0, -35),
          name: 'connectorLeft',
          type: 'input',
        }),
        connectorRight: new Connector({
          workspace,
          position: new Position(200, -35),
          name: 'connectorRight',
          type: 'output',
        }),
      },
    })

    const containers = [container, container2, container3]
    const mouseState = getMouseState(workspaceElement, {
      mousedown: (mouseState, mousePosition) => {
        if (mouseState.leftButton === 'down') {
          // コンテナ上でクリックされたかどうかをチェック（複数対象を一括で考慮）
          dragEligible = containers.some((instance) => isCollision(instance, mousePosition))
        }
      },
      mouseup: () => {
        dragEligible = false
        dragContainers = []
      },
    })

    // 前フレームのマウス位置
    let previousMousePosition = { x: 0, y: 0 }

    // クリック開始時にコンテナ上でクリックされたかを保持するフラグ
    let dragEligible = false

    // 複数のコンテナーを管理するための配列
    let dragContainers: Container[] = []

    animate((dt, frame) => {
      const delta = getPositionDelta(mouseState.mousePosition, previousMousePosition)
      previousMousePosition = { x: mouseState.mousePosition.x, y: mouseState.mousePosition.y }

      //　複数containerをdnd
      dragContainers = handleDragAndDropMulti(
        containers,
        delta,
        mouseState,
        dragEligible,
        dragContainers,
        false
      )

      // 必要に応じてエッジの接続更新などを実施
      edge.move(
        container2.children.connectorBottom.position,
        container.children.connectorTop.position
      )

      edge2.move(
        container3.children.connectorLeft.position,
        container2.children.connectorTop.position
      )

      //snap機能の実装
      /**
       * 要件
       * 指定した要素とのsnapを行う
       * 
       * 条件
       * 指定した条件（例：XとXとの距離がXX以下など）
       * 
       * 引数
       * @param 対象先、対象元
       * @param 条件
       * @param 条件に合致した場合の処理
       */

      //まずは手続き的に作ってみる
      if (container.children) {
        
      }

    })
  }, [])

  return (
    <>
      <h1>Headless VPL</h1>
      {/* workspace */}
      <div style={{ width: '1200px', height: '700px', backgroundColor: 'white' }}>
        <svg id='workspace' style={{ width: '100%', height: '100%' }}>
          <rect x='100' y='100' width='100' height='100' fill='gray' />
        </svg>
      </div>
    </>
  )
}

export default App
