import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";

function token() {
  const t = getAdminToken();
  if (!t) throw new Error("Reconnectez-vous pour continuer.");
  return t;
}

export type IncidentState = "ouvert" | "acquitte" | "en_cours" | "resolu";
export type IncidentSeverity = "error" | "warn" | "info";
export type IncidentSource = "mobile" | "admin" | "backend" | "api";
export type ErrorType =
  | "DatabaseError"
  | "AuthError"
  | "ValidationError"
  | "ExternalServiceError"
  | "NetworkError"
  | "PaymentError"
  | "RuntimeError"
  | "UnknownError";

export type IncidentFrame = {
  function: string;
  file: string | null;
  abs_path: string | null;
  line: number;
  column: number;
  in_app: boolean;
  source?: string | null;
  github_url?: string | null;
};

export type IncidentCodeContext = {
  start_line: number;
  lines: { line: number; text: string; highlight: boolean }[];
};

export type SourceLocation = {
  function: string;
  file: string | null;
  abs_path: string | null;
  line: number;
  column: number;
  in_app: boolean;
  github_url?: string | null;
};

export type AppIncident = {
  id: string;
  request_id: string;
  source: IncidentSource;
  severity: IncidentSeverity;
  category: string;
  error_type: ErrorType | null;
  fingerprint: string | null;
  state: IncidentState;
  title: string;
  message: string;
  cause: string | null;
  stack: string | null;
  frames: IncidentFrame[] | null;
  source_location: SourceLocation | null;
  code_context: IncidentCodeContext | null;
  github_url: string | null;
  http_method: string | null;
  http_path: string | null;
  http_status: number | null;
  latency_ms: number | null;
  user_id: string | null;
  user_role: string | null;
  platform: string | null;
  app_version: string | null;
  device_info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  request_payload: Record<string, unknown> | null;
  environment: string | null;
  release: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  admin_note: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
};

export type IncidentEvent = {
  id: string;
  incident_id: string;
  event_type:
    | "cree"
    | "occurrence"
    | "acquitte"
    | "en_cours"
    | "resolu"
    | "reouvert"
    | "note"
    | "changement_statut";
  actor_id: string | null;
  actor_kind: "admin" | "systeme" | "mobile" | "backend";
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type IncidentGroup = {
  id: string;
  fingerprint: string;
  error_type: ErrorType | null;
  title: string;
  severity: IncidentSeverity;
  source: IncidentSource;
  state: IncidentState;
  http_method: string | null;
  http_path: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved: boolean;
};

export type IncidentListResponse = {
  items: AppIncident[];
  total: number;
};

export type IncidentDetailResponse = {
  incident: AppIncident;
  events: IncidentEvent[];
  related: Pick<
    AppIncident,
    | "id"
    | "title"
    | "severity"
    | "source"
    | "state"
    | "error_type"
    | "occurrence_count"
    | "last_seen_at"
    | "resolved"
  >[];
};

export type IncidentGroupListResponse = {
  window_min: number;
  groups: IncidentGroup[];
};

export type BySource = { source: string; request_count: number; error_count: number; error_rate: number };
export type ByErrorType = { error_type: string; count: number };
export type OpenBySeverity = { severity: string; count: number };
export type Spike = {
  fingerprint: string;
  error_type: ErrorType | null;
  occurrence_count: number;
  last_seen_at: string;
};
export type TopEndpoint = {
  method: string;
  path: string;
  request_count: number;
  error_count: number;
  slow_count: number;
  error_rate: number;
  slow_rate: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
};
export type EndpointHealth = TopEndpoint & { latency_max_ms: number };

export type ObservabilityDashboard = {
  window_min: number;
  request_count: number;
  error_count: number;
  slow_count: number;
  error_rate: number;
  slow_rate: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  by_source: BySource[];
  by_error_type: ByErrorType[];
  open_by_severity: OpenBySeverity[];
  top_endpoints: TopEndpoint[];
  spikes: Spike[];
};

export type EndpointHealthResponse = {
  window_min: number;
  endpoints: EndpointHealth[];
};

export type AlertChannel = {
  id: string;
  nom: string;
  type: "telegram" | "webhook" | "email";
  config: Record<string, unknown>;
  est_actif: boolean;
  created_at: string;
  updated_at: string;
};

export type AlertRule = {
  id: string;
  nom: string;
  description: string | null;
  est_actif: boolean;
  condition: {
    kind: "error_rate" | "slow_endpoint" | "incident_severity" | "spike";
    [k: string]: unknown;
  };
  channel_ids: string[];
  cooldown_min: number;
  last_fired_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AlertHistoryEntry = {
  id: string;
  rule_id: string | null;
  channel_id: string | null;
  incident_id: string | null;
  status: "envoye" | "echec" | "skip_cooldown";
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function fetchIncidents(params?: {
  limit?: number;
  offset?: number;
  resolved?: boolean;
  state?: IncidentState;
  source?: string;
  severity?: string;
  error_type?: string;
  requestId?: string;
  fingerprint?: string;
  q?: string;
}): Promise<IncidentListResponse> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  if (params?.resolved != null) qs.set("resolved", String(params.resolved));
  if (params?.state) qs.set("state", params.state);
  if (params?.source) qs.set("source", params.source);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.error_type) qs.set("error_type", params.error_type);
  if (params?.requestId) qs.set("requestId", params.requestId);
  if (params?.fingerprint) qs.set("fingerprint", params.fingerprint);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<IncidentListResponse>(`/api/admin/observability/incidents${suffix}`, {
    method: "GET",
    token: token(),
  });
}

export async function fetchIncidentDetail(incidentId: string): Promise<IncidentDetailResponse> {
  return apiFetch<IncidentDetailResponse>(
    `/api/admin/observability/incidents/${incidentId}`,
    { method: "GET", token: token() },
  );
}

export async function fetchIncidentGroups(params?: {
  window_min?: number;
  source?: string;
  severity?: string;
  state?: IncidentState;
}): Promise<IncidentGroupListResponse> {
  const qs = new URLSearchParams();
  if (params?.window_min != null) qs.set("window_min", String(params.window_min));
  if (params?.source) qs.set("source", params.source);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.state) qs.set("state", params.state);
  const suffix = qs.toString() ?? "";
  return apiFetch<IncidentGroupListResponse>(
    `/api/admin/observability/incidents/groups${suffix ? `?${suffix}` : ""}`,
    { method: "GET", token: token() },
  );
}

