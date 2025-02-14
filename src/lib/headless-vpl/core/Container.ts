import { getPositionDelta } from '../util/mouse'
import AutoLayout from './AutoLayout'
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
      this.updateChildPosition(child)
      this.updateChildLayout(child)
    }
  }

  //子要素を同じように移動させる
  private updateChildPosition(child: MovableObject | AutoLayout) {
    if (this.isMovableObject(child)) {
      child.move(this.position.x + child.position.x, this.position.y - child.position.y)
    }
  }

  //子要素（AutoLayout）を更新する
  private updateChildLayout(child: MovableObject | AutoLayout) {
    if (this.isAutoLayout(child)) {
      child.setParent(this)
      child.update()
      console.log(child.parentContainer)
    }
  }

  //移動
  move(x: number, y: number) {
    const delta = this.calculatePositionDelta(x, y)
    super.move(x, y)

    //子要素の移動処理
    this.updateChildrenPosition(delta)
  }

  //子要素の移動処理
  private updateChildrenPosition(delta: { x: number; y: number }) {
    for (const child of Object.values(this.children)) {
      if (this.isMovableObject(child)) {
        child.move(child.position.x - delta.x, child.position.y - delta.y)
      } else if (this.isAutoLayout(child)) {
        child.update()
        console.log(child.parentContainer)
      }
    }
  }

  //親の移動差分を計算する
  private calculatePositionDelta(x: number, y: number) {
    const previousPosition = this.position
    return getPositionDelta(previousPosition, { x, y })
  }

  //子要素がMovableObjectかどうかを判断する
  private isMovableObject(child: any): child is MovableObject {
    return child instanceof MovableObject
  }

  //子要素がAutoLayoutかどうかを判断する
  private isAutoLayout(child: any): child is AutoLayout {
    return child instanceof AutoLayout
  }
}

export default Container
