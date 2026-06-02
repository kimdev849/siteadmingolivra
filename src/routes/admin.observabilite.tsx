import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Activity, Filter, Layers, X } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchIncidents,
  fetchIncidentGroups,
  formatIncidentSeverity,
  formatIncidentSource,
  formatIncidentState,
  formatErrorType,
  stateVariant,
  type IncidentState,
  type IncidentSeverity,
  type IncidentSource,
  type ErrorType,
} from "@/lib/observability-api";
import { formatDateTimeFr } from "@/lib/admin-api";
import { ADMIN_LIVE_REFETCH_MS } from "@/lib/admin-nav";

const ALL = "all";

type GroupView = "list" | "groups";

export const Route = createFileRoute("/admin/observabilite")({
  component: ObservabilitePage,
});

function severityVariant(severity: string): "destructive" | "secondary" | "outline" {
  if (severity === "error") return "destructive";
  if (severity === "warn") return "secondary";
  return "outline";
}

function ObservabilitePage() {
  const [view, setView] = useState<GroupView>("list");
  const [statusFilter, setStatusFilter] = useState<"ouvert" | "resolu" | "all">("ouvert");
  const [stateFilter, setStateFilter] = useState<IncidentState | typeof ALL>(ALL);
  const [sourceFilter, setSourceFilter] = useState<IncidentSource | typeof ALL>(ALL);
  const [errorTypeFilter, setErrorTypeFilter] = useState<ErrorType | typeof ALL>(ALL);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const incidentsQuery = useQuery({
    queryKey: ["admin", "incidents", statusFilter, stateFilter, sourceFilter, errorTypeFilter, search],
    queryFn: () =>
      fetchIncidents({
        limit: 80,
        resolved: statusFilter === "resolu" ? true : statusFilter === "ouvert" ? false : undefined,
        state: stateFilter === ALL ? undefined : (stateFilter as IncidentState),
        source: sourceFilter === ALL ? undefined : (sourceFilter as IncidentSource),
        error_type: errorTypeFilter === ALL ? undefined : (errorTypeFilter as ErrorType),
        q: search.trim() || undefined,
      }),
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
  });

  const groupsQuery = useQuery({
    queryKey: ["admin", "incidents", "groups", sourceFilter, statusFilter],
    queryFn: () =>
      fetchIncidentGroups({
        window_min: 60,
        source: sourceFilter === ALL ? undefined : (sourceFilter as IncidentSource),
        state: statusFilter === "ouvert" ? "ouvert" : statusFilter === "resolu" ? "resolu" : undefined,
      }),
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
    enabled: view === "groups",
  });

  const items = useMemo(() => incidentsQuery.data?.items ?? [], [incidentsQuery.data]);

  const rows = items.map((inc) => [
    <Link
      key={`id-${inc.id}`}
      to="/admin/observabilite/$id"
      params={{ id: inc.id }}
      className="font-mono text-primary hover:underline"
    >
      {inc.request_id.slice(0, 8)}
    </Link>,
    <Badge key={`sev-${inc.id}`} variant={severityVariant(inc.severity)}>
      {formatIncidentSeverity(inc.severity as IncidentSeverity)}
    </Badge>,
    <Badge key={`type-${inc.id}`} variant="outline">
      {formatErrorType(inc.error_type)}
    </Badge>,
    formatIncidentSource(inc.source as IncidentSource),
    <span key={`title-${inc.id}`} className="max-w-[260px] truncate block font-medium">
      {inc.title}
    </span>,
    <span key={`cause-${inc.id}`} className="max-w-[280px] truncate block text-muted-foreground">
      {inc.cause || "—"}
    </span>,
    inc.http_path ? (
      <span key={`path-${inc.id}`} className="font-mono text-xs">
        {inc.http_method || "GET"} {inc.http_path}
      </span>
    ) : (
      "—"
    ),
    <span key={`occ-${inc.id}`} className="font-mono text-xs">
      ×{inc.occurrence_count}
    </span>,
    <Badge key={`state-${inc.id}`} variant={stateVariant(inc.state)}>
      {formatIncidentState(inc.state)}
    </Badge>,
    formatDateTimeFr(inc.last_seen_at),
    <Button key={`act-${inc.id}`} size="sm" variant="outline" asChild>
      <Link to="/admin/observabilite/$id" params={{ id: inc.id }}>
        Analyser
      </Link>
    </Button>,
  ]);

  return (
    <div>
      <PageHeader
        title="Observabilité"
        description="Erreurs, anomalies et métriques de l'app mobile, de l'admin et de l'API — groupées par fingerprint, classées automatiquement."
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs " +
                (view === "list" ? "bg-primary text-primary-foreground" : "text-foreground")
              }
            >
              <Filter className="h-3.5 w-3.5" /> Liste
            </button>
            <button
              type="button"
              onClick={() => setView("groups")}
              className={
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs " +
                (view === "groups" ? "bg-primary text-primary-foreground" : "text-foreground")
              }
            >
              <Layers className="h-3.5 w-3.5" /> Groupes (fingerprint)
            </button>
          </div>

          {view === "list" ? (
            <>
              <Input
                placeholder="Rechercher (titre, message, requestId, endpoint, fingerprint, cause…)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ouvert">Ouverts</SelectItem>
                  <SelectItem value="resolu">Résolus</SelectItem>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stateFilter} onValueChange={(v) => setStateFilter(v as IncidentState | typeof ALL)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="État" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous états</SelectItem>
                  <SelectItem value="ouvert">Ouvert</SelectItem>
                  <SelectItem value="acquitte">Acquitté</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="resolu">Résolu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as IncidentSource | typeof ALL)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Toutes sources</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={errorTypeFilter}
                onValueChange={(v) => setErrorTypeFilter(v as ErrorType | typeof ALL)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Type d'erreur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous types</SelectItem>
                  <SelectItem value="DatabaseError">DatabaseError</SelectItem>
                  <SelectItem value="AuthError">AuthError</SelectItem>
                  <SelectItem value="ValidationError">ValidationError</SelectItem>
                  <SelectItem value="PaymentError">PaymentError</SelectItem>
                  <SelectItem value="NetworkError">NetworkError</SelectItem>
                  <SelectItem value="ExternalServiceError">ExternalServiceError</SelectItem>
                  <SelectItem value="RuntimeError">RuntimeError</SelectItem>
                  <SelectItem value="UnknownError">UnknownError</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ouvert">Ouverts</SelectItem>
                  <SelectItem value="resolu">Résolus</SelectItem>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as IncidentSource | typeof ALL)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Toutes sources</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {incidentsQuery.isError ? (
        <p className="mb-4 text-sm text-destructive">
          Impossible de charger les incidents. Vérifiez que la migration SQL{" "}
          <code className="rounded bg-muted px-1">amendments-observability-v2.sql</code> est appliquée sur Supabase.
        </p>
      ) : null}

      {view === "list" ? (
        <DataTable
          columns={[
            "Request ID",
            "Gravité",
            "Type",
            "Source",
            "Problème",
            "Cause",
            "Endpoint",
            "Occ.",
            "État",
            "Vu",
            "",
          ]}
          rows={rows}
          emptyTitle={
            incidentsQuery.isLoading ? "Chargement des incidents…" : "Aucun incident pour ces filtres."
          }
        />
      ) : (
        <GroupsTable
          groups={groupsQuery.data?.groups ?? []}
          isLoading={groupsQuery.isLoading}
        />
      )}
    </div>
  );
}

