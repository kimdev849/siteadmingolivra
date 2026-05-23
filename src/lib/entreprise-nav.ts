import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Wallet,
  LayoutDashboard,
  PackageCheck,
  Users,
} from "lucide-react";

export type EntrepriseNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const entrepriseNavItems: EntrepriseNavItem[] = [
  { to: "/entreprise", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/entreprise/operations", label: "Opérations live", icon: Activity },
  { to: "/entreprise/livraisons", label: "Livraisons", icon: PackageCheck },
  { to: "/entreprise/retards", label: "Retards", icon: AlertTriangle },
  { to: "/entreprise/portefeuille", label: "Portefeuille", icon: Wallet },
  { to: "/entreprise/statistiques", label: "Statistiques", icon: BarChart3 },
  { to: "/entreprise/livreurs", label: "Livreurs", icon: Users },
  { to: "/entreprise/profil", label: "Mon entreprise", icon: Building2 },
];

/** Rafraîchissement automatique des écrans opérationnels (ms). */
export const ENTREPRISE_OPS_REFETCH_MS = 15_000;
