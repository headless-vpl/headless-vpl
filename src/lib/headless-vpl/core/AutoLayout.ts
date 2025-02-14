import Container from './Container'
import Workspace from './Workspace'
import Position from './Position'

type AutoLayoutProps = {
  workspace: Workspace
  position: Position
  width: number
  height: number
  containers: Container[]
}
class AutoLayout {
  Children: Container[] = []
  position: Position
  parentContainer: Container | null = null
  width: number = 100
  height: number = 100
  domElement: SVGElement | null = null
  workspace: Workspace
  frame: number = 0

  constructor({ workspace, position, width, height, containers }: AutoLayoutProps) {
    this.workspace = workspace
    this.workspace.addElement(this)
    this.Children = containers
    this.position = position
    this.width = width
    this.height = height
    this.createDom()
  }

  createDom(): void {
    const autoLayout = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    autoLayout.setAttribute('width', `${this.width}`)
    autoLayout.setAttribute('height', `${this.height}`)
    autoLayout.setAttribute('stroke-width', '4')
    autoLayout.setAttribute('stroke', 'blue')
    autoLayout.setAttribute('fill', 'none')
    this.domElement = autoLayout
    this.workspace.getWorkspace().appendChild(this.domElement)
  }

  // 親Containerを設定するメソッド
  setParent(container: Container) {
    this.parentContainer = container
  }

  // レイアウトを管理するオブジェクトの追加
  addElement(element: Container) {
    this.Children.push(element)
  }

  //fix: updateとmoveの使い方をプロジェクトで統一する
  //updateの中でmoveの処理を呼んでおらず、直接動かす処理を書いてしまっている
  update() {
    //親の位置
    if (!this.parentContainer) return
    this.domElement!.setAttribute('x', `${this.position.x + this.parentContainer!.position.x}`)
    this.domElement!.setAttribute('y', `${this.position.y + this.parentContainer!.position.y}`)

    let startX = this.position.x + this.parentContainer!.position.x
    let startY = this.position.y + this.parentContainer!.position.y + this.height / 2

    //子の位置
    this.Children.forEach((child, index) => {
      if (!this.parentContainer) return

      //childを横幅5pxごとにずらして配置していく
      child.move(startX, startY - child.height / 2)
      if (index === 1) {
        child.width = 100 + Math.sin(this.frame / 10) * 20
        child.update()
      }
      if (index === 2) {
        child.width = 50 + Math.sin(this.frame / 10) * 30
        child.update()
      }
      startX += child.width + 10
    })
    this.frame++
  }

  move(x: number, y: number) {
    this.position.x = x
    this.position.y = y
    this.update()
  }
}

export default AutoLayout
