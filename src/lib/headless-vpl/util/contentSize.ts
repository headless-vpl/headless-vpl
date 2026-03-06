import type Container from '../core/Container'

/**
 * DOM要素のリサイズを監視し、Containerの幅・高さを自動同期する。
 * min/max制約を適用した上でupdate()を呼ぶ。
 *
 * @returns クリーンアップ関数（監視停止）
 */
export function observeContentSize(element: HTMLElement, container: Container): () => void {
  const sync = () => {
    const w = element.offsetWidth
    const h = element.offsetHeight
    let changed = false

    // widthMode === 'hug' の場合、AutoLayoutが計算した幅を優先する
    if (container.widthMode !== 'hug') {
      const newW = Math.min(Math.max(w, container.minWidth), container.maxWidth)
      if (container.width !== newW) {
        container.width = newW
        changed = true
      }
    }

    // heightMode === 'hug' の場合、AutoLayoutが計算した高さを優先する
    if (container.heightMode !== 'hug') {
      const newH = Math.min(Math.max(h, container.minHeight), container.maxHeight)
      if (container.height !== newH) {
        container.height = newH
        changed = true
      }
    }

    if (changed) {
      container.update()
      // サイズ変更を親AutoLayoutに伝搬し、C-blockの高さを再計算させる
      container.parentAutoLayout?.update()
    }
  }

  const observer = new ResizeObserver(() => sync())
  observer.observe(element)

  // 初回同期
  sync()

  return () => observer.disconnect()
}
