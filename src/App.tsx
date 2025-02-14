import { useEffect } from 'react'
import { Workspace, Position, Connector, Edge, Container, getDistance } from './lib/headless-vpl'
import { getMousePosition, getPositionDelta, getMouseState } from './lib/headless-vpl/util/mouse'
import { isCollision } from './lib/headless-vpl/util/collision_detecion'
import { animate } from './lib/headless-vpl/util/animate'
import { DragAndDrop } from './lib/headless-vpl/util/dnd'
import { snap } from './lib/headless-vpl/util/snap'
import { moveGroup } from './lib/headless-vpl/util/moveContainersGroup'
import AutoLayout from './lib/headless-vpl/core/AutoLayout'

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
      position: new Position(200, 0),
      name: 'container2',
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
      position: new Position(400, 220),
      name: 'container3',
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

    const autoLayoutContainer = new Container({
      workspace,
      position: new Position(300, 300),
      name: 'autoLayoutContainer',
      color: 'orange',
      width: 300,
      height: 120,
      children: {
        autoLayout: new AutoLayout({
          workspace,
          position: new Position(10, 10),
          width: 280,
          height: 100,
          containers: [
            new Container({
              workspace,
              name: 'autoLayoutContainer',
              color: 'purple',
              width: 40,
              height: 40,
            }),
            new Container({
              workspace,
              name: 'autoLayoutContainer',
              color: 'purple',
              width: 80,
              height: 40,
            }),
            new Container({
              workspace,
              name: 'autoLayoutContainer',
              color: 'purple',
              width: 50,
              height: 40,
            }),
            new Container({
              workspace,
              name: 'autoLayoutContainer',
              color: 'purple',
              width: 20,
              height: 40,
            }),
            new Container({
              workspace,
              name: 'autoLayoutContainer',
              color: 'purple',
              width: 40,
              height: 40,
            }),
          ],
        }),
      },
    })

    const containers = [container, container2, container3, autoLayoutContainer]
    const mouseState = getMouseState(workspaceElement, {
      mousedown: (buttonState, mousePosition) => {
        if (buttonState.leftButton === 'down') {
          // コンテナ上でクリックされたかどうかをチェック
          dragEligible = containers.some((instance) => isCollision(instance, mousePosition))
          // マウスダウン時にスナップ処理を再度有効化
          snapLocked = false
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

    let snapLocked = false
    let hasFailed = false

    animate((dt, frame) => {
      const delta = getPositionDelta(mouseState.mousePosition, previousMousePosition)
      previousMousePosition = { x: mouseState.mousePosition.x, y: mouseState.mousePosition.y }

      //　複数containerをdnd
      dragContainers = DragAndDrop(
        containers,
        delta,
        mouseState,
        dragEligible,
        dragContainers,
        false,
        () => {
          //container2のChildrenも一緒に動かす
          if (dragContainers.includes(container2)) {
            if (container2.Children) {
              const children = container2.Children
              children.move(children.position.x + delta.x, children.position.y + delta.y)
            }
          }
        }
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

      // 汎用スナップ機能の利用例
      if (!snapLocked) {
        const snapped = snap(
          container, // ソースコンテナ
          container.children.connectorTop.position, // ソースの位置
          container2.children.connectorBottom.position, // ターゲットの位置
          mouseState,
          50,
          () => {
            console.log('snap')
            container.Parent = container2
            container2.Children = container
            hasFailed = false // スナップ成功時にリセット
          },
          () => {
            if (!hasFailed) {
              console.log('snap failed')
              container.Parent = null
              container2.Children = null
              hasFailed = true
            }
          }
        )
        if (snapped) snapLocked = true
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
