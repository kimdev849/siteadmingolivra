import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";
import { formatEnterpriseTypeLabel, formatStatutLabel as formatStatutLabelUx } from "@/lib/ux-copy";

function token() {
  const t = getAdminToken();
  if (!t) throw new Error("Reconnectez-vous pour continuer.");
  return t;
}

export type AdminStats = {
  commerces_en_attente: number;
  commerces_actifs: number;
  comptes_marchands_en_attente: number;
  commandes_total: number;
  livraisons_total?: number;
  livraisons_externes?: number;
  livraisons_en_cours?: number;
  incidents_ouverts?: number;
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
  stats?: AdminCommerceStats;
};

export type AdminCommercePeriodStats = {
  commandes: number;
  commandes_livrees: number;
  commandes_annulees: number;
  commandes_en_cours: number;
  ca_produits_fcfa: number;
  frais_livraison_fcfa: number;
  total_paye_client_fcfa: number;
  panier_moyen_fcfa: number;
  top_produits: { nom: string; quantite: number; ca_fcfa: number }[];
};

export type AdminCommerceStats = {
  source: string;
  commission_ventes_golivra_fcfa: number;
  note: string;
  periodes: {
    j7: AdminCommercePeriodStats;
    j30: AdminCommercePeriodStats;
    j90: AdminCommercePeriodStats;
    total: AdminCommercePeriodStats;
  };
  mis_a_jour_le: string;
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

export const formatStatutLabel = formatStatutLabelUx;
export const formatTypeLabel = formatEnterpriseTypeLabel;

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

/** Date et heure (ex. « 23 mai 2026, 14:32 »). */
export function formatDateTimeFr(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso ?? "—";
  }
}

export type TimelineStep = {
  key: string;
  label: string;
  at: string;
  label_fr?: string | null;
};

export type OrderTimelinePayload = {
  commande: TimelineStep[];
  sous_commandes: { id: string; numero?: string; timeline: TimelineStep[] }[];
  livraisons: { id: string; statut?: string; timeline: TimelineStep[] }[];
};

export type AdminOrder = {
  id: string;
  numero: string;
  statut: string;
  total: number;
  sous_total?: number;
  frais_livraison_total?: number;
  remise_totale?: number;
  adresse_livraison?: string | null;
  created_at: string;
  created_at_label?: string;
  livree_at?: string | null;
  livree_at_label?: string | null;
  acceptee_at?: string | null;
  acceptee_at_label?: string | null;
  timeline?: OrderTimelinePayload;
  livraisons?: {
    id: string;
    statut: string;
    timeline: TimelineStep[];
    created_at?: string;
    created_at_label?: string;
    attribuee_at?: string | null;
    attribuee_at_label?: string | null;
    collectee_at?: string | null;
    collectee_at_label?: string | null;
    livree_at?: string | null;
    livree_at_label?: string | null;
  }[];
  client?: {
    id: string;
    nom: string | null;
    telephone: string | null;
    email?: string | null;
  } | null;
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
  articles: {
    id: string;
    nom_produit: string;
    quantite: number;
    prix_unitaire: number;
    sous_total: number;
  }[];
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
  /** % GoLivra prélevé sur les frais de livraison de cette entreprise */
  commission_pct?: number;
  nb_livreurs?: number;
  created_at?: string;
  gestionnaire?: AdminOwner | null;
  livreurs?: (AdminCourier & { utilisateur?: AdminOwner | null })[];
  livraisons_recentes?: AdminDelivery[];
  resume_livraisons?: {
    en_cours: number;
    en_retard: number;
    retards: { id: string; en_retard: boolean; type_retard?: string | null; minutes_retard?: number }[];
  };
  stats?: AdminLogisticsStats;
};

