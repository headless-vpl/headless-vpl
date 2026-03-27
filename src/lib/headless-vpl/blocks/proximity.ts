import type Container from '../core/Container'
import type { IPosition } from '../core/Position'
import type Workspace from '../core/Workspace'

/** 近接ヒットの情報 */
export type ProximityHit = {
  source: Container
  sourcePosition: IPosition
  targetPosition: IPosition
  snapDistance: number
}

/**
 * 近接ヒットの差分を取り、EventBus に proximity / proximity-end を発火する。
 * activeIds は呼び出し側が保持するミュータブルな Set。
 */
export function syncProximityHighlights(
  workspace: Workspace,
  activeIds: Set<string>,
  nextHits: Map<string, ProximityHit>
): void {
  for (const id of Array.from(activeIds)) {
    if (nextHits.has(id)) continue
    workspace.eventBus.emit('proximity-end', workspace, { connectionId: id })
    activeIds.delete(id)
  }
  for (const [id, hit] of nextHits.entries()) {
    if (activeIds.has(id)) continue
    workspace.eventBus.emit('proximity', hit.source, {
      connectionId: id,
      sourcePosition: hit.sourcePosition,
      targetPosition: hit.targetPosition,
      snapDistance: hit.snapDistance,
    })
    activeIds.add(id)
  }
}

/**
 * RAF ループで近接判定を行い、ハイライトを同期する汎用ヘルパー。
 * collectHits は毎フレーム呼ばれ、最新の ProximityHit Map を返す。
 * 戻り値はループ停止関数。
 */
export function startProximityLoop(
  workspace: Workspace,
  activeIds: Set<string>,
  collectHits: () => Map<string, ProximityHit>
): () => void {
  let frameId = 0
  const tick = () => {
    syncProximityHighlights(workspace, activeIds, collectHits())
    frameId = requestAnimationFrame(tick)
  }
  frameId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frameId)
}
