import type Container from './Container'
import type Position from './Position'
import { type PositionLike, resolvePosition } from './Position'
import type Workspace from './Workspace'
import { generateId } from './types'
import type { IWorkspaceElement } from './types'

type AutoLayoutDirection = 'horizontal' | 'vertical'
type AutoLayoutAlignment = 'start' | 'center' | 'end'

type AutoLayoutProps = {
  workspace?: Workspace
  position: PositionLike
  width?: number
  height?: number
  direction?: AutoLayoutDirection
  gap?: number
  alignment?: AutoLayoutAlignment
  containers?: Container[]
  minWidth?: number
  minHeight?: number
  resizesParent?: boolean
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
  width = 100
  height = 100
  direction: AutoLayoutDirection
  gap: number
  alignment: AutoLayoutAlignment
  minWidth: number
  minHeight: number
  resizesParent: boolean
  workspace!: Workspace
  name = 'autoLayout'
  type = 'autoLayout'

  constructor({
    workspace,
    position: positionInput,
    width,
    height,
    direction,
    gap,
    alignment,
    containers,
    minWidth,
    minHeight,
    resizesParent,
  }: AutoLayoutProps) {
    this.id = generateId('autolayout')
    if (workspace) this.workspace = workspace
    this.Children = containers ?? []
    this.position = resolvePosition(positionInput)
    this.width = width ?? 100
    this.height = height ?? 100
    this.direction = direction ?? 'horizontal'
    this.gap = gap ?? 10
    this.alignment = alignment ?? 'center'
    this.minWidth = minWidth ?? 0
    this.minHeight = minHeight ?? 0
    this.resizesParent = resizesParent ?? true
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
    element.parentAutoLayout = this
    this.update()
  }

  removeElement(element: Container): boolean {
    const idx = this.Children.indexOf(element)
    if (idx === -1) return false
    this.Children.splice(idx, 1)
    element.parentAutoLayout = null
    this.update()
    return true
  }

  /** 子要素の位置のみ更新する（コンテンツサイズ再計算・親への伝搬なし） */
  relayout(): void {
    if (!this.parentContainer) return
    const abs = this.absolutePosition
    if (this.direction === 'horizontal') this.layoutHorizontal(abs)
    else this.layoutVertical(abs)
    this.parentContainer.refreshAnchoredChildren()
    this.workspace.eventBus.emit('update', this)
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

    if (this.resizesParent) {
      this.parentContainer.applyContentSize(contentSize.width, contentSize.height)
    }

    this.parentContainer.refreshAnchoredChildren()
    this.workspace.eventBus.emit('update', this)
  }

  private layoutHorizontal(abs: { x: number; y: number }) {
    let cursor = abs.x

    for (const child of this.Children) {
      const y = this.alignCrossAxis(abs.y, this.height, child.height)
      child.move(cursor, y, true)
      cursor += child.width + this.gap
    }
  }

  private layoutVertical(abs: { x: number; y: number }) {
    let cursor = abs.y

    for (const child of this.Children) {
      const x = this.alignCrossAxis(abs.x, this.width, child.width)
      child.move(x, cursor, true)
      cursor += child.height + this.gap
    }
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
    }
    const maxWidth = Math.max(...this.Children.map((c) => c.width))
    const totalHeight = this.Children.reduce((sum, c) => sum + c.height, 0) + totalGap
    return {
      width: Math.max(maxWidth, this.minWidth),
      height: Math.max(totalHeight, this.minHeight),
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
