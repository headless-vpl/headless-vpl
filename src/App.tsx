import { useEffect } from 'react'
import { Workspace, Position, Connector } from './lib/headless-vpl'

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

    let frame = 0
    function animate() {
      const x = Math.sin(frame / 20) * 2
      const y = Math.cos(frame / 20) * 2
      connector.move(connector.position.x + x, connector.position.y + 0)
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
