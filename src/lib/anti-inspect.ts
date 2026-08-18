/**
 * Anti-inspection du back-office.
 *
 * Dissuade l'ouverture des DevTools et l'inspection de la page :
 *   - clic droit bloqué (menu contextuel)
 *   - raccourcis clavier DevTools bloqués (F12, Ctrl+Shift+I/J/C, Ctrl+U)
 *   - détection de fenêtre de devtools redimensionnée (avertissement console)
 *   - boucle `debugger` tant que les devtools sont ouverts (ralentit l'analyse)
 *
 * ⚠️ LIMITE À CONNAÎTRE : rien en JavaScript ne peut bloquer à 100 % un
 * utilisateur déterminé (outils externes, about:config, etc.). Cette couche
 * est une dissuasion et une gêne, PAS une barrière de sécurité. La vraie
 * protection des données reste côté API (auth, rôles, autorisations) — voir
 * docs/security/.
 */

const BLOCKED_KEYS = new Set(["F12", "F11"]);

function isDevtoolsShortcut(e: KeyboardEvent): boolean {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return BLOCKED_KEYS.has(e.key);
  // Ctrl/Meta + Shift + I/J/C ; Ctrl/Meta + U (source) ; Ctrl/Meta + S
  if (e.shiftKey) {
    const k = e.key.toLowerCase();
    if (k === "i" || k === "j" || k === "c") return true;
  }
  const k = e.key.toLowerCase();
  return k === "u" || k === "s";
}

function blockEvent(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
  return;
}

function warnIfOpen(): void {
  // Heuristique : une fenêtre de devtools dockée réduit la largeur visible.
  const threshold = 200;
  const widthDiff = window.outerWidth - window.innerWidth;
  if (widthDiff > threshold) {
    console.warn(
      "%c[ALERT] Inspection détectée — l'analyse du back-office est interdite.",
      "font-size:16px;color:#dc2626;font-weight:bold;",
    );
  }
}

export function enableAntiInspection(): void {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __antiInspect?: boolean }).__antiInspect) return;
  (window as unknown as { __antiInspect?: boolean }).__antiInspect = true;

  // 1. Clic droit : menu contextuel bloqué.
  window.addEventListener("contextmenu", blockEvent, true);

  // 2. Raccourcis clavier DevTools bloqués.
  window.addEventListener(
    "keydown",
    (e) => {
      if (isDevtoolsShortcut(e)) {
        blockEvent(e);
      }
    },
    true,
  );

  // 3. Détection par redimensionnement (avertissement console).
  window.addEventListener("resize", () => warnIfOpen());

  // 4. Sélection de texte neutralisée (copie de contenu gênée).
  document.addEventListener("selectstart", blockEvent, true);
  document.addEventListener("copy", blockEvent, true);

  // 5. Boucle `debugger` tant qu'une fenêtre de devtools est ouverte.
  //    Désactivée en dev pour ne pas gêner le débogage légitime.
  if (import.meta.env.PROD) {
    setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth;
      if (widthDiff > 200) {
        // eslint-disable-next-line no-debugger
        debugger;
      }
    }, 1000);
  }
}