function GroupsTable({
  groups,
  isLoading,
}: {
  groups: {
    id: string;
    fingerprint: string;
    title: string;
    severity: IncidentSeverity;
    error_type: ErrorType | null;
    source: IncidentSource;
    state: IncidentState;
    http_method: string | null;
    http_path: string | null;
    occurrence_count: number;
    last_seen_at: string;
  }[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des groupes…</p>;
  }
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Aucun groupe d’incidents sur la fenêtre. Soit tout va bien, soit les fingerprints ne sont pas encore
          calculés (vérifiez la migration <code>amendments-observability-v2.sql</code>).
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <Card key={g.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              <span className="max-w-[420px] truncate">{g.title}</span>
              <Badge variant={severityVariant(g.severity)}>{formatIncidentSeverity(g.severity)}</Badge>
              <Badge variant="outline">{formatErrorType(g.error_type)}</Badge>
              <Badge variant={stateVariant(g.state)}>{formatIncidentState(g.state)}</Badge>
              <span className="text-xs font-normal text-muted-foreground">
                {formatIncidentSource(g.source)}
              </span>
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Vu {formatDateTimeFr(g.last_seen_at)}
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {g.http_path ? (
                <span className="font-mono">
                  {g.http_method || "GET"} {g.http_path}
                </span>
              ) : null}
              <span>
                Fingerprint : <code className="rounded bg-muted px-1 text-foreground">{g.fingerprint}</code>
              </span>
              <span>
                <strong className="text-foreground">×{g.occurrence_count}</strong> occurrence(s)
              </span>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/observabilite/$id" params={{ id: g.id }}>
                  Voir l’incident de référence
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
