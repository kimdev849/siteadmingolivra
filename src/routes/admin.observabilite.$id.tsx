import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchIncidentDetail,
  formatIncidentSeverity,
  formatIncidentSource,
  resolveIncident,
} from "@/lib/observability-api";
import { formatDateTimeFr } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/observabilite/$id")({
  component: IncidentDetailPage,
});

function IncidentDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [adminNote, setAdminNote] = useState("");

  const detailQuery = useQuery({
    queryKey: ["admin", "incident", id],
    queryFn: () => fetchIncidentDetail(id),
  });

  const resolveMutation = useMutation({
    mutationFn: () => resolveIncident(id, adminNote.trim() || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "incident", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  const inc = detailQuery.data?.incident;
  const related = detailQuery.data?.related ?? [];

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/admin/observabilite">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </Button>

      <PageHeader
        title={inc ? inc.title : "Incident"}
        description={inc ? `Request ID : ${inc.request_id}` : "Analyse de l'incident"}
      />

      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : detailQuery.isError || !inc ? (
        <p className="text-sm text-destructive">Incident introuvable.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <Badge variant={inc.severity === "error" ? "destructive" : "secondary"}>
                    {formatIncidentSeverity(inc.severity)}
                  </Badge>
                  <Badge variant="outline">{formatIncidentSource(inc.source)}</Badge>
                  {inc.resolved ? (
                    <Badge variant="outline">Résolu</Badge>
                  ) : (
                    <Badge variant="destructive">Ouvert</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-foreground">Quoi (problème)</p>
                  <p className="mt-1">{inc.message}</p>
                </div>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="font-semibold text-foreground">Pourquoi (cause probable)</p>
                  <p className="mt-1 text-muted-foreground">{inc.cause || "Non déterminée automatiquement."}</p>
                </div>
                {inc.http_path ? (
                  <p>
                    <span className="text-muted-foreground">Endpoint : </span>
                    <code className="rounded bg-muted px-1">
                      {inc.http_method || "?"} {inc.http_path}
                      {inc.http_status != null ? ` → ${inc.http_status}` : ""}
                    </code>
                  </p>
                ) : null}
                {inc.stack ? (
                  <div>
                    <p className="mb-1 font-semibold">Stack trace</p>
                    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                      {inc.stack}
                    </pre>
                  </div>
                ) : null}
                {Object.keys(inc.metadata || {}).length > 0 ? (
                  <div>
                    <p className="mb-1 font-semibold">Métadonnées</p>
                    <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(inc.metadata, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {related.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Même requestId (fil de traçage)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {related.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTimeFr(r.created_at)}</p>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/admin/observabilite/$id" params={{ id: r.id }}>
                          Voir
                        </Link>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Contexte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Request ID : </span>
                  <code className="break-all">{inc.request_id}</code>
                </p>
                <p>
                  <span className="text-muted-foreground">Catégorie : </span>
                  {inc.category}
                </p>
                <p>
                  <span className="text-muted-foreground">Plateforme : </span>
                  {inc.platform || "—"} {inc.app_version ? `(v${inc.app_version})` : ""}
                </p>
                <p>
                  <span className="text-muted-foreground">Utilisateur : </span>
                  {inc.user_id ? `${inc.user_id.slice(0, 8)}… (${inc.user_role || "?"})` : "Anonyme / non connecté"}
                </p>
                <p>
                  <span className="text-muted-foreground">Signalé le : </span>
                  {formatDateTimeFr(inc.created_at)}
                </p>
                {inc.resolved_at ? (
                  <p>
                    <span className="text-muted-foreground">Résolu le : </span>
                    {formatDateTimeFr(inc.resolved_at)}
                  </p>
                ) : null}
                {inc.admin_note ? (
                  <p>
                    <span className="text-muted-foreground">Note admin : </span>
                    {inc.admin_note}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {!inc.resolved ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Marquer comme résolu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Note interne (optionnel) : action prise, cause confirmée…"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={4}
                  />
                  <Button
                    className="w-full"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate()}>
                    {resolveMutation.isPending ? "Enregistrement…" : "Résoudre l'incident"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
