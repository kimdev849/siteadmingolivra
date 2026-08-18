import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  PhoneCall,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  TrendingDown,
  XCircle,
} from "lucide-react";
import type { ControlCenter, ServiceStatus } from "@/lib/observability-api";
import { formatErrorType } from "@/lib/observability-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/KpiCard";

const PAYMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  airtel_money: "Airtel Money",
  mtn_money: "MTN Money",
  mobile_money_autre: "Mobile Money",
  carte_bancaire: "Carte bancaire",
  portefeuille_golivra: "Portefeuille GoLivra",
};

const SERVICE_LABELS: Record<string, string> = {
  api: "API",
  database: "Base de données",
  payments: "Paiements",
  mobile: "Mobile",
};

function statusStyles(status: ServiceStatus): string {
  switch (status) {
    case "ok":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "degraded":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "down":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusDot(status: ServiceStatus): string {
  switch (status) {
    case "ok":
      return "bg-emerald-500";
    case "degraded":
      return "bg-amber-500";
    case "down":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/40";
  }
}

function StatusChip({ label, status }: { label: string; status: ServiceStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles(status)}`}
    >
      <span className={`h-2 w-2 rounded-full ${statusDot(status)}`} />
      {label}
    </span>
  );
}

function pct(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero : statut global + composants + incidents ouverts
// ─────────────────────────────────────────────────────────────────────────────
export function ControlCenterHero({
  data,
  isLoading,
}: {
  data: ControlCenter | undefined;
  isLoading: boolean;
}) {
  const status = data?.global_status ?? "unknown";
  const hero =
    status === "ok"
      ? { label: "Opérationnelle", cls: "text-emerald-600 dark:text-emerald-400" }
      : status === "degraded"
        ? { label: "Dégradée", cls: "text-amber-600 dark:text-amber-400" }
        : status === "down"
          ? { label: "En panne", cls: "text-destructive" }
          : { label: "Inconnue", cls: "text-muted-foreground" };

  const services = data?.services;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${statusStyles(status)}`}
          >
            {status === "ok" ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : status === "down" ? (
              <XCircle className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Statut de la plateforme</p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className={`text-2xl font-extrabold ${hero.cls}`}>{hero.label}</h2>
              {data ? (
                <span className="text-xs text-muted-foreground">
                  fenêtre de {data.window_min} min
                </span>
              ) : null}
            </div>
            {data?.incidents?.open_count != null && data.incidents.open_count > 0 ? (
              <Link
                to="/admin/observabilite"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {data.incidents.open_count} incident(s) ouvert(s) — voir →
              </Link>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Aucun incident ouvert.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {services
            ? Object.entries(services).map(([key, s]) => (
                <StatusChip
                  key={key}
                  label={`${SERVICE_LABELS[key] ?? key} · ${s?.label ?? "Inconnu"}`}
                  status={s?.status ?? "unknown"}
                />
              ))
            : isLoading
              ? [1, 2, 3, 4].map((i) => (
                  <span key={i} className="h-7 w-28 animate-pulse rounded-full bg-muted" />
                ))
              : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Répartition par code HTTP (2xx / 4xx / 5xx avec 400-401-404 détaillés)
// ─────────────────────────────────────────────────────────────────────────────
export function StatusBreakdown({ data }: { data: ControlCenter | undefined }) {
  const t = data?.technical;
  if (!t) return null;
  const b = t.by_status;
  const total = Math.max(1, t.request_count);
  const bars = [
    { label: "2xx · Succès", count: b.c2xx + b.c3xx, cls: "bg-emerald-500" },
    { label: "4xx · Clients", count: b.c400 + b.c401 + b.c404 + b.c4xx, cls: "bg-amber-500" },
    { label: "5xx · Serveur", count: b.c5xx, cls: "bg-destructive" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Répartition des statuts HTTP</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-foreground">{bar.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{bar.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${bar.cls}`}
                style={{ width: `${Math.max(2, (bar.count / total) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
          {[
            ["400", b.c400],
            ["401", b.c401],
            ["404", b.c404],
            ["5xx", b.c5xx],
          ].map(([label, count]) => (
            <div
              key={label as string}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5"
            >
              <span className="font-mono text-xs text-muted-foreground">HTTP {label}</span>
              <span className="ml-1.5 font-mono text-sm font-bold text-foreground">
                {count as number}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Taux de succès {pct(t.success_rate)} · erreurs {pct(t.error_rate)} · p95{" "}
          {t.latency.p95_ms >= 1000
            ? `${(t.latency.p95_ms / 1000).toFixed(2)} s`
            : `${t.latency.p95_ms} ms`}
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Santé business : commandes + paiements du jour
// ─────────────────────────────────────────────────────────────────────────────
export function BusinessSection({ data }: { data: ControlCenter | undefined }) {
  const biz = data?.business;
  const o = biz?.orders;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Santé business · aujourd’hui</h3>
        <p className="text-xs text-muted-foreground">Commandes et paiements du jour</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Commandes" icon={ShoppingBag} value={o ? o.total : undefined} />
        <KpiCard label="Livrées" icon={CheckCircle2} value={o ? o.livrees : undefined} />
        <KpiCard
          label="En cours"
          icon={Clock}
          value={o ? o.en_cours : undefined}
          hint={o ? `${o.acceptees} acceptée(s)` : undefined}
        />
        <KpiCard label="Annulées" icon={TrendingDown} value={o ? o.annulees : undefined} />
        <KpiCard
          label="Taux d’annulation"
          icon={ShieldCheck}
          value={o && o.total > 0 ? pct(o.annulees / o.total) : undefined}
          hint="Commandes du jour"
        />
      </div>

      {biz && biz.payments.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Paiements par méthode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 text-left">Méthode</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 text-right">Réussis</th>
                    <th className="py-2 text-right">Échecs</th>
                    <th className="py-2 text-right">Taux de réussite</th>
                  </tr>
                </thead>
                <tbody>
                  {biz.payments.map((m) => (
                    <tr key={m.methode} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 font-medium text-foreground">
                        {PAYMENT_LABELS[m.methode] ?? m.methode}
                      </td>
                      <td className="py-1.5 text-right font-mono text-xs">{m.total}</td>
                      <td className="py-1.5 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {m.reussis}
                      </td>
                      <td className="py-1.5 text-right font-mono text-xs text-destructive">
                        {m.echoues}
                      </td>
                      <td className="py-1.5 text-right">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            m.taux_reussite >= 0.95 ? "text-foreground" : "text-destructive"
                          }`}
                        >
                          {pct(m.taux_reussite)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Santé des acteurs : boutiques, restaurants, livreurs, clients
// ─────────────────────────────────────────────────────────────────────────────
export function ActorsSection({ data }: { data: ControlCenter | undefined }) {
  const a = data?.actors;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Santé des acteurs</h3>
        <p className="text-xs text-muted-foreground">Boutiques, restaurants, livreurs, clients</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Boutiques actives"
          icon={Store}
          value={a ? a.boutiques.actives : undefined}
          hint={a ? `${a.boutiques.total} au total` : undefined}
        />
        <KpiCard
          label="Restaurants actifs"
          icon={ShoppingBag}
          value={a ? a.restaurants.actives : undefined}
          hint={a ? `${a.restaurants.total} au total` : undefined}
        />
        <KpiCard
          label="Livreurs disponibles"
          icon={PhoneCall}
          value={a ? a.livreurs.disponibles : undefined}
          hint={a ? `${a.livreurs.total} au total` : undefined}
        />
        <KpiCard
          label="En livraison"
          icon={Package}
          value={a ? a.livreurs.en_livraison : undefined}
        />
        <KpiCard
          label="Clients actifs"
          icon={CheckCircle2}
          value={a ? a.clients.actifs_aujourdhui : undefined}
          hint={a ? `${a.clients.total} inscrits` : undefined}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monitoring mobile : versions, taux de crash, dernier crash
// ─────────────────────────────────────────────────────────────────────────────
export function MobileSection({ data }: { data: ControlCenter | undefined }) {
  const m = data?.mobile;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Monitoring mobile</h3>
        <p className="text-xs text-muted-foreground">
          Signalements des apps sur 7 jours (proxy du taux de crash)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Versions déployées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {!m ? (
              <p className="text-muted-foreground">Aucune donnée mobile.</p>
            ) : m.versions.length === 0 ? (
              <p className="text-muted-foreground">Aucun signalement sur 7 jours.</p>
            ) : (
              m.versions.map((v) => (
                <div key={v.app_version} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                    {v.app_version}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {v.count} signalement(s)
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Taux de signalements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-foreground">
              {m ? pct(m.crash_rate_7j) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {m ? `${m.incidents_7j} incident(s) mobile / requêtes sur 7 j` : "Chargement…"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Dernier signalement</CardTitle>
          </CardHeader>
          <CardContent>
            {!m || !m.dernier_crash ? (
              <p className="text-sm text-muted-foreground">Aucun crash récent. 🎉</p>
            ) : (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-foreground">{m.dernier_crash.title}</p>
                <p className="text-xs text-muted-foreground">
                  v{m.dernier_crash.app_version ?? "?"} · {m.dernier_crash.platform ?? "mobile"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.dernier_crash.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini liste des incidents en tête (alertes)
// ─────────────────────────────────────────────────────────────────────────────
export function TopIncidents({ data }: { data: ControlCenter | undefined }) {
  const top = data?.incidents?.top ?? [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Incidents les plus fréquents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {top.length === 0 ? (
          <p className="text-muted-foreground">Aucun incident groupé sur la fenêtre.</p>
        ) : (
          top.map((g) => (
            <Link
              key={g.fingerprint}
              to="/admin/observabilite"
              className="flex items-center justify-between gap-2 rounded border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-accent"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono font-bold text-destructive">
                  ×{g.occurrence_count}
                </span>
                <span className="truncate text-foreground">{g.title}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">
                {formatErrorType(g.error_type)}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ControlCenterSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
