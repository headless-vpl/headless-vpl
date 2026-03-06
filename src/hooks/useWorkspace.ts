import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Connector,
  Container,
  DomSyncHelper,
  InteractionManager,
  Position,
  RemoveCommand,
  SvgRenderer,
  Workspace,
  bindDefaultShortcuts,
  bindWheelZoom,
} from '../lib/headless-vpl'
import type { InteractionConfig } from '../lib/headless-vpl'
import { animate } from '../lib/headless-vpl/util/animate'
import { getMouseState } from '../lib/headless-vpl/util/mouse'

export type UseWorkspaceConfig = {
  /** InteractionManager に渡す追加設定 */
  interactionOverrides?: Partial<InteractionConfig>
  /** DomSyncHelper を使うか（デフォルト: true） */
  enableDomSync?: boolean
  /** コピー/ペースト機能を有効にするか */
  enableShortcuts?: boolean
  /** グリッドサイズ */
  gridSize?: number
  /** アニメーションループ内で実行する追加処理 */
  onTick?: () => void
  /** ペースト完了時のコールバック */
  onPaste?: (pasted: Container[]) => void
}

export type UseWorkspaceReturn = {
  workspace: Workspace
  containers: Container[]
  connectors: Connector[]
  interaction: InteractionManager
}

export function useWorkspace(
  svgRef: React.RefObject<SVGSVGElement | null>,
  overlayRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLDivElement | null>,
  config?: UseWorkspaceConfig
) {
  const workspaceRef = useRef<Workspace | null>(null)
  const containersRef = useRef<Container[]>([])
  const connectorsRef = useRef<Connector[]>([])
  const interactionRef = useRef<InteractionManager | null>(null)
  const [ready, setReady] = useState(false)

  const getWorkspace = useCallback(() => workspaceRef.current, [])
  const getContainers = useCallback(() => containersRef.current, [])
  const getConnectors = useCallback(() => connectorsRef.current, [])

  useEffect(() => {
    const svgEl = svgRef.current
    const overlayEl = overlayRef.current
    const canvasEl = canvasRef.current
    if (!svgEl || !overlayEl || !canvasEl) return

    const workspace = new Workspace()
    workspaceRef.current = workspace
    new SvgRenderer(svgEl, workspace)

    const gridSize = config?.gridSize ?? 24

    // マーキー矩形
    const mRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    mRect.setAttribute('fill', 'rgba(59,130,246,0.08)')
    mRect.setAttribute('stroke', 'rgba(59,130,246,0.4)')
    mRect.setAttribute('stroke-width', '1')
    mRect.setAttribute('stroke-dasharray', '4 2')
    mRect.setAttribute('display', 'none')
    mRect.setAttribute('rx', '2')
    svgEl.appendChild(mRect)

    // EdgeBuilder プレビューパス
    const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    previewPath.setAttribute('fill', 'none')
    previewPath.setAttribute('stroke', 'rgba(59,130,246,0.6)')
    previewPath.setAttribute('stroke-width', '2')
    previewPath.setAttribute('stroke-dasharray', '6 3')
    previewPath.setAttribute('display', 'none')
    const viewportGroup = svgEl.querySelector('[data-role="viewport"]') as SVGGElement
    if (viewportGroup) viewportGroup.appendChild(previewPath)

    const interaction = new InteractionManager({
      workspace,
      canvasElement: canvasEl,
      containers: () => containersRef.current,
      connectors: () => connectorsRef.current,
      gridSize,
      onModeChange: (mode) => {
        if (mode === 'dragging' || mode === 'panning') {
          canvasEl.style.cursor = 'grabbing'
        } else if (mode === 'edgeBuilding') {
          canvasEl.style.cursor = 'crosshair'
        } else {
          canvasEl.style.cursor = ''
        }
      },
      onHover: (container) => {
        if (container) {
          canvasEl.style.cursor = 'grab'
        } else {
          canvasEl.style.cursor = ''
        }
      },
      onMarqueeUpdate: (rect) => {
        if (rect) {
          mRect.setAttribute('display', 'block')
          mRect.setAttribute('x', `${rect.x}`)
          mRect.setAttribute('y', `${rect.y}`)
          mRect.setAttribute('width', `${rect.width}`)
          mRect.setAttribute('height', `${rect.height}`)
        } else {
          mRect.setAttribute('display', 'none')
        }
      },
      ...config?.interactionOverrides,
    })
    interactionRef.current = interaction
    setReady(true)

    const mouse = getMouseState(canvasEl, {
      mousedown: (_bs, mp, ev) => {
        if (ev.button === 1) ev.preventDefault()
        interaction.handlePointerDown(mp, ev)
      },
      mouseup: (_bs, mp) => interaction.handlePointerUp(mp),
    })

    canvasEl.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault()
    })

    const cleanupZoom = bindWheelZoom(canvasEl, { workspace })

    // DOM同期
    const domSync =
      config?.enableDomSync !== false
        ? new DomSyncHelper({
            workspace,
            overlayElement: overlayEl,
            canvasElement: canvasEl,
            gridSize,
            resolveElement: (c: Container) => document.getElementById(`node-${c.id}`),
          })
        : null

    // キーボードショートカット
    const kb =
      config?.enableShortcuts !== false
        ? bindDefaultShortcuts({
            workspace,
            element: document.body,
            containers: () => containersRef.current,
            onDelete: () => {
              const sel = workspace.selection.getSelection().slice()
              for (const s of sel) {
                workspace.history.execute(new RemoveCommand(workspace, s))
                const i = containersRef.current.indexOf(s as Container)
                if (i >= 0) containersRef.current.splice(i, 1)
              }
            },
            paste: {
              factory: (json, pos) => {
                const w = (json.width as number) || 140
                const h = (json.height as number) || 50
                return new Container({
                  workspace,
                  position: new Position(pos.x, pos.y),
                  name: ((json.name as string) || 'Node') + ' (copy)',
                  color: (json.color as string) || '#3b82f6',
                  width: w,
                  height: h,
                  children: {
                    left: new Connector({
                      position: new Position(0, -h / 2),
                      name: 'left',
                      type: 'input',
                    }),
                    right: new Connector({
                      position: new Position(w, -h / 2),
                      name: 'right',
                      type: 'output',
                    }),
                  },
                })
              },
              onPaste: (pasted) => {
                for (const n of pasted) {
                  containersRef.current.push(n)
                }
                config?.onPaste?.(pasted)
              },
            },
          })
        : null

    animate(() => {
      interaction.tick(mouse.mousePosition, mouse.buttonState)
      if (domSync) domSync.syncAll(containersRef.current)
      config?.onTick?.()
    })

    return () => {
      kb?.destroy()
      interaction.destroy()
      cleanupZoom()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    workspaceRef,
    containersRef,
    connectorsRef,
    interactionRef,
    ready,
    getWorkspace,
    getContainers,
    getConnectors,
  }
}
