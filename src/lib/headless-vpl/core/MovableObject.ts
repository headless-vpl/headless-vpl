import Position from './Position'
import Workspace from './Workspace'

/**
 * 動くオブジェクトに共通するプロパティ・処理をまとめた基底クラス
 */
export abstract class MovableObject {
  public workspace: Workspace
  public position: Position
  public name: string

  public type: string
  public show: boolean
  public domElement: SVGElement | null = null

  constructor(workspace: Workspace, position: Position, name: string, type: string) {
    this.workspace = workspace
    this.position = position
    this.name = name
    this.type = type
    this.show = false

    // ワークスペースに自身を登録（管理用）
    this.workspace.addElement(this)

    // DOM 要素の生成
    this.createDom()
  }

  /**
   * 各サブクラスで具体的な DOM 要素の生成処理を実装してください
   */
  public abstract createDom(): void

  /**
   * DOM 要素の状態を更新します。
   * 共通の更新処理がある場合はここに記述し、
   * サブクラスでさらに独自処理を追加する際はオーバーライドしてください。
   */
  public update(): void {
    if (!this.domElement) return
    // 例: ポジションの更新などの共通処理
    // this.domElement.setAttribute('cx', `${this.position.x}`);
    // this.domElement.setAttribute('cy', `${this.position.y}`);
  }

  public move(x: number, y: number): void {
    this.position.x = x
    this.position.y = y
    this.update()
  }
}
