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
  Package,
  User,
  Navigation,
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

/* ── Helpers d'affichage ─────────────────────────────────────────────────── */

function severityBadge(level: string | null) {
  switch (level) {
    case "niveau_3":
      return (
        <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-xs">
          <AlertTriangle className="h-3 w-3" /> Incident critique
        </Badge>
      );
    case "niveau_2":
      return (
        <Badge variant="destructive" className="gap-1 bg-orange-500 px-2 py-0.5 text-xs">
          <Clock className="h-3 w-3" /> Retard important
        </Badge>
      );
    case "niveau_1":
      return (
        <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
          <Clock className="h-3 w-3" /> A surveiller
        </Badge>
      );
    default:
      return null;
  }
}

function custodyBadge(inc: IncidentDelivery) {
  if (!inc.colis_recupere) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Package className="h-3 w-3" /> Colis au commerce
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
      <Package className="h-3 w-3" /> Colis chez le livreur
    </span>
  );
}

function formatDelay(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  }
  return `${minutes}min`;
}

/* ── Carte d'incident ─────────────────────────────────────────────────────── */

function IncidentCard({
  incident,
  onResolve,
  onCancel,
  onNote,
  onEscalate,
  loading,
}: {
  incident: IncidentDelivery;
  onResolve: (id: string, e: React.MouseEvent) => void;
  onCancel: (id: string, e: React.MouseEvent) => void;
  onNote: (id: string, e: React.MouseEvent) => void;
  onEscalate: (id: string, e: React.MouseEvent) => void;
  loading: string | null;
}) {
  const isCritical =
    incident.risk_level === "CRITIQUE" || incident.incident_level === "niveau_3";
  const isUrgent =
    incident.risk_level === "INCIDENT" ||
    incident.risk_level === "RETARD" ||
    incident.incident_level === "niveau_2";

  const levelLabel =
    incident.incident_level === "niveau_3"
      ? "INCIDENT CRITIQUE"
      : incident.incident_level === "niveau_2"
        ? "RETARD IMPORTANT"
        : incident.incident_level === "niveau_1"
          ? "A SURVEILLER"
          : "SUIVI";

  return (
    <Card
      className={`transition-colors ${
        isCritical
          ? "border-destructive/60 bg-destructive/5"
          : isUrgent
            ? "border-orange-400/60 bg-orange-50/50 dark:bg-orange-950/20"
            : "border-border"
      }`}
    >
      <CardContent className="space-y-3 p-4">
        {/* ── En-tete : niveau + retard ─────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {severityBadge(incident.incident_level)}
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {levelLabel}
            </span>
          </div>
          <span className="text-sm font-bold tabular-nums">
            +{formatDelay(incident.delay_minutes)}
          </span>
        </div>

        {/* ── Identifiant + commerce ────────────────────────────── */}
        <div>
          <p className="text-sm font-semibold">
            {incident.client?.nom || "Client inconnu"}
          </p>
          <p className="text-xs text-muted-foreground">
            {incident.commerce?.nom || "Commerce inconnu"} —{" "}
            {incident.type_livraison === "externe"
              ? "Livraison externe"
              : "Commande client"}
          </p>
        </div>

        {/* ── Livreur + colis ──────────────────────────────────── */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {incident.livreur?.nom ? (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 shrink-0" />
              <span className="font-medium">{incident.livreur.nom}</span>
              {incident.livreur.telephone ? (
                <a
                  href={`tel:${incident.livreur.telephone}`}
                  className="ml-1 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="inline h-3 w-3" /> Appeler
                </a>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 shrink-0" />
              <span className="text-amber-600">Aucun livreur assigne</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">{custodyBadge(incident)}</div>
          {incident.last_activity_ago != null && (
            <div className="flex items-center gap-1.5">
              <Navigation className="h-3 w-3 shrink-0" />
              <span>
                Derniere activite : il y a {incident.last_activity_ago} min
              </span>
            </div>
          )}
        </div>

        {/* ── Adresse ──────────────────────────────────────────── */}
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{incident.adresse_livraison || "Adresse non renseignee"}</span>
        </div>

        {/* ── Motif ────────────────────────────────────────────── */}
        {incident.incident_reason ? (
          <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Motif : </span>
            {incident.incident_reason}
          </div>
        ) : null}

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            asChild
          >
            <Link to="/entreprise/incidents/$id" params={{ id: incident.id }}>
              Voir l'incident
            </Link>
          </Button>
          {incident.livreur?.telephone ? (
            <a
              href={`tel:${incident.livreur.telephone}`}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3 w-3" /> Contacter
            </a>
          ) : null}
          <button
            className="inline-flex h-7 items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
            title="Marquer la livraison comme effectuee"
            disabled={!!loading}
            onClick={(e) => void onResolve(incident.id, e)}
          >
            {loading === `resolve-${incident.id}` ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Resolu
          </button>
          <button
            className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            title="Annuler cette livraison"
            disabled={!!loading}
            onClick={(e) => void onCancel(incident.id, e)}
          >
            {loading === `cancel-${incident.id}` ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Annuler
          </button>
          <button
            className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            title="Ajouter une note"
            disabled={!!loading}
            onClick={(e) => void onNote(incident.id, e)}
          >
            {loading === `note-${incident.id}` ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <MessageSquare className="h-3 w-3" />
            )}
            Note
          </button>
          <button
            className="inline-flex h-7 items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 text-xs font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
            title="Remonter la situation a GoLivra"
            disabled={!!loading}
            onClick={(e) => void onEscalate(incident.id, e)}
          >
            {loading === `escalate-${incident.id}` ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowUpRight className="h-3 w-3" />
            )}
            GoLivra
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Page principale ──────────────────────────────────────────────────────── */

function EntrepriseIncidentsPage() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

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

  const withLoading = async (action: string, fn: () => Promise<unknown>) => {
    setLoading(action);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incident-stats"] });
    } catch {
      toast.error("Une erreur s'est produite. Reessayez.");
    } finally {
      setLoading(null);
    }
  };

  const handleResolve = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    withLoading(`resolve-${id}`, async () => {
      const raison = prompt(
        "La livraison a ete effectuee ?\n\nDecrivez ce qui s'est passe."
      );
      if (raison === null) return;
      await resolveMyIncident(id, raison || undefined);
      toast.success("Incident resolu");
    });
  };

  const handleCancel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    withLoading(`cancel-${id}`, async () => {
      const raison = prompt(
        "Pourquoi annulez-vous cette livraison ?\n\n" +
          "Exemples :\n- Livreur injoignable\n- Colis perdu\n- Client ne veut plus attendre"
      );
      if (raison === null) return;
      await cancelMyIncident(id, raison || undefined);
      toast.success("Livraison annulee");
    });
  };

  const handleNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    withLoading(`note-${id}`, async () => {
      const note = prompt(
        "Ajoutez une note interne :\n\n" +
          'Ex : "Appele le livreur a 14h30, il dit etre en panne"'
      );
      if (!note) return;
      await addMyIncidentNote(id, note);
      toast.success("Note enregistree");
    });
  };

  const handleEscalate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    withLoading(`escalate-${id}`, async () => {
      if (!confirm("Remonter cette situation a GoLivra ?")) return;
      await escalateMyIncident(id);
      toast.success("Situation remontee a GoLivra");
    });
  };

  return (
    <div>
      <PageHeader
        title="Centre de controle"
        description="Suivi des livraisons en retard ou bloquees. Chaque incident necessite une intervention."
      />

      {/* ── Guide rapide ────────────────────────────────────────── */}
      <Card className="mb-6 border-border bg-muted/30">
        <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              Comment gerer un incident ?
            </p>
            <p>
              1. Contactez le livreur pour comprendre la situation.
              2. Si le colis est encore au commerce, un nouveau livreur peut etre assigne.
              3. Si le colis est deja recupere, seul le livreur actuel peut le livrer.
              4. Si le livreur est injoignable, remontez la situation a GoLivra.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Statistiques ────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Incidents actifs"
          icon={AlertTriangle}
          value={stats?.total_incidents}
        />
        <KpiCard label="A surveiller" icon={Clock} value={stats?.niveau_1} />
        <KpiCard label="Retards importants" icon={Clock} value={stats?.niveau_2} />
        <KpiCard
          label="Incidents critiques"
          icon={Shield}
          value={stats?.niveau_3}
        />
      </div>

      {/* ── Liste ───────────────────────────────────────────────── */}
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
            pour le suivi en temps reel.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {incidents.map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              onResolve={handleResolve}
              onCancel={handleCancel}
              onNote={handleNote}
              onEscalate={handleEscalate}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
