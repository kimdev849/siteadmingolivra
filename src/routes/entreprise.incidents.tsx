import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Clock, Loader2, Shield, Phone } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTREPRISE_OPS_REFETCH_MS } from "@/lib/entreprise-nav";
import {
  fetchMyIncidents,
  fetchMyIncidentStats,
  fetchMyIncidentDetail,
  resolveMyIncident,
  cancelMyIncident,
  addMyIncidentNote,
  escalateMyIncident,
  type IncidentDelivery,
} from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/incidents")({
  component: EntrepriseIncidentsPage,
});

function riskBadge(level: string) {
  switch (level) {
    case "CRITIQUE":
      return <Badge variant="destructive" className="gap-1">🔴🔴 Critique</Badge>;
    case "INCIDENT":
      return <Badge variant="destructive" className="gap-1">🔴 Incident</Badge>;
    case "RETARD":
      return <Badge variant="destructive" className="gap-1">🟠 Retard</Badge>;
    case "A_SURVEILLER":
      return <Badge variant="secondary" className="gap-1">🟡 À surveiller</Badge>;
    default:
      return <Badge variant="secondary">🟢 Normal</Badge>;
  }
}

function incidentLevelBadge(level: string | null) {
  if (!level) return null;
  switch (level) {
    case "niveau_3":
      return <Badge variant="destructive">🔴 Niveau 3 — Incident</Badge>;
    case "niveau_2":
      return <Badge variant="destructive" className="bg-orange-500">🟠 Niveau 2 — Significatif</Badge>;
    case "niveau_1":
      return <Badge variant="secondary">🟡 Niveau 1 — Léger</Badge>;
    default:
      return <Badge variant="secondary">{level}</Badge>;
  }
}

function IncidentCard({
  incident,
  onAction,
}: {
  incident: IncidentDelivery;
  onAction: (id: string) => void;
}) {
  const isUrgent = incident.risk_level === "CRITIQUE" || incident.incident_level === "niveau_3";

  return (
    <Card
      className={`cursor-pointer transition-colors hover:border-primary/50 ${
        isUrgent ? "border-destructive/50 bg-destructive/5" : ""
      }`}
      onClick={() => onAction(incident.id)}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold">
              {incident.client?.nom || "Client inconnu"}
            </p>
            <p className="text-xs text-muted-foreground">
              {incident.commerce?.nom || "Commerce inconnu"} — {incident.type_livraison === "externe" ? "Externe" : "Commande"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {riskBadge(incident.risk_level)}
            {incidentLevelBadge(incident.incident_level)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {incident.delay_label} de retard
          </span>
          {incident.livreur?.nom ? (
            <span className="inline-flex items-center gap-1">
              🛵 {incident.livreur.nom}
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">Sans livreur</span>
          )}
          {incident.livreur?.telephone ? (
            <a
              href={`tel:${incident.livreur.telephone}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3 w-3" />
              Appeler
            </a>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>📍 {incident.adresse_livraison || "Adresse non renseignée"}</span>
        </div>

        {incident.incident_reason ? (
          <p className="text-xs text-muted-foreground italic">
            Motif : {incident.incident_reason}
          </p>
        ) : null}

        {incident.operator_actions?.length ? (
          <p className="text-xs text-muted-foreground">
            {incident.operator_actions.length} action(s) enregistrée(s)
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EntrepriseIncidentsPage() {
  const queryClient = useQueryClient();
  const [actionId, setActionId] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ["logistics", "incident-stats"],
    queryFn: fetchMyIncidentStats,
    refetchInterval: ENTREPRISE_OPS_REFETCH_MS,
  });

  const incidentsQuery = useQuery({
    queryKey: ["logistics", "incidents"],
    queryFn: fetchMyIncidents,
    refetchInterval: ENTREPRISE_OPS_REFETCH_MS,
  });

  const stats = statsQuery.data;
  const incidents = incidentsQuery.data ?? [];

  const handleOpenDetail = (id: string) => {
    setActionId(id);
  };

  const handleResolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const raison = prompt("Raison de la résolution ?");
    if (raison === null) return;
    await resolveMyIncident(id, raison || undefined);
    await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
    await queryClient.invalidateQueries({ queryKey: ["logistics", "incident-stats"] });
  };

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const raison = prompt("Raison de l'annulation ?");
    if (raison === null) return;
    await cancelMyIncident(id, raison || undefined);
    await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
    await queryClient.invalidateQueries({ queryKey: ["logistics", "incident-stats"] });
  };

  const handleAddNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const note = prompt("Note à ajouter ?");
    if (!note) return;
    await addMyIncidentNote(id, note);
    await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
  };

  const handleEscalate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Escalader cet incident au niveau supérieur ?")) return;
    await escalateMyIncident(id);
    await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
    await queryClient.invalidateQueries({ queryKey: ["logistics", "incident-stats"] });
  };

  return (
    <div>
      <PageHeader
        title="Centre d'incidents"
        description="Livraisons en incident ou en anomalie — intervention requise. Sélectionnez une incident pour voir les détails et agir."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Incidents actifs" icon={AlertTriangle} value={stats?.total_incidents} />
        <KpiCard label="Niveau 1 (léger)" icon={Clock} value={stats?.niveau_1} />
        <KpiCard label="Niveau 2 (significatif)" icon={Clock} value={stats?.niveau_2} />
        <KpiCard label="Niveau 3 (critique)" icon={Shield} value={stats?.niveau_3} />
      </div>

      {stats?.risk_breakdown ? (
        <Card className="mb-6 border-border">
          <CardContent className="py-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-3">
              <span>🟢 Normal : <strong>{stats.risk_breakdown.NORMAL}</strong></span>
              <span>🟡 À surveiller : <strong>{stats.risk_breakdown.A_SURVEILLER}</strong></span>
              <span>🟠 Retard : <strong>{stats.risk_breakdown.RETARD}</strong></span>
              <span>🔴 Incident : <strong>{stats.risk_breakdown.INCIDENT}</strong></span>
              <span>🔴🔴 Critique : <strong>{stats.risk_breakdown.CRITIQUE}</strong></span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {incidentsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des incidents…
        </p>
      ) : incidents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary">Aucun incident</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Toutes les courses sont dans les temps. Consultez les{" "}
            <Link to="/entreprise/operations" className="text-primary hover:underline">
              Opérations live
            </Link>{" "}
            pour le suivi en temps réel.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {incidents.map((inc) => (
            <div key={inc.id} className="relative">
              <IncidentCard incident={inc} onAction={handleOpenDetail} />
              <div className="absolute right-2 top-2 flex gap-1">
                {inc.livreur?.telephone ? (
                  <a
                    href={`tel:${inc.livreur.telephone}`}
                    className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📞
                  </a>
                ) : null}
                <button
                  className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
                  onClick={(e) => void handleResolve(inc.id, e)}
                  title="Résoudre"
                >
                  ✅
                </button>
                <button
                  className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                  onClick={(e) => void handleCancel(inc.id, e)}
                  title="Annuler"
                >
                  ❌
                </button>
                <button
                  className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200"
                  onClick={(e) => void handleAddNote(inc.id, e)}
                  title="Ajouter une note"
                >
                  📝
                </button>
                <button
                  className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200"
                  onClick={(e) => void handleEscalate(inc.id, e)}
                  title="Escalader"
                >
                  🚨
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {incidents.length > 0 ? (
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/entreprise/livraisons">Voir toutes les livraisons</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
