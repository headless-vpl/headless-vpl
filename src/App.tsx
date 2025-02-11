import { useEffect } from 'react'
import { Workspace, Position, Connector, Edge, getDistance, Container } from './lib/headless-vpl'
import { getMousePosition, getMouseState } from './lib/headless-vpl/util/mouse'

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
    })

    const mousePosition = getMousePosition(workspaceElement)

    const mouseState = getMouseState(workspaceElement, (newState) => {
      // console.log('mouseState changed:', newState)
    })

    let frame = 0
    function animate() {
      const x = Math.sin(frame / 20) * 50 + 100
      const y = Math.cos(frame / 20) * 50 + 100

      connector.move(mousePosition.x, mousePosition.y)

      const start = new Position(mousePosition.x, mousePosition.y)
      const end = new Position(100, 100)

      edge.move(start, end)

      const distance = getDistance(mousePosition, container.position)
      if (distance > 50) {
        container.setColor('green')
      } else {
        container.setColor('red')
      }
      frame++
      requestAnimationFrame(animate)
    }

    animate()
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
