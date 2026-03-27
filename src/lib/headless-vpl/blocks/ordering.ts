import type Container from '../core/Container'

/** ネスト親（AutoLayout経由の親コンテナ）を取得する */
export function getNestedParent(container: Container): Container | null {
  return container.parentAutoLayout?.parentContainer ?? null
}

/** container が ancestor のネスト子孫かどうかを判定する */
export function isNestedDescendantOf(container: Container, ancestor: Container): boolean {
  let current = getNestedParent(container)
  while (current) {
    if (current === ancestor) return true
    current = getNestedParent(current)
  }
  return false
}

/**
 * ネストされたコンテナが親より後に来るようにソートする。
 * 描画順（z-index）に使う。
 */
export function sortContainersForNestedRender(containers: readonly Container[]): Container[] {
  const order = new Map(containers.map((c, i) => [c.id, i]))
  return [...containers].sort((a, b) => {
    if (a === b) return 0
    if (isNestedDescendantOf(a, b)) return 1
    if (isNestedDescendantOf(b, a)) return -1
    return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  })
}

/**
 * roots とそのネスト子孫を全て収集し、描画順でソートして返す。
 * ブロックを最前面に持ってくるときに使う。
 */
export function collectFrontGroup(
  containers: readonly Container[],
  roots: readonly Container[]
): Container[] {
  const groupIds = new Set<string>()
  const queue = [...roots]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || groupIds.has(current.id)) continue
    groupIds.add(current.id)
    for (const c of containers) {
      if (getNestedParent(c) === current) queue.push(c)
    }
  }

  return sortContainersForNestedRender(containers.filter((c) => groupIds.has(c.id)))
}
