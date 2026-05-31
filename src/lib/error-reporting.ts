import { apiUrl } from "@/lib/api";

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type AdminIncidentPayload = {
  requestId?: string;
  title: string;
  message: string;
  category?: string;
  severity?: "error" | "warn" | "info";
  stack?: string;
  httpMethod?: string;
  httpPath?: string;
  httpStatus?: number;
  code?: string;
};

export async function reportAdminIncident(payload: AdminIncidentPayload): Promise<void> {
  const requestId = payload.requestId || createRequestId();
  try {
    const { getAdminToken } = await import("@/lib/auth-session");
    const token = getAdminToken();
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "X-Request-Id": requestId,
      "X-Client-Source": "admin",
    };
    if (token) headers.authorization = `Bearer ${token}`;

    await fetch(apiUrl("/api/observability/report"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        request_id: requestId,
        source: "admin",
        severity: payload.severity ?? "error",
        category: payload.category ?? "unknown",
        title: payload.title.slice(0, 500),
        message: payload.message.slice(0, 4000),
        stack: payload.stack?.slice(0, 12000),
        http_method: payload.httpMethod,
        http_path: payload.httpPath,
        http_status: payload.httpStatus,
        platform: "web",
        metadata: { code: payload.code },
      }),
    });
  } catch {
    /* silencieux */
  }
}
