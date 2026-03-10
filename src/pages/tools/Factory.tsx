import { useCallback, useState } from 'react'
import { FactoryProvider } from '../../contexts/FactoryContext'
import { FactoryLayout } from '../../components/factory/FactoryLayout'
import type { Connector, Container, Workspace } from '../../lib/headless-vpl/primitives'
import type { InteractionManager } from '../../lib/headless-vpl/recipes'

export default function Factory() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [containers, setContainers] = useState<Container[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [interaction, setInteraction] = useState<InteractionManager | null>(null)
  const [refs, setRefs] = useState<{
    containersRef: React.RefObject<Container[]>
    connectorsRef: React.RefObject<Connector[]>
  } | null>(null)

  const handleWorkspaceReady = useCallback(
    (args: {
      workspace: Workspace | null
      containers: Container[]
      connectors: Connector[]
      interaction: InteractionManager | null
      containersRef: React.RefObject<Container[]>
      connectorsRef: React.RefObject<Connector[]>
    }) => {
      setWorkspace(args.workspace)
      setContainers(args.containers)
      setConnectors(args.connectors)
      setInteraction(args.interaction)
      setRefs({
        containersRef: args.containersRef,
        connectorsRef: args.connectorsRef,
      })
    },
    []
  )

  const currentContainers = refs?.containersRef.current || containers
  const currentConnectors = refs?.connectorsRef.current || connectors

  return (
    <FactoryProvider
      workspace={workspace}
      containers={currentContainers}
      connectors={currentConnectors}
      interaction={interaction}
      containersRef={refs?.containersRef ?? null}
      connectorsRef={refs?.connectorsRef ?? null}
    >
      <FactoryLayout onWorkspaceReady={handleWorkspaceReady} />
    </FactoryProvider>
  )
}
