import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useClusterHealth } from '@/features/cluster/data-access/use-cluster-health'
import { getCluster } from '@/features/cluster/data-access/clusters'
import { useAppCluster } from '@/features/core/data-access/use-app-cluster'

/**
 * Explains a bad endpoint once, up front, instead of letting the rest of the app fail one card at a
 * time.
 *
 * An unreachable Localnet gets the command that fixes it, because it almost always means the
 * validator has not been started yet. Everything else gets the endpoint it failed to reach, or the
 * network it turned out to be.
 */
export function ClusterUiOfflineAlert() {
  const cluster = useAppCluster()
  const health = useClusterHealth()

  if (health.status === 'checking' || health.status === 'ok') {
    return null
  }

  if (health.status === 'mismatch') {
    return (
      <Alert variant="destructive">
        <AlertTitle>This endpoint is not {cluster.label}</AlertTitle>
        <AlertDescription>
          <span>
            <code className="font-mono text-xs">{cluster.rpcUrl}</code> reports the genesis hash of{' '}
            {getCluster(health.actual).label}. Point it at {cluster.label}, or pick {getCluster(health.actual).label} in
            the network menu.
          </span>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Can&apos;t reach the {cluster.label} RPC</AlertTitle>
      <AlertDescription>
        {cluster.id === 'solana:localnet' ? (
          <>
            <span>Start a local validator and this page will connect on its own:</span>
            <code className="bg-muted text-foreground w-full rounded px-2 py-1 font-mono text-xs break-all">
              npx solana-mobile@latest localnet start
            </code>
          </>
        ) : (
          <span>
            Nothing answered at <code className="font-mono text-xs">{cluster.rpcUrl}</code>.
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}
