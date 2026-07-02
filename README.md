# GoLivra Admin

Back-office administrateur GoLivra (marketplace Brazzaville).

## Développement local

```bash
npm install
cp .env.example .env
npm run dev
```

Ouvrir l’URL affichée (souvent `http://localhost:8080`). L’API pointe par défaut vers `https://golivra-api.onrender.com`.

## Déploiement Render

1. Ce dépôt est connecté à [kimdev849/siteadmingolivra](https://github.com/kimdev849/siteadmingolivra).
2. Render → **New** → **Static Site** → connecter le repo (ou importer `render.yaml`).
3. Build : `npm ci && npm run build` — dossier publié : `dist` (contient `index.html`).
4. Variable d'environnement (build) : `VITE_PUBLIC_API_BASE_URL=https://golivra-api.onrender.com`.
5. Sur le service API **golivraback**, ajouter l'URL du site admin dans `CORS_ORIGINS` (ex. `https://golivra-admin.onrender.com`).

## Écosystème GoLivra

| Composant | Dépôt | Description |
|-----------|-------|-------------|
| **App Mobile** | [kimdev849/golivra](https://github.com/kimdev849/golivra) | Application mobile Expo / React Native |
| **Backend API** | [kimdev849/golivraback](https://github.com/kimdev849/golivraback) | API Node.js / Express |
| **Site Admin** (ce dépôt) | [kimdev849/siteadmingolivra](https://github.com/kimdev849/siteadmingolivra) | Back-office web — TanStack Start, Vite, Tailwind, Radix |

## API backend

- Production : https://golivra-api.onrender.com
