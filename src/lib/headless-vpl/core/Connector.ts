import Position from './Position'
import Workspace from './Workspace'

type Props = {
  workspace: Workspace
  position: Position
  name: string
  type: 'input' | 'output'
}

class Connector {
  public workspace: Workspace
  public position: Position
  public name: string
  public type: 'input' | 'output'
  public show: boolean
  public domElement: SVGCircleElement | null = null

  constructor({ workspace, position, name, type }: Props) {
    this.workspace = workspace
    this.position = position
    this.name = name
    this.type = type
    this.show = false
    
    this.workspace.addElement(this)
    this.createDom()
  }

  public createDom() {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', `${this.position.x}`)
    circle.setAttribute('cy', `${this.position.y}`)
    circle.setAttribute('r', '10')
    circle.setAttribute('stroke', 'black')
    circle.setAttribute('fill', 'red')
    this.domElement = circle

    this.workspace.getWorkspace().appendChild(this.domElement)
  }

  public update() {
    if (!this.domElement) return

    this.domElement.setAttribute('cx', `${this.position.x}`)
    this.domElement.setAttribute('cy', `${this.position.y}`)
  }

  public move(x: number, y: number) {
    this.position.x = x
    this.position.y = y
    this.update()
  }
}

export default Connector
