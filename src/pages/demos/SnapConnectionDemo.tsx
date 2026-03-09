import { useRef, useState } from 'react'
import { DebugPanel } from '../../components/DebugPanel'
import { SampleLayout } from '../../components/SampleLayout'
import { VplCanvas } from '../../components/VplCanvas'
import { useRecipeWorkspace } from '../../hooks/workspace/useRecipeWorkspace'
import { SnapConnection, computeConnectorSnapDistance, either } from '../../lib/headless-vpl/helpers'
import { Connector, Container, Position } from '../../lib/headless-vpl/primitives'

type BlockView = { id: string; name: string; color: string; width: number; height: number }

export default function SnapConnectionDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [blocks, setBlocks] = useState<BlockView[]>([])

  const snapConnsRef = useRef<SnapConnection[]>([])

  const { workspaceRef, containersRef, ready } = useRecipeWorkspace(svgRef, overlayRef, canvasRef, {
    enableShortcuts: false,
    interactionOverrides: { snapConnections: snapConnsRef.current },
  })

  const initialized = useRef(false)
  if (!initialized.current && ready && workspaceRef.current) {
    initialized.current = true
    const ws = workspaceRef.current
    const W = 120,
      H = 45
    const blockViews: BlockView[] = []

    // --- パターン1: 縦（top-bottom） ---
    const vColors = ['#7c3aed', '#6d28d9', '#5b21b6']
    const vNames = ['V-A', 'V-B', 'V-C']
    const vBlocks: Container[] = []

    for (let i = 0; i < 3; i++) {
      const topConn = new Connector({
        position: new Position(W / 2, 0),
        name: 'top',
        type: 'input',
      })
      const bottomConn = new Connector({
        position: new Position(W / 2, -H),
        name: 'bottom',
        type: 'output',
      })
      const c = new Container({
        workspace: ws,
        position: new Position(60, 40 + i * 80),
        name: vNames[i],
        color: vColors[i],
        width: W,
        height: H,
        children: { top: topConn, bottom: bottomConn },
      })
      vBlocks.push(c)
      containersRef.current.push(c)
      blockViews.push({ id: c.id, name: c.name, color: c.color, width: W, height: H })
    }

    // B→A のスナップ
    const vBTop = (vBlocks[1].children as { top: Connector }).top
    const vABottom = (vBlocks[0].children as { bottom: Connector }).bottom
    snapConnsRef.current.push(
      new SnapConnection({
        source: vBlocks[1],
        sourcePosition: vBTop.position,
        target: vBlocks[0],
        targetPosition: vABottom.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(vBTop, vABottom),
      })
    )
    // C→B のスナップ
    const vCTop = (vBlocks[2].children as { top: Connector }).top
    const vBBottom = (vBlocks[1].children as { bottom: Connector }).bottom
    snapConnsRef.current.push(
      new SnapConnection({
        source: vBlocks[2],
        sourcePosition: vCTop.position,
        target: vBlocks[1],
        targetPosition: vBBottom.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(vCTop, vBBottom),
      })
    )

    // --- パターン2: 横（left-right） ---
    const hColors = ['#0891b2', '#0e7490', '#155e75']
    const hNames = ['H-A', 'H-B', 'H-C']
    const hBlocks: Container[] = []

    for (let i = 0; i < 3; i++) {
      const leftConn = new Connector({
        position: new Position(0, -H / 2),
        name: 'left',
        type: 'input',
      })
      const rightConn = new Connector({
        position: new Position(W, -H / 2),
        name: 'right',
        type: 'output',
      })
      const c = new Container({
        workspace: ws,
        position: new Position(260 + i * 150, 40),
        name: hNames[i],
        color: hColors[i],
        width: W,
        height: H,
        children: { left: leftConn, right: rightConn },
      })
      hBlocks.push(c)
      containersRef.current.push(c)
      blockViews.push({ id: c.id, name: c.name, color: c.color, width: W, height: H })
    }

    // B.left → A.right
    const hBLeft = (hBlocks[1].children as { left: Connector }).left
    const hARight = (hBlocks[0].children as { right: Connector }).right
    snapConnsRef.current.push(
      new SnapConnection({
        source: hBlocks[1],
        sourcePosition: hBLeft.position,
        target: hBlocks[0],
        targetPosition: hARight.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(hBLeft, hARight),
      })
    )
    // C.left → B.right
    const hCLeft = (hBlocks[2].children as { left: Connector }).left
    const hBRight = (hBlocks[1].children as { right: Connector }).right
    snapConnsRef.current.push(
      new SnapConnection({
        source: hBlocks[2],
        sourcePosition: hCLeft.position,
        target: hBlocks[1],
        targetPosition: hBRight.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(hCLeft, hBRight),
      })
    )

    // --- パターン3: 十字（4方向） ---
    const CW = 100, CH = 40
    const centerConn = {
      top: new Connector({ position: new Position(CW / 2, 0), name: 'top', type: 'input' }),
      bottom: new Connector({ position: new Position(CW / 2, -CH), name: 'bottom', type: 'output' }),
      left: new Connector({ position: new Position(0, -CH / 2), name: 'left', type: 'input' }),
      right: new Connector({ position: new Position(CW, -CH / 2), name: 'right', type: 'output' }),
    }
    const centerX = 350, centerY = 200
    const center = new Container({
      workspace: ws,
      position: new Position(centerX, centerY),
      name: 'Center',
      color: '#dc2626',
      width: CW,
      height: CH,
      children: centerConn,
    })
    containersRef.current.push(center)
    blockViews.push({ id: center.id, name: center.name, color: center.color, width: CW, height: CH })

    // 上
    const topBlock = new Container({
      workspace: ws,
      position: new Position(centerX, centerY - 70),
      name: 'Top',
      color: '#ef4444',
      width: CW,
      height: CH,
      children: { bottom: new Connector({ position: new Position(CW / 2, -CH), name: 'bottom', type: 'output' }) },
    })
    containersRef.current.push(topBlock)
    blockViews.push({ id: topBlock.id, name: topBlock.name, color: topBlock.color, width: CW, height: CH })
    snapConnsRef.current.push(
      new SnapConnection({
        source: topBlock,
        sourcePosition: (topBlock.children as { bottom: Connector }).bottom.position,
        target: center,
        targetPosition: centerConn.top.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(
          (topBlock.children as { bottom: Connector }).bottom,
          centerConn.top
        ),
      })
    )

    // 下
    const bottomBlock = new Container({
      workspace: ws,
      position: new Position(centerX, centerY + 70),
      name: 'Bottom',
      color: '#f97316',
      width: CW,
      height: CH,
      children: { top: new Connector({ position: new Position(CW / 2, 0), name: 'top', type: 'input' }) },
    })
    containersRef.current.push(bottomBlock)
    blockViews.push({ id: bottomBlock.id, name: bottomBlock.name, color: bottomBlock.color, width: CW, height: CH })
    snapConnsRef.current.push(
      new SnapConnection({
        source: bottomBlock,
        sourcePosition: (bottomBlock.children as { top: Connector }).top.position,
        target: center,
        targetPosition: centerConn.bottom.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(
          (bottomBlock.children as { top: Connector }).top,
          centerConn.bottom
        ),
      })
    )

    // 左
    const leftBlock = new Container({
      workspace: ws,
      position: new Position(centerX - 130, centerY),
      name: 'Left',
      color: '#a855f7',
      width: CW,
      height: CH,
      children: { right: new Connector({ position: new Position(CW, -CH / 2), name: 'right', type: 'output' }) },
    })
    containersRef.current.push(leftBlock)
    blockViews.push({ id: leftBlock.id, name: leftBlock.name, color: leftBlock.color, width: CW, height: CH })
    snapConnsRef.current.push(
      new SnapConnection({
        source: leftBlock,
        sourcePosition: (leftBlock.children as { right: Connector }).right.position,
        target: center,
        targetPosition: centerConn.left.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(
          (leftBlock.children as { right: Connector }).right,
          centerConn.left
        ),
      })
    )

    // 右
    const rightBlock = new Container({
      workspace: ws,
      position: new Position(centerX + 130, centerY),
      name: 'Right',
      color: '#ec4899',
      width: CW,
      height: CH,
      children: { left: new Connector({ position: new Position(0, -CH / 2), name: 'left', type: 'input' }) },
    })
    containersRef.current.push(rightBlock)
    blockViews.push({ id: rightBlock.id, name: rightBlock.name, color: rightBlock.color, width: CW, height: CH })
    snapConnsRef.current.push(
      new SnapConnection({
        source: rightBlock,
        sourcePosition: (rightBlock.children as { left: Connector }).left.position,
        target: center,
        targetPosition: centerConn.right.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(
          (rightBlock.children as { left: Connector }).left,
          centerConn.right
        ),
      })
    )

    // --- パターン4: 双方向（either） ---
    const eColors = ['#059669', '#047857']
    const eNames = ['Either-A', 'Either-B']
    const eBlocks: Container[] = []

    for (let i = 0; i < 2; i++) {
      const topConn = new Connector({ position: new Position(W / 2, 0), name: 'top', type: 'input' })
      const bottomConn = new Connector({ position: new Position(W / 2, -H), name: 'bottom', type: 'output' })
      const c = new Container({
        workspace: ws,
        position: new Position(60, 280 + i * 80),
        name: eNames[i],
        color: eColors[i],
        width: W,
        height: H,
        children: { top: topConn, bottom: bottomConn },
      })
      eBlocks.push(c)
      containersRef.current.push(c)
      blockViews.push({ id: c.id, name: c.name, color: c.color, width: W, height: H })
    }

    // 双方向: どちらが近づいてもスナップ
    const eBTop = (eBlocks[1].children as { top: Connector }).top
    const eABottom = (eBlocks[0].children as { bottom: Connector }).bottom
    snapConnsRef.current.push(
      new SnapConnection({
        source: eBlocks[1],
        sourcePosition: eBTop.position,
        target: eBlocks[0],
        targetPosition: eABottom.position,
        workspace: ws,
        snapDistance: computeConnectorSnapDistance(eBTop, eABottom),
        strategy: either,
      })
    )

    setBlocks(blockViews)
  }

  return (
    <SampleLayout
      title='Snap Connection'
      description='4パターンのスナップ接続: 縦/横/十字(4方向)/双方向。ブロックを近づけるとスナップします。'
      rightPanel={<DebugPanel workspaceRef={workspaceRef} containersRef={containersRef} svgRef={svgRef} overlayRef={overlayRef} showGrid={showGrid} onShowGridChange={setShowGrid} canvasRef={canvasRef} ready={ready} />}
    >
      <VplCanvas
        ref={(handle) => {
          if (handle) {
            svgRef.current = handle.svg
            overlayRef.current = handle.overlay
            canvasRef.current = handle.canvas
          }
        }}
        showGrid={showGrid}
      >
        {blocks.map((b) => (
          <div
            key={b.id}
            id={`node-${b.id}`}
            className='node-scratch'
            style={{ width: b.width, height: b.height }}
          >
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '12px' }}>
              {b.name}
            </span>
          </div>
        ))}
      </VplCanvas>
    </SampleLayout>
  )
}
