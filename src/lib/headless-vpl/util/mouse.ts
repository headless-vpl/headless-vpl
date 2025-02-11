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

//マウスの状態を取得（クリックしているかなど）
type MouseState = {
  isLeftButtonDown: boolean
}
export function getMouseState(
  parent: HTMLElement,
  callback: (newState: MouseState) => void
): MouseState {
  const mouseState: MouseState = {
    isLeftButtonDown: false,
  }

  function updateMouseState(e: MouseEvent, isDown: boolean) {
    if (e.button === 0) {
      mouseState.isLeftButtonDown = isDown
    }
    callback(mouseState)
  }

  parent.addEventListener('mousedown', (e) => updateMouseState(e, true))
  parent.addEventListener('mouseup', (e) => updateMouseState(e, false))

  return mouseState
}
