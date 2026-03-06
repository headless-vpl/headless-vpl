import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'

export type VplCanvasHandle = {
  svg: SVGSVGElement | null
  overlay: HTMLDivElement | null
  canvas: HTMLDivElement | null
}

type VplCanvasProps = {
  children?: React.ReactNode
  height?: string
  showGrid?: boolean
  dark?: boolean
}

export const VplCanvas = forwardRef<VplCanvasHandle, VplCanvasProps>(
  ({ children, height = '100%', showGrid = true, dark }, ref) => {
    const { theme } = useTheme()
    const svgRef = useRef<SVGSVGElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      get svg() {
        return svgRef.current
      },
      get overlay() {
        return overlayRef.current
      },
      get canvas() {
        return canvasRef.current
      },
    }))

    const isDark = dark ?? theme === 'dark'
    const bg = isDark ? '#0a0a0b' : '#ffffff'
    const dotColor = isDark ? '#27272a' : '#d4d4d8'

    return (
      <div
        ref={canvasRef}
        className='vpl-canvas rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden'
        style={{
          height,
          backgroundColor: bg,
          backgroundImage: showGrid
            ? `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`
            : undefined,
          backgroundSize: showGrid ? '24px 24px' : undefined,
        }}
      >
        <svg ref={svgRef} />
        <div ref={overlayRef} className='dom-overlay'>
          {children}
        </div>
      </div>
    )
  }
)

VplCanvas.displayName = 'VplCanvas'
