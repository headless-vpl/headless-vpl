import type { Container } from '../../../lib/headless-vpl'

export function getNestedParent(container: Container): Container | null {
  return container.parentAutoLayout?.parentContainer ?? null
}

export function isNestedDescendantOf(
  container: Container,
  ancestor: Container,
): boolean {
  let current = getNestedParent(container)

  while (current) {
    if (current === ancestor) return true
    current = getNestedParent(current)
  }

  return false
}

export function sortContainersForNestedRender(
  containers: readonly Container[],
): Container[] {
  const order = new Map(containers.map((container, index) => [container.id, index]))

  return [...containers].sort((a, b) => {
    if (a === b) return 0
    if (isNestedDescendantOf(a, b)) return 1
    if (isNestedDescendantOf(b, a)) return -1
    return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  })
}

export function collectFrontGroup(
  containers: readonly Container[],
  roots: readonly Container[],
): Container[] {
  const groupIds = new Set<string>()
  const queue = [...roots]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || groupIds.has(current.id)) continue

    groupIds.add(current.id)

    for (const container of containers) {
      if (getNestedParent(container) === current) {
        queue.push(container)
      }
    }
  }

  return sortContainersForNestedRender(
    containers.filter((container) => groupIds.has(container.id)),
  )
}
