import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { enableAntiInspection } from "./lib/anti-inspect";
import { Toaster } from "@/components/ui/sonner";
import "./styles.css";

// Dissuasion anti-inspection du back-office (clic droit, raccourcis DevTools,
// sélection/copie). La vraie protection reste côté API (auth + rôles).
enableAntiInspection();

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const el = document.getElementById("root");
if (!el) throw new Error("Élément #root introuvable");

createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
