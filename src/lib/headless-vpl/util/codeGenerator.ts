import type AutoLayout from '../core/AutoLayout'
import type Connector from '../core/Connector'
import type Container from '../core/Container'
import type Edge from '../core/Edge'
import type { IWorkspaceElement } from '../core/types'

type ConnectorLike = Connector & {
  id: string
  type: 'input' | 'output'
  name: string
  hitRadius: number
  position: { x: number; y: number }
  anchor?: {
    target: 'parent' | string | { id: string }
    origin?: string
    offset?: { x?: number; y?: number }
  } | null
}

type BuildCtx = {
  containerPaths: Map<string, string>
  connectorPaths: Map<string, string>
  layoutPaths: Map<string, string>
  activeContainers: Set<string>
}

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function i(level: number): string {
  return '  '.repeat(level)
}

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1')
    .toLowerCase()
}

function uniqueVar(baseRaw: string, used: Set<string>, fallback: string): string {
  const base = sanitizeName(baseRaw || fallback) || fallback
  let name = base
  let n = 2
  while (used.has(name)) {
    name = `${base}_${n}`
    n += 1
  }
  used.add(name)
  return name
}

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function fmt(value: number): string {
  if (Number.isInteger(value)) return `${value}`
  return value.toFixed(3).replace(/\.?0+$/, '')
}

function isContainerLike(value: unknown): value is Container {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'children' in value &&
      'color' in value &&
      'width' in value &&
      'height' in value &&
      'position' in value
  )
}

function isAutoLayoutLike(value: unknown): value is AutoLayout {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'direction' in value &&
      'Children' in value &&
      'position' in value &&
      'insertElement' in value
  )
}

function isConnectorLike(value: unknown): value is ConnectorLike {
  if (!value || typeof value !== 'object') return false
  if (!('id' in value) || !('position' in value) || !('name' in value) || !('type' in value))
    return false
  const t = (value as { type?: string }).type
  return t === 'input' || t === 'output'
}

function propOrIndex(base: string, key: string): string {
  return IDENT_RE.test(key) ? `${base}.${key}` : `${base}[${JSON.stringify(key)}]`
}

function appendObjectProp(out: string[], key: string, exprLines: string[], level: number): void {
  const keyExpr = IDENT_RE.test(key) ? key : JSON.stringify(key)
  out.push(`${i(level)}${keyExpr}: ${exprLines[0].trimStart()}`)
  for (let idx = 1; idx < exprLines.length; idx += 1) out.push(exprLines[idx])
  out[out.length - 1] = `${out[out.length - 1]},`
}

function appendArrayItem(out: string[], exprLines: string[]): void {
  for (const line of exprLines) out.push(line)
  out[out.length - 1] = `${out[out.length - 1]},`
}

function buildConnectorExpr(
  connector: ConnectorLike,
  level: number,
  parentContainer: Container,
  key: string,
  path: string,
  ctx: BuildCtx,
  childKeyById: Map<string, string>
): string[] {
  ctx.connectorPaths.set(connector.id, path)
  const relX = connector.position.x - parentContainer.position.x
  const relY = parentContainer.position.y - connector.position.y
  const lines: string[] = []
  lines.push(`${i(level)}new Connector({`)
  lines.push(`${i(level + 1)}position: new Position(${fmt(relX)}, ${fmt(relY)}),`)
  lines.push(`${i(level + 1)}name: '${esc(connector.name || key)}',`)
  lines.push(`${i(level + 1)}type: '${connector.type}',`)
  if (connector.hitRadius !== 12)
    lines.push(`${i(level + 1)}hitRadius: ${fmt(connector.hitRadius)},`)
  const anchorExpr = buildConnectorAnchorExpr(connector, parentContainer, childKeyById)
  if (anchorExpr) {
    lines.push(`${i(level + 1)}anchor: {`)
    lines.push(`${i(level + 2)}target: ${anchorExpr.target},`)
    if (anchorExpr.origin !== 'top-left') {
      lines.push(`${i(level + 2)}origin: '${anchorExpr.origin}',`)
    }
    if ((anchorExpr.offsetX ?? 0) !== 0 || (anchorExpr.offsetY ?? 0) !== 0) {
      lines.push(
        `${i(level + 2)}offset: { x: ${fmt(anchorExpr.offsetX ?? 0)}, y: ${fmt(anchorExpr.offsetY ?? 0)} },`
      )
    }
    lines.push(`${i(level + 1)}},`)
  }
  lines.push(`${i(level)}})`)
  return lines
}

