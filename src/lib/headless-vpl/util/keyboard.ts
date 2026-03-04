export type KeyBinding = {
  key: string
  modifiers?: ('ctrl' | 'shift' | 'alt')[]
  handler: (event: KeyboardEvent) => void
}

/**
 * キーボードショートカットを管理するクラス。
 * Ctrl/Meta を統一し、Mac/Windows の互換性を保証する。
 */
export class KeyboardManager {
  private bindings: KeyBinding[] = []
  private element: HTMLElement
  private listener: (event: KeyboardEvent) => void

  constructor(element: HTMLElement) {
    this.element = element
    this.listener = (event: KeyboardEvent) => this.handleKeyDown(event)
    this.element.addEventListener('keydown', this.listener)
  }

  bind(binding: KeyBinding): void {
    this.bindings.push(binding)
  }

  unbind(key: string, modifiers?: ('ctrl' | 'shift' | 'alt')[]): void {
    this.bindings = this.bindings.filter(
      (b) => !(b.key === key && this.modifiersMatch(b.modifiers, modifiers))
    )
  }

  destroy(): void {
    this.element.removeEventListener('keydown', this.listener)
    this.bindings = []
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement
    const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    for (const binding of this.bindings) {
      if (this.matches(event, binding)) {
        // 編集可能な要素にフォーカス中は、修飾キーなしのバインドをスキップ
        if (isEditable && !(binding.modifiers && binding.modifiers.length > 0)) {
          return
        }
        event.preventDefault()
        binding.handler(event)
        return
      }
    }
  }

  private matches(event: KeyboardEvent, binding: KeyBinding): boolean {
    if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false

    const mods = binding.modifiers ?? []

    // ctrl modifier は Ctrl または Meta (Mac の Cmd) にマッチ
    const wantCtrl = mods.includes('ctrl')
    const hasCtrl = event.ctrlKey || event.metaKey
    if (wantCtrl !== hasCtrl) return false

    const wantShift = mods.includes('shift')
    if (wantShift !== event.shiftKey) return false

    const wantAlt = mods.includes('alt')
    if (wantAlt !== event.altKey) return false

    return true
  }

  private modifiersMatch(
    a?: ('ctrl' | 'shift' | 'alt')[],
    b?: ('ctrl' | 'shift' | 'alt')[]
  ): boolean {
    const setA = new Set(a ?? [])
    const setB = new Set(b ?? [])
    if (setA.size !== setB.size) return false
    for (const m of setA) {
      if (!setB.has(m)) return false
    }
    return true
  }
}
