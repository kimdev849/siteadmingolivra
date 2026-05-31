/**
 * Base URL du backend (sans suffixe /api).
 */
export const DEFAULT_API_ORIGIN = "https://golivraback.onrender.com";

export function getApiOrigin(): string {
  if (import.meta.env.PROD) {
    return DEFAULT_API_ORIGIN;
  }

  const raw = import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined;
  const trimmed = raw?.trim();
  if (trimmed && trimmed !== "/" && trimmed !== "") {
    return trimmed.replace(/\/+$/, "");
  }
  return DEFAULT_API_ORIGIN;
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getApiOrigin()}${p}`;
}

export type ApiFetchOptions = RequestInit & {
  token?: string | null;
  jsonBody?: unknown;
  skipIncidentReport?: boolean;
};

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function extractErrorCode(parsed: unknown): string | undefined {
  if (typeof parsed === "object" && parsed !== null && "code" in parsed) {
    const code = (parsed as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, jsonBody, headers: initHeaders, body, skipIncidentReport, ...rest } = options;
  const headers = new Headers(initHeaders);
  const requestId = createRequestId();

  headers.set("X-Request-Id", requestId);
  headers.set("X-Client-Source", "admin");

  let finalBody = body;
  if (jsonBody !== undefined) {
    headers.set("content-type", "application/json");
    finalBody = JSON.stringify(jsonBody);
  }

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const method = (rest.method || "GET").toUpperCase();
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...rest,
      headers,
      body: finalBody,
    });
  } catch {
    const origin = getApiOrigin();
    const hint =
      origin.includes("localhost") || origin.includes("127.0.0.1")
        ? "Vérifiez que le backend tourne (cd golivra-backendcd && npm run dev, port 3000)."
        : "Vérifiez votre connexion et que le backend Render est actif.";
    const message = `Impossible de joindre l'API (${origin}). ${hint}`;
    if (!skipIncidentReport) {
      const { reportAdminIncident } = await import("@/lib/error-reporting");
      void reportAdminIncident({
        requestId,
        title: "API injoignable (admin)",
        message,
        category: "network",
        httpMethod: method,
        httpPath: path,
      });
    }
    throw new Error(message);
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }

  const responseRequestId =
    (typeof parsed === "object" &&
      parsed !== null &&
      "requestId" in parsed &&
      typeof (parsed as { requestId: unknown }).requestId === "string" &&
      (parsed as { requestId: string }).requestId) ||
    res.headers.get("X-Request-Id") ||
    requestId;

  if (!res.ok) {
    const msg =
      typeof parsed === "object" && parsed !== null && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : text || res.statusText;
    const code = extractErrorCode(parsed);
    if (!skipIncidentReport && res.status !== 401 && !path.includes("/observability/report")) {
      const { reportAdminIncident } = await import("@/lib/error-reporting");
      void reportAdminIncident({
        requestId: responseRequestId,
        title: `Erreur API ${res.status} (admin)`,
        message: msg || `Erreur HTTP ${res.status}`,
        code,
        httpMethod: method,
        httpPath: path,
        httpStatus: res.status,
        severity: res.status >= 500 ? "error" : "warn",
      });
    }
    const err = new Error(msg || `Erreur HTTP ${res.status}`) as Error & { requestId?: string };
    err.requestId = responseRequestId;
    throw err;
  }

  return parsed as T;
}
