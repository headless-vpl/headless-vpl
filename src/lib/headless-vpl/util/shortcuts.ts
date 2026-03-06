import type Container from '../core/Container'
import type { MovableObject } from '../core/MovableObject'
import type { IPosition } from '../core/Position'
import type Workspace from '../core/Workspace'
import type { ClipboardData } from './clipboard'
import { copyElements, pasteElements } from './clipboard'
import { KeyboardManager } from './keyboard'

export type DefaultShortcutsConfig = {
  workspace: Workspace
  element: HTMLElement
  containers: () => MovableObject[]
  onChange?: () => void
  onDelete?: (selected: MovableObject[]) => void
  paste?: {
    factory: (json: Record<string, unknown>, position: IPosition) => Container
    offset?: IPosition
    onPaste?: (pasted: Container[]) => void
  }
}

/**
 * 標準キーボードショートカット（Undo/Redo/Delete/SelectAll/Copy/Paste）をバインドする。
 * KeyboardManager を返すので、追加のバインドやdestroy()が可能。
 */
export function bindDefaultShortcuts(config: DefaultShortcutsConfig): KeyboardManager {
  const { workspace, element, containers, onChange, onDelete, paste } = config
  const kb = new KeyboardManager(element)

  let clipboard: ClipboardData | null = null

  // Undo
  kb.bind({
    key: 'z',
    modifiers: ['ctrl'],
    handler: () => {
      workspace.history.undo()
      onChange?.()
    },
  })

  // Redo
  kb.bind({
    key: 'z',
    modifiers: ['ctrl', 'shift'],
    handler: () => {
      workspace.history.redo()
      onChange?.()
    },
  })

  // Copy
  kb.bind({
    key: 'c',
    modifiers: ['ctrl'],
    handler: () => {
      const sel = workspace.selection.getSelection()
      if (sel.length > 0) clipboard = copyElements(sel.slice())
    },
  })

  // Paste
  if (paste) {
    kb.bind({
      key: 'v',
      modifiers: ['ctrl'],
      handler: () => {
        if (!clipboard) return
        const pasted = pasteElements(clipboard, paste.factory, paste.offset ?? { x: 40, y: 40 })
        workspace.selection.deselectAll()
        for (const n of pasted) {
          workspace.selection.select(n)
        }
        paste.onPaste?.(pasted)
        onChange?.()
      },
    })
  }

  // Delete
  const deleteHandler = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return
    const sel = workspace.selection.getSelection().slice()
    if (sel.length === 0) return
    onDelete?.(sel)
    onChange?.()
  }
  kb.bind({ key: 'Delete', handler: deleteHandler })
  kb.bind({ key: 'Backspace', handler: deleteHandler })

  // Select All
  kb.bind({
    key: 'a',
    modifiers: ['ctrl'],
    handler: (e) => {
      e.preventDefault()
      workspace.selection.selectAll(containers())
      onChange?.()
    },
  })

  return kb
}
