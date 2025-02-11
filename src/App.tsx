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

    const connector = new Connector({
      workspace,
      position: new Position(100, 100),
      name: 'connector',
      type: 'input',
    })
    console.log(connector)

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
    })

    const mousePosition = getMousePosition(workspaceElement)
    let previousMousePosition = { x: mousePosition.x, y: mousePosition.y }

    const mouseState = getMouseState(workspaceElement, (newState) => {
      // console.log('mouseState changed:', newState)
    })

    let drag = false

    animate((deltaTime, frame) => {
      const { dx, dy } = getPositionDelta(mousePosition, previousMousePosition)
      previousMousePosition = { x: mousePosition.x, y: mousePosition.y }

      connector.move(mousePosition.x, mousePosition.y)

      const start = new Position(mousePosition.x, mousePosition.y)
      const end = new Position(100, 100)

      edge.move(start, end)

      // const distance = getDistance(mousePosition, container.position)
      // if (distance > 50) {
      //   container.setColor('green')
      // } else {
      //   container.setColor('red')
      // }

      //ドラッグ&ドロップ]
      if (drag || isCollision(container, mousePosition)) {
        if (mouseState.isLeftButtonDown) {
          drag = true
          container.setColor('red')
          container.move(container.position.x + dx, container.position.y + dy)
        } else {
          drag = false
        }
      } else {
        drag = false
        container.setColor('green')
      }
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
