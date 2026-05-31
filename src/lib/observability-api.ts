import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";

function token() {
  const t = getAdminToken();
  if (!t) throw new Error("Reconnectez-vous pour continuer.");
  return t;
}

export type AppIncident = {
  id: string;
  request_id: string;
  source: "mobile" | "admin" | "backend" | "api";
  severity: "error" | "warn" | "info";
  category: string;
  title: string;
  message: string;
  cause: string | null;
  stack: string | null;
  http_method: string | null;
  http_path: string | null;
  http_status: number | null;
  user_id: string | null;
  user_role: string | null;
  platform: string | null;
  app_version: string | null;
  device_info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_note: string | null;
  created_at: string;
};

export type IncidentListResponse = {
  items: AppIncident[];
  total: number;
};

export type IncidentDetailResponse = {
  incident: AppIncident;
  related: Pick<AppIncident, "id" | "title" | "severity" | "source" | "created_at" | "resolved">[];
};

export async function fetchIncidentsSummary(): Promise<{ open_count: number }> {
  return apiFetch("/api/admin/incidents/summary", { method: "GET", token: token() });
}

export async function fetchIncidents(params?: {
  limit?: number;
  offset?: number;
  resolved?: boolean;
  source?: string;
  severity?: string;
  q?: string;
}): Promise<IncidentListResponse> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  if (params?.resolved != null) qs.set("resolved", String(params.resolved));
  if (params?.source) qs.set("source", params.source);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<IncidentListResponse>(`/api/admin/incidents${suffix}`, { method: "GET", token: token() });
}

export async function fetchIncidentDetail(incidentId: string): Promise<IncidentDetailResponse> {
  return apiFetch<IncidentDetailResponse>(`/api/admin/incidents/${incidentId}`, {
    method: "GET",
    token: token(),
  });
}

export async function resolveIncident(incidentId: string, adminNote?: string): Promise<AppIncident> {
  return apiFetch<AppIncident>(`/api/admin/incidents/${incidentId}/resolve`, {
    method: "PATCH",
    token: token(),
    jsonBody: { admin_note: adminNote || null },
  });
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
