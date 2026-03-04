import Position from './Position'
import Workspace from './Workspace'
import { MovableObject } from './MovableObject'

type ConnectorProps = {
  workspace?: Workspace
  position: Position
  name: string
  type: 'input' | 'output'
}

class Connector extends MovableObject {
  constructor({ workspace, position, name, type }: ConnectorProps) {
    super(workspace, position, name, type)
    if (this.workspace) {
      this.workspace.addElement(this)
    }
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      connectorType: this.type,
    }
  }
}

export default Connector