export async function transitionIncident(
  incidentId: string,
  state: IncidentState,
  adminNote?: string,
): Promise<AppIncident> {
  return apiFetch<AppIncident>(`/api/admin/observability/incidents/${incidentId}/state`, {
    method: "PATCH",
    token: token(),
    jsonBody: { state, admin_note: adminNote },
  });
}

export async function resolveIncident(
  incidentId: string,
  adminNote?: string,
): Promise<AppIncident> {
  return apiFetch<AppIncident>(
    `/api/admin/observability/incidents/${incidentId}/resolve`,
    {
      method: "PATCH",
      token: token(),
      jsonBody: { admin_note: adminNote },
    },
  );
}

export async function acknowledgeIncident(incidentId: string): Promise<AppIncident> {
  return apiFetch<AppIncident>(
    `/api/admin/observability/incidents/${incidentId}/acknowledge`,
    { method: "PATCH", token: token(), jsonBody: {} },
  );
}

export async function investigatingIncident(incidentId: string): Promise<AppIncident> {
  return apiFetch<AppIncident>(
    `/api/admin/observability/incidents/${incidentId}/investigating`,
    { method: "PATCH", token: token(), jsonBody: {} },
  );
}

export async function reopenIncident(incidentId: string): Promise<AppIncident> {
  return apiFetch<AppIncident>(`/api/admin/observability/incidents/${incidentId}/reopen`, {
    method: "PATCH",
    token: token(),
    jsonBody: {},
  });
}

export async function addIncidentNote(incidentId: string, message: string): Promise<IncidentEvent> {
  return apiFetch<IncidentEvent>(`/api/admin/observability/incidents/${incidentId}/notes`, {
    method: "POST",
    token: token(),
    jsonBody: { message },
  });
}

export async function reanalyzeIncidentStack(incidentId: string): Promise<AppIncident> {
  return apiFetch<AppIncident>(
    `/api/admin/observability/incidents/${incidentId}/reanalyze-stack`,
    { method: "POST", token: token(), jsonBody: {} },
  );
}

export async function fetchObservabilityDashboard(windowMin = 60): Promise<ObservabilityDashboard> {
  return apiFetch<ObservabilityDashboard>(
    `/api/admin/observability/dashboard?window_min=${windowMin}`,
    { method: "GET", token: token() },
  );
}

export async function fetchEndpointHealth(
  windowMin = 60,
  minRequests = 1,
): Promise<EndpointHealthResponse> {
  return apiFetch<EndpointHealthResponse>(
    `/api/admin/observability/endpoints?window_min=${windowMin}&min_requests=${minRequests}`,
    { method: "GET", token: token() },
  );
}

export async function fetchAlertChannels(): Promise<{ items: AlertChannel[] }> {
  return apiFetch<{ items: AlertChannel[] }>(`/api/admin/observability/alert-channels`, {
    method: "GET",
    token: token(),
  });
}

export async function createAlertChannel(payload: {
  nom: string;
  type: "telegram" | "webhook" | "email";
  config: Record<string, unknown>;
  est_actif?: boolean;
}): Promise<AlertChannel> {
  return apiFetch<AlertChannel>(`/api/admin/observability/alert-channels`, {
    method: "POST",
    token: token(),
    jsonBody: payload,
  });
}

export async function updateAlertChannel(
  channelId: string,
  patch: Partial<{ nom: string; config: Record<string, unknown>; est_actif: boolean }>,
): Promise<AlertChannel> {
  return apiFetch<AlertChannel>(`/api/admin/observability/alert-channels/${channelId}`, {
    method: "PATCH",
    token: token(),
    jsonBody: patch,
  });
}

