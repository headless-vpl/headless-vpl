import type AutoLayout from './AutoLayout'
import type Position from './Position'
import type Workspace from './Workspace'
import { generateId } from './types'
import type { IWorkspaceElement } from './types'

/**
 * 動くオブジェクトに共通するプロパティ・処理をまとめた基底クラス。
 * DOM 依存はゼロ — 描画は外部の Renderer が EventBus 経由で行う。
 */
export abstract class MovableObject implements IWorkspaceElement {
  readonly id: string

  /** スナップ接続による親 (型安全) */
  public Parent: MovableObject | null = null
  /** スナップ接続による子 (複数対応) */
  public Children: Set<MovableObject> = new Set()
  /** この要素が所属するAutoLayout（サイズ変更の伝搬に使用） */
  public parentAutoLayout: AutoLayout | null = null

  public workspace!: Workspace
  public position: Position
  public name: string
  public type: string
  public selected = false

  constructor(workspace: Workspace | undefined, position: Position, name: string, type: string) {
    this.id = generateId(type)
    if (workspace) this.workspace = workspace
    this.position = position
    this.name = name
    this.type = type
    // NOTE: サブクラスで初期化完了後に this.workspace.addElement(this) を呼ぶこと
  }

  /**
   * プロパティ変更を通知する。Renderer が 'update' イベントで再描画する。
   */
  public update(): void {
    this.workspace.eventBus.emit('update', this)
  }

  /**
   * 位置を変更し 'move' イベントを発火する。
   * @param skipSnapCascade trueの場合、スナップ接続された子へのカスケード移動をスキップする（AutoLayout配置時に使用）
   */
  public move(x: number, y: number, skipSnapCascade = false): void {
    const dx = x - this.position.x
    const dy = y - this.position.y
    this.position.x = x
    this.position.y = y
    this.workspace.eventBus.emit('move', this)
    if (!skipSnapCascade) {
      // スナップ接続された子を再帰的に追従させる
      for (const child of this.Children) {
        if (child.Parent !== this) continue
        child.move(child.position.x + dx, child.position.y + dy)
      }
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      position: { x: this.position.x, y: this.position.y },
      selected: this.selected,
    }
  }
}
