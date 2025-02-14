import { getPositionDelta } from '../util/mouse'
import AutoLayout from './AutoLayout'
import Connector from './Connector'
import { MovableObject } from './MovableObject'
import Position from './Position'
import Workspace from './Workspace'

type ContainerProps<T extends { [key: string]: MovableObject | AutoLayout } = {}> = {
  workspace: Workspace
  position: Position
  name: string
  color?: string
  width?: number
  height?: number
  children?: T
}

class Container<
  T extends { [key: string]: MovableObject | AutoLayout } = {}
> extends MovableObject {
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
    container.setAttribute('rx', '10')
    container.setAttribute('ry', '10')
    container.setAttribute('stroke', this.color)
    container.setAttribute('fill', 'none')

    this.domElement = container
    this.workspace.getWorkspace().appendChild(this.domElement)
  }

  update() {
    if (!this.domElement) return
    this.domElement.setAttribute('x', `${this.position.x}`)
    this.domElement.setAttribute('y', `${this.position.y}`)
    this.domElement.setAttribute('width', `${this.width}`)
    this.domElement.setAttribute('height', `${this.height}`)
  }

  setColor(color: string) {
    this.color = color
    if (!this.domElement) return
    this.domElement.setAttribute('stroke', color)
  }

  updateChildren() {
    for (const child of Object.values(this.children)) {
      //子要素がMovableObjectの場合
      if (this.isMovableObject(child)) {
        child.move(this.position.x + child.position.x, this.position.y - child.position.y)
      }

      //子要素がAutoLayoutの場合、親Containerを自動的にセットする
      if (this.isAutoLayout(child)) {
        child.setParent(this)
        child.update()
        console.log(child.parentContainer)
      }
    }
  }

  //移動
  move(x: number, y: number) {
    // 親の移動差分を計算
    const previousPosition = this.position
    const delta = getPositionDelta(previousPosition, { x, y })

    // 親を移動する
    super.move(x, y)

    // 子要素は型に応じて差分だけ移動または更新を行う
    for (const child of Object.values(this.children)) {
      //子要素がMovableObjectの場合
      if (this.isMovableObject(child)) {
        child.move(child.position.x - delta.x, child.position.y - delta.y)
      }

      //子要素がAutoLayoutの場合
      if (this.isAutoLayout(child)) {
        child.update()
        console.log(child.parentContainer)
      }
    }
  }

  private isMovableObject(child: any): child is MovableObject {
    return child instanceof MovableObject
  }

  private isAutoLayout(child: any): child is AutoLayout {
    return child instanceof AutoLayout
  }
}

export default Container
