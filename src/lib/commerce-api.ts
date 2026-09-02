import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";

export type HorairesEntry = {
  id?: string;
  jour: number;
  ouverture: string | null;
  fermeture: string | null;
};

/**
 * Récupère les horaires d'un commerce.
 */
export async function fetchHoraires(enterpriseId: string): Promise<HorairesEntry[]> {
  const token = getAdminToken();
  if (!token) throw new Error("Non connecté");
  const data = await apiFetch<{ horaires: HorairesEntry[] }>(
    `/api/enterprises/${enterpriseId}/horaires`,
    { method: "GET", token }
  );
  return Array.isArray(data?.horaires) ? data.horaires : [];
}

/**
 * Enregistre les horaires d'un commerce (remplacement complet).
 */
export async function saveHoraires(
  enterpriseId: string,
  horaires: HorairesEntry[]
): Promise<HorairesEntry[]> {
  const token = getAdminToken();
  if (!token) throw new Error("Non connecté");
  const data = await apiFetch<{ horaires: HorairesEntry[] }>(
    `/api/enterprises/${enterpriseId}/horaires`,
    { method: "PUT", token, jsonBody: { horaires } }
  );
  return Array.isArray(data?.horaires) ? data.horaires : [];
}

/**
 * Récupère les enterprises du propriétaire connecté.
 */
export async function fetchMyEnterprises(): Promise<{ id: string; nom: string; type: string }[]> {
  const token = getAdminToken();
  if (!token) throw new Error("Non connecté");
  const data = await apiFetch<{ id: string; nom: string; type: string }[]>(
    "/api/enterprises/mine",
    { method: "GET", token }
  );
  return Array.isArray(data) ? data : [];
}
