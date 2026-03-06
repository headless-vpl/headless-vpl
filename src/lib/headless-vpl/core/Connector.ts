import type AutoLayout from './AutoLayout'
import type Container from './Container'
import { MovableObject } from './MovableObject'
import Position, { type IPosition } from './Position'
import type Workspace from './Workspace'

export type ConnectorAnchorOrigin =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type ConnectorAnchorTarget = 'parent' | string | Container | AutoLayout

export type ConnectorAnchor = {
  target: ConnectorAnchorTarget
  origin?: ConnectorAnchorOrigin
  offset?: {
    x?: number
    y?: number
  }
}

type ConnectorProps = {
  workspace?: Workspace
  position?: Position
  name: string
  type: 'input' | 'output'
  hitRadius?: number
  anchor?: ConnectorAnchor
}

class Connector extends MovableObject {
  public hitRadius: number
  public anchor: ConnectorAnchor | null

  constructor({ workspace, position, name, type, hitRadius, anchor }: ConnectorProps) {
    const initialPosition = position ?? new Position(0, 0)
    super(workspace, initialPosition, name, type)
    this.hitRadius = hitRadius ?? 12
    this.anchor = anchor ?? null
    if (this.workspace) {
      this.workspace.addElement(this)
    }
  }

  public isAnchored(): boolean {
    return this.anchor !== null
  }

  public setAnchor(anchor: ConnectorAnchor | null, owner?: Container): void {
    this.anchor = anchor
    this.refreshAnchor(owner)
  }

  public refreshAnchor(owner?: Container): void {
    const resolved = this.resolveAnchorPosition(owner)
    if (!resolved) return
    if (!this.workspace) {
      this.position.x = resolved.x
      this.position.y = resolved.y
      return
    }
    if (resolved.x === this.position.x && resolved.y === this.position.y) return
    super.move(resolved.x, resolved.y, true)
  }

  public hitTest(point: IPosition): boolean {
    const dx = point.x - this.position.x
    const dy = point.y - this.position.y
    return dx * dx + dy * dy <= this.hitRadius * this.hitRadius
  }

  private resolveAnchorPosition(owner?: Container): IPosition | null {
    if (!this.anchor) return null

    const target = this.resolveAnchorTarget(owner)
    if (!target) return null

    const origin = this.anchor.origin ?? 'top-left'
    const offsetX = this.anchor.offset?.x ?? 0
    const offsetY = this.anchor.offset?.y ?? 0
    const bounds = this.getTargetBounds(target)
    const base = this.resolveOriginPoint(bounds, origin)

    return {
      x: base.x + offsetX,
      y: base.y + offsetY,
    }
  }

  private resolveAnchorTarget(owner?: Container): Container | AutoLayout | null {
    if (!this.anchor) return null

    if (this.anchor.target === 'parent') {
      return owner ?? null
    }

    if (typeof this.anchor.target === 'string') {
      if (!owner) return null
      const target = owner.children[this.anchor.target as keyof typeof owner.children]
      if (!target) return null
      if (this.isAnchorTarget(target)) return target
      return null
    }

    return this.anchor.target
  }

  private isAnchorTarget(value: unknown): value is Container | AutoLayout {
    return Boolean(
      value &&
        typeof value === 'object' &&
        'id' in value &&
        (('absolutePosition' in value && 'direction' in value) ||
          ('width' in value && 'height' in value && 'children' in value))
    )
  }

  private getTargetBounds(target: Container | AutoLayout): {
    x: number
    y: number
    width: number
    height: number
  } {
    if ('absolutePosition' in target && 'direction' in target) {
      const abs = target.absolutePosition
      return {
        x: abs.x,
        y: abs.y,
        width: target.width,
        height: target.height,
      }
    }

    return {
      x: target.position.x,
      y: target.position.y,
      width: target.width,
      height: target.height,
    }
  }

  private resolveOriginPoint(
    bounds: { x: number; y: number; width: number; height: number },
    origin: ConnectorAnchorOrigin
  ): IPosition {
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const rightX = bounds.x + bounds.width
    const bottomY = bounds.y + bounds.height

    switch (origin) {
      case 'top-left':
        return { x: bounds.x, y: bounds.y }
      case 'top-center':
        return { x: centerX, y: bounds.y }
      case 'top-right':
        return { x: rightX, y: bounds.y }
      case 'center-left':
        return { x: bounds.x, y: centerY }
      case 'center':
        return { x: centerX, y: centerY }
      case 'center-right':
        return { x: rightX, y: centerY }
      case 'bottom-left':
        return { x: bounds.x, y: bottomY }
      case 'bottom-center':
        return { x: centerX, y: bottomY }
      case 'bottom-right':
        return { x: rightX, y: bottomY }
    }
  }

  public override toJSON(): Record<string, unknown> {
    const offset = this.anchor?.offset
    return {
      ...super.toJSON(),
      connectorType: this.type,
      hitRadius: this.hitRadius,
      ...(this.anchor
        ? {
            anchor:
              typeof this.anchor.target === 'string'
                ? {
                    target: this.anchor.target,
                    origin: this.anchor.origin ?? 'top-left',
                    offset: {
                      x: offset?.x ?? 0,
                      y: offset?.y ?? 0,
                    },
                  }
                : {
                    targetId: this.anchor.target.id,
                    origin: this.anchor.origin ?? 'top-left',
                    offset: {
                      x: offset?.x ?? 0,
                      y: offset?.y ?? 0,
                    },
                  },
          }
        : {}),
    }
  }
}

export default Connector
