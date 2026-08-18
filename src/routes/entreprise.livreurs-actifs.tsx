import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActiveCouriersView } from "@/components/tracking/ActiveCouriersView";
import { fetchMyActiveCouriersTracking } from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/livreurs-actifs")({
  component: LivreursActifsPage,
});

/** Rafraîchissement temps réel : 10 s tant que l'onglet est visible. */
const LIVE_REFETCH_MS = 10_000;

function LivreursActifsPage() {
  const query = useQuery({
    queryKey: ["logistics", "tracking", "active"],
    queryFn: fetchMyActiveCouriersTracking,
    refetchInterval: LIVE_REFETCH_MS,
  });

  return (
    <div>
      <PageHeader
        title="Livreurs actifs"
        description="Vos livreurs en temps réel sur la carte — position partagée uniquement pendant leurs courses."
      />
      <ActiveCouriersView
        data={query.data}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRefetch={() => void query.refetch()}
        title="Livreurs actifs"
        description="Position temps réel des livreurs de votre entreprise."
      />
    </div>
  );
}
