/**
 * コマンドインターフェース。Undo/Redo のための do/undo ペア。
 */
export interface Command {
  execute(): void
  undo(): void
}

/**
 * Command パターンベースの Undo/Redo 履歴。
 * execute() でコマンドを実行しスタックに積む。
 * undo()/redo() でスタックを戻す/進む。
 */
export class History {
  private _undoStack: Command[] = []
  private _redoStack: Command[] = []
  private _maxDepth: number

  constructor(maxDepth = 100) {
    this._maxDepth = maxDepth
  }

  /**
   * コマンドを実行し、Undo スタックに追加する。
   * 新しいコマンド実行時に Redo スタックはクリアされる。
   */
  execute(command: Command): void {
    this._undoStack.push(command)
    this._redoStack = []

    // maxDepth を超えた場合、古いコマンドを削除
    if (this._undoStack.length > this._maxDepth) {
      this._undoStack.shift()
    }

    command.execute()
  }

  undo(): void {
    const command = this._undoStack.pop()
    if (!command) return
    this._redoStack.push(command)
    command.undo()
  }

  redo(): void {
    const command = this._redoStack.pop()
    if (!command) return
    this._undoStack.push(command)
    command.execute()
  }

  get canUndo(): boolean {
    return this._undoStack.length > 0
  }

  get canRedo(): boolean {
    return this._redoStack.length > 0
  }

  clear(): void {
    this._undoStack = []
    this._redoStack = []
  }
}
