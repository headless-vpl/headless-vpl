import type AutoLayout from './AutoLayout'
import type Container from './Container'
import type { Command } from './History'
import { MovableObject } from './MovableObject'
import type Workspace from './Workspace'
import type { IEdge, IWorkspaceElement } from './types'

/**
 * 移動コマンド。要素を指定位置に移動する。
 */
export class MoveCommand implements Command {
  private element: IWorkspaceElement
  private fromX: number
  private fromY: number
  private toX: number
  private toY: number

  constructor(element: IWorkspaceElement, fromX: number, fromY: number, toX: number, toY: number) {
    this.element = element
    this.fromX = fromX
    this.fromY = fromY
    this.toX = toX
    this.toY = toY
  }

  execute(): void {
    this.element.move(this.toX, this.toY)
  }

  undo(): void {
    this.element.move(this.fromX, this.fromY)
  }
}

/**
 * 要素追加コマンド。
 */
export class AddCommand implements Command {
  private workspace: Workspace
  private element: IWorkspaceElement

  constructor(workspace: Workspace, element: IWorkspaceElement) {
    this.workspace = workspace
    this.element = element
  }

  execute(): void {
    this.workspace.addElement(this.element)
  }

  undo(): void {
    this.workspace.removeElement(this.element)
  }
}

/**
 * 要素削除コマンド。Undo で再追加する。
 */
export class RemoveCommand implements Command {
  private workspace: Workspace
  private element: IWorkspaceElement
  private relatedEdges: IEdge[] = []
  private savedParent: MovableObject | null = null
  private savedChildren: Set<MovableObject> = new Set()
  private savedChildElements: IWorkspaceElement[] = []

  constructor(workspace: Workspace, element: IWorkspaceElement) {
    this.workspace = workspace
    this.element = element
    // 削除前に関連 Edge を記録
    this.relatedEdges = this.findRelatedEdges()
  }

  private findRelatedEdges(): IEdge[] {
    const childIds = new Set<string>()
    childIds.add(this.element.id)
    if ('children' in this.element) {
      const children = (this.element as { children: Record<string, { id: string }> }).children
      for (const child of Object.values(children)) {
        if (child && typeof child === 'object' && 'id' in child) {
          childIds.add(child.id)
        }
      }
    }

    return this.workspace.edges.filter((edge) => {
      const e = edge as unknown as {
        startConnector?: { id: string }
        endConnector?: { id: string }
      }
      return (
        (e.startConnector && childIds.has(e.startConnector.id)) ||
        (e.endConnector && childIds.has(e.endConnector.id))
      )
    })
  }

  execute(): void {
    // Parent/Children を保存してクリーンアップ
    const mo = this.element as unknown as {
      Parent: MovableObject | null
      Children: Set<MovableObject>
    }
    this.savedParent = mo.Parent
    this.savedChildren = new Set(mo.Children)

    for (const edge of this.relatedEdges) {
      this.workspace.removeEdge(edge)
    }
    if (mo.Parent) {
      mo.Parent.Children.delete(mo as unknown as MovableObject)
      mo.Parent = null
    }
    for (const child of mo.Children) {
      child.Parent = null
    }
    mo.Children.clear()

    // 子要素（Connector 等）を workspace から除去
    this.savedChildElements = []
    if ('children' in this.element) {
      const children = (this.element as { children: Record<string, IWorkspaceElement> }).children
      for (const child of Object.values(children)) {
        if (child && typeof child === 'object' && 'id' in child) {
          this.savedChildElements.push(child)
          this.workspace.removeElement(child)
        }
      }
    }

    this.workspace.removeElement(this.element)
  }

  undo(): void {
    this.workspace.addElement(this.element)
    // 子要素を復元
    for (const child of this.savedChildElements) {
      this.workspace.addElement(child)
    }
    for (const edge of this.relatedEdges) {
      this.workspace.addEdge(edge)
    }
    // Parent/Children を復元
    const mo = this.element as unknown as {
      Parent: MovableObject | null
      Children: Set<MovableObject>
    }
    if (this.savedParent) {
      mo.Parent = this.savedParent
      this.savedParent.Children.add(mo as unknown as MovableObject)
    }
    for (const child of this.savedChildren) {
      mo.Children.add(child)
      child.Parent = mo as unknown as MovableObject
    }
  }
}

