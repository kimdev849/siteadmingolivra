import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertTriangle,
  Clock,
  Loader2,
  Shield,
  Phone,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowUpRight,
  MapPin,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTREPRISE_OPS_REFETCH_MS } from "@/lib/entreprise-nav";
import { toast } from "sonner";
import {
  fetchMyIncidents,
  fetchMyIncidentStats,
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
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Critique
        </Badge>
      );
    case "INCIDENT":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Incident
        </Badge>
      );
    case "RETARD":
      return (
        <Badge variant="destructive" className="gap-1">
          <Clock className="h-3 w-3" /> Retard
        </Badge>
      );
    case "A_SURVEILLER":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> A surveiller
        </Badge>
      );
    default:
      return <Badge variant="secondary">Normal</Badge>;
  }
}

function incidentLevelBadge(level: string | null) {
  if (!level) return null;
  switch (level) {
    case "niveau_3":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" /> Niveau 3 — Intervention requise
        </Badge>
      );
    case "niveau_2":
      return (
        <Badge variant="destructive" className="bg-orange-500">
          <Clock className="mr-1 h-3 w-3" /> Niveau 2 — Situation grave
        </Badge>
      );
    case "niveau_1":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" /> Niveau 1 — Retard leger
        </Badge>
      );
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
  const isUrgent =
    incident.risk_level === "CRITIQUE" || incident.incident_level === "niveau_3";

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
              {incident.commerce?.nom || "Commerce inconnu"} —{" "}
              {incident.type_livraison === "externe"
                ? "Livraison externe"
                : "Commande client"}
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
              {incident.livreur.nom}
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              Aucun livreur
            </span>
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
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{incident.adresse_livraison || "Adresse non renseignee"}</span>
        </div>

        {incident.incident_reason ? (
          <p className="text-xs text-muted-foreground italic">
            Motif : {incident.incident_reason}
          </p>
        ) : null}

        {incident.operator_actions?.length ? (
          <p className="text-xs text-muted-foreground">
            {incident.operator_actions.length} action(s) enregistree(s)
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EntrepriseIncidentsPage() {
  const queryClient = useQueryClient();

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
    window.location.href = `/entreprise/incidents/${id}`;
  };

  const handleResolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const raison = prompt(
      "Pourquoi cet incident est-il resolu ?\n\n" +
        "Decrivez brievement ce qui s'est passe : le livreur a livr\u00e9, le probleme est regle, etc."
    );
    if (raison === null) return;
    try {
      await resolveMyIncident(id, raison || undefined);
      toast.success("Incident resolu", {
        description: "La livraison est consideree comme terminee.",
      });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incident-stats"] });
    } catch {
      toast.error("Erreur", { description: "Impossible de resoudre l'incident." });
    }
  };

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const raison = prompt(
      "Pourquoi annulez-vous cette livraison ?\n\n" +
        "Exemples : livreur injoignable, client introuvable, colis perdu, etc."
    );
    if (raison === null) return;
    try {
      await cancelMyIncident(id, raison || undefined);
      toast.success("Livraison annulee", {
        description: "Le livreur est libere et le client sera notifie.",
      });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incident-stats"] });
    } catch {
      toast.error("Erreur", { description: "Impossible d'annuler la livraison." });
    }
  };

  const handleAddNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const note = prompt("Ajoutez une note sur cette situation :\n\n" +
      "Exemples : \"Appele le livreur a 14h30, il dit etre en panne\"");
    if (!note) return;
    try {
      await addMyIncidentNote(id, note);
      toast.success("Note enregistree");
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
    } catch {
      toast.error("Erreur", { description: "Impossible d'enregistrer la note." });
    }
  };

  const handleEscalate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "Remonter cet incident a l'administration GoLivra ?\n\n" +
          "L'equipe GoLivra sera notifiee et prendra en charge la situation."
      )
    )
      return;
    try {
      await escalateMyIncident(id);
      toast.success("Incident remonte", {
        description: "GoLivra a ete notifie et interviendra.",
      });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incident-stats"] });
    } catch {
      toast.error("Erreur", { description: "Impossible de remonter l'incident." });
    }
  };

  return (
    <div>
      <PageHeader
        title="Incidents de livraison"
        description="Livraisons en retard ou bloquees. Ces situations necessitent une intervention de votre part."
      />

      {/* ── Explication ───────────────────────────────────────────── */}
      <Card className="mb-6 border-border bg-muted/30">
        <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              Comment gerer un incident ?
            </p>
            <p>
              Un incident signifie qu'une livraison depasse le delai prevu. Le
              livreur a le colis en sa possession mais n'a pas livre. Vous devez
              d'abord contacter le livreur pour comprendre la situation, puis
              agir en consequence.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── KPIs ─────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Incidents actifs"
          icon={AlertTriangle}
          value={stats?.total_incidents}
        />
        <KpiCard label="Retard leger" icon={Clock} value={stats?.niveau_1} />
        <KpiCard label="Situation grave" icon={Clock} value={stats?.niveau_2} />
        <KpiCard label="Intervention requise" icon={Shield} value={stats?.niveau_3} />
      </div>

      {stats?.risk_breakdown ? (
        <Card className="mb-6 border-border">
          <CardContent className="py-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-3">
              <span>
                Normal : <strong>{stats.risk_breakdown.NORMAL}</strong>
              </span>
              <span>
                A surveiller :{" "}
                <strong>{stats.risk_breakdown.A_SURVEILLER}</strong>
              </span>
              <span>
                En retard : <strong>{stats.risk_breakdown.RETARD}</strong>
              </span>
              <span>
                En incident : <strong>{stats.risk_breakdown.INCIDENT}</strong>
              </span>
              <span>
                Critique : <strong>{stats.risk_breakdown.CRITIQUE}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Liste des incidents ───────────────────────────────────── */}
      {incidentsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </p>
      ) : incidents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary">
              Aucun incident en cours
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Toutes les livraisons sont dans les temps. Consultez les{" "}
            <Link
              to="/entreprise/operations"
              className="text-primary hover:underline"
            >
              Operations en direct
            </Link>{" "}
            pour suivre vos courses en temps reel.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {incidents.map((inc) => (
            <div key={inc.id} className="relative">
              <IncidentCard incident={inc} onAction={handleOpenDetail} />
              {/* ── Boutons d'action rapides ──────────────────────── */}
              <div className="absolute right-2 top-2 flex gap-1">
                {inc.livreur?.telephone ? (
                  <a
                    href={`tel:${inc.livreur.telephone}`}
                    className="rounded bg-blue-100 p-1.5 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                    title="Appeler le livreur"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                <button
                  className="rounded bg-green-100 p-1.5 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
                  title="Marquer comme resolu"
                  onClick={(e) => void handleResolve(inc.id, e)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded bg-red-100 p-1.5 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                  title="Annuler la livraison"
                  onClick={(e) => void handleCancel(inc.id, e)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded bg-amber-100 p-1.5 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200"
                  title="Ajouter une note"
                  onClick={(e) => void handleAddNote(inc.id, e)}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded bg-orange-100 p-1.5 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200"
                  title="Remonter a GoLivra"
                  onClick={(e) => void handleEscalate(inc.id, e)}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
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
