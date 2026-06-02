import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";

function token() {
  const t = getAdminToken();
  if (!t) throw new Error("Reconnectez-vous pour continuer.");
  return t;
}

export type MobileUsers = {
  total: number;
  total_clients: number;
  total_livreurs: number;
  total_commercants: number;
  actifs: number;
  approuves: number;
  nouveaux_30j: number;
  nouveaux_clients_30j: number;
  nouveaux_livreurs_30j: number;
  croissance_30j_pct: number;
};

export type UsageActivite = {
  utilisateurs_actifs_7j: number;
  utilisateurs_actifs_30j: number;
  livreurs_actifs_7j: number;
  requetes_30j: number;
  commandes_30j: number;
  commandes_livrees_30j: number;
  moyenne_requetes_par_utilisateur_actif_30j: number;
  moyenne_commandes_par_client_actif_30j: number;
};

export type UsageTopZone = {
  quartier: string;
  commandes: number;
  livraisons: number;
};

export type UsageDashboard = {
  window_days: number;
  generated_at: string;
  mobile_users: MobileUsers;
  activite: UsageActivite;
  top_zones_livraison: UsageTopZone[];
};

export async function fetchUsageDashboard(params?: {
  window_days?: number;
  top_zones_limit?: number;
}): Promise<UsageDashboard> {
  const qs = new URLSearchParams();
  if (params?.window_days != null) qs.set("window_days", String(params.window_days));
  if (params?.top_zones_limit != null) qs.set("top_zones_limit", String(params.top_zones_limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<UsageDashboard>(`/api/admin/usage/dashboard${suffix}`, {
    method: "GET",
    token: token(),
  });
}
