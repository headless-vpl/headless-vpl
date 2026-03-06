import type Container from '../core/Container'
import { observeContentSize } from '../util/contentSize'

export type ObserveContainerContentSizesConfig<T> = {
  items: readonly T[]
  getContainer: (item: T) => Container | null | undefined
  resolveElement: (item: T) => HTMLElement | null | undefined
}

export function observeContainerContentSizes<T>({
  items,
  getContainer,
  resolveElement,
}: ObserveContainerContentSizesConfig<T>): () => void {
  const cleanups: Array<() => void> = []
  let disposed = false

  const frameId = requestAnimationFrame(() => {
    if (disposed) return

    for (const item of items) {
      const container = getContainer(item)
      const element = resolveElement(item)
      if (!container || !element) continue
      cleanups.push(observeContentSize(element, container))
    }
  })

  return () => {
    disposed = true
    cancelAnimationFrame(frameId)
    for (const cleanup of cleanups) cleanup()
  }
}
