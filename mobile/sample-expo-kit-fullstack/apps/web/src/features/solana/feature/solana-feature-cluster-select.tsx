import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCluster } from '@/features/solana/data-access/cluster-context'

export function SolanaFeatureClusterSelect() {
  const { cluster, clusters, setCluster } = useCluster()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline">{cluster.label}</Button>}
      />
      <DropdownMenuContent className="w-56">
        <DropdownMenuRadioGroup
          onValueChange={(nextId) => {
            const next = clusters.find((entry) => entry.id === nextId)

            if (next) {
              setCluster(next)
            }
          }}
          value={cluster.id}
        >
          {clusters.map((nextCluster) => (
            <DropdownMenuRadioItem key={nextCluster.id} value={nextCluster.id}>
              {nextCluster.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
