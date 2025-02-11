import { useEffect } from 'react'
import { Workspace } from './lib/headless-vpl'

function App() {
  useEffect(() => {
    const workspace = new Workspace('#workspace')
    const workspaceElement = workspace.getWorkspace()

    console.log(workspaceElement)
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
