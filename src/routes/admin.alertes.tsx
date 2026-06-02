import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Plus, Trash2, Zap } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAlertChannels,
  createAlertChannel,
  updateAlertChannel,
  deleteAlertChannel,
  fetchAlertRules,
  createAlertRule,
  deleteAlertRule,
  testAlertRule,
  evaluateAlertRulesNow,
  fetchAlertHistory,
  type AlertChannel,
  type AlertRule,
} from "@/lib/observability-api";
import { formatDateTimeFr } from "@/lib/admin-api";

const ALL = "__all__";

export const Route = createFileRoute("/admin/alertes")({
  component: AlertesPage,
});

function AlertesPage() {
  const queryClient = useQueryClient();
  const channelsQuery = useQuery({
    queryKey: ["admin", "alert-channels"],
    queryFn: fetchAlertChannels,
    refetchInterval: 30_000,
  });
  const rulesQuery = useQuery({
    queryKey: ["admin", "alert-rules"],
    queryFn: fetchAlertRules,
    refetchInterval: 30_000,
  });
  const historyQuery = useQuery({
    queryKey: ["admin", "alert-history"],
    queryFn: () => fetchAlertHistory({ limit: 50 }),
    refetchInterval: 30_000,
  });

  const evaluateMutation = useMutation({
    mutationFn: evaluateAlertRulesNow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "alert-history"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Alertes & notifications"
        description="Configurez les canaux (Telegram, webhook, email) et les règles de déclenchement."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Évaluation automatique toutes les minutes (configurable via
          <code className="mx-1 rounded bg-muted px-1">OBSERVABILITY_RULES_INTERVAL_MS</code>).
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={evaluateMutation.isPending}
          onClick={() => evaluateMutation.mutate()}
        >
          <Zap className="h-4 w-4" /> Évaluer maintenant
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChannelsCard
          channels={channelsQuery.data?.items ?? []}
          onChanged={() => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "alert-channels"] });
          }}
        />
        <RulesCard
          channels={channelsQuery.data?.items ?? []}
          rules={rulesQuery.data?.items ?? []}
          onChanged={() => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "alert-rules"] });
            void queryClient.invalidateQueries({ queryKey: ["admin", "alert-history"] });
          }}
        />
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4" /> Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(historyQuery.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune alerte envoyée pour l’instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Statut</th>
                    <th className="py-2 text-left">Message</th>
                    <th className="py-2 text-left">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {historyQuery.data?.items.map((h) => (
                    <tr key={h.id} className="border-b border-border/50 last:border-0 align-top">
                      <td className="py-1.5 text-xs">{formatDateTimeFr(h.created_at)}</td>
                      <td className="py-1.5">
                        <Badge
                          variant={
                            h.status === "envoye"
                              ? "default"
                              : h.status === "echec"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {h.status}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-foreground">{h.message ?? "—"}</td>
                      <td className="py-1.5 text-xs text-muted-foreground">
                        <pre className="max-h-24 overflow-auto rounded bg-muted p-2 text-[10px]">
                          {JSON.stringify(h.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelsCard({
  channels,
  onChanged,
}: {
  channels: AlertChannel[];
  onChanged: () => void;
}) {
  const [type, setType] = useState<"telegram" | "webhook" | "email">("telegram");
  const [nom, setNom] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const createMutation = useMutation({
    mutationFn: () => {
      const config: Record<string, unknown> =
        type === "telegram"
          ? { bot_token: telegramBotToken, chat_id: telegramChatId }
          : type === "webhook"
          ? { url: webhookUrl }
          : {};
      return createAlertChannel({ nom, type, config });
    },
    onSuccess: () => {
      setNom("");
      setTelegramBotToken("");
      setTelegramChatId("");
      setWebhookUrl("");
      onChanged();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; est_actif: boolean }) =>
      updateAlertChannel(vars.id, { est_actif: vars.est_actif }),
    onSuccess: onChanged,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAlertChannel(id),
    onSuccess: onChanged,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">Canaux d’alerte</CardTitle>
        <Badge variant="secondary">{channels.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun canal. Ajoutez-en un ci-dessous.</p>
        ) : (
          <div className="space-y-2">
            {channels.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded border border-border bg-card px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{c.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.type} · {c.est_actif ? "actif" : "désactivé"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate({ id: c.id, est_actif: !c.est_actif })}
                  >
                    {c.est_actif ? "Désactiver" : "Activer"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(c.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 rounded-md border border-dashed border-border p-3">
          <p className="text-xs font-semibold text-foreground">Ajouter un canal</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input placeholder="Nom (ex. Telegram DevOps)" value={nom} onChange={(e) => setNom(e.target.value)} />
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="email">Email (à brancher)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "telegram" ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Bot Token (123456:ABC...)"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                type="password"
              />
              <Input
                placeholder="Chat ID"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
              />
            </div>
          ) : null}
          {type === "webhook" ? (
            <Input
              placeholder="https://example.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          ) : null}
          {type === "email" ? (
            <p className="text-xs text-muted-foreground">
              Canal email à implémenter dans <code>alerting.service.js</code> (Resend / SES / SMTP).
            </p>
          ) : null}
          <Button
            size="sm"
            disabled={
              !nom.trim() ||
              createMutation.isPending ||
              (type === "telegram" && (!telegramBotToken || !telegramChatId)) ||
              (type === "webhook" && !webhookUrl)
            }
            onClick={() => createMutation.mutate()}
          >
            <Plus className="h-4 w-4" /> Créer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RulesCard({
  channels,
  rules,
  onChanged,
}: {
  channels: AlertChannel[];
  rules: AlertRule[];
  onChanged: () => void;
}) {
  const [nom, setNom] = useState("");
  const [kind, setKind] = useState<"error_rate" | "slow_endpoint" | "incident_severity" | "spike">(
    "error_rate",
  );
  const [windowMin, setWindowMin] = useState(15);
  const [threshold, setThreshold] = useState(0.1);
  const [thresholdMs, setThresholdMs] = useState(2000);
  const [severity, setSeverity] = useState<"error" | "warn" | "info">("error");
  const [incidentCount, setIncidentCount] = useState(10);
  const [baselineMin, setBaselineMin] = useState(60);
  const [factor, setFactor] = useState(3);
  const [cooldownMin, setCooldownMin] = useState(15);
  const [channelIds, setChannelIds] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: () => {
      let condition: Record<string, unknown> = { kind, window_min: windowMin };
      if (kind === "error_rate") condition = { ...condition, threshold };
      if (kind === "slow_endpoint") condition = { ...condition, threshold_ms: thresholdMs, threshold };
      if (kind === "incident_severity")
        condition = { ...condition, severity, count: incidentCount };
      if (kind === "spike")
        condition = { ...condition, baseline_min: baselineMin, factor };
      return createAlertRule({
        nom,
        condition: condition as AlertRule["condition"],
        channel_ids: channelIds,
        cooldown_min: cooldownMin,
      });
    },
    onSuccess: () => {
      setNom("");
      onChanged();
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => testAlertRule(id),
    onSuccess: onChanged,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAlertRule(id),
    onSuccess: onChanged,
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; est_actif: boolean }) =>
      import("@/lib/observability-api").then((m) =>
        m.updateAlertRule(vars.id, { est_actif: vars.est_actif }),
      ),
    onSuccess: onChanged,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">Règles d’alerte</CardTitle>
        <Badge variant="secondary">{rules.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune règle. Créez-en une ci-dessous.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{r.nom}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.condition.kind} · cooldown {r.cooldown_min}min · {r.channel_ids.length} canal(aux) ·{" "}
                    {r.est_actif ? "active" : "désactivée"}
                    {r.last_fired_at ? ` · dernier: ${formatDateTimeFr(r.last_fired_at)}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate({ id: r.id, est_actif: !r.est_actif })}
                  >
                    {r.est_actif ? "Désactiver" : "Activer"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => testMutation.mutate(r.id)}
                    disabled={testMutation.isPending || r.channel_ids.length === 0}
                  >
                    Tester
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(r.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 rounded-md border border-dashed border-border p-3">
          <p className="text-xs font-semibold text-foreground">Ajouter une règle</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="error_rate">Taux d’erreur endpoint</SelectItem>
                <SelectItem value="slow_endpoint">Endpoint lent</SelectItem>
                <SelectItem value="incident_severity">Pic d’incidents</SelectItem>
                <SelectItem value="spike">Spike vs baseline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input
              type="number"
              placeholder="Fenêtre (min)"
              value={windowMin}
              onChange={(e) => setWindowMin(Number(e.target.value) || 15)}
            />
            {kind === "error_rate" ? (
              <Input
                type="number"
                step="0.01"
                placeholder="Seuil (0.1 = 10%)"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 0.1)}
              />
            ) : null}
            {kind === "slow_endpoint" ? (
              <>
                <Input
                  type="number"
                  placeholder="Latence seuil (ms)"
                  value={thresholdMs}
                  onChange={(e) => setThresholdMs(Number(e.target.value) || 2000)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="% min de slow"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value) || 0.1)}
                />
              </>
            ) : null}
            {kind === "incident_severity" ? (
              <>
                <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">error</SelectItem>
                    <SelectItem value="warn">warn</SelectItem>
                    <SelectItem value="info">info</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Nb incidents"
                  value={incidentCount}
                  onChange={(e) => setIncidentCount(Number(e.target.value) || 10)}
                />
              </>
            ) : null}
            {kind === "spike" ? (
              <>
                <Input
                  type="number"
                  placeholder="Baseline (min)"
                  value={baselineMin}
                  onChange={(e) => setBaselineMin(Number(e.target.value) || 60)}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Facteur (x)"
                  value={factor}
                  onChange={(e) => setFactor(Number(e.target.value) || 3)}
                />
              </>
            ) : null}
            <Input
              type="number"
              placeholder="Cooldown (min)"
              value={cooldownMin}
              onChange={(e) => setCooldownMin(Number(e.target.value) || 15)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Canaux (multi-sélection)</p>
            <div className="flex flex-wrap gap-1.5">
              {channels.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Créez d’abord un canal (Telegram ou webhook).
                </p>
              ) : (
                channels.map((c) => {
                  const active = channelIds.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() =>
                        setChannelIds((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                        )
                      }
                      className={
                        "rounded border px-2 py-0.5 text-xs " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground")
                      }
                    >
                      {c.nom} ({c.type})
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <Button
            size="sm"
            disabled={!nom.trim() || channelIds.length === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <Plus className="h-4 w-4" /> Créer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
