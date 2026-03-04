import type { IPosition } from '../core/Position'
import type { Viewport } from '../core/types'

export function screenToWorld(screen: IPosition, viewport: Viewport): IPosition {
  return {
    x: (screen.x - viewport.x) / viewport.scale,
    y: (screen.y - viewport.y) / viewport.scale,
  }
}

export function worldToScreen(world: IPosition, viewport: Viewport): IPosition {
  return {
    x: world.x * viewport.scale + viewport.x,
    y: world.y * viewport.scale + viewport.y,
  }
}
