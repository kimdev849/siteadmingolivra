import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { EntrepriseSidebar } from "@/components/entreprise/EntrepriseSidebar";
import { EntrepriseTopbar } from "@/components/entreprise/EntrepriseTopbar";
import { fetchAdminMe, isAdminUser, isLogisticsManager } from "@/lib/auth-api";
import { clearAdminToken, getAdminToken } from "@/lib/auth-session";

export const Route = createFileRoute("/entreprise")({
  component: EntrepriseLayout,
});

function EntrepriseLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const token = getAdminToken();
      if (!token) {
        await navigate({ to: "/login" });
        return;
      }
      try {
        const me = await fetchAdminMe(token);
        if (isAdminUser(me)) {
          await navigate({ to: "/admin" });
          return;
        }
        if (!isLogisticsManager(me)) {
          clearAdminToken();
          await navigate({ to: "/login" });
          return;
        }
      } catch {
        clearAdminToken();
        await navigate({ to: "/login" });
        return;
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Vérification de la session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <EntrepriseSidebar className="hidden md:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <EntrepriseTopbar />
        <main className="flex-1 px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
