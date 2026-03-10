import type { MutableRefObject, RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DomSyncHelper } from '../../lib/headless-vpl/helpers'
import { Connector, Container, SvgRenderer, Workspace } from '../../lib/headless-vpl/primitives'
import { animate } from '../../lib/headless-vpl/util/animate'
import {
  getMouseState,
  type MouseState,
  type getMouseState as MouseSnapshot,
} from '../../lib/headless-vpl/util/mouse'

type WorkspaceRefs = {
  workspace: Workspace
  svgElement: SVGSVGElement
  overlayElement: HTMLDivElement
  canvasElement: HTMLDivElement
  containersRef: MutableRefObject<Container[]>
  connectorsRef: MutableRefObject<Connector[]>
}

export type UseWorkspaceCoreConfig = {
  enableDomSync?: boolean
  enableWheelZoom?: boolean
  resolveDomElement?: (container: Container) => HTMLElement | null
  gridSize?: number
  onReady?: (refs: WorkspaceRefs) => void | (() => void)
  onPointerDown?: (
    screenPos: { x: number; y: number },
    event: MouseEvent,
    refs: WorkspaceRefs
  ) => void
  onPointerUp?: (
    screenPos: { x: number; y: number },
    event: MouseEvent,
    refs: WorkspaceRefs
  ) => void
  onFrame?: (args: WorkspaceRefs & { mouse: MouseSnapshot; buttonState: MouseState }) => void
}

export type UseWorkspaceCoreReturn = {
  workspaceRef: MutableRefObject<Workspace | null>
  containersRef: MutableRefObject<Container[]>
  connectorsRef: MutableRefObject<Connector[]>
  ready: boolean
  getWorkspace: () => Workspace | null
  getContainers: () => Container[]
  getConnectors: () => Connector[]
}

export function useWorkspaceCore(
  svgRef: RefObject<SVGSVGElement | null>,
  overlayRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLDivElement | null>,
  config?: UseWorkspaceCoreConfig
): UseWorkspaceCoreReturn {
  const workspaceRef = useRef<Workspace | null>(null)
  const containersRef = useRef<Container[]>([])
  const connectorsRef = useRef<Connector[]>([])
  const [ready, setReady] = useState(false)

  const getWorkspace = useCallback(() => workspaceRef.current, [])
  const getContainers = useCallback(() => containersRef.current, [])
  const getConnectors = useCallback(() => connectorsRef.current, [])

  useEffect(() => {
    const svgElement = svgRef.current
    const overlayElement = overlayRef.current
    const canvasElement = canvasRef.current
    if (!svgElement || !overlayElement || !canvasElement) return

    const workspace = new Workspace()
    workspaceRef.current = workspace
    new SvgRenderer(svgElement, workspace)

    const refs: WorkspaceRefs = {
      workspace,
      svgElement,
      overlayElement,
      canvasElement,
      containersRef,
      connectorsRef,
    }

    const gridSize = config?.gridSize ?? 24
    const mouse = getMouseState(canvasElement, {
      mousedown: (_buttonState, mousePosition, event) =>
        config?.onPointerDown?.(mousePosition, event, refs),
      mouseup: (_buttonState, mousePosition, event) =>
        config?.onPointerUp?.(mousePosition, event, refs),
    })

    const domSync =
      config?.enableDomSync !== false
        ? new DomSyncHelper({
            workspace,
            overlayElement,
            canvasElement,
            gridSize,
            resolveElement:
              config?.resolveDomElement ??
              ((container: Container) => document.getElementById(`node-${container.id}`)),
          })
        : null

    const cleanup = config?.onReady?.(refs)
    setReady(true)

    animate(() => {
      config?.onFrame?.({ ...refs, mouse, buttonState: mouse.buttonState })
      if (domSync) domSync.syncAll(containersRef.current)
    })

    return () => {
      cleanup?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    workspaceRef,
    containersRef,
    connectorsRef,
    ready,
    getWorkspace,
    getContainers,
    getConnectors,
  }
}
