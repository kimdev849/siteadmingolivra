/**
 * Fallback SPA pour Render : /login, /admin, etc. → index.html
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const index = path.join(dist, "index.html");

if (!fs.existsSync(index)) {
  console.error("[postbuild] dist/index.html introuvable");
  process.exit(1);
}

fs.copyFileSync(index, path.join(dist, "404.html"));

const redirects = "/*  /index.html  200\n";
fs.writeFileSync(path.join(dist, "_redirects"), redirects);

const publicRedirects = path.join(root, "public", "_redirects");
if (fs.existsSync(publicRedirects)) {
  fs.copyFileSync(publicRedirects, path.join(dist, "_redirects"));
}

console.log("[postbuild] 404.html + _redirects OK");