function buildConnectorAnchorExpr(
  connector: ConnectorLike,
  parentContainer: Container,
  childKeyById: Map<string, string>
): {
  target: string
  origin: string
  offsetX: number
  offsetY: number
} | null {
  if (!connector.anchor) return null

  let targetExpr: string | null = null
  const target = connector.anchor.target

  if (target === 'parent') {
    targetExpr = "'parent'"
  } else if (typeof target === 'string') {
    targetExpr = `'${esc(target)}'`
  } else if (target.id === parentContainer.id) {
    targetExpr = "'parent'"
  } else {
    const childKey = childKeyById.get(target.id)
    if (childKey) {
      targetExpr = `'${esc(childKey)}'`
    }
  }

  if (!targetExpr) return null

  return {
    target: targetExpr,
    origin: connector.anchor.origin ?? 'top-left',
    offsetX: connector.anchor.offset?.x ?? 0,
    offsetY: connector.anchor.offset?.y ?? 0,
  }
}

function buildContainerExpr(
  container: Container,
  level: number,
  path: string,
  ctx: BuildCtx,
  options: {
    includeWorkspace: boolean
    position: 'absolute' | 'relative' | 'omit'
    relativeParent?: Container
  }
): string[] {
  if (ctx.activeContainers.has(container.id)) {
    return [
      `${i(level)}new Container({`,
      `${i(level + 1)}name: '${esc(container.name)} (circular)',`,
      `${i(level + 1)}color: '${esc(container.color)}',`,
      `${i(level + 1)}width: ${fmt(container.width)},`,
      `${i(level + 1)}height: ${fmt(container.height)},`,
      `${i(level)}})`,
    ]
  }

  ctx.containerPaths.set(container.id, path)
  ctx.activeContainers.add(container.id)

  const lines: string[] = []
  lines.push(`${i(level)}new Container({`)
  if (options.includeWorkspace) lines.push(`${i(level + 1)}workspace,`)
  if (options.position === 'absolute') {
    lines.push(
      `${i(level + 1)}position: new Position(${fmt(container.position.x)}, ${fmt(container.position.y)}),`
    )
  } else if (options.position === 'relative' && options.relativeParent) {
    const relX = container.position.x - options.relativeParent.position.x
    const relY = options.relativeParent.position.y - container.position.y
    lines.push(`${i(level + 1)}position: new Position(${fmt(relX)}, ${fmt(relY)}),`)
  }
  lines.push(`${i(level + 1)}name: '${esc(container.name)}',`)
  lines.push(`${i(level + 1)}color: '${esc(container.color)}',`)
  lines.push(`${i(level + 1)}width: ${fmt(container.width)},`)
  lines.push(`${i(level + 1)}height: ${fmt(container.height)},`)
  if (container.widthMode !== 'fixed')
    lines.push(`${i(level + 1)}widthMode: '${container.widthMode}',`)
  if (container.heightMode !== 'fixed')
    lines.push(`${i(level + 1)}heightMode: '${container.heightMode}',`)
  if (
    container.padding.top ||
    container.padding.right ||
    container.padding.bottom ||
    container.padding.left
  ) {
    lines.push(
      `${i(level + 1)}padding: { top: ${fmt(container.padding.top)}, right: ${fmt(container.padding.right)}, bottom: ${fmt(container.padding.bottom)}, left: ${fmt(container.padding.left)} },`
    )
  }
  if (container.minWidth !== 0) lines.push(`${i(level + 1)}minWidth: ${fmt(container.minWidth)},`)
  if (Number.isFinite(container.maxWidth))
    lines.push(`${i(level + 1)}maxWidth: ${fmt(container.maxWidth)},`)
  if (container.minHeight !== 0)
    lines.push(`${i(level + 1)}minHeight: ${fmt(container.minHeight)},`)
  if (Number.isFinite(container.maxHeight))
    lines.push(`${i(level + 1)}maxHeight: ${fmt(container.maxHeight)},`)
  if (container.resizable) lines.push(`${i(level + 1)}resizable: true,`)
  if (container.contentGap !== 0)
    lines.push(`${i(level + 1)}contentGap: ${fmt(container.contentGap)},`)

  const childEntries = Object.entries(container.children)
  const childKeyById = new Map<string, string>()
  for (const [key, child] of childEntries) {
    if (child && typeof child === 'object' && 'id' in child) {
      childKeyById.set((child as { id: string }).id, key)
    }
  }
  if (childEntries.length > 0) {
    lines.push(`${i(level + 1)}children: {`)
    for (const [key, child] of childEntries) {
      const childPath = propOrIndex(`${path}.children`, key)
      if (isConnectorLike(child)) {
        const expr = buildConnectorExpr(
          child,
          level + 2,
          container,
          key,
          childPath,
          ctx,
          childKeyById
        )
        appendObjectProp(lines, key, expr, level + 2)
      } else if (isAutoLayoutLike(child)) {
        const expr = buildAutoLayoutExpr(child, level + 2, childPath, ctx, {
          includeWorkspace: false,
        })
        appendObjectProp(lines, key, expr, level + 2)
      } else if (isContainerLike(child)) {
        const expr = buildContainerExpr(child, level + 2, childPath, ctx, {
          includeWorkspace: false,
          position: 'relative',
          relativeParent: container,
        })
        appendObjectProp(lines, key, expr, level + 2)
      }
    }
    lines.push(`${i(level + 1)}},`)
  }

  lines.push(`${i(level)}})`)
  ctx.activeContainers.delete(container.id)
  return lines
}

