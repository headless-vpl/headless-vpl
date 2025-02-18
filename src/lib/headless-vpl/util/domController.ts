export class DomController {
  private element: HTMLElement
  private x: number = 0
  private y: number = 0

  constructor(selector: string) {
    const el = document.querySelector(selector)
    if (!el) {
      throw new Error(`Element with selector "${selector}" not found.`)
    }
    this.element = el as HTMLElement
    this.updatePosition()
  }

  // 絶対位置への移動
  move(x: number, y: number): void {
    this.x = x
    this.y = y
    this.updatePosition()
  }

  // 相対移動
  moveBy(dx: number, dy: number): void {
    this.x += dx
    this.y += dy
    this.updatePosition()
  }

  // 現在の位置を取得するゲッター
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }

  // DOM要素のtransformスタイルを更新する
  private updatePosition(): void {
    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`
  }
}
