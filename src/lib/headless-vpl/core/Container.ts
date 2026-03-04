import AutoLayout from './AutoLayout'
import { MovableObject } from './MovableObject'
import Position from './Position'
import Workspace from './Workspace'
import type { SizingMode, Padding } from './types'

type ContainerProps<T extends { [key: string]: MovableObject | AutoLayout } = {}> = {
  workspace?: Workspace
  position?: Position
  name: string
  color?: string
  width?: number
  height?: number
  widthMode?: SizingMode
  heightMode?: SizingMode
  padding?: Partial<Padding>
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  resizable?: boolean
  children?: T
}

class Container<
  T extends { [key: string]: MovableObject | AutoLayout } = {}
> extends MovableObject {
  color: string
  width: number
  height: number
  widthMode: SizingMode
  heightMode: SizingMode
  padding: Padding
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  resizable: boolean
  children: T

  constructor({
    workspace,
    position = new Position(0, 0),
    name,
    color,
    width,
    height,
    widthMode,
    heightMode,
    padding,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    resizable,
    children,
  }: ContainerProps<T>) {
    super(workspace, position, name, 'container')
    this.color = color || 'red'
    this.width = width || 100
    this.height = height || 100
    this.widthMode = widthMode || 'fixed'
    this.heightMode = heightMode || 'fixed'
    this.padding = {
      top: padding?.top ?? 0,
      right: padding?.right ?? 0,
      bottom: padding?.bottom ?? 0,
      left: padding?.left ?? 0,
    }
    this.minWidth = minWidth ?? 0
    this.maxWidth = maxWidth ?? Infinity
    this.minHeight = minHeight ?? 0
    this.maxHeight = maxHeight ?? Infinity
    this.resizable = resizable ?? false
    this.children = children || ({} as T)

    if (this.workspace) {
      this.propagateWorkspace(this.workspace)
      this.workspace.addElement(this)
      this.move(position.x, position.y)
      this.updateChildren()
    }
  }

  private propagateWorkspace(ws: Workspace) {
    for (const child of Object.values(this.children)) {
      this.bindChildWorkspace(child, ws)
    }
  }

  private bindChildWorkspace(child: MovableObject | AutoLayout, ws: Workspace) {
    if (child.workspace) return

    child.workspace = ws
    ws.addElement(child)

    if (child instanceof Container) {
      for (const grandChild of Object.values(child.children) as (MovableObject | AutoLayout)[]) {
        this.bindChildWorkspace(grandChild, ws)
      }
    } else if (child instanceof AutoLayout) {
      for (const grandChild of child.Children) {
        this.bindChildWorkspace(grandChild, ws)
      }
    }
  }

  setColor(color: string) {
    this.color = color
    this.update()
  }

  applyContentSize(contentWidth: number, contentHeight: number): void {
    let changed = false
    if (this.widthMode === 'hug') {
      const newWidth = Math.min(Math.max(contentWidth + this.padding.left + this.padding.right, this.minWidth), this.maxWidth)
      if (this.width !== newWidth) {
        this.width = newWidth
        changed = true
      }
    }
    if (this.heightMode === 'hug') {
      const newHeight = Math.min(Math.max(contentHeight + this.padding.top + this.padding.bottom, this.minHeight), this.maxHeight)
      if (this.height !== newHeight) {
        this.height = newHeight
        changed = true
      }
    }
    if (changed) {
      this.update()
    }
  }

  updateChildren() {
    for (const child of Object.values(this.children)) {
      this.updateChildPosition(child)
      this.updateChildLayout(child)
    }
  }

  private updateChildPosition(child: MovableObject | AutoLayout) {
    if (this.isMovableObject(child)) {
      child.move(this.position.x + child.position.x, this.position.y - child.position.y)
    }
  }

  private updateChildLayout(child: MovableObject | AutoLayout) {
    if (this.isAutoLayout(child)) {
      child.setParent(this)
      child.update()
    }
  }

  move(x: number, y: number) {
    const dx = this.position.x - x
    const dy = this.position.y - y
    super.move(x, y)
    this.updateChildrenPosition({ x: dx, y: dy })
  }

  private updateChildrenPosition(delta: { x: number; y: number }) {
    for (const child of Object.values(this.children)) {
      if (this.isMovableObject(child)) {
        child.move(child.position.x - delta.x, child.position.y - delta.y)
      } else if (this.isAutoLayout(child)) {
        child.update()
      }
    }
  }

  private isMovableObject(child: unknown): child is MovableObject {
    return child instanceof MovableObject
  }

  private isAutoLayout(child: unknown): child is AutoLayout {
    return child instanceof AutoLayout
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      color: this.color,
      width: this.width,
      height: this.height,
      widthMode: this.widthMode,
      heightMode: this.heightMode,
      padding: this.padding,
      children: Object.fromEntries(
        Object.entries(this.children).map(([key, child]) => {
          const c = child as MovableObject | AutoLayout
          return [key, 'toJSON' in c ? (c as ISerializable).toJSON() : {}]
        })
      ),
    }
  }
}

interface ISerializable {
  toJSON(): Record<string, unknown>
}

export default Container
