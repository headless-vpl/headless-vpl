import Container from '../core/Container'
import { IPosition } from '../core/Position'
import { isCollision } from './collision_detecion'
import { getMouseState, MouseState } from './mouse'

/**
 * 複数のコンテナーに対してドラッグ＆ドロップの更新を行います。
 *
 * @param containers - ドラッグ対象のコンテナーの配列
 * @param dx - 前フレームからのX軸方向の移動量
 * @param dy - 前フレームからのY軸方向の移動量
 * @param mousePosition - マウスの現在位置
 * @param mouseState - マウスの状態（leftButton は 'down' / 'up'）
 * @param dragEligible - マウスクリック開始時にコンテナー上でクリックされたかを示すフラグ
 * @param currentDragContainers - 現在ドラッグ中のコンテナーの配列
 * @param allowMultiple - 複数のコンテナーをドラッグ可能にするかどうかのフラグ
 *
 * @returns 更新後のドラッグ中コンテナーの配列。ドラッグしていなければ空の配列を返します。
 */
export function DragAndDrop(
  containers: Container[],
  delta: IPosition,
  mouseState: getMouseState,
  dragEligible: boolean,
  currentDragContainers: Container[],
  allowMultiple: boolean = false,
  callback?: () => void
): Container[] {
  // 現在のドラッグ中コンテナー配列をコピーして更新を行う
  let newDragContainers = [...currentDragContainers]

  if (mouseState.buttonState.leftButton === 'down') {
    containers.forEach((container) => {
      if (newDragContainers.includes(container)) {
        // 既にドラッグ中のコンテナーは移動＆赤色に更新
        container.setColor('red')
        container.move(container.position.x + delta.x, container.position.y + delta.y)
        callback?.()
      } else if (isCollision(container, mouseState.mousePosition) && dragEligible) {
        if (!allowMultiple && newDragContainers.length > 0) {
          // 複数ドラッグが許可されていない場合、最初のコンテナのみをドラッグ
          return
        }
        // クリック開始時にコンテナー上でクリックされていたら、ドラッグ中リストに追加
        newDragContainers.push(container)
      } else {
        // それ以外は緑色に
        container.setColor(container.color)
      }
    })
  } else {
    // マウスボタンが離された場合は全てのコンテナーをリセット
    containers.forEach((container) => container.setColor('green'))
    newDragContainers = []
  }

  return newDragContainers
}
