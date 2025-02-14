import Connector from './Connector'
import AutoLayout from './AutoLayout'

type Element = Connector | AutoLayout

class Workspace {
  private workspace: HTMLElement
  private elements: Element[] = []

  constructor(workspaceId: string) {
    this.workspace = document.querySelector(workspaceId) as HTMLElement
  }

  public addElement(element: Element) {
    this.elements.push(element)
  }

  public getWorkspace() {
    return this.workspace
  }
}

export default Workspace
