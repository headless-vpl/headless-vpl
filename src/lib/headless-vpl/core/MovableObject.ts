import Position from './Position'
import Workspace from './Workspace'
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
  /** スナップ接続による子 (型安全) */
  public Children: MovableObject | null = null

  public workspace!: Workspace
  public position: Position
  public name: string
  public type: string
  public selected: boolean = false

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
   */
  public move(x: number, y: number): void {
    const dx = x - this.position.x
    const dy = y - this.position.y
    this.position.x = x
    this.position.y = y
    this.workspace.eventBus.emit('move', this)
    // スナップ接続された子を再帰的に追従させる
    if (this.Children) {
      this.Children.move(this.Children.position.x + dx, this.Children.position.y + dy)
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
