import { Link, useRouterState } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { adminNavItems } from "@/lib/admin-nav";
import { APP_BUILD_ID } from "@/lib/build-info";

export function Sidebar({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className={cn("flex w-64 shrink-0 flex-col border-r border-border bg-card", className)}>
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <img src={logo} alt="GoLivra" className="h-9 w-9 object-contain" />
        <span className="text-lg font-bold tracking-tight text-foreground">
          Go<span className="text-accent">Livra</span>
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {adminNavItems.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        <Link
          to="/admin/transporteurs/nouveau"
          className={cn(
            "mt-2 flex items-center gap-3 rounded-md border border-dashed border-primary/40 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5",
            pathname === "/admin/transporteurs/nouveau" && "bg-primary/10",
          )}
        >
          <span className="text-lg leading-none">+</span>
          Créer entreprise
        </Link>
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">© GoLivra Admin</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground" title="Vérifiez que Render a déployé ce build">
          build {APP_BUILD_ID.slice(0, 7)}
        </p>
      </div>
    </aside>
  );
}
