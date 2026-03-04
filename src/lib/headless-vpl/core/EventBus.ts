import type { VplEventType, VplEvent } from './types'

/**
 * 最小限のイベントシステム。
 * move / connect / disconnect / add / remove / update の 6 種のイベントを扱う。
 */
export class EventBus {
  private handlers = new Map<VplEventType, Set<(event: VplEvent) => void>>()

  on(type: VplEventType, handler: (event: VplEvent) => void): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  emit(type: VplEventType, target: unknown, data?: Record<string, unknown>): void {
    const event: VplEvent = { type, target, data }
    this.handlers.get(type)?.forEach((handler) => handler(event))
  }
}
