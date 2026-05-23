/** Identifiant de build (Render : RENDER_GIT_COMMIT injecté au build). */
export const APP_BUILD_ID =
  (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || "dev-local";
