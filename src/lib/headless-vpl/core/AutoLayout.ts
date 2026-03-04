import Container from './Container'
import Workspace from './Workspace'
import Position from './Position'
import { generateId } from './types'
import type { IWorkspaceElement } from './types'

type AutoLayoutDirection = 'horizontal' | 'vertical'
type AutoLayoutAlignment = 'start' | 'center' | 'end'

type AutoLayoutProps = {
  workspace?: Workspace
  position: Position
  width?: number
  height?: number
  direction?: AutoLayoutDirection
  gap?: number
  alignment?: AutoLayoutAlignment
  containers: Container[]
  minWidth?: number
  minHeight?: number
}

/**
 * 子 Container を配置するレイアウトマネージャ。
 * direction で水平/垂直、gap で間隔、alignment で交差軸の揃えを制御する。
 * IWorkspaceElement を実装し、MovableObject と同じインターフェースを持つ。
 */
class AutoLayout implements IWorkspaceElement {
  readonly id: string
  Children: Container[] = []
  position: Position
  parentContainer: Container | null = null
  width: number = 100
  height: number = 100
  direction: AutoLayoutDirection
  gap: number
  alignment: AutoLayoutAlignment
  minWidth: number
  minHeight: number
  workspace!: Workspace
  name: string = 'autoLayout'
  type: string = 'autoLayout'

  constructor({ workspace, position, width, height, direction, gap, alignment, containers, minWidth, minHeight }: AutoLayoutProps) {
    this.id = generateId('autolayout')
    if (workspace) this.workspace = workspace
    this.Children = containers
    this.position = position
    this.width = width ?? 100
    this.height = height ?? 100
    this.direction = direction ?? 'horizontal'
    this.gap = gap ?? 10
    this.alignment = alignment ?? 'center'
    this.minWidth = minWidth ?? 0
    this.minHeight = minHeight ?? 0
    if (this.workspace) {
      this.workspace.addElement(this)
    }
  }

  get absolutePosition(): { x: number; y: number } {
    const px = this.parentContainer?.position.x ?? 0
    const py = this.parentContainer?.position.y ?? 0
    return { x: this.position.x + px, y: this.position.y + py }
  }

  setParent(container: Container) {
    this.parentContainer = container
  }

  addElement(element: Container) {
    this.Children.push(element)
    this.update()
  }

  insertElement(element: Container, index?: number): void {
    if (index !== undefined) {
      this.Children.splice(index, 0, element)
    } else {
      this.Children.push(element)
    }
    this.update()
  }

  removeElement(element: Container): boolean {
    const idx = this.Children.indexOf(element)
    if (idx === -1) return false
    this.Children.splice(idx, 1)
    this.update()
    return true
  }

  update() {
    if (!this.parentContainer) return

    // コンテンツサイズを先に計算（alignCrossAxis が正しい高さ/幅を使えるようにする）
    const contentSize = this.computeContentSize()
    this.width = contentSize.width
    this.height = contentSize.height

    const abs = this.absolutePosition

    if (this.direction === 'horizontal') {
      this.layoutHorizontal(abs)
    } else {
      this.layoutVertical(abs)
    }

    this.parentContainer.applyContentSize(contentSize.width, contentSize.height)

    this.workspace.eventBus.emit('update', this)
  }

  private layoutHorizontal(abs: { x: number; y: number }) {
    let cursor = abs.x

    this.Children.forEach((child) => {
      const y = this.alignCrossAxis(abs.y, this.height, child.height)
      child.move(cursor, y)
      cursor += child.width + this.gap
    })
  }

  private layoutVertical(abs: { x: number; y: number }) {
    let cursor = abs.y

    this.Children.forEach((child) => {
      const x = this.alignCrossAxis(abs.x, this.width, child.width)
      child.move(x, cursor)
      cursor += child.height + this.gap
    })
  }

  private alignCrossAxis(start: number, containerSize: number, childSize: number): number {
    switch (this.alignment) {
      case 'start':
        return start
      case 'center':
        return start + (containerSize - childSize) / 2
      case 'end':
        return start + containerSize - childSize
    }
  }

  private computeContentSize(): { width: number; height: number } {
    if (this.Children.length === 0) {
      return { width: this.minWidth, height: this.minHeight }
    }

    const totalGap = this.gap * (this.Children.length - 1)

    if (this.direction === 'horizontal') {
      const totalWidth = this.Children.reduce((sum, c) => sum + c.width, 0) + totalGap
      const maxHeight = Math.max(...this.Children.map((c) => c.height))
      return {
        width: Math.max(totalWidth, this.minWidth),
        height: Math.max(maxHeight, this.minHeight),
      }
    } else {
      const maxWidth = Math.max(...this.Children.map((c) => c.width))
      const totalHeight = this.Children.reduce((sum, c) => sum + c.height, 0) + totalGap
      return {
        width: Math.max(maxWidth, this.minWidth),
        height: Math.max(totalHeight, this.minHeight),
      }
    }
  }

  move(x: number, y: number) {
    this.position.x = x
    this.position.y = y
    this.workspace.eventBus.emit('move', this)
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      position: { x: this.position.x, y: this.position.y },
      width: this.width,
      height: this.height,
      children: this.Children.map((c) => c.toJSON()),
    }
  }
}

export default AutoLayout
