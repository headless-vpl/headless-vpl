import { getPositionDelta } from '../util/mouse'
import { MovableObject } from './MovableObject'
import Position from './Position'
import Workspace from './Workspace'

type ContainerProps<T extends { [key: string]: MovableObject } = {}> = {
  workspace: Workspace
  position: Position
  name: string
  color?: string
  width?: number
  height?: number
  children?: T
}

class Container<T extends { [key: string]: MovableObject } = {}> extends MovableObject {
  color: string
  width: number
  height: number
  children: T //childrenの型をTにする

  constructor({ workspace, position, name, color, width, height, children }: ContainerProps<T>) {
    super(workspace, position, name, 'container')
    this.color = color || 'red'
    this.width = width || 100
    this.height = height || 100
    this.children = children || ({} as T) //childrenの型をTにする
    this.createDom()

    this.move(position.x, position.y)
    this.updateChildren()
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

  updateChildren() {
    for (const child of Object.values(this.children)) {
      child.move(this.position.x + child.position.x, this.position.y - child.position.y)
    }
  }

  //移動
  move(x: number, y: number) {
    //親の移動差分を計算
    const previousPosition = this.position
    const delta = getPositionDelta(previousPosition, { x, y })

    //親を移動する
    super.move(x, y)

    // 子要素は差分だけ移動させる
    for (const child of Object.values(this.children)) {
      child.move(child.position.x - delta.x, child.position.y - delta.y)
    }
  }
}

export default Container
