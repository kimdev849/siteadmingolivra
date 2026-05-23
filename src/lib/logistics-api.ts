import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";
import type { AdminCourier, AdminLogistics, TimelineStep } from "@/lib/admin-api";

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
  created_at_label?: string;
  attribuee_at?: string | null;
  attribuee_at_label?: string | null;
  collectee_at?: string | null;
  collectee_at_label?: string | null;
  livree_at?: string | null;
  livree_at_label?: string | null;
  commande_created_at?: string | null;
  commande_created_at_label?: string | null;
  timeline?: TimelineStep[];
  adresse?: string;
  commande?: { id: string; numero: string; statut: string } | null;
  livreur?: {
    id: string;
    nom?: string | null;
    telephone?: string | null;
    type_vehicule?: string;
  } | null;
  minutes_depuis_creation?: number;
  minutes_depuis_attribution?: number | null;
  en_retard?: boolean;
  type_retard?: "assignation" | "livraison" | null;
  minutes_retard?: number;
};

export type CourierDetail = AdminCourier & {
  compte_actif?: boolean;
  livraisons_recentes?: LogisticsDelivery[];
  resume?: {
    total_historique: number;
    reussies_historique: number;
    recentes_total: number;
    recentes_livrees: number;
    recentes_en_cours: number;
  };
};

export async function fetchMyCourier(livreurId: string): Promise<CourierDetail> {
  return apiFetch<CourierDetail>(`/api/logistics/livreurs/${livreurId}`, {
    method: "GET",
    token: token(),
  });
}

export async function setMyCourierAvailability(
  livreurId: string,
  disponible: boolean,
): Promise<AdminCourier> {
  return apiFetch<AdminCourier>(`/api/logistics/livreurs/${livreurId}/disponibilite`, {
    method: "PATCH",
    token: token(),
    jsonBody: { disponible },
  });
}

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
  revenus_livraison_total_fcfa?: number;
  revenus_livraison_aujourdhui_fcfa?: number;
  split_ventes_percent?: { merchant_percent: number; platform_fee_percent: number };
  split_livraison_percent?: {
    delivery_logistics_percent: number;
    delivery_platform_percent: number;
  };
  portefeuille_solde_fcfa?: number | null;
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

export type WalletDashboard = {
  solde_fcfa: number;
  solde_en_attente_fcfa?: number;
  transactions: Array<{
    id: string;
    type: string;
    montant: number;
    solde_apres: number;
    description?: string | null;
    created_at: string;
  }>;
  retraits: Array<{
    id: string;
    montant: number;
    statut: string;
    methode: string;
    numero_compte: string;
    created_at: string;
  }>;
};

export async function fetchMyWallet(): Promise<WalletDashboard> {
  return apiFetch<WalletDashboard>("/api/logistics/wallet", { method: "GET", token: token() });
}

export async function requestMyWithdrawal(payload: {
  montant: number;
  methode: string;
  numero_compte: string;
  note?: string;
}): Promise<unknown> {
  return apiFetch("/api/wallet/retraits", {
    method: "POST",
    token: token(),
    jsonBody: payload,
  });
}

export async function fetchMyStats(): Promise<LogisticsStats> {
  return apiFetch<LogisticsStats>("/api/logistics/stats", { method: "GET", token: token() });
}

export async function fetchMyOperations(): Promise<LogisticsOperations> {
  return apiFetch<LogisticsOperations>("/api/logistics/operations", {
    method: "GET",
    token: token(),
  });
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

/** Relance l'attribution automatique GoLivra (aucun choix manuel de livreur). */
export async function retryMyDeliveryDispatch(deliveryId: string): Promise<LogisticsDelivery> {
  return apiFetch<LogisticsDelivery>(`/api/logistics/livraisons/${deliveryId}/retry-dispatch`, {
    method: "POST",
    token: token(),
  });
}

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch("/api/auth/change-password", {
    method: "POST",
    token: token(),
    jsonBody: { currentPassword, newPassword },
  });
}
