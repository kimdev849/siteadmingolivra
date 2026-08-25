import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ADMIN_LIVE_REFETCH_MS } from "@/lib/admin-nav";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminDeliveries, formatDateTimeFr, formatStatutLabel } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/livraisons")({
  component: LivraisonsPage,
});

/** Référence stable partagée : évite que `?? []` recrée un tableau à chaque
 * rendu (et donc des dépendances de useMemo instables). */
const NO_DATA: never[] = [];

const PERIODS = [
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
  { value: "365", label: "12 derniers mois" },
  { value: "all", label: "Tout l'historique" },
];

function isoDaysAgo(days: string | number | undefined | null): string | undefined {
  if (!days || days === "all") return undefined;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - Number(days) + 1);
  return d.toISOString();
}

function LivraisonsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("30");
  const [page, setPage] = useState(0);
  const pageSize = 100;

  const since = isoDaysAgo(period);

  const deliveriesQuery = useQuery({
    queryKey: ["admin", "deliveries", statusFilter, typeFilter, period, page],
    queryFn: () =>
      fetchAdminDeliveries({
        status: statusFilter === "all" ? undefined : statusFilter,
        type: typeFilter === "all" ? undefined : (typeFilter as "commande" | "externe"),
        since,
        limit: pageSize,
        offset: page * pageSize,
      }),
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
    placeholderData: (prev) => prev,
  });

  const allItems = deliveriesQuery.data?.items ?? NO_DATA;
  const total = deliveriesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const deliveries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((d) => {
      const hay = [
        d.id,
        d.commande?.numero,
        d.commerce_nom,
        d.client_nom,
        d.livreur?.nom,
        d.adresse,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allItems, search]);

  const rows = deliveries.map((d) => [
    <Link
      key={`id-${d.id}`}
      to="/admin/livraisons/$id"
      params={{ id: d.id }}
      className="font-mono text-primary hover:underline"
    >
      {d.id.slice(0, 8)}
    </Link>,
    <Badge key={`type-${d.id}`} variant="outline">
      {d.type_livraison === "externe" ? "Externe" : "Commande"}
    </Badge>,
    d.commande?.numero || d.commerce_nom || d.client_nom || "—",
    d.livreur?.nom || "—",
    <span key={`addr-${d.id}`} className="block max-w-[200px] truncate">
      {d.adresse || "—"}
    </span>,
    <Badge key={`st-${d.id}`} variant={d.en_retard ? "destructive" : "secondary"}>
      {formatStatutLabel(d.statut)}
    </Badge>,
    formatDateTimeFr(d.commande_created_at),
    formatDateTimeFr(d.created_at),
    formatDateTimeFr(d.livree_at),
    <Button key={`act-${d.id}`} size="sm" variant="outline" asChild>
      <Link to="/admin/livraisons/$id" params={{ id: d.id }}>
        Détail
      </Link>
    </Button>,
  ]);

  const incidentsQuery = useQuery({
    queryKey: ["admin", "delivery-incidents"],
    queryFn: () =>
      fetch("/api/admin/delivery-incidents", {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      }).then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const incidents = (incidentsQuery.data as any[]) || [];
  const hasIncidents = incidents.length > 0;

  return (
    <div>
      <PageHeader
        title="Livraisons"
        description="Commandes clients et livraisons externes créées par les commerces — avec horaires et retards"
      />

      {/* ── 🚨 Livraisons nécessitant une intervention ──────────────── */}
      {hasIncidents && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🚨</span>
            <h2 className="text-sm font-bold text-red-800">
              {incidents.length} livraison(s) nécessitant une intervention
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-red-200">
                  <th className="py-1.5 pr-3 text-left font-semibold text-red-700">ID</th>
                  <th className="py-1.5 pr-3 text-left font-semibold text-red-700">Commerce</th>
                  <th className="py-1.5 pr-3 text-left font-semibold text-red-700">Livreur</th>
                  <th className="py-1.5 pr-3 text-left font-semibold text-red-700">Client</th>
                  <th className="py-1.5 pr-3 text-left font-semibold text-red-700">Statut</th>
                  <th className="py-1.5 pr-3 text-left font-semibold text-red-700">Durée</th>
                  <th className="py-1.5 pr-3 text-left font-semibold text-red-700">Niveau</th>
                  <th className="py-1.5 text-left font-semibold text-red-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc: any) => (
                  <tr key={inc.id} className="border-b border-red-100 last:border-0">
                    <td className="py-1.5 pr-3 font-mono">{inc.id.slice(0, 8)}</td>
                    <td className="py-1.5 pr-3">{inc.commerce_nom || '—'}</td>
                    <td className="py-1.5 pr-3">{inc.livreur_nom || '—'}</td>
                    <td className="py-1.5 pr-3">{inc.client_nom || '—'}</td>
                    <td className="py-1.5 pr-3">{inc.statut}</td>
                    <td className="py-1.5 pr-3 font-semibold">{inc.elapsed_label}</td>
                    <td className="py-1.5 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        inc.incident_niveau === 'bloquee' ? 'bg-red-200 text-red-900' :
                        inc.incident_niveau === 'anomalie' ? 'bg-orange-200 text-orange-900' :
                        inc.incident_niveau === 'incident' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{inc.statut_label}</span>
                    </td>
                    <td className="py-1.5">
                      <div className="flex gap-1">
                        <button
                          className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 hover:bg-green-200"
                          onClick={async () => {
                            const raison = prompt('Raison de la résolution ?');
                            if (!raison) return;
                            await fetch(`/api/admin/delivery-incidents/${inc.id}/resolve`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
                              body: JSON.stringify({ raison }),
                            });
                            incidentsQuery.refetch();
                          }}
                        >Résoudre</button>
                        <button
                          className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-200"
                          onClick={async () => {
                            const raison = prompt('Raison de l\'annulation ?');
                            if (!raison) return;
                            await fetch(`/api/admin/delivery-incidents/${inc.id}/cancel`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
                              body: JSON.stringify({ raison }),
                            });
                            incidentsQuery.refetch();
                          }}
                        >Annuler</button>
                        {inc.livreur_telephone && (
                          <a
                            href={`tel:${inc.livreur_telephone}`}
                            className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 hover:bg-blue-200"
                          >📞 Appeler</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher (ID, commerce…)"
          className="w-full sm:max-w-xs"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="commande">Commande client</SelectItem>
            <SelectItem value="externe">Livraison externe</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="attribuee">Attribuée</SelectItem>
            <SelectItem value="en_route">En route</SelectItem>
            <SelectItem value="livree">Livrée</SelectItem>
            <SelectItem value="annulee">Annulée</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={period}
          onValueChange={(v) => {
            setPeriod(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {deliveriesQuery.isLoading
            ? "Chargement…"
            : `${total.toLocaleString("fr-FR")} livraison(s) sur la période`}
        </p>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0 || deliveriesQuery.isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Précédent
            </Button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1 || deliveriesQuery.isFetching}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Suivant →
            </Button>
          </div>
        ) : null}
      </div>

      {deliveriesQuery.isError ? (
        <p className="text-sm text-destructive">
          Erreur de chargement des livraisons. Réessayez ou réduisez la période.
        </p>
      ) : deliveries.length === 0 && !deliveriesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">
          Aucune livraison pour ces filtres. Élargissez la période ou changez le statut.
        </p>
      ) : (
        <DataTable
          columns={[
            "ID",
            "Type",
            "Référence",
            "Livreur",
            "Adresse",
            "Statut",
            "Cmd. créée",
            "Livraison créée",
            "Terminée",
            "",
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
