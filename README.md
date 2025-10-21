# 🏔️ Analyse de Rentabilité - Chalet Locatif

Application web pour analyser la rentabilité d'un chalet locatif avec scénarios multiples, analyses de sensibilité et optimisation.

## 🚀 Fonctionnalités

- **📊 Analyse financière** : KPIs en temps réel (cashflow, cash-on-cash, cap rate, NOI, ROI)
- **🎯 Scénarios multiples** : Création, duplication et comparaison visuelle
- **📈 Sensibilité** : Analyses 1D (Tornado), 2D (Heatmap) et Monte Carlo
- **🔍 Optimisation** : Grid search avec contraintes pour trouver les meilleures combinaisons
- **💾 Exports** : JSON (projets), Excel (tableaux), PDF (rapports), PNG (graphiques)
- **💿 Autosave** : Sauvegarde automatique en localStorage

## 🛠️ Stack technique

React 18 · TypeScript · Vite · Tailwind CSS · Recharts

## ⚡ Démarrage rapide

```bash
# Installation
npm install

# Développement (http://localhost:5173)
npm run dev

# Build de production
npm run build

# Prévisualisation du build
npm preview
```

## 📦 Déploiement

### Architecture

Application **100% client-side** (SPA) sans backend :
- Aucune base de données requise
- Aucun serveur API nécessaire
- Toutes les données stockées localement (localStorage)
- Fichiers statiques uniquement (HTML, CSS, JS)

### Option 1 : GitHub Pages (Gratuit, recommandé)

```bash
# 1. Build de production
npm run build

# 2. Déployer sur GitHub Pages
# Via GitHub Actions (recommandé) :
# - Créer .github/workflows/deploy.yml
# - Push sur main → déploiement automatique
# - Accessible sur https://<username>.github.io/<repo-name>

# Via terminal (manuel) :
npm install -g gh-pages
gh-pages -d dist
```

**Configuration GitHub** :
1. Settings → Pages → Source : `gh-pages` branch
2. Custom domain (optionnel) : ajouter un fichier `CNAME` dans `public/`

### Option 2 : Netlify (Gratuit)

```bash
# Méthode 1 : Déploiement par glisser-déposer
# 1. Aller sur https://app.netlify.com/drop
# 2. Glisser le dossier dist/

# Méthode 2 : CLI Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Configuration Netlify** :
- Build command : `npm run build`
- Publish directory : `dist`
- Redirects : Créer `public/_redirects` avec `/* /index.html 200`

### Option 3 : Vercel (Gratuit)

```bash
# CLI Vercel
npm install -g vercel
vercel --prod
```

**Configuration Vercel** :
- Framework Preset : Vite
- Build Command : `npm run build`
- Output Directory : `dist`

### Option 4 : Hébergement web traditionnel

1. Build : `npm run build`
2. Upload le contenu de `dist/` via FTP/SFTP
3. Pointer le domaine vers le dossier uploadé
4. Configurer le serveur pour servir `index.html` sur toutes les routes (SPA routing)

**Configuration Apache** (`.htaccess`) :
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Configuration Nginx** :
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Variables d'environnement

Aucune variable d'environnement requise. L'application est entièrement autonome.

### Performance

- Build optimisé avec code splitting automatique
- Assets compressés (gzip/brotli selon le serveur)
- Taille du bundle : ~500KB (gzipped)
- Temps de chargement initial : < 2s (connexion 4G)

## 📁 Structure

```
src/
├── components/ui/      # Composants réutilisables (Button, Card, Input...)
├── features/           # Modules (inputs, scenarios, sensitivity...)
├── lib/                # Logique métier (calculations, exports, utils)
├── store/              # State management (Context)
└── types/              # Types TypeScript
```

## 📝 Utilisation

1. **Paramètres** → Saisir revenus, dépenses, financement
2. **KPIs** → Consulter le dashboard en temps réel
3. **Scénarios** → Comparer différentes hypothèses
4. **Sensibilité** → Identifier les paramètres critiques
5. **Optimisation** → Trouver les meilleures combinaisons
6. **Export** → Sauvegarder et générer des rapports

## 📐 Formules clés

**Revenus** : `Tarif moyen × (365 jours × Taux d'occupation)`  
**Cashflow** : `Revenus - Dépenses - Service de la dette`  
**Cash-on-Cash** : `(Cashflow annuel / Investissement initial) × 100`  
**Cap Rate** : `(NOI / Prix d'achat) × 100`

## 📄 Licence

MIT — Développé pour l'analyse de chalets locatifs au Québec
