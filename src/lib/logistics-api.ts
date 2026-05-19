import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";
import type { AdminCourier, AdminLogistics } from "@/lib/admin-api";

function token() {
  const t = getAdminToken();
  if (!t) throw new Error("Session expirée. Reconnectez-vous.");
  return t;
}

export type CreateCourierPayload = {
  nom: string;
  telephone: string;
  motDePasse: string;
  typeVehicule: "moto" | "voiture" | "velo" | "pied";
  plaqueImmatriculation?: string;
};

export async function fetchMyLogisticsCompany(): Promise<AdminLogistics> {
  return apiFetch<AdminLogistics>("/api/logistics/company", { method: "GET", token: token() });
}

export async function fetchMyCouriers(): Promise<AdminCourier[]> {
  return apiFetch<AdminCourier[]>("/api/logistics/livreurs", { method: "GET", token: token() });
}

export async function createMyCourier(payload: CreateCourierPayload): Promise<AdminCourier> {
  return apiFetch<AdminCourier>("/api/logistics/livreurs", {
    method: "POST",
    token: token(),
    jsonBody: payload,
  });
}

export async function suspendMyCourier(livreurId: string): Promise<AdminCourier> {
  return apiFetch<AdminCourier>(`/api/logistics/livreurs/${livreurId}/suspend`, {
    method: "PATCH",
    token: token(),
    jsonBody: {},
  });
}

export async function activateMyCourier(livreurId: string): Promise<AdminCourier> {
  return apiFetch<AdminCourier>(`/api/logistics/livreurs/${livreurId}/activate`, {
    method: "PATCH",
    token: token(),
    jsonBody: {},
  });
}

export type LogisticsDelivery = {
  id: string;
  statut: string;
  created_at: string;
  attribuee_at?: string | null;
  livree_at?: string | null;
  adresse?: string;
  commande?: { id: string; numero: string; statut: string } | null;
  livreur?: { id: string; nom?: string | null; telephone?: string | null; type_vehicule?: string } | null;
  minutes_depuis_creation?: number;
  minutes_depuis_attribution?: number | null;
  en_retard?: boolean;
  type_retard?: "assignation" | "livraison" | null;
  minutes_retard?: number;
};

export type LogisticsStats = {
  seuils_retard: { assignation_minutes: number; livraison_minutes: number };
  livreurs_total: number;
  livreurs_disponibles: number;
  livreurs_actifs: number;
  livraisons_total: number;
  livraisons_aujourdhui: number;
  livraisons_en_cours: number;
  livraisons_en_retard: number;
  livraisons_sans_livreur: number;
  livraisons_livrees_aujourdhui: number;
  taux_reussite_pct: number | null;
  delai_moyen_minutes: number | null;
  par_statut: Record<string, number>;
  mis_a_jour_le: string;
};

export type LogisticsOperations = {
  livraisons_actives: LogisticsDelivery[];
  livraisons_recentes_livrees: LogisticsDelivery[];
  colonnes: {
    sans_livreur: LogisticsDelivery[];
    en_route: LogisticsDelivery[];
    autres: LogisticsDelivery[];
  };
  alertes_retard: LogisticsDelivery[];
  mis_a_jour_le: string;
};

export type LogisticsDelays = {
  total: number;
  assignation: number;
  livraison: number;
  livraisons: LogisticsDelivery[];
  seuils_retard: { assignation_minutes: number; livraison_minutes: number };
  mis_a_jour_le: string;
};

export async function fetchMyStats(): Promise<LogisticsStats> {
  return apiFetch<LogisticsStats>("/api/logistics/stats", { method: "GET", token: token() });
}

export async function fetchMyOperations(): Promise<LogisticsOperations> {
  return apiFetch<LogisticsOperations>("/api/logistics/operations", { method: "GET", token: token() });
}

export async function fetchMyDelays(): Promise<LogisticsDelays> {
  return apiFetch<LogisticsDelays>("/api/logistics/retards", { method: "GET", token: token() });
}

export async function fetchMyDeliveries(status?: string): Promise<LogisticsDelivery[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await apiFetch<LogisticsDelivery[]>(`/api/logistics/livraisons${qs}`, {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function assignMyDelivery(deliveryId: string, livreurId: string): Promise<LogisticsDelivery> {
  return apiFetch<LogisticsDelivery>(`/api/logistics/livraisons/${deliveryId}/assign`, {
    method: "PATCH",
    token: token(),
    jsonBody: { livreurId },
  });
}

export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch("/api/auth/change-password", {
    method: "POST",
    token: token(),
    jsonBody: { currentPassword, newPassword },
  });
}
