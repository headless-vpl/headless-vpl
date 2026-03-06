import type Connector from '../core/Connector'
import type Container from '../core/Container'
import type Workspace from '../core/Workspace'
import type { SnapConnection } from '../util/snap'
import { BlockStackController } from './stack'

const blockStack = new BlockStackController()

export type StackConnectable = {
  container: Container
  topConn: Connector | null
  bottomConn: Connector | null
}

export type ConnectStackPairsConfig<T extends StackConnectable> = {
  workspace: Workspace
  snapConnections: readonly SnapConnection[]
  pairs: ReadonlyArray<readonly [T, T]>
}

export function connectStackPairs<T extends StackConnectable>({
  workspace,
  snapConnections,
  pairs,
}: ConnectStackPairsConfig<T>): void {
  for (const [child, parent] of pairs) {
    if (!child.topConn || !parent.bottomConn) continue

    const dx = child.topConn.position.x - parent.bottomConn.position.x
    const dy = child.topConn.position.y - parent.bottomConn.position.y
    child.container.move(child.container.position.x - dx, child.container.position.y - dy)

    const connection = snapConnections.find(
      (snap) => snap.source === child.container && snap.target === parent.container
    )

    if (connection) {
      connection.lock()
    } else {
      blockStack.reattach(child.container, parent.container)
    }

    workspace.eventBus.emit('connect', child.container, {
      parent: parent.container.id,
      child: child.container.id,
    })
  }
}
