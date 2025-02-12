import { Container, getDistance, Position } from '../../headless-vpl'
import { getMouseState, getPositionDelta } from './mouse'

/**
 * 指定されたソースとターゲットのコネクタ間で、ソースコンテナを動かしてスナップを試みます。
 *
 * @param source ソースコンテナ（スナップ対象）
 * @param sourcePosition ソースの座標
 * @param targetPosition ターゲットの座標
 * @param mouseState 現在のマウス状態。左ボタンが 'up' の場合にのみスナップを試みる。
 * @param snapDistance スナップを発動する距離の閾値
 * @param onSnap スナップが成功した場合に実行するコールバック
 * @param onFail スナップが失敗した場合に実行するコールバック
 * @returns スナップが実行された場合は true を返します。
 */

export function snap(
  source: Container,
  sourcePosition: Position,
  targetPosition: Position,
  mouseState: getMouseState,
  snapDistance: number = 50,
  onSnap?: () => void,
  onFail?: () => void
): boolean {
  // マウスがリリース状態でなければ処理しない
  if (mouseState.buttonState.leftButton !== 'up') {
    return false
  }

  const sourceConnector = sourcePosition
  const targetConnector = targetPosition

  const distance = getDistance(sourceConnector, targetConnector)
  if (distance < snapDistance) {
    const delta = getPositionDelta(sourceConnector, targetConnector)
    // source の位置を調整してスナップさせる
    source.move(source.position.x - delta.x, source.position.y - delta.y)
    onSnap?.()
    return true
  }

  // スナップが失敗した場合にコールバックを実行
  onFail?.()
  return false
}
