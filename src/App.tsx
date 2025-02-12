import { useEffect } from 'react'
import { Workspace, Position, Connector, Edge, getDistance, Container } from './lib/headless-vpl'
import { getMousePosition, getPositionDelta, getMouseState } from './lib/headless-vpl/util/mouse'
import { isCollision } from './lib/headless-vpl/util/collision_detecion'
import { animate } from './lib/headless-vpl/util/animate'

function App() {
  useEffect(() => {
    const workspace = new Workspace('#workspace')
    const workspaceElement = workspace.getWorkspace()

    console.log(workspaceElement)

    const edge = new Edge({
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
          position: new Position(50, 70),
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
          position: new Position(50, 70),
          name: 'connectorBottom',
          type: 'output',
        }),
      },
    })

    const mousePosition = getMousePosition(workspaceElement)
    let previousMousePosition = { x: mousePosition.x, y: mousePosition.y }

    const mouseState = getMouseState(workspaceElement, {
      mousedown: (mouseState) => {
        if (mouseState.leftButton === 'down') {
          // コンテナ上でクリックされたかどうかをチェック
          dragEligible = [container, container2].some((instance) =>
            isCollision(instance, mousePosition)
          )
        }
      },
      mouseup: () => {
        dragEligible = false
        dragContainer = null
      },
    })

    // クリック開始時にコンテナ上でクリックされたかを保持するフラグ
    let dragEligible = false

    let dragContainer: Container | null = null

    animate((dt, frame) => {
      const { dx, dy } = getPositionDelta(mousePosition, previousMousePosition)
      previousMousePosition = { x: mousePosition.x, y: mousePosition.y }

      // ドラッグ&ドロップ
      for (const instance of [container, container2]) {
        if (dragContainer === instance) {
          if (mouseState.leftButton === 'down') {
            instance.setColor('red')
            instance.move(instance.position.x + dx, instance.position.y + dy)
          } else {
            dragContainer = null
          }
        } else if (
          isCollision(instance, mousePosition) &&
          mouseState.leftButton === 'down' &&
          dragEligible
        ) {
          dragContainer = instance
        } else {
          instance.setColor('green')
        }
      }

      edge.move(
        container2.children.connectorBottom.position,
        container.children.connectorTop.position
      )
    })
  }, [])

  return (
    <>
      <h1>Headless VPL</h1>

      {/* workspace */}
      <div style={{ width: '500px', height: '500px', backgroundColor: 'white' }}>
        <svg id='workspace' style={{ width: '100%', height: '100%' }}>
          <rect x='100' y='100' width='100' height='100' fill='gray' />
        </svg>
      </div>
    </>
  )
}

export default App
