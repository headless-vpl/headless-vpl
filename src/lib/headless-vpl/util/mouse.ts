import { IPosition } from '../core/Position'

export function getMousePosition(parent: HTMLElement): IPosition {
  const mousePosition: IPosition = {
    x: 0,
    y: 0,
  }
  parent.addEventListener('mousemove', (e) => {
    const rect = parent.getBoundingClientRect()
    mousePosition.x = e.clientX - rect.left
    mousePosition.y = e.clientY - rect.top
  })
  return mousePosition
}

export function getPositionDelta(currentPosition: IPosition, previousPosition: IPosition) {
  const dx = currentPosition.x - previousPosition.x
  const dy = currentPosition.y - previousPosition.y
  return { dx, dy }
}

//マウスの状態を取得（クリックしているかなど）
type MouseState = {
  leftButton: 'down' | 'up'
}

//マウスの状態を取得する関数
type getMouseStateProps = {
  mousedown?: (newState: MouseState) => void
  mouseup?: (newState: MouseState) => void
}

export function getMouseState(element: HTMLElement, handlers: getMouseStateProps) {
  const mouseState: MouseState = {
    leftButton: 'up',
  }

  element.addEventListener('mousedown', (event) => {
    mouseState.leftButton = 'down'
    handlers.mousedown?.(mouseState)
  })

  element.addEventListener('mouseup', (event) => {
    mouseState.leftButton = 'up'
    handlers.mouseup?.(mouseState)
  })

  return mouseState
}
