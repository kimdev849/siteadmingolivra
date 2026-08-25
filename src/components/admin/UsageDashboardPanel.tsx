import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import {
  Clock,
  MapPin,
  Percent,
  Smartphone,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
  Activity,
  Trophy,
  Truck,
  ShoppingBag,
  BarChart3,
  Store,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/KpiCard";
import { fetchUsageDashboard, type UsageDashboard } from "@/lib/usage-api";
import { ADMIN_LIVE_REFETCH_MS } from "@/lib/admin-nav";

const WINDOWS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
];

function pct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function WindowChip({
  value,
  label,
  active,
  onClick,
}: {
  value: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-accent")
      }
    >
      {label}
    </button>
  );
}

export function UsageDashboardPanel() {
  const [windowDays, setWindowDays] = React.useState(30);
  const usageQuery = useQuery({
    queryKey: ["admin", "usage", "dashboard", windowDays],
    queryFn: () => fetchUsageDashboard({ window_days: windowDays, top_zones_limit: 8 }),
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
  });
  const data = usageQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Utilisation de l'app mobile</h2>
          <p className="text-xs text-muted-foreground">
            Utilisateurs officiels, activité, fréquence et zones les plus livrées sur les{" "}
            {WINDOWS.find((w) => w.value === windowDays)?.label ?? `${windowDays} jours`}.
            Rafraîchissement {Math.round(ADMIN_LIVE_REFETCH_MS / 1000)}s.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <WindowChip
              key={w.value}
              value={w.value}
              label={w.label}
              active={w.value === windowDays}
              onClick={() => setWindowDays(w.value)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Utilisateurs mobile"
          icon={Smartphone}
          value={data ? data.mobile_users.total.toLocaleString("fr-FR") : undefined}
          hint={
            data
              ? `${data.mobile_users.total_clients} clients · ${data.mobile_users.total_livreurs} livreurs`
              : undefined
          }
        />
        <KpiCard
          label="Nouveaux (30j)"
          icon={Users}
          value={data ? data.mobile_users.nouveaux_30j.toLocaleString("fr-FR") : undefined}
          hint={
            data
              ? pct(data.mobile_users.croissance_30j_pct / 100) + " vs 30j précédents"
              : undefined
          }
        />
        <KpiCard
          label="Actifs 7 jours"
          icon={UserCheck}
          value={data ? data.activite.utilisateurs_actifs_7j.toLocaleString("fr-FR") : undefined}
          hint={data ? `${data.activite.livreurs_actifs_7j} livreur(s) en mission` : undefined}
        />
        <KpiCard
          label="Actifs 30 jours"
          icon={Activity}
          value={data ? data.activite.utilisateurs_actifs_30j.toLocaleString("fr-FR") : undefined}
          hint={data ? `${data.mobile_users.actifs} comptes actifs en base` : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Commandes (30j)"
          icon={ShoppingBag}
          value={data ? data.activite.commandes_30j.toLocaleString("fr-FR") : undefined}
          hint={data ? `${data.activite.commandes_livrees_30j} livrées` : undefined}
        />
        <KpiCard
          label="Fréquence commandes"
          icon={BarChart3}
          value={
            data
              ? data.activite.moyenne_commandes_par_client_actif_30j.toLocaleString("fr-FR")
              : undefined
          }
          hint="Commandes par client actif"
        />
        <KpiCard
          label="Fréquence requêtes"
          icon={TrendingUp}
          value={
            data
              ? data.activite.moyenne_requetes_par_utilisateur_actif_30j.toLocaleString("fr-FR")
              : undefined
          }
          hint="Requêtes API par utilisateur actif"
        />
        <KpiCard
          label="Commerces"
          icon={Truck}
          value={data ? data.mobile_users.total_commercants.toLocaleString("fr-FR") : undefined}
          hint="Restaurants + boutiques actifs"
        />
      </div>

      {/* ── Sessions & livraison ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Durée session moyenne"
          icon={Clock}
          value={
            data?.sessions?.duree_moyenne_min != null
              ? `${data.sessions.duree_moyenne_min} min`
              : undefined
          }
          hint={
            data?.sessions?.duree_mediane_min != null
              ? `Médiane : ${data.sessions.duree_mediane_min} min`
              : undefined
          }
        />
        <KpiCard
          label="Délai livraison moyen"
          icon={Timer}
          value={
            data?.livraison?.delai_moyen_min != null
              ? `${data.livraison.delai_moyen_min} min`
              : undefined
          }
          hint="Création commande → livrée"
        />
        <KpiCard
          label="Taux de livraison"
          icon={Percent}
          value={
            data?.activite?.taux_livraison_30j != null
              ? `${data.activite.taux_livraison_30j}%`
              : undefined
          }
          hint={
            data?.activite?.commandes_livrees_30j != null
              ? `${data.activite.commandes_livrees_30j} livrées / ${data.activite.commandes_30j} total`
              : undefined
          }
        />
        <KpiCard
          label="Taux d'annulation"
          icon={XCircle}
          value={
            data?.activite?.taux_annulation_30j != null
              ? `${data.activite.taux_annulation_30j}%`
              : undefined
          }
          hint={
            data?.activite?.commandes_annulees_30j != null
              ? `${data.activite.commandes_annulees_30j} annulées`
              : undefined
          }
        />
      </div>

      <TopCommercesCard data={data} loading={usageQuery.isLoading} />
      <TopZonesCard data={data} loading={usageQuery.isLoading} />
    </div>
  );
}

function TopCommercesCard({ data, loading }: { data: UsageDashboard | undefined; loading: boolean }) {
  const commerces = data?.top_commerces ?? [];
  const max = commerces[0]?.commandes || 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" /> Top commerces (commandes)
        </CardTitle>
        {commerces.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {commerces.length} commerce(s) classés sur la fenêtre
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : commerces.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune commande sur la fenêtre.</p>
        ) : (
          <div className="space-y-2">
            {commerces.map((c, idx) => {
              const widthPct = Math.round((c.commandes / max) * 100);
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      <span className="mr-2 text-muted-foreground">#{idx + 1}</span>
                      {c.nom}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.commandes.toLocaleString("fr-FR")} cmd
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopZonesCard({ data, loading }: { data: UsageDashboard | undefined; loading: boolean }) {
  const zones = data?.top_zones_livraison ?? [];
  const totalCommandes = zones.reduce((s, z) => s + z.commandes, 0);
  const top = zones[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" /> Zones les plus livrées
        </CardTitle>
        {top ? (
          <p className="text-xs text-muted-foreground">
            <Trophy className="inline h-3.5 w-3.5 text-amber-500" />{" "}
            <span className="font-medium text-foreground">{top.quartier}</span> en tête avec{" "}
            <span className="font-mono">{top.commandes}</span> commande(s) ·{" "}
            {totalCommandes.toLocaleString("fr-FR")} total
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : zones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune commande sur la fenêtre. Les zones sont calculées à partir du champ{" "}
            <code className="rounded bg-muted px-1">quartier</code> du snapshot d'adresse de
            livraison.
          </p>
        ) : (
          <div className="space-y-2">
            {zones.map((z, idx) => {
              const max = zones[0]?.commandes || 1;
              const widthPct = Math.round((z.commandes / max) * 100);
              return (
                <div key={z.quartier + idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      <span className="mr-2 text-muted-foreground">#{idx + 1}</span>
                      {z.quartier}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {z.commandes.toLocaleString("fr-FR")} cmd
                      {z.livraisons ? ` · ${z.livraisons.toLocaleString("fr-FR")} livr.` : ""}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
