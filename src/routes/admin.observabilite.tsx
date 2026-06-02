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
import {
  fetchIncidents,
  formatIncidentSeverity,
  formatIncidentSource,
} from "@/lib/observability-api";
import { formatDateTimeFr } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/observabilite")({
  component: ObservabilitePage,
});

function severityVariant(severity: string): "destructive" | "secondary" | "outline" {
  if (severity === "error") return "destructive";
  if (severity === "warn") return "secondary";
  return "outline";
}

function ObservabilitePage() {
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "all">("open");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  const incidentsQuery = useQuery({
    queryKey: ["admin", "incidents", statusFilter, sourceFilter, search],
    queryFn: () =>
      fetchIncidents({
        limit: 80,
        resolved: statusFilter === "open" ? false : statusFilter === "resolved" ? true : undefined,
        source: sourceFilter === "all" ? undefined : sourceFilter,
        q: search.trim() || undefined,
      }),
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
  });

  const items = useMemo(() => incidentsQuery.data?.items ?? [], [incidentsQuery.data]);

  const rows = items.map((inc) => [
    <Link
      key={`id-${inc.id}`}
      to="/admin/observabilite/$id"
      params={{ id: inc.id }}
      className="font-mono text-primary hover:underline">
      {inc.request_id.slice(0, 8)}
    </Link>,
    <Badge key={`sev-${inc.id}`} variant={severityVariant(inc.severity)}>
      {formatIncidentSeverity(inc.severity)}
    </Badge>,
    formatIncidentSource(inc.source),
    inc.platform || "—",
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
    inc.resolved ? (
      <Badge key={`res-${inc.id}`} variant="outline">
        Résolu
      </Badge>
    ) : (
      <Badge key={`res-${inc.id}`} variant="destructive">
        Ouvert
      </Badge>
    ),
    formatDateTimeFr(inc.created_at),
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
        description="Erreurs et anomalies remontées par l'app mobile, l'admin et l'API — avec cause probable et traçage requestId."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Rechercher (titre, message, requestId, endpoint…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Ouverts</SelectItem>
            <SelectItem value="resolved">Résolus</SelectItem>
            <SelectItem value="all">Tous</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sources</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="backend">Backend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {incidentsQuery.isError ? (
        <p className="mb-4 text-sm text-destructive">
          Impossible de charger les incidents. Vérifiez que la migration SQL{" "}
          <code className="rounded bg-muted px-1">amendments-observability.sql</code> est appliquée sur Supabase.
        </p>
      ) : null}

      <DataTable
        columns={[
          "Request ID",
          "Gravité",
          "Source",
          "Plateforme",
          "Problème",
          "Pourquoi (cause)",
          "Endpoint",
          "Statut",
          "Date",
          "",
        ]}
        rows={rows}
        emptyTitle={
          incidentsQuery.isLoading
            ? "Chargement des incidents…"
            : "Aucun incident pour ces filtres."
        }
      />
    </div>
  );
}
