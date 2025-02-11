/**
 * 毎フレーム実行されるアニメーションループのユーティリティ関数
 *
 * @param onFrame 各フレームで実行するコールバック関数
 * @param deltaTime 前回フレームからの経過時間 (ms)
 * @param frame 現在のフレーム数
 */
export function animate(callback: (deltaTime: number, frame: number) => void) {
  let lastTimestamp = performance.now()
  let frame = 0

  //アニメーションのメインループ
  function tick(currentTime: number) {
    const deltaTime = currentTime - lastTimestamp
    lastTimestamp = currentTime

    //コールバック（実際の実装を実行）
    callback(deltaTime, frame)
    frame++

    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}
