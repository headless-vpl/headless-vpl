import Connector from "./Connector"

type Element = Connector

class Workspace {
  private workspace: HTMLElement
  private elements: Element[] = []

  constructor(workspaceId: string) {
    this.workspace = document.querySelector(workspaceId) as HTMLElement
  }

  public addElement(element: Connector) {
    this.elements.push(element)
  }

  public getWorkspace() {
    return this.workspace
  }
}

export default Workspace