function buildAutoLayoutExpr(
  layout: AutoLayout,
  level: number,
  path: string,
  ctx: BuildCtx,
  options: { includeWorkspace: boolean }
): string[] {
  ctx.layoutPaths.set(layout.id, path)

  const lines: string[] = []
  lines.push(`${i(level)}new AutoLayout({`)
  if (options.includeWorkspace) lines.push(`${i(level + 1)}workspace,`)
  lines.push(
    `${i(level + 1)}position: new Position(${fmt(layout.position.x)}, ${fmt(layout.position.y)}),`
  )
  if (layout.width !== 100) lines.push(`${i(level + 1)}width: ${fmt(layout.width)},`)
  if (layout.height !== 100) lines.push(`${i(level + 1)}height: ${fmt(layout.height)},`)
  lines.push(`${i(level + 1)}direction: '${layout.direction}',`)
  if (layout.gap !== 10) lines.push(`${i(level + 1)}gap: ${fmt(layout.gap)},`)
  if (layout.alignment !== 'center') lines.push(`${i(level + 1)}alignment: '${layout.alignment}',`)
  if (layout.minWidth !== 0) lines.push(`${i(level + 1)}minWidth: ${fmt(layout.minWidth)},`)
  if (layout.minHeight !== 0) lines.push(`${i(level + 1)}minHeight: ${fmt(layout.minHeight)},`)
  if (!layout.resizesParent) lines.push(`${i(level + 1)}resizesParent: false,`)

  lines.push(`${i(level + 1)}containers: [`)
  for (let idx = 0; idx < layout.Children.length; idx += 1) {
    const child = layout.Children[idx]
    const childPath = `${path}.Children[${idx}]`
    const expr = buildContainerExpr(child, level + 2, childPath, ctx, {
      includeWorkspace: options.includeWorkspace,
      position: options.includeWorkspace ? 'absolute' : 'omit',
    })
    appendArrayItem(lines, expr)
  }
  lines.push(`${i(level + 1)}],`)
  lines.push(`${i(level)}})`)
  return lines
}

