import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";

function token() {
  const t = getAdminToken();
  if (!t) throw new Error("Session admin expirée. Reconnectez-vous.");
  return t;
}

export type AdminStats = {
  commerces_en_attente: number;
  commerces_actifs: number;
  comptes_marchands_en_attente: number;
  commandes_total: number;
};

export type AdminOwner = {
  id: string;
  nom: string | null;
  telephone: string | null;
  email?: string | null;
  est_approuve?: boolean;
  created_at?: string;
  role?: string | null;
};

export type AdminEnterprise = {
  id: string;
  nom: string;
  type: "restaurant" | "boutique";
  description?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  adresse_ligne1?: string | null;
  statut?: string;
  statut_moderation?: string;
  ouvert?: boolean;
  est_ouvert?: boolean;
  created_at?: string;
  proprietaire?: AdminOwner | null;
  proprietaire_id?: string;
  products?: AdminProduct[];
};

export type AdminProduct = {
  id: string;
  nom: string;
  prix: number;
  stock?: number | null;
  est_disponible?: boolean;
  kind: "plat" | "article";
};

export type AdminPendingUser = {
  id: string;
  nom: string;
  telephone: string | null;
  email?: string | null;
  role?: string | null;
  est_approuve: boolean;
  created_at: string;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/api/admin/stats", { method: "GET", token: token() });
}

