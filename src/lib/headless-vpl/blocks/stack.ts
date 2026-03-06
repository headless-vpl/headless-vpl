import type AutoLayout from '../core/AutoLayout'
import type Container from '../core/Container'

export function collectConnectedChain(root: Container): Container[] {
  const chain: Container[] = [root]
  const visited = new Set<string>([root.id])
  let current = root

  while (true) {
    const next = Array.from(current.Children).find((child) => {
      const candidate = child as Container
      return candidate.Parent === current && !visited.has(candidate.id)
    }) as Container | undefined

    if (!next) break
    chain.push(next)
    visited.add(next.id)
    current = next
  }

  return chain
}

export class BlockStackController {
  reattach(container: Container, expectedParent: Container | null): void {
    for (const element of container.workspace.elements) {
      if (!element || typeof element !== 'object' || !('Children' in element)) continue
      if (expectedParent && element === expectedParent) continue
      const maybeParent = element as unknown as { Children?: Set<Container> }
      if (!(maybeParent.Children instanceof Set)) continue
      maybeParent.Children.delete(container)
    }

    container.Parent = expectedParent
    if (expectedParent) {
      expectedParent.Children.add(container)
    }
  }

  normalize(containers: Container[]): void {
    for (let i = 0; i < containers.length; i += 1) {
      this.reattach(containers[i], i > 0 ? containers[i - 1] : null)
    }
  }

  syncLayout(layout: AutoLayout): void {
    this.normalize(layout.Children)
  }

  detachFromLayout(layout: AutoLayout, container: Container): void {
    const siblings = new Set(layout.Children)
    if (!siblings.has(container)) return

    this.reattach(container, null)

    for (const child of Array.from(container.Children)) {
      const childContainer = child as Container
      if (!siblings.has(childContainer)) continue
      container.Children.delete(childContainer)
      if (childContainer.Parent === container) {
        childContainer.Parent = null
      }
    }
  }

  pullFollowerChainOutOfLayout(root: Container, layout: AutoLayout): Container[] {
    const followers: Container[] = []
    let parent: Container = root

    while (true) {
      const next = layout.Children.find((child) => child.Parent === parent)
      if (!next) break
      followers.push(next)
      parent = next
    }

    for (let i = followers.length - 1; i >= 0; i -= 1) {
      layout.removeElement(followers[i])
    }

    this.normalize([root, ...followers])

    let anchor = root
    for (const follower of followers) {
      follower.move(anchor.position.x, anchor.position.y + anchor.height)
      anchor = follower
    }

    this.syncLayout(layout)
    return followers
  }
}
