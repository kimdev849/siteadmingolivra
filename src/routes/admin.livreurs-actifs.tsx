import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActiveCouriersView } from "@/components/tracking/ActiveCouriersView";
import { fetchActiveCouriersTracking } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/livreurs-actifs")({
  component: LivreursActifsPage,
});

/** Rafraîchissement temps réel : 10 s tant que l'onglet est visible. */
const LIVE_REFETCH_MS = 10_000;

function LivreursActifsPage() {
  const query = useQuery({
    queryKey: ["admin", "tracking", "active"],
    queryFn: fetchActiveCouriersTracking,
    refetchInterval: LIVE_REFETCH_MS,
  });

  return (
    <div>
      <PageHeader
        title="Livreurs actifs"
        description="Position temps réel des livreurs de toutes les entreprises de livraison — pendant leurs courses uniquement."
      />
      <ActiveCouriersView
        data={query.data}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRefetch={() => void query.refetch()}
        showCompany
        title="Livreurs actifs"
        description="Position temps réel des livreurs de toutes les entreprises."
      />
    </div>
  );
}
