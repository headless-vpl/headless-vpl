import type { EventBus } from './EventBus'
import type { MovableObject } from './MovableObject'

/**
 * 選択状態を管理するクラス。
 * Workspace のプロパティとして保持し、EventBus 経由で select/deselect イベントを発火する。
 */
export class SelectionManager {
  private _selected = new Set<MovableObject>()
  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  select(element: MovableObject): void {
    if (this._selected.has(element)) return
    this._selected.add(element)
    element.selected = true
    this.eventBus.emit('select', element)
  }

  deselect(element: MovableObject): void {
    if (!this._selected.has(element)) return
    this._selected.delete(element)
    element.selected = false
    this.eventBus.emit('deselect', element)
  }

  toggleSelect(element: MovableObject): void {
    if (this._selected.has(element)) {
      this.deselect(element)
    } else {
      this.select(element)
    }
  }

  selectAll(elements: readonly MovableObject[]): void {
    for (const el of elements) {
      this.select(el)
    }
  }

  deselectAll(): void {
    for (const el of [...this._selected]) {
      this.deselect(el)
    }
  }

  getSelection(): readonly MovableObject[] {
    return [...this._selected]
  }

  isSelected(element: MovableObject): boolean {
    return this._selected.has(element)
  }

  get size(): number {
    return this._selected.size
  }
}
