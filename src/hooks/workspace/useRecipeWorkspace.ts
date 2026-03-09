import type { MutableRefObject, RefObject } from 'react'
import { useRef } from 'react'
import { EdgeBuilder, bindWheelZoom } from '../../lib/headless-vpl/helpers'
import {
  Connector as ConnectorClass,
  Container as ContainerClass,
  Position,
  RemoveCommand,
  Workspace,
  type Container,
} from '../../lib/headless-vpl/primitives'
import {
  InteractionManager,
  type InteractionConfig,
  bindDefaultShortcuts,
} from '../../lib/headless-vpl/recipes'
import { useWorkspaceCore } from './useWorkspaceCore'

export type UseRecipeWorkspaceConfig = {
  interactionOverrides?: Partial<InteractionConfig>
  enableDomSync?: boolean
  resolveDomElement?: (container: Container) => HTMLElement | null
  enableShortcuts?: boolean
  enableWheelZoom?: boolean
  gridSize?: number
  createEdgeBuilder?: (
    workspace: Workspace,
    svgElement: SVGSVGElement,
    previewPath: SVGPathElement
  ) => EdgeBuilder | null
  onTick?: () => void
  onPaste?: (pasted: Container[]) => void
}

export type UseRecipeWorkspaceReturn = ReturnType<typeof useWorkspaceCore> & {
  interactionRef: MutableRefObject<InteractionManager | null>
}

export function useRecipeWorkspace(
  svgRef: RefObject<SVGSVGElement | null>,
  overlayRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLDivElement | null>,
  config?: UseRecipeWorkspaceConfig
): UseRecipeWorkspaceReturn {
  const interactionRef = useRef<InteractionManager | null>(null)
  const gridSize = config?.gridSize ?? 24

  const core = useWorkspaceCore(svgRef, overlayRef, canvasRef, {
    enableDomSync: config?.enableDomSync,
    gridSize,
    resolveDomElement: config?.resolveDomElement,
    onReady: ({ workspace, svgElement, canvasElement, containersRef, connectorsRef }) => {
      const marqueeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      marqueeRect.setAttribute('fill', 'rgba(59,130,246,0.08)')
      marqueeRect.setAttribute('stroke', 'rgba(59,130,246,0.4)')
      marqueeRect.setAttribute('stroke-width', '1')
      marqueeRect.setAttribute('stroke-dasharray', '4 2')
      marqueeRect.setAttribute('display', 'none')
      marqueeRect.setAttribute('rx', '2')
      svgElement.appendChild(marqueeRect)

      const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      previewPath.setAttribute('fill', 'none')
      previewPath.setAttribute('stroke', 'rgba(59,130,246,0.6)')
      previewPath.setAttribute('stroke-width', '2')
      previewPath.setAttribute('stroke-dasharray', '6 3')
      previewPath.setAttribute('display', 'none')
      const viewportGroup = svgElement.querySelector('[data-role="viewport"]') as SVGGElement
      if (viewportGroup) viewportGroup.appendChild(previewPath)

      const edgeBuilder =
        config?.createEdgeBuilder?.(workspace, svgElement, previewPath) ?? undefined

      const interaction = new InteractionManager({
        workspace,
        canvasElement,
        containers: () => containersRef.current,
        connectors: () => connectorsRef.current,
        edgeBuilder,
        gridSize,
        onModeChange: (mode) => {
          if (mode === 'dragging' || mode === 'panning') {
            canvasElement.style.cursor = 'grabbing'
          } else if (mode === 'edgeBuilding') {
            canvasElement.style.cursor = 'crosshair'
          } else {
            canvasElement.style.cursor = ''
          }
        },
        onHover: (container) => {
          canvasElement.style.cursor = container ? 'grab' : ''
        },
        onMarqueeUpdate: (rect) => {
          if (rect) {
            marqueeRect.setAttribute('display', 'block')
            marqueeRect.setAttribute('x', `${rect.x}`)
            marqueeRect.setAttribute('y', `${rect.y}`)
            marqueeRect.setAttribute('width', `${rect.width}`)
            marqueeRect.setAttribute('height', `${rect.height}`)
          } else {
            marqueeRect.setAttribute('display', 'none')
          }
        },
        ...config?.interactionOverrides,
      })
      interactionRef.current = interaction

      const preventMiddleMouse = (event: MouseEvent) => {
        if (event.button === 1) event.preventDefault()
      }
      canvasElement.addEventListener('mousedown', preventMiddleMouse)

      const cleanupZoom =
        config?.enableWheelZoom === false ? () => {} : bindWheelZoom(canvasElement, { workspace })

      const keyboard =
        config?.enableShortcuts === false
          ? null
          : bindDefaultShortcuts({
              workspace,
              element: document.body,
              containers: () => containersRef.current,
              onDelete: () => {
                const selected = workspace.selection.getSelection().slice()
                for (const item of selected) {
                  workspace.history.execute(new RemoveCommand(workspace, item))
                  const index = containersRef.current.indexOf(item as Container)
                  if (index >= 0) containersRef.current.splice(index, 1)
                }
              },
              paste: {
                factory: (json, pos) => {
                  const width = (json.width as number) || 140
                  const height = (json.height as number) || 50
                  return new ContainerClass({
                    workspace,
                    position: new Position(pos.x, pos.y),
                    name: ((json.name as string) || 'Node') + ' (copy)',
                    color: (json.color as string) || '#3b82f6',
                    width,
                    height,
                    children: {
                      left: new ConnectorClass({
                        position: new Position(0, -height / 2),
                        name: 'left',
                        type: 'input',
                      }),
                      right: new ConnectorClass({
                        position: new Position(width, -height / 2),
                        name: 'right',
                        type: 'output',
                      }),
                    },
                  })
                },
                onPaste: (pasted) => {
                  for (const node of pasted) {
                    containersRef.current.push(node)
                  }
                  config?.onPaste?.(pasted)
                },
              },
            })

      return () => {
        keyboard?.destroy()
        interaction.destroy()
        cleanupZoom()
        canvasElement.removeEventListener('mousedown', preventMiddleMouse)
      }
    },
    onPointerDown: (screenPos, event) => {
      if (event.button === 1) event.preventDefault()
      interactionRef.current?.handlePointerDown(screenPos, event)
    },
    onPointerUp: (screenPos) => {
      interactionRef.current?.handlePointerUp(screenPos)
    },
    onFrame: ({ mouse }) => {
      interactionRef.current?.tick(mouse.mousePosition, mouse.buttonState)
      config?.onTick?.()
    },
  })

  return {
    ...core,
    interactionRef,
  }
}
