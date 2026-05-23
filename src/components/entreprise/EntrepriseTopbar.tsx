import { AdminNotificationsBell } from "@/components/admin/AdminNotificationsBell";
import { LogOut, Menu } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { fetchAdminMe, logoutAdmin } from "@/lib/auth-api";
import { entrepriseNavItems } from "@/lib/entreprise-nav";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

function initials(nom?: string | null, email?: string | null): string {
  if (nom?.trim()) {
    const parts = nom.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return nom.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "EN";
}

export function EntrepriseTopbar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const meQuery = useQuery({
    queryKey: ["entreprise", "me"],
    queryFn: () => fetchAdminMe(),
    staleTime: 60_000,
  });

  const handleLogout = async () => {
    await logoutAdmin();
    await navigate({ to: "/login" });
  };

  const me = meQuery.data;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <img src={logo} alt="" className="h-8 w-8" />
              GoLivra Entreprise
            </SheetTitle>
          </SheetHeader>
          <nav className="space-y-1 p-3">
            {entrepriseNavItems.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/entreprise/livreurs/nouveau"
              className="mt-2 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              + Ajouter un livreur
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <AdminNotificationsBell />
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(me?.nom, me?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="max-w-[160px] truncate text-sm font-medium text-foreground">
              {me?.nom || "Responsable"}
            </p>
            <p className="max-w-[160px] truncate text-xs text-muted-foreground">
              {me?.email || "—"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Se déconnecter"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