export async function deleteAlertChannel(channelId: string): Promise<void> {
  await apiFetch(`/api/admin/observability/alert-channels/${channelId}`, {
    method: "DELETE",
    token: token(),
  });
}

export async function fetchAlertRules(): Promise<{ items: AlertRule[] }> {
  return apiFetch<{ items: AlertRule[] }>(`/api/admin/observability/alert-rules`, {
    method: "GET",
    token: token(),
  });
}

export async function createAlertRule(payload: {
  nom: string;
  description?: string;
  condition: AlertRule["condition"];
  channel_ids?: string[];
  cooldown_min?: number;
  est_actif?: boolean;
}): Promise<AlertRule> {
  return apiFetch<AlertRule>(`/api/admin/observability/alert-rules`, {
    method: "POST",
    token: token(),
    jsonBody: payload,
  });
}

export async function updateAlertRule(
  ruleId: string,
  patch: Partial<{
    nom: string;
    description: string;
    condition: AlertRule["condition"];
    channel_ids: string[];
    cooldown_min: number;
    est_actif: boolean;
  }>,
): Promise<AlertRule> {
  return apiFetch<AlertRule>(`/api/admin/observability/alert-rules/${ruleId}`, {
    method: "PATCH",
    token: token(),
    jsonBody: patch,
  });
}

export async function deleteAlertRule(ruleId: string): Promise<void> {
  await apiFetch(`/api/admin/observability/alert-rules/${ruleId}`, {
    method: "DELETE",
    token: token(),
  });
}

export async function testAlertRule(ruleId: string): Promise<{ ok: boolean; sent: boolean }> {
  return apiFetch<{ ok: boolean; sent: boolean }>(
    `/api/admin/observability/alert-rules/${ruleId}/test`,
    { method: "POST", token: token(), jsonBody: {} },
  );
}

export async function evaluateAlertRulesNow(): Promise<{ evaluated: number; fired: number }> {
  return apiFetch<{ evaluated: number; fired: number }>(
    `/api/admin/observability/alert-rules/evaluate`,
    { method: "POST", token: token(), jsonBody: {} },
  );
}

export async function fetchAlertHistory(
  params?: { limit?: number; rule_id?: string },
): Promise<{ items: AlertHistoryEntry[] }> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.rule_id) qs.set("rule_id", params.rule_id);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<{ items: AlertHistoryEntry[] }>(
    `/api/admin/observability/alert-history${suffix}`,
    { method: "GET", token: token() },
  );
}

export function formatIncidentSource(source: AppIncident["source"]): string {
  const map: Record<AppIncident["source"], string> = {
    mobile: "Application mobile",
    admin: "Admin web",
    backend: "Backend API",
    api: "API",
  };
  return map[source] || source;
}

export function formatIncidentSeverity(severity: AppIncident["severity"]): string {
  const map = { error: "Erreur", warn: "Avertissement", info: "Info" };
  return map[severity] || severity;
}

export function formatIncidentState(state: IncidentState): string {
  const map: Record<IncidentState, string> = {
    ouvert: "Ouvert",
    acquitte: "Acquitté",
    en_cours: "En cours",
    resolu: "Résolu",
  };
  return map[state] || state;
}

export function formatEventType(eventType: IncidentEvent["event_type"]): string {
  const map: Record<IncidentEvent["event_type"], string> = {
    cree: "Créé",
    occurrence: "Occurrence",
    acquitte: "Acquitté",
    en_cours: "En cours",
    resolu: "Résolu",
    reouvert: "Réouvert",
    note: "Note",
    changement_statut: "Changement d'état",
  };
  return map[eventType] || eventType;
}

export function formatActorKind(kind: IncidentEvent["actor_kind"]): string {
  const map: Record<IncidentEvent["actor_kind"], string> = {
    admin: "Admin",
    systeme: "Système",
    mobile: "Mobile",
    backend: "Backend",
  };
  return map[kind] || kind;
}

export function formatAlertStatus(status: AlertHistoryEntry["status"]): string {
  const map: Record<AlertHistoryEntry["status"], string> = {
    envoye: "Envoyé",
    echec: "Échec",
    skip_cooldown: "Skip (cooldown)",
  };
  return map[status] || status;
}

export function stateVariant(state: IncidentState): "destructive" | "secondary" | "outline" | "default" {
  switch (state) {
    case "ouvert": return "destructive";
    case "acquitte": return "secondary";
    case "en_cours": return "default";
    case "resolu": return "outline";
    default: return "outline";
  }
}

export function formatErrorType(t: ErrorType | null | undefined): string {
  if (!t) return "Non classifié";
  const map: Record<ErrorType, string> = {
    DatabaseError: "Base de données",
    AuthError: "Authentification",
    ValidationError: "Validation",
    ExternalServiceError: "Service externe",
    NetworkError: "Réseau",
    PaymentError: "Paiement",
    RuntimeError: "Runtime",
    UnknownError: "Inconnu",
  };
  return map[t] || t;
}
