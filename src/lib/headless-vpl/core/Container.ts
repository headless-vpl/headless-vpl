import { MovableObject } from './MovableObject'
import Position from './Position'
import Workspace from './Workspace'

type ContainerProps = {
  workspace: Workspace
  position: Position
  name: string
}

class Container extends MovableObject {
  color: string
  width: number
  height: number

  constructor({ workspace, position, name }: ContainerProps) {
    super(workspace, position, name, 'container')
    this.color = 'red'
    this.width = 100
    this.height = 100
    this.createDom()

    this.move(position.x, position.y)
  }

  createDom(): void {
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    container.setAttribute('width', `${this.width}`)
    container.setAttribute('height', `${this.height}`)
    container.setAttribute('stroke-width', '4')
    container.setAttribute('stroke', this.color)
    container.setAttribute('fill', 'none')

    this.domElement = container
    this.workspace.getWorkspace().appendChild(this.domElement)
  }

  update() {
    if (!this.domElement) return
    this.domElement.setAttribute('x', `${this.position.x}`)
    this.domElement.setAttribute('y', `${this.position.y}`)
  }

  setColor(color: string) {
    this.color = color
    if (!this.domElement) return
    this.domElement.setAttribute('stroke', color)
  }
}

export default Container