/**
 * 接続コマンド。2 つの要素の Parent/Children 関係を設定する。
 */
export class ConnectCommand implements Command {
  private workspace: Workspace
  private parent: IWorkspaceElement & { Children: Set<MovableObject> }
  private child: IWorkspaceElement & { Parent: unknown }

  constructor(
    workspace: Workspace,
    parent: IWorkspaceElement & { Children: Set<MovableObject> },
    child: IWorkspaceElement & { Parent: unknown }
  ) {
    this.workspace = workspace
    this.parent = parent
    this.child = child
  }

  execute(): void {
    this.child.Parent = this.parent
    this.parent.Children.add(this.child as unknown as MovableObject)
    this.workspace.eventBus.emit('connect', this.child, {
      parent: this.parent.id,
      child: this.child.id,
    })
  }

  undo(): void {
    this.workspace.eventBus.emit('disconnect', this.child, {
      parent: this.parent.id,
      child: this.child.id,
    })
    this.child.Parent = null
    this.parent.Children.delete(this.child as unknown as MovableObject)
  }
}

/**
 * ネストコマンド。Container を AutoLayout に追加/除去する。
 */
/**
 * 複数コマンドをまとめて1つのUndoableコマンドにする。
 * execute は順番に、undo は逆順に実行する。
 */
export class BatchCommand implements Command {
  private commands: Command[]

  constructor(commands: Command[]) {
    this.commands = commands
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute()
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo()
    }
  }
}

/**
 * デタッチコマンド。snap Parent/Children 関係および AutoLayout からの除去を行う。
 * ツリーDnDで要素を移動する前に、既存の親関係を解除するために使用する。
 */
export class DetachCommand implements Command {
  private workspace: Workspace
  private element: MovableObject
  private savedParent: MovableObject | null = null
  private savedAutoLayout: AutoLayout | null = null
  private savedAutoLayoutIndex = -1

  constructor(workspace: Workspace, element: MovableObject) {
    this.workspace = workspace
    this.element = element
  }

  execute(): void {
    // snap Parent 関係を保存して解除
    this.savedParent = this.element.Parent
    if (this.savedParent) {
      this.savedParent.Children.delete(this.element)
      this.workspace.eventBus.emit('disconnect', this.element, {
        parent: this.savedParent.id,
        child: this.element.id,
      })
      this.element.Parent = null
    }

    // AutoLayout からの除去を保存して実行
    this.savedAutoLayout = this.element.parentAutoLayout
    if (this.savedAutoLayout) {
      const children = this.savedAutoLayout.Children as Container[]
      this.savedAutoLayoutIndex = children.indexOf(this.element as unknown as Container)
      this.savedAutoLayout.removeElement(this.element as unknown as Container)
      this.workspace.eventBus.emit('unnest', this.element, {
        parentId: this.savedAutoLayout.parentContainer?.id ?? this.savedAutoLayout.id,
        childId: this.element.id,
      })
    }
  }

  undo(): void {
    // AutoLayout への復元
    if (this.savedAutoLayout) {
      this.savedAutoLayout.insertElement(
        this.element as unknown as Container,
        this.savedAutoLayoutIndex >= 0 ? this.savedAutoLayoutIndex : undefined
      )
      this.workspace.eventBus.emit('nest', this.element, {
        parentId: this.savedAutoLayout.parentContainer?.id ?? this.savedAutoLayout.id,
        childId: this.element.id,
        index: this.savedAutoLayoutIndex,
      })
    }

    // snap Parent 関係の復元
    if (this.savedParent) {
      this.element.Parent = this.savedParent
      this.savedParent.Children.add(this.element)
      this.workspace.eventBus.emit('connect', this.element, {
        parent: this.savedParent.id,
        child: this.element.id,
      })
    }
  }
}