export type AdminLogisticsStats = {
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
  revenus_livraison_total_fcfa: number;
  revenus_livraison_aujourdhui_fcfa: number;
  portefeuille_solde_fcfa: number | null;
  split_livraison_percent?: {
    delivery_logistics_percent: number;
    delivery_platform_percent: number;
  };
  mis_a_jour_le: string;
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

export type AdminDelivery = {
  id: string;
  type_livraison: "commande" | "externe";
  statut: string;
  created_at: string;
  attribuee_at?: string | null;
  collectee_at?: string | null;
  livree_at?: string | null;
  adresse?: string;
  adresse_retrait?: string;
  commande?: { id: string; numero: string; statut: string; created_at?: string } | null;
  commerce?: { id: string; nom: string; type: string } | null;
  commerce_nom?: string | null;
  client_nom?: string | null;
  client_telephone?: string | null;
  montant_total?: number | null;
  note?: string | null;
  livreur?: {
    id: string;
    nom?: string | null;
    telephone?: string | null;
    type_vehicule?: string;
    plaque_immatriculation?: string | null;
  } | null;
  entreprise_logistique?: { id: string; nom: string; telephone?: string | null } | null;
  timeline?: TimelineStep[];
  created_at_label?: string;
  attribuee_at_label?: string | null;
  collectee_at_label?: string | null;
  livree_at_label?: string | null;
  commande_created_at?: string | null;
  commande_created_at_label?: string | null;
  en_retard?: boolean;
  type_retard?: "assignation" | "livraison" | null;
  minutes_retard?: number;
};

export type AppNotification = {
  id: string;
  type: string;
  titre: string;
  corps?: string | null;
  data?: Record<string, unknown> | null;
  est_lue: boolean;
  created_at: string;
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

export async function fetchAdminOrders(params?: {
  status?: string;
  q?: string;
}): Promise<AdminOrder[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await apiFetch<AdminOrder[]>(`/api/admin/orders${suffix}`, {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminOrder(id: string): Promise<AdminOrder> {
  return apiFetch<AdminOrder>(`/api/admin/orders/${id}`, { method: "GET", token: token() });
}

export async function fetchAdminLogistics(params?: {
  status?: string;
  q?: string;
}): Promise<AdminLogistics[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await apiFetch<AdminLogistics[]>(`/api/admin/logistics${suffix}`, {
    method: "GET",
    token: token(),
  });
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

export async function updateLogisticsCommissionAdmin(
  id: string,
  commission_pct: number,
): Promise<AdminLogistics> {
  return apiFetch<AdminLogistics>(`/api/admin/logistics/${id}/commission`, {
    method: "PATCH",
    token: token(),
    jsonBody: { commission_pct },
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

export type AdminDeliveryList = {
  items: AdminDelivery[];
  total: number;
  limit: number;
  offset: number;
};

export async function fetchAdminDeliveries(opts?: {
  status?: string;
  type?: "commande" | "externe";
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminDeliveryList> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.since) params.set("since", opts.since);
  if (opts?.until) params.set("until", opts.until);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const data = await apiFetch<AdminDeliveryList | AdminDelivery[]>(`/api/admin/deliveries${qs}`, {
    method: "GET",
    token: token(),
  });
  // Tolère l'ancien format (tableau brut) pour rétro-compat.
  if (Array.isArray(data)) {
    return { items: data, total: data.length, limit: data.length, offset: 0 };
  }
  return data || { items: [], total: 0, limit: 0, offset: 0 };
}

export async function fetchAdminDeliveryDetail(deliveryId: string): Promise<AdminDelivery> {
  return apiFetch<AdminDelivery>(`/api/admin/deliveries/${deliveryId}`, {
    method: "GET",
    token: token(),
  });
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const data = await apiFetch<AppNotification[]>("/api/notifications?limit=40", {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>("/api/notifications/unread-count", {
    method: "GET",
    token: token(),
  });
  return Number(data?.count ?? 0);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiFetch(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    token: token(),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/notifications/read-all", { method: "PATCH", token: token() });
}

export async function fetchAdminCommissions(): Promise<AdminCommissions> {
  return apiFetch<AdminCommissions>("/api/admin/commissions", { method: "GET", token: token() });
}

export type WalletTransaction = {
  id: string;
  type: string;
  montant: number;
  solde_apres: number;
  description?: string | null;
  created_at: string;
};

export type PlatformWallet = {
  solde_fcfa: number;
  commissions_livraison_total_fcfa: number;
  commissions_livraison_mois_fcfa: number;
  retraits_en_attente_fcfa: number;
  nb_retraits_en_attente: number;
  transactions: WalletTransaction[];
  message?: string;
};

export type WithdrawalRequest = {
  id: string;
  montant: number;
  methode: string;
  numero_compte: string;
  statut: string;
  note_demandeur?: string | null;
  note_admin?: string | null;
  created_at: string;
  traite_at?: string | null;
  utilisateur?: { id: string; nom: string | null; telephone: string | null } | null;
};

export async function fetchAdminPlatformWallet(): Promise<PlatformWallet> {
  return apiFetch<PlatformWallet>("/api/admin/portefeuille", { method: "GET", token: token() });
}

export async function fetchAdminWithdrawals(statut?: string): Promise<WithdrawalRequest[]> {
  const qs = statut ? `?statut=${encodeURIComponent(statut)}` : "";
  const data = await apiFetch<WithdrawalRequest[]>(`/api/admin/retraits${qs}`, {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function processAdminWithdrawal(
  retraitId: string,
  action: "approuver" | "rejeter",
  note_admin?: string,
): Promise<WithdrawalRequest> {
  return apiFetch<WithdrawalRequest>(`/api/admin/retraits/${retraitId}`, {
    method: "PATCH",
    token: token(),
    jsonBody: { action, note_admin },
  });
}

export async function rejectUserAdmin(userId: string, raison?: string): Promise<AdminPendingUser> {
  return apiFetch<AdminPendingUser>(`/api/admin/users/${userId}/reject`, {
    method: "PATCH",
    token: token(),
    jsonBody: raison ? { raison } : {},
  });
}

export type AdminChartDay = {
  date: string;
  count?: number;
  revenue_fcfa?: number;
  amount_fcfa?: number;
};

export type AdminCharts = {
  days: number;
  orders_by_day: AdminChartDay[];
  commissions_by_day: AdminChartDay[];
};

export async function fetchAdminCharts(days = 30): Promise<AdminCharts> {
  return apiFetch<AdminCharts>(`/api/admin/stats/charts?days=${days}`, {
    method: "GET",
    token: token(),
  });
}

export type AdminSettingEntry = {
  valeur: string | number | boolean;
  type: string;
  description?: string | null;
  est_public?: boolean;
  updated_at?: string;
};

export async function fetchAdminSettings(): Promise<Record<string, AdminSettingEntry>> {
  const res = await apiFetch<{ settings: Record<string, AdminSettingEntry> }>("/api/settings/admin", {
    method: "GET",
    token: token(),
  });
  return res.settings;
}

export async function updateAdminSettings(
  patch: Record<string, string | number | boolean>,
): Promise<Record<string, AdminSettingEntry>> {
  const res = await apiFetch<{ settings: Record<string, AdminSettingEntry>; message: string }>(
    "/api/settings/admin",
    {
      method: "PATCH",
      token: token(),
      jsonBody: patch,
    },
  );
  return res.settings;
}

export type AdminZone = {
  id: string;
  name: string;
  label: string;
  price_base: number;
  is_active: boolean;
  sort_order: number;
};

export type AdminArrondissement = {
  id: string;
  name: string;
  ville_id: string | null;
  zone_id: string | null;
  sort_order: number;
};

export type AdminArrondissementShort = {
  id: string;
  name: string;
  zone_id: string | null;
  sort_order: number;
};

export type AdminVilleWithArrondissements = {
  id: string;
  nom: string;
  arrondissements: AdminArrondissementShort[];
};

export type AdminPaysWithVilles = {
  id: string;
  nom: string;
  code_iso2: string;
  villes: AdminVilleWithArrondissements[];
};

export type AdminZonesBoard = {
  zones: AdminZone[];
  pays: AdminPaysWithVilles[];
  arrondissements_unlinked: AdminArrondissementShort[];
};

export async function fetchAdminZonesBoard(): Promise<AdminZonesBoard> {
  return apiFetch<AdminZonesBoard>("/api/zones/admin", {
    method: "GET",
    token: token(),
  });
}

export async function updateAdminZonesBoard(body: {
  zones: { id: string; price_base: number; is_active: boolean }[];
  assignments: { arrondissement_id: string; zone_id: string | null }[];
}): Promise<AdminZonesBoard> {
  return apiFetch<AdminZonesBoard>("/api/zones/admin", {
    method: "PATCH",
    token: token(),
    jsonBody: body,
  });
}

// ── Admin : campagnes marketing ─────────────────────────────────────────────

export type MarketingCampagne = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  image_url: string | null;
  date_debut: string | null;
  date_fin: string | null;
  est_actif: boolean;
  created_at: string;
  updated_at: string;
  ville_ids: string[];
  villes: { id: string; nom: string; pays_id: string; sort_order: number }[];
};

export async function fetchAdminCampagnes(): Promise<MarketingCampagne[]> {
  const data = await apiFetch<MarketingCampagne[]>("/api/admin/campagnes", {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminCampagne(id: string): Promise<MarketingCampagne> {
  return apiFetch<MarketingCampagne>(`/api/admin/campagnes/${id}`, {
    method: "GET",
    token: token(),
  });
}

export async function createAdminCampagne(body: {
  nom: string;
  description?: string;
  type?: string;
  date_debut?: string;
  date_fin?: string;
  est_actif?: boolean;
  ville_ids?: string[];
}): Promise<MarketingCampagne> {
  return apiFetch<MarketingCampagne>("/api/admin/campagnes", {
    method: "POST",
    token: token(),
    jsonBody: body,
  });
}

export async function updateAdminCampagne(
  id: string,
  body: Partial<{
    nom: string;
    description: string;
    type: string;
    date_debut: string | null;
    date_fin: string | null;
    est_actif: boolean;
    ville_ids: string[];
  }>,
): Promise<MarketingCampagne> {
  return apiFetch<MarketingCampagne>(`/api/admin/campagnes/${id}`, {
    method: "PATCH",
    token: token(),
    jsonBody: body,
  });
}

export async function deleteAdminCampagne(id: string): Promise<void> {
  await apiFetch(`/api/admin/campagnes/${id}`, {
    method: "DELETE",
    token: token(),
  });
}

// ── Admin : pays / villes / arrondissements ─────────────────────────────────

export type AdminPays = {
  id: string;
  nom: string;
  code_iso2: string;
  code_iso3: string;
  indicatif: string | null;
};

export type AdminVille = {
  id: string;
  pays_id: string;
  nom: string;
  sort_order: number;
};

export type AdminArrondissementFull = {
  id: string;
  ville_id: string;
  name: string;
  zone_id: string | null;
  sort_order: number;
};

export async function fetchAdminPays(): Promise<AdminPays[]> {
  const data = await apiFetch<AdminPays[]>("/api/admin/locations/pays", {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function createAdminPays(body: {
  nom: string;
  code_iso2: string;
  code_iso3: string;
  indicatif?: string;
}): Promise<AdminPays> {
  return apiFetch<AdminPays>("/api/admin/locations/pays", {
    method: "POST",
    token: token(),
    jsonBody: body,
  });
}

export async function updateAdminPays(
  paysId: string,
  body: Partial<{ nom: string; code_iso2: string; code_iso3: string; indicatif: string }>,
): Promise<AdminPays> {
  return apiFetch<AdminPays>(`/api/admin/locations/pays/${paysId}`, {
    method: "PATCH",
    token: token(),
    jsonBody: body,
  });
}

export async function deleteAdminPays(paysId: string): Promise<void> {
  await apiFetch(`/api/admin/locations/pays/${paysId}`, {
    method: "DELETE",
    token: token(),
  });
}

export async function fetchAdminVilles(paysId?: string): Promise<AdminVille[]> {
  const qs = paysId ? `?pays_id=${encodeURIComponent(paysId)}` : "";
  const data = await apiFetch<AdminVille[]>(`/api/admin/locations/villes${qs}`, {
    method: "GET",
    token: token(),
  });
  return Array.isArray(data) ? data : [];
}

export async function createAdminVille(body: {
  pays_id: string;
  nom: string;
  sort_order?: number;
}): Promise<AdminVille> {
  return apiFetch<AdminVille>("/api/admin/locations/villes", {
    method: "POST",
    token: token(),
    jsonBody: body,
  });
}

export async function updateAdminVille(
  villeId: string,
  body: Partial<{ nom: string; sort_order: number }>,
): Promise<AdminVille> {
  return apiFetch<AdminVille>(`/api/admin/locations/villes/${villeId}`, {
    method: "PATCH",
    token: token(),
    jsonBody: body,
  });
}

export async function deleteAdminVille(villeId: string): Promise<void> {
  await apiFetch(`/api/admin/locations/villes/${villeId}`, {
    method: "DELETE",
    token: token(),
  });
}

export async function fetchAdminArrondissements(villeId?: string): Promise<AdminArrondissementFull[]> {
  const qs = villeId ? `?ville_id=${encodeURIComponent(villeId)}` : "";
  const data = await apiFetch<AdminArrondissementFull[]>(
    `/api/admin/locations/arrondissements${qs}`,
    {
      method: "GET",
      token: token(),
    },
  );
  return Array.isArray(data) ? data : [];
}

export async function createAdminArrondissement(body: {
  ville_id: string;
  name: string;
  sort_order?: number;
  zone_id?: string | null;
}): Promise<AdminArrondissementFull> {
  return apiFetch<AdminArrondissementFull>("/api/admin/locations/arrondissements", {
    method: "POST",
    token: token(),
    jsonBody: body,
  });
}

export async function deleteAdminArrondissement(arrId: string): Promise<void> {
  await apiFetch(`/api/admin/locations/arrondissements/${arrId}`, {
    method: "DELETE",
    token: token(),
  });
}
