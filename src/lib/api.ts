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
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, jsonBody, headers: initHeaders, body, ...rest } = options;
  const headers = new Headers(initHeaders);

  let finalBody = body;
  if (jsonBody !== undefined) {
    headers.set("content-type", "application/json");
    finalBody = JSON.stringify(jsonBody);
  }

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

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
    throw new Error(`Impossible de joindre l'API (${origin}). ${hint}`);
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

  if (!res.ok) {
    const msg =
      typeof parsed === "object" && parsed !== null && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : text || res.statusText;
    throw new Error(msg || `Erreur HTTP ${res.status}`);
  }

  return parsed as T;
}
