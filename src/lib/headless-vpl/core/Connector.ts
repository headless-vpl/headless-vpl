import Position from './Position'
import Workspace from './Workspace'
import { MovableObject } from './MovableObject'

type ConnectorProps = {
  workspace: Workspace
  position: Position
  name: string
  type: 'input' | 'output'
}

class Connector extends MovableObject {
  constructor({ workspace, position, name, type }: ConnectorProps) {
    super(workspace, position, name, type)
  }

  public createDom(): void {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', `${this.position.x}`)
    circle.setAttribute('cy', `${this.position.y}`)
    circle.setAttribute('r', '10')
    circle.setAttribute('stroke', 'black')
    circle.setAttribute('fill', 'red')
    this.domElement = circle

    this.workspace.getWorkspace().appendChild(this.domElement)
  }

  public update(): void {
    if (!this.domElement) return
    this.domElement.setAttribute('cx', `${this.position.x}`)
    this.domElement.setAttribute('cy', `${this.position.y}`)
  }
}

export default Connector
