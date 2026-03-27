import type AutoLayout from '../core/AutoLayout'
import type Container from '../core/Container'
import type Workspace from '../core/Workspace'
import { type CBlockRefLike, findBodyLayoutForBlock, findCBlockRefForBodyLayout } from './lookup'
import { BlockStackController } from './stack'

/**
 * body layout の同期 + 親 C-block のアンカーリフレッシュをまとめて行う。
 * blockStack はシングルトンを内部で使用する。
 */
const blockStack = new BlockStackController()

export function syncBodyLayout<T extends CBlockRefLike>(layout: AutoLayout, cBlockRefs: T[]): void {
  blockStack.syncLayout(layout)
  const owner = findCBlockRefForBodyLayout(layout, cBlockRefs)
  if (owner) owner.container.refreshAnchoredChildren()
}

export type SubscribeCBlockConnectionSyncConfig<T extends CBlockRefLike> = {
  workspace: Workspace
  containerMap: Map<string, Container>
  cBlockRefs: T[]
  onBodyLayoutChange?: () => void
}

/**
 * connect/disconnect イベントを監視し、C-block body layout を自動同期する。
 * 戻り値は購読解除関数。
 */
export function subscribeCBlockConnectionSync<T extends CBlockRefLike>({
  workspace,
  containerMap,
  cBlockRefs,
  onBodyLayoutChange,
}: SubscribeCBlockConnectionSyncConfig<T>): () => void {
  const unsubConnect = workspace.eventBus.on('connect', (event) => {
    const parentId = event.data?.parent as string | undefined
    const childId = event.data?.child as string | undefined
    if (!parentId || !childId) return

    const parentContainer = containerMap.get(parentId)
    const childContainer = containerMap.get(childId)
    if (!parentContainer || !childContainer) return

    const layout = findBodyLayoutForBlock(parentContainer, cBlockRefs)
    if (!layout) return

    if (layout.Children.includes(childContainer)) {
      syncBodyLayout(layout, cBlockRefs)
      onBodyLayoutChange?.()
      return
    }

    const prevLayout = findBodyLayoutForBlock(childContainer, cBlockRefs)
    if (prevLayout && prevLayout !== layout) {
      blockStack.detachFromLayout(prevLayout, childContainer)
      prevLayout.removeElement(childContainer)
      syncBodyLayout(prevLayout, cBlockRefs)
      onBodyLayoutChange?.()
    }

    const parentIndex = layout.Children.indexOf(parentContainer)
    layout.insertElement(childContainer, parentIndex + 1)
    syncBodyLayout(layout, cBlockRefs)
    onBodyLayoutChange?.()
  })

  const unsubDisconnect = workspace.eventBus.on('disconnect', (event) => {
    const childId = event.data?.child as string | undefined
    if (!childId) return

    const childContainer = containerMap.get(childId)
    if (!childContainer) return

    const layout = findBodyLayoutForBlock(childContainer, cBlockRefs)
    if (!layout) return

    blockStack.detachFromLayout(layout, childContainer)
    layout.removeElement(childContainer)
    syncBodyLayout(layout, cBlockRefs)
    onBodyLayoutChange?.()
  })

  return () => {
    unsubConnect()
    unsubDisconnect()
  }
}
