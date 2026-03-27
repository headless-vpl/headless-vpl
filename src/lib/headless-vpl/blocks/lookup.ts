import type AutoLayout from '../core/AutoLayout'
import type Container from '../core/Container'

/**
 * C-blockの参照情報。bodyLayouts を持つコンテナを表す。
 * ライブラリ側では構造だけ定義し、具体的なフィールドはユーザーが拡張する。
 */
export type CBlockRefLike = {
  container: Container
  bodyLayouts: AutoLayout[]
}

/**
 * cBlockRefs 配列から、predicate にマッチする最初の CBlockRef を返す。
 * bodyLayouts の各 layout に対して predicate が呼ばれる。
 */
export function findCBlockOwner<T extends CBlockRefLike>(
  cBlockRefs: T[],
  predicate: (ref: T, layout: AutoLayout) => boolean
): T | null {
  for (const ref of cBlockRefs) {
    for (const layout of ref.bodyLayouts) {
      if (predicate(ref, layout)) return ref
    }
  }
  return null
}

/** blockContainer が含まれている body layout を返す */
export function findBodyLayoutForBlock<T extends CBlockRefLike>(
  blockContainer: Container,
  cBlockRefs: T[]
): AutoLayout | null {
  let found: AutoLayout | null = null
  findCBlockOwner(cBlockRefs, (_, layout) => {
    if (layout.Children.includes(blockContainer)) {
      found = layout
      return true
    }
    return false
  })
  return found
}

/** layout が cBlockRefs のいずれかの body layout かどうか */
export function isCBlockBodyLayout<T extends CBlockRefLike>(
  layout: AutoLayout,
  cBlockRefs: T[]
): boolean {
  return findCBlockOwner(cBlockRefs, (_, l) => l === layout) !== null
}

/** layout を所有する CBlockRef を返す */
export function findCBlockRefForBodyLayout<T extends CBlockRefLike>(
  layout: AutoLayout,
  cBlockRefs: T[]
): T | null {
  return findCBlockOwner(cBlockRefs, (_, l) => l === layout)
}
