import { useEffect, useState } from 'react'
import { Workspace, Position, Connector, Edge, Container, getDistance } from './lib/headless-vpl'
import { getMousePosition, getPositionDelta, getMouseState } from './lib/headless-vpl/util/mouse'
import { isCollision } from './lib/headless-vpl/util/collision_detecion'
import { animate } from './lib/headless-vpl/util/animate'
import { DragAndDrop } from './lib/headless-vpl/util/dnd'
import { snap } from './lib/headless-vpl/util/snap'
import { moveGroup } from './lib/headless-vpl/util/moveContainersGroup'
import AutoLayout from './lib/headless-vpl/core/AutoLayout'
import { DomController } from './lib/headless-vpl/util/domController'

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

    /**
     * 宣言的UIを使った独自コンテナの作成
     */

    // const mitou = new Container({
    //   workspace,
    //   position: new Position(400, 40),
    //   name: 'mitou',
    //   color: 'blue',
    //   width: 200,
    //   height: 70,
    //   children: {
    //     connectorTop: new Connector({
    //       workspace,
    //       position: new Position(50, 0),
    //       name: 'connectorTop',
    //       type: 'input',
    //     }),
    //     connectorBottom: new Connector({
    //       workspace,
    //       position: new Position(50, -70),
    //       name: 'connectorBottom',
    //       type: 'output',
    //     }),
    //     connectorLeft: new Connector({
    //       workspace,
    //       position: new Position(0, -35),
    //       name: 'connectorLeft',
    //       type: 'input',
    //     }),
    //     connectorRight: new Connector({
    //       workspace,
    //       position: new Position(200, -35),
    //       name: 'connectorRight',
    //       type: 'output',
    //     }),
    //   },
    // })

    const container = new Container({
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
        // test: new Container({
        //   workspace,
        //   position: new Position(50, -70),
        //   name: 'test',
        //   color: 'blue',
        //   width: 200,
        // }),
      },
    })

    //**
    // ノードのデモ
    //  */

    // const position = container.children.connectorBottom.position;
    // alert(position.x)
    

    const container2 = new Container({
      workspace,
      position: new Position(200, 150),
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
      position: new Position(400, 300),
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
      position: new Position(600, 400),
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

    const domController = new DomController('#node1')
    const domController2 = new DomController('#node2')
    const domController3 = new DomController('#node3')

    animate((dt, frame) => {
      const delta = getPositionDelta(mouseState.mousePosition, previousMousePosition)
      previousMousePosition = { x: mouseState.mousePosition.x, y: mouseState.mousePosition.y }

      // 複数containerをdnd
      dragContainers = DragAndDrop(
        containers,
        delta,
        mouseState,
        dragEligible,
        dragContainers,
        false,
        () => {
          // container2のChildrenも一緒に動かす
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

      domController.move(container.position.x, container.position.y)
      domController2.move(container2.position.x, container2.position.y)
      domController3.move(container3.position.x, container3.position.y)
    })
  }, [])

  return (
    <>
      <h1>Headless VPL</h1>
      {/* workspace */}
      <div
        style={{
          width: '1200px',
          height: '700px',
          backgroundColor: 'rgb(244, 253, 255)',
          position: 'relative',
        }}
      >
        {/* Debug */}
        <svg id='workspace' style={{ width: '100%', height: '100%', position: 'absolute' }}></svg>

        {/* display */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <ScratchLikeBlock id='node1' />
          <Node id='node2' />
          <Node id='node3' />
        </div>
      </div>
    </>
  )
}

const Node = ({ id }: { id: string }) => {
  return (
    <div
      id={id}
      style={{
        cursor: 'grab',
        position: 'absolute',
        width: '200px',
        height: '70px',
        boxShadow: '0 12px 16px rgba(0, 0, 0, 0.2)',
        borderRadius: '15px',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #667eea, rgb(255, 0, 234))',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <p style={{ color: 'white', fontWeight: 'bold', margin: 0 }}>ノード</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <input
          type='text'
          placeholder='入力'
          style={{
            borderRadius: '5px',
            border: 'none',
            width: '50%',
            pointerEvents: 'auto',
          }}
        />
        <label style={{ color: 'white', fontWeight: 'bold' }}>
          <input type='checkbox' style={{ marginRight: '5px', pointerEvents: 'auto' }} />
          トグル
        </label>
      </div>
      <input type='range' name='' id='' style={{ pointerEvents: 'auto' }} />
    </div>
  )
}
const ScratchLikeBlock = ({ id }: { id: string }) => {
  return (
    <div
      id={id}
      style={{
        cursor: 'grab',
        position: 'absolute',
        width: '200px',
        height: '70px',
        boxShadow: '0 12px 16px rgba(0, 0, 0, 0.2)',
        borderRadius: '15px',
        display: 'flex',
        flexDirection: 'column',
        background: 'blue',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'left' }}>
        <input
          type='text'
          placeholder='歩数'
          style={{
            borderRadius: '5px',
            border: 'none',
            margin: '5px',
            padding: '5px',
            backgroundColor: 'white',
            width: '20%',
            color: 'black',
            pointerEvents: 'auto',
          }}
        />
        <p style={{ color: 'white', fontWeight: 'bold' }}>歩動かす</p>
      </div>
    </div>
  )
}
export default App
