class Workspace {
  private workspace: HTMLElement

  constructor(workspaceId: string) {
    this.workspace = document.querySelector(workspaceId) as HTMLElement
  }

  public getWorkspace() {
    return this.workspace
  }
}

export default Workspace