function collectAllContainers(seed: readonly Container[]): Container[] {
  const out: Container[] = []
  const seen = new Set<string>()

  const visitContainer = (container: Container) => {
    if (seen.has(container.id)) return
    seen.add(container.id)
    out.push(container)

    for (const child of Object.values(container.children)) {
      if (isContainerLike(child)) {
        visitContainer(child)
      } else if (isAutoLayoutLike(child)) {
        for (const nested of child.Children) {
          if (isContainerLike(nested)) visitContainer(nested)
        }
      }
    }

    for (const snapChild of container.Children) {
      if (isContainerLike(snapChild)) visitContainer(snapChild)
    }
    if (container.Parent && isContainerLike(container.Parent)) {
      visitContainer(container.Parent)
    }
    if (container.parentAutoLayout?.parentContainer) {
      visitContainer(container.parentAutoLayout.parentContainer)
    }
  }

  for (const c of seed) visitContainer(c)
  return out
}

export function generateCode(
  containers: Container[],
  edges: Edge[],
  elements: readonly IWorkspaceElement[] = []
): string {
  const lines: string[] = []
  const ctx: BuildCtx = {
    containerPaths: new Map(),
    connectorPaths: new Map(),
    layoutPaths: new Map(),
    activeContainers: new Set(),
  }

  const allContainers = collectAllContainers(containers)
  const allLayouts = new Map<string, AutoLayout>()
  const embeddedContainerIds = new Set<string>()
  const embeddedLayoutIds = new Set<string>()
  const allConnectors = new Map<string, ConnectorLike>()
  const structuralConnectorIds = new Set<string>()

  for (const container of allContainers) {
    for (const child of Object.values(container.children)) {
      if (isConnectorLike(child)) {
        allConnectors.set(child.id, child)
        structuralConnectorIds.add(child.id)
      } else if (isAutoLayoutLike(child)) {
        allLayouts.set(child.id, child)
        embeddedLayoutIds.add(child.id)
        for (const nested of child.Children) {
          embeddedContainerIds.add(nested.id)
        }
      } else if (isContainerLike(child)) {
        embeddedContainerIds.add(child.id)
      }
    }
  }

  for (const el of elements) {
    if (isAutoLayoutLike(el)) allLayouts.set(el.id, el)
    if (isConnectorLike(el)) allConnectors.set(el.id, el)
  }
  for (const edge of edges) {
    const start = edge.startConnector as unknown
    const end = edge.endConnector as unknown
    if (isConnectorLike(start)) allConnectors.set(start.id, start)
    if (isConnectorLike(end)) allConnectors.set(end.id, end)
  }

  const rootContainers = allContainers.filter((c) => !embeddedContainerIds.has(c.id))
  const rootLayouts = [...allLayouts.values()].filter((l) => !embeddedLayoutIds.has(l.id))

  const usedVarNames = new Set<string>()
  const rootContainerVarById = new Map<string, string>()
  const rootLayoutVarById = new Map<string, string>()
  const standaloneConnectorVarById = new Map<string, string>()

  for (const c of rootContainers) {
    rootContainerVarById.set(c.id, uniqueVar(c.name, usedVarNames, 'container'))
  }
  for (const l of rootLayouts) {
    rootLayoutVarById.set(l.id, uniqueVar(l.name || 'layout', usedVarNames, 'layout'))
  }

  const standaloneConnectors = [...allConnectors.values()].filter(
    (c) => !structuralConnectorIds.has(c.id)
  )
  for (const c of standaloneConnectors) {
    standaloneConnectorVarById.set(
      c.id,
      uniqueVar(c.name || 'connector', usedVarNames, 'connector')
    )
  }

  lines.push('import {')
  lines.push('  Workspace, Container, Connector, AutoLayout, Edge, Position,')
  lines.push("} from 'headless-vpl'")
  lines.push('')
  lines.push('const workspace = new Workspace()')
  lines.push('')

  if (standaloneConnectors.length > 0) {
    lines.push('// Standalone connectors')
    for (const connector of standaloneConnectors) {
      const varName = standaloneConnectorVarById.get(connector.id)
      if (!varName) continue
      ctx.connectorPaths.set(connector.id, varName)
      lines.push(`const ${varName} = new Connector({`)
      lines.push('  workspace,')
      lines.push(
        `  position: new Position(${fmt(connector.position.x)}, ${fmt(connector.position.y)}),`
      )
      lines.push(`  name: '${esc(connector.name)}',`)
      lines.push(`  type: '${connector.type}',`)
      if (connector.hitRadius !== 12) lines.push(`  hitRadius: ${fmt(connector.hitRadius)},`)
      lines.push('})')
      lines.push('')
    }
  }

  if (rootLayouts.length > 0) {
    lines.push('// Root AutoLayouts')
    for (const layout of rootLayouts) {
      const varName = rootLayoutVarById.get(layout.id)
      if (!varName) continue
      const expr = buildAutoLayoutExpr(layout, 0, varName, ctx, { includeWorkspace: true })
      lines.push(`const ${varName} = ${expr[0].trimStart()}`)
      for (let idx = 1; idx < expr.length; idx += 1) lines.push(expr[idx])
      lines.push('')
    }
  }

  if (rootContainers.length > 0) {
    lines.push('// Containers (nested style)')
    for (const container of rootContainers) {
      const varName = rootContainerVarById.get(container.id)
      if (!varName) continue
      const expr = buildContainerExpr(container, 0, varName, ctx, {
        includeWorkspace: true,
        position: 'absolute',
      })
      lines.push(`const ${varName} = ${expr[0].trimStart()}`)
      for (let idx = 1; idx < expr.length; idx += 1) lines.push(expr[idx])
      lines.push('')
    }
  }

  const snapLinks = allContainers
    .filter((child): child is typeof child & { Parent: NonNullable<typeof child.Parent> } =>
      Boolean(child.Parent)
    )
    .flatMap((child) => {
      const parentPath = ctx.containerPaths.get(child.Parent.id)
      const childPath = ctx.containerPaths.get(child.id)
      if (parentPath && childPath && parentPath !== childPath) {
        return [{ parentPath, childPath }]
      }
      return []
    })

  if (snapLinks.length > 0) {
    lines.push('// Snap hierarchy (Parent/Children)')
    lines.push('const connectParentChild = (parent: Container, child: Container) => {')
    lines.push('  child.Parent = parent')
    lines.push('  parent.Children.add(child)')
    lines.push('}')
    lines.push('')
    for (const link of snapLinks) {
      lines.push(`connectParentChild(${link.parentPath}, ${link.childPath})`)
    }
    lines.push('')
  }

  if (edges.length > 0) {
    lines.push('// Edges')
    for (const edge of edges) {
      const startRef = ctx.connectorPaths.get(edge.startConnector.id)
      const endRef = ctx.connectorPaths.get(edge.endConnector.id)
      if (!startRef || !endRef) continue
      lines.push('new Edge({')
      lines.push('  workspace,')
      lines.push(`  start: ${startRef},`)
      lines.push(`  end: ${endRef},`)
      lines.push(`  edgeType: '${edge.edgeType}',`)
      if (edge.label) lines.push(`  label: '${esc(edge.label)}',`)
      if (edge.markerStart) lines.push(`  markerStart: ${JSON.stringify(edge.markerStart)},`)
      if (edge.markerEnd) lines.push(`  markerEnd: ${JSON.stringify(edge.markerEnd)},`)
      lines.push('})')
      lines.push('')
    }
  }

  return lines.join('\n')
}
