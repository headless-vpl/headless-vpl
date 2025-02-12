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
  const delta: IPosition = {
    x: currentPosition.x - previousPosition.x,
    y: currentPosition.y - previousPosition.y,
  }
  return delta
}

//マウスの状態を取得（クリックしているかなど）
export type MouseState = {
  leftButton: 'down' | 'up'
}

//マウスの状態を取得する関数
type getMouseStateProps = {
  mousedown?: (mouseState: MouseState, mousePosition: IPosition) => void
  mouseup?: (mouseState: MouseState, mousePosition: IPosition) => void
}
export type getMouseState = {
  buttonState: MouseState
  mousePosition: IPosition
}
export function getMouseState(element: HTMLElement, handlers: getMouseStateProps): getMouseState {
  const buttonState: MouseState = {
    leftButton: 'up',
  }

  const mousePosition: IPosition = {
    x: 0,
    y: 0,
  }

  element.addEventListener('mousemove', (e) => {
    const rect = element.getBoundingClientRect()
    mousePosition.x = e.clientX - rect.left
    mousePosition.y = e.clientY - rect.top
  })

  element.addEventListener('mousedown', () => {
    buttonState.leftButton = 'down'
    handlers.mousedown?.(buttonState, mousePosition)
  })

  element.addEventListener('mouseup', () => {
    buttonState.leftButton = 'up'
    handlers.mouseup?.(buttonState, mousePosition)
  })

  return { buttonState, mousePosition } as getMouseState
}
