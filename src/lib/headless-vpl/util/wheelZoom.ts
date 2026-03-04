import type Workspace from '../core/Workspace'

export type WheelZoomConfig = {
  workspace: Workspace
  minScale?: number
  maxScale?: number
  factor?: number
  onChange?: () => void
}

/**
 * ホイールによるズームをバインドする。
 * クリーンアップ関数を返す。
 */
export function bindWheelZoom(element: HTMLElement, config: WheelZoomConfig): () => void {
  const {
    workspace,
    minScale = 0.1,
    maxScale = 5,
    factor = 0.1,
    onChange,
  } = config

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const r = element.getBoundingClientRect()
    const zoomFactor = e.deltaY > 0 ? 1 - factor : 1 + factor
    const newScale = Math.max(minScale, Math.min(maxScale, workspace.viewport.scale * zoomFactor))
    workspace.zoomAt(e.clientX - r.left, e.clientY - r.top, newScale)
    onChange?.()
  }

  element.addEventListener('wheel', onWheel, { passive: false })

  return () => {
    element.removeEventListener('wheel', onWheel)
  }
}