export async function fetchAdminEnterprises(params?: {
  status?: string;
  type?: string;
  q?: string;
}): Promise<AdminEnterprise[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.type) qs.set("type", params.type);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await apiFetch<AdminEnterprise[]>(`/api/admin/enterprises${suffix}`, {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchPendingEnterprises(): Promise<AdminEnterprise[]> {
  const data = await apiFetch<AdminEnterprise[]>("/api/admin/enterprises/pending", {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchEnterpriseAdmin(id: string): Promise<AdminEnterprise> {
  return apiFetch<AdminEnterprise>(`/api/admin/enterprises/${id}`, {
    method: "GET",
    token: token(),
  });
}

export async function activateEnterpriseAdmin(id: string): Promise<AdminEnterprise> {
  return apiFetch<AdminEnterprise>(`/api/admin/enterprises/${id}/activate`, {
    method: "PATCH",
    token: token(),
    jsonBody: {},
  });
}

export async function rejectEnterpriseAdmin(id: string, raison?: string): Promise<AdminEnterprise> {
  return apiFetch<AdminEnterprise>(`/api/admin/enterprises/${id}/reject`, {
    method: "PATCH",
    token: token(),
    jsonBody: raison ? { raison } : {},
  });
}

export async function suspendEnterpriseAdmin(id: string): Promise<AdminEnterprise> {
  return apiFetch<AdminEnterprise>(`/api/admin/enterprises/${id}/suspend`, {
    method: "PATCH",
    token: token(),
    jsonBody: {},
  });
}

export async function fetchPendingUsers(): Promise<AdminPendingUser[]> {
  const data = await apiFetch<AdminPendingUser[]>("/api/admin/users/pending", {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function approveUserAdmin(userId: string): Promise<AdminPendingUser> {
  return apiFetch<AdminPendingUser>(`/api/admin/users/${userId}/approve`, {
    method: "PATCH",
    token: token(),
    jsonBody: {},
  });
}

export function formatStatutLabel(statut?: string | null): string {
  const map: Record<string, string> = {
    en_attente: "En attente",
    en_examen: "En examen",
    active: "Actif",
    suspendue: "Suspendu",
    rejetee: "Rejeté",
  };
  if (!statut) return "—";
  return map[statut] || statut;
}

export function formatTypeLabel(type?: string | null): string {
  if (type === "restaurant") return "Restaurant";
  if (type === "boutique") return "Boutique";
  return type || "—";
}

export function formatDateFr(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export type AdminOrder = {
  id: string;
  numero: string;
  statut: string;
  total: number;
  sous_total?: number;
  frais_livraison_total?: number;
  adresse_livraison?: string | null;
  created_at: string;
  client?: { id: string; nom: string | null; telephone: string | null; email?: string | null } | null;
  sous_commandes?: AdminSousCommande[];
};

export type AdminSousCommande = {
  id: string;
  numero: string;
  statut: string;
  total: number;
  sous_total: number;
  frais_livraison: number;
  commission_ttc: number;
  etablissement?: { id: string; nom: string; type: string } | null;
  articles: { id: string; nom_produit: string; quantite: number; prix_unitaire: number; sous_total: number }[];
};

export type AdminCourier = {
  id: string;
  type_vehicule?: string | null;
  est_disponible?: boolean;
  est_approuve?: boolean;
  nb_livraisons_total?: number;
  nb_livraisons_reussies?: number;
  plaque_immatriculation?: string | null;
  created_at?: string;
  utilisateur?: {
    id: string;
    nom: string | null;
    telephone: string | null;
    email?: string | null;
    est_actif?: boolean;
  } | null;
};

export type AdminLogistics = {
  id: string;
  nom: string;
  telephone?: string | null;
  email?: string | null;
  statut?: string;
  statut_moderation?: string;
  nb_livreurs?: number;
  created_at?: string;
  gestionnaire?: AdminOwner | null;
  livreurs?: AdminCourier[];
};

export type CreateLogisticsCompanyPayload = {
  nomEntreprise: string;
  telephoneEntreprise?: string;
  emailEntreprise?: string;
  description?: string;
  zoneActivite?: string;
  gestionnaire: {
    nom: string;
    email: string;
    motDePasse: string;
    telephone?: string;
  };
};

export type CreateLogisticsCourierPayload = {
  nom: string;
  telephone: string;
  motDePasse: string;
  typeVehicule: "moto" | "voiture" | "velo" | "pied";
  plaqueImmatriculation?: string;
};

export type AdminDelivery = {
  id: string;
  statut: string;
  created_at: string;
  adresse?: string;
  commande?: { id: string; numero: string; statut: string } | null;
  livreur?: { id: string; nom?: string | null; telephone?: string | null; type_vehicule?: string } | null;
};

export type AdminCommissions = {
  total_commission: number;
  commission_mois: number;
  reversements_en_attente: number;
  factures_emises: number;
  lignes: {
    id: string;
    periode: string;
    etablissement: string;
    livraisons: number;
    montant: number;
    commission: number;
    statut: string;
  }[];
};

export async function fetchAdminOrders(params?: { status?: string; q?: string }): Promise<AdminOrder[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await apiFetch<AdminOrder[]>(`/api/admin/orders${suffix}`, { method: "GET", token: token() });
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminOrder(id: string): Promise<AdminOrder> {
  return apiFetch<AdminOrder>(`/api/admin/orders/${id}`, { method: "GET", token: token() });
}

export async function fetchAdminLogistics(params?: { status?: string; q?: string }): Promise<AdminLogistics[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await apiFetch<AdminLogistics[]>(`/api/admin/logistics${suffix}`, { method: "GET", token: token() });
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminLogisticsDetail(id: string): Promise<AdminLogistics> {
  return apiFetch<AdminLogistics>(`/api/admin/logistics/${id}`, { method: "GET", token: token() });
}

export async function updateLogisticsStatusAdmin(
  id: string,
  action: "activate" | "reject" | "suspend",
  raison?: string,
): Promise<AdminLogistics> {
  return apiFetch<AdminLogistics>(`/api/admin/logistics/${id}/status`, {
    method: "PATCH",
    token: token(),
    jsonBody: raison ? { action, raison } : { action },
  });
}

export async function createLogisticsCompanyAdmin(
  payload: CreateLogisticsCompanyPayload,
): Promise<AdminLogistics> {
  return apiFetch<AdminLogistics>("/api/admin/logistics", {
    method: "POST",
    token: token(),
    jsonBody: payload,
  });
}

export async function createLogisticsCourierAdmin(
  companyId: string,
  payload: CreateLogisticsCourierPayload,
): Promise<AdminCourier> {
  return apiFetch<AdminCourier>(`/api/admin/logistics/${companyId}/livreurs`, {
    method: "POST",
    token: token(),
    jsonBody: payload,
  });
}

export async function suspendLogisticsCourierAdmin(
  companyId: string,
  livreurId: string,
): Promise<AdminCourier> {
  return apiFetch<AdminCourier>(`/api/admin/logistics/${companyId}/livreurs/${livreurId}/suspend`, {
    method: "PATCH",
    token: token(),
    jsonBody: {},
  });
}

export async function activateLogisticsCourierAdmin(
  companyId: string,
  livreurId: string,
): Promise<AdminCourier> {
  return apiFetch<AdminCourier>(`/api/admin/logistics/${companyId}/livreurs/${livreurId}/activate`, {
    method: "PATCH",
    token: token(),
    jsonBody: {},
  });
}

export async function fetchAdminDeliveries(status?: string): Promise<AdminDelivery[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await apiFetch<AdminDelivery[]>(`/api/admin/deliveries${qs}`, { method: "GET", token: token() });
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminCouriers(): Promise<
  { id: string; type_vehicule: string; est_disponible: boolean; utilisateur?: { nom: string; telephone: string } | null }[]
> {
  const data = await apiFetch<
    { id: string; type_vehicule: string; est_disponible: boolean; utilisateur?: { nom: string; telephone: string } | null }[]
  >("/api/admin/couriers", { method: "GET", token: token() });
  return Array.isArray(data) ? data : [];
}

export async function assignDeliveryCourierAdmin(deliveryId: string, livreurId: string): Promise<void> {
  await apiFetch(`/api/admin/deliveries/${deliveryId}/assign`, {
    method: "PATCH",
    token: token(),
    jsonBody: { livreurId },
  });
}

export async function fetchAdminCommissions(): Promise<AdminCommissions> {
  return apiFetch<AdminCommissions>("/api/admin/commissions", { method: "GET", token: token() });
}

export async function rejectUserAdmin(userId: string, raison?: string): Promise<AdminPendingUser> {
  return apiFetch<AdminPendingUser>(`/api/admin/users/${userId}/reject`, {
    method: "PATCH",
    token: token(),
    jsonBody: raison ? { raison } : {},
  });
}
