import Position from './Position'
import Workspace from './Workspace'

interface EdgeData {
  start: Position
  end: Position
  type: 'straight' | 'bezier'
}

type Props = {
  workspace: Workspace
  start: Position
  end: Position
}

class Edge {
  public edgeData: EdgeData
  public workspace: Workspace
  public domElement: SVGElement | null = null

  constructor({ workspace, start, end }: Props) {
    this.workspace = workspace
    this.edgeData = {
      start,
      end,
      type: 'straight',
    }

    this.createDom()
  }

  public update(): void {
    if (!this.domElement) return
    this.domElement.setAttribute('x1', `${this.edgeData.start.x}`)
    this.domElement.setAttribute('y1', `${this.edgeData.start.y}`)
    this.domElement.setAttribute('x2', `${this.edgeData.end.x}`)
    this.domElement.setAttribute('y2', `${this.edgeData.end.y}`)
  }

  public createDom(): void {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', `${this.edgeData.start.x}`)
    line.setAttribute('y1', `${this.edgeData.start.y}`)
    line.setAttribute('x2', `${this.edgeData.end.x}`)
    line.setAttribute('y2', `${this.edgeData.end.y}`)
    line.setAttribute('stroke', 'black')
    line.setAttribute('stroke-width', '2')

    this.domElement = line
    this.workspace.getWorkspace().appendChild(this.domElement)
  }

  public move(start: Position, end: Position): void {
    this.edgeData.start = start
    this.edgeData.end = end
    this.update()
  }
}

export default Edge
