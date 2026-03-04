import type { Command } from './History'
import type { IWorkspaceElement, IEdge } from './types'
import type Workspace from './Workspace'
import type { MovableObject } from './MovableObject'
import type AutoLayout from './AutoLayout'
import type Container from './Container'

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
  private savedChildren: MovableObject | null = null
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
      const e = edge as unknown as { startConnector?: { id: string }; endConnector?: { id: string } }
      return (
        (e.startConnector && childIds.has(e.startConnector.id)) ||
        (e.endConnector && childIds.has(e.endConnector.id))
      )
    })
  }

  execute(): void {
    // Parent/Children を保存してクリーンアップ
    const mo = this.element as unknown as { Parent: MovableObject | null; Children: MovableObject | null }
    this.savedParent = mo.Parent
    this.savedChildren = mo.Children

    for (const edge of this.relatedEdges) {
      this.workspace.removeEdge(edge)
    }
    if (mo.Parent) {
      mo.Parent.Children = null
      mo.Parent = null
    }
    if (mo.Children) {
      mo.Children.Parent = null
      mo.Children = null
    }

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
    const mo = this.element as unknown as { Parent: MovableObject | null; Children: MovableObject | null }
    if (this.savedParent) {
      mo.Parent = this.savedParent
      this.savedParent.Children = mo as unknown as MovableObject
    }
    if (this.savedChildren) {
      mo.Children = this.savedChildren
      this.savedChildren.Parent = mo as unknown as MovableObject
    }
  }
}

/**
 * 接続コマンド。2 つの要素の Parent/Children 関係を設定する。
 */
export class ConnectCommand implements Command {
  private workspace: Workspace
  private parent: IWorkspaceElement & { Children: unknown }
  private child: IWorkspaceElement & { Parent: unknown }

  constructor(
    workspace: Workspace,
    parent: IWorkspaceElement & { Children: unknown },
    child: IWorkspaceElement & { Parent: unknown }
  ) {
    this.workspace = workspace
    this.parent = parent
    this.child = child
  }

  execute(): void {
    this.child.Parent = this.parent
    this.parent.Children = this.child
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
    this.parent.Children = null
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