export class NestCommand implements Command {
  private child: Container
  private layout: AutoLayout
  private workspace: Workspace
  private index: number
  private prevPosition: { x: number; y: number }

  constructor(child: Container, layout: AutoLayout, workspace: Workspace, index: number) {
    this.child = child
    this.layout = layout
    this.workspace = workspace
    this.index = index
    this.prevPosition = { x: child.position.x, y: child.position.y }
  }

  execute(): void {
    this.layout.insertElement(this.child, this.index)
    this.workspace.eventBus.emit('nest', this.child, {
      parentId: this.layout.parentContainer?.id ?? this.layout.id,
      childId: this.child.id,
      index: this.index,
    })
  }

  undo(): void {
    this.layout.removeElement(this.child)
    this.child.move(this.prevPosition.x, this.prevPosition.y)
    this.workspace.eventBus.emit('unnest', this.child, {
      parentId: this.layout.parentContainer?.id ?? this.layout.id,
      childId: this.child.id,
    })
  }
}

/**
 * 構造的子要素（Connector/AutoLayout）の親コンテナ変更コマンド。
 * ワールド座標を維持しつつ、新しい親コンテナからの相対座標に変換する。
 */
export class ReparentChildCommand implements Command {
  private child: MovableObject | AutoLayout
  private sourceContainer: Container
  private sourceKey: string
  private targetContainer: Container | null
  private targetKey: string | null
  private savedRelativePos: { x: number; y: number }

  constructor(
    child: MovableObject | AutoLayout,
    sourceContainer: Container,
    sourceKey: string,
    targetContainer?: Container,
    targetKey?: string
  ) {
    this.child = child
    this.sourceContainer = sourceContainer
    this.sourceKey = sourceKey
    this.targetContainer = targetContainer ?? null
    this.targetKey = targetKey ?? null
    // 元の相対座標を保存（undo用）
    this.savedRelativePos = { x: child.position.x, y: child.position.y }
  }

  execute(): void {
    // ワールド座標を記録
    let worldX: number
    let worldY: number
    if (this.child instanceof MovableObject) {
      // Connector: position はワールド座標そのもの（parent.x + relative.x, parent.y - relative.y で計算されている）
      worldX = this.child.position.x
      worldY = this.child.position.y
    } else {
      // AutoLayout: absolutePosition がワールド座標
      const abs = (this.child as AutoLayout).absolutePosition
      worldX = abs.x
      worldY = abs.y
    }

    // 元の親から除去
    this.sourceContainer.removeChild(this.sourceKey)

    if (this.targetContainer && this.targetKey) {
      // 新しい親からの相対座標に変換
      const targetPos = this.targetContainer.position
      if (this.child instanceof MovableObject) {
        // Connector の相対座標: relative.x = world.x - parent.x, relative.y = parent.y - world.y
        this.child.position.x = worldX - targetPos.x
        this.child.position.y = targetPos.y - worldY
      } else {
        // AutoLayout の相対座標: relative.x = world.x - parent.x, relative.y = world.y - parent.y
        this.child.position.x = worldX - targetPos.x
        this.child.position.y = worldY - targetPos.y
      }

      // 新しい親に追加
      this.targetContainer.addChild(this.targetKey, this.child)
      return
    }

    // Workspace 直下に外す場合はワールド座標をそのまま保持
    this.child.position.x = worldX
    this.child.position.y = worldY
    if (this.child instanceof MovableObject) {
      this.child.update()
    } else {
      this.child.workspace.eventBus.emit('update', this.child)
    }
  }

  undo(): void {
    // 新しい親から除去（workspace直下へ外していた場合は不要）
    if (this.targetContainer && this.targetKey) {
      this.targetContainer.removeChild(this.targetKey)
    }

    // 元の相対座標を復元
    this.child.position.x = this.savedRelativePos.x
    this.child.position.y = this.savedRelativePos.y

    // 元の親に追加
    this.sourceContainer.addChild(this.sourceKey, this.child)
  }
}
