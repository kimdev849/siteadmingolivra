import { apiFetch } from "@/lib/api";
import { clearAdminToken, getAdminToken } from "@/lib/auth-session";

export type AdminUser = {
  id: string;
  nom: string;
  email?: string | null;
  telephone?: string | null;
  role?: string | null;
  roleId?: string | number;
  est_approuve?: boolean;
};

export type StaffLoginResponse = {
  token: string;
  expireLe: string;
  user: AdminUser;
};

export async function staffLogin(email: string, motDePasse: string): Promise<StaffLoginResponse> {
  const body = { email: email.trim().toLowerCase(), motDePasse };

  try {
    return await apiFetch<StaffLoginResponse>("/api/auth/staff/login", {
      method: "POST",
      jsonBody: body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // Render pas encore à jour : repli sur POST /api/auth/login (email supporté)
    if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
      return apiFetch<StaffLoginResponse>("/api/auth/login", {
        method: "POST",
        jsonBody: body,
      });
    }
    throw err;
  }
}

export async function fetchAdminMe(token?: string | null): Promise<AdminUser> {
  const t = token ?? getAdminToken();
  if (!t) throw new Error("Non connecté");
  return apiFetch<AdminUser>("/api/auth/me", { method: "GET", token: t });
}

export async function logoutAdmin(): Promise<void> {
  const token = getAdminToken();
  if (token) {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", token, jsonBody: {} });
    } catch {
      /* on efface quand même localement */
    }
  }
  clearAdminToken();
}

export function isAdminUser(user: AdminUser | null | undefined): boolean {
  return user?.role === "admin";
}

export function isLogisticsManager(user: AdminUser | null | undefined): boolean {
  return user?.role === "gestionnaire_logistique";
}

export function isStaffUser(user: AdminUser | null | undefined): boolean {
  return isAdminUser(user) || isLogisticsManager(user);
}
