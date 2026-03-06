import AutoLayout from './AutoLayout'
import Connector from './Connector'
import { MovableObject } from './MovableObject'
import Position from './Position'
import type Workspace from './Workspace'
import type { Padding, SizingMode } from './types'

type ContainerProps<
  // biome-ignore lint/complexity/noBannedTypes: {} is the idiomatic default for empty generic in TypeScript
  T extends { [key: string]: MovableObject | AutoLayout } = {},
> = {
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
  contentGap?: number
  children?: T
}

class Container<
  // biome-ignore lint/complexity/noBannedTypes: {} is the idiomatic default for empty generic in TypeScript
  T extends { [key: string]: MovableObject | AutoLayout } = {},
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
  contentGap: number
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
    contentGap,
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
    this.maxWidth = maxWidth ?? Number.POSITIVE_INFINITY
    this.minHeight = minHeight ?? 0
    this.maxHeight = maxHeight ?? Number.POSITIVE_INFINITY
    this.resizable = resizable ?? false
    this.contentGap = contentGap ?? 0
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

  public override update(): void {
    this.refreshAnchoredChildren()
    super.update()
  }

  applyContentSize(_contentWidth: number, _contentHeight: number): void {
    // resizesParent=true のAutoLayout子からサイズを計算
    const bodyLayouts = Object.values(this.children).filter(
      (child): child is AutoLayout => this.isAutoLayout(child) && child.resizesParent
    )

    let contentWidth = _contentWidth
    let contentHeight = _contentHeight

    if (bodyLayouts.length > 0) {
      // Y座標でソートして正しい順序を保証
      bodyLayouts.sort((a, b) => a.position.y - b.position.y)

      // 高さ = body AutoLayout高さの合算 + contentGap × (count - 1)
      contentHeight =
        bodyLayouts.reduce((sum, l) => sum + l.height, 0) +
        this.contentGap * Math.max(0, bodyLayouts.length - 1)
      // 幅 = body AutoLayout幅の最大値
      contentWidth = Math.max(...bodyLayouts.map((l) => l.width))

      // body AutoLayoutを縦に自動配置
      let cursor = bodyLayouts[0].position.y
      for (const layout of bodyLayouts) {
        if (layout.position.y !== cursor) {
          layout.position.y = cursor
          layout.relayout()
        }
        cursor += layout.height + this.contentGap
      }
    }

    let changed = false
    if (this.widthMode === 'hug') {
      const newWidth = Math.min(
        Math.max(contentWidth + this.padding.left + this.padding.right, this.minWidth),
        this.maxWidth
      )
      if (this.width !== newWidth) {
        this.width = newWidth
        changed = true
      }
    }
    if (this.heightMode === 'hug') {
      const newHeight = Math.min(
        Math.max(contentHeight + this.padding.top + this.padding.bottom, this.minHeight),
        this.maxHeight
      )
      if (this.height !== newHeight) {
        this.height = newHeight
        changed = true
      }
    }
    if (changed) {
      this.update()
      // サイズ変更を親AutoLayoutに伝搬（ネストされたC-block対応）
      this.parentAutoLayout?.update()
    }
  }

  updateChildren() {
    for (const child of Object.values(this.children)) {
      this.updateChildPosition(child)
      this.updateChildLayout(child)
    }
    this.refreshAnchoredChildren()
  }

  private updateChildPosition(child: MovableObject | AutoLayout) {
    if (child instanceof Connector && child.isAnchored()) {
      return
    }
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

  move(x: number, y: number, skipSnapCascade = false) {
    const dx = this.position.x - x
    const dy = this.position.y - y
    super.move(x, y, skipSnapCascade)
    this.updateChildrenPosition({ x: dx, y: dy })
  }

  private updateChildrenPosition(delta: { x: number; y: number }) {
    for (const child of Object.values(this.children)) {
      if (this.isMovableObject(child)) {
        if (child instanceof Connector && child.isAnchored()) {
          continue
        }
        child.move(child.position.x - delta.x, child.position.y - delta.y)
      } else if (this.isAutoLayout(child)) {
        child.relayout()
      }
    }
    this.refreshAnchoredChildren()
  }

  private isMovableObject(child: unknown): child is MovableObject {
    return child instanceof MovableObject
  }

  private isAutoLayout(child: unknown): child is AutoLayout {
    return child instanceof AutoLayout
  }

  /**
   * 構造的子要素をキーで追加する。ランタイムでの親コンテナ変更に使用。
   */
  addChild(key: string, child: MovableObject | AutoLayout): void {
    ;(this.children as Record<string, MovableObject | AutoLayout>)[key] = child
    if (this.workspace) {
      this.bindChildWorkspace(child, this.workspace)
    }
    this.updateChildPosition(child)
    this.updateChildLayout(child)
    this.refreshAnchoredChildren()
    this.update()
  }

  /**
   * 構造的子要素をキーで除去する。workspaceからは除去しない（移動先で再利用）。
   * 戻り値は除去された子要素。
   */
  removeChild(key: string): MovableObject | AutoLayout | undefined {
    const child = (this.children as Record<string, MovableObject | AutoLayout>)[key]
    if (!child) return undefined
    delete (this.children as Record<string, MovableObject | AutoLayout>)[key]
    if (this.isAutoLayout(child)) {
      child.parentContainer = null
    }
    this.refreshAnchoredChildren()
    this.update()
    return child
  }

  /**
   * 子要素のオブジェクト参照からキー名を逆引きする。
   */
  findChildKey(child: MovableObject | AutoLayout): string | undefined {
    for (const [key, value] of Object.entries(this.children)) {
      if (value === child) return key
    }
    return undefined
  }

  /**
   * anchor を持つ Connector を親/兄弟の最新レイアウトに合わせて再配置する。
   */
  refreshAnchoredChildren(): void {
    for (const child of Object.values(this.children)) {
      if (child instanceof Connector) {
        child.refreshAnchor(this)
      }
    }
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
