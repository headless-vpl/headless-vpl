import { useEffect } from 'react'
import { Workspace, Position, Connector, Edge, getDistance } from './lib/headless-vpl'
import { getMousePosition, getMouseState } from './lib/headless-vpl/util/mouse'

function App() {
  useEffect(() => {
    const workspace = new Workspace('#workspace')
    const workspaceElement = workspace.getWorkspace()

    console.log(workspaceElement)

    const position = new Position(100, 100)
    console.log(position.getPosition())

    const connector = new Connector({
      workspace,
      position,
      name: 'connector',
      type: 'input',
    })
    console.log(connector)

    const edge = new Edge({
      workspace,
      start: position,
      end: position,
    })

    const mousePosition = getMousePosition(workspaceElement)
    
    const mouseState = getMouseState(workspaceElement, (newState) => {
      console.log('mouseState changed:', newState)
    })

    let frame = 0
    function animate() {
      const x = Math.sin(frame / 20) * 50 + 100
      const y = Math.cos(frame / 20) * 50 + 100

      connector.move(mousePosition.x, mousePosition.y)

      const start = new Position(mousePosition.x, mousePosition.y)
      const end = new Position(100, 100)

      edge.move(start, end)

      // const distance = getDistance(edge.edgeData.start, connector.position)
      // console.log(distance)

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
          <rect x='100' y='100' width='100' height='100' fill='blue' />
        </svg>
      </div>
    </>
  )
}

export default App
