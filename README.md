# Webapp - Analyse de Rentabilité Chalet Locatif

Application web moderne pour analyser la rentabilité d'un chalet locatif avec gestion de scénarios, analyses de sensibilité, optimisation et export complet.

## Fonctionnalités

### 📊 Analyse financière complète
- Calcul automatique des KPIs : revenus, dépenses, cashflow, cash-on-cash, cap rate
- Traçabilité complète des calculs avec formules et sources
- Inspection détaillée de chaque métrique

### 🎯 Scénarios multiples
- Création et duplication de scénarios
- Système d'overrides intelligent (seules les différences vs base)
- Comparaison visuelle avec tableaux et graphiques

### 📈 Analyses de sensibilité
- **Analyse 1D (Tornado)** : impact relatif de N paramètres sur un objectif
- **Analyse 2D (Heatmap)** : carte de chaleur pour deux paramètres variables
- Export des résultats et création de scénarios depuis les points d'intérêt

### 🔍 Optimisation
- **Mode automatique** : grid search avec contraintes
- Variables configurables avec bornes min/max
- Contraintes flexibles (cashflow ≥ 0, occupation ≤ max, etc.)
- Top-K solutions triées par faisabilité et objectif

### 💾 Sauvegarde et export
- **Autosave local** : localStorage avec sauvegarde automatique
- **Fichiers projets** : save/load complet en JSON
- **Exports** : Excel (tableaux), PNG (graphiques), PDF (rapports)
- File System Access API avec fallback

### 📝 Sources et remarques
- Chaque input peut avoir une source et des remarques
- Traçabilité complète dans les exports
- Liens vers sources dans l'inspection des KPIs

## Stack technique

- **React 18** + **TypeScript 5.5**
- **Vite** (build ultra-rapide)
- **Tailwind CSS** (styling)
- **Recharts** (graphiques)
- **xlsx** (export Excel)
- **jsPDF + html2canvas** (export PDF/PNG)
- **Zustand** (state management optionnel)

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

## Build de production

```bash
npm run build
```

Les fichiers de production seront dans `dist/`.

## Structure du projet

```
src/
├── components/        # Composants UI réutilisables
│   ├── ui/           # Composants de base (Button, Input, Card, etc.)
│   └── KPIDashboard.tsx
├── features/         # Modules fonctionnels
│   ├── inputs/       # Formulaire d'entrée
│   ├── scenarios/    # Gestion des scénarios
│   ├── sensitivity/  # Analyses de sensibilité
│   └── optimization/ # Optimisation
├── lib/              # Logique métier
│   ├── calculations.ts  # Moteur de calcul financier
│   ├── sensitivity.ts   # Analyses de sensibilité
│   ├── optimizer.ts     # Optimisation
│   ├── exports.ts       # Exports (Excel, PDF, JSON)
│   └── utils.ts         # Utilitaires
├── store/            # State management
│   └── ProjectContext.tsx
├── types/            # Types TypeScript
│   └── index.ts
└── App.tsx           # Composant principal
```

## Utilisation

1. **Saisir les paramètres** : revenus, dépenses, financement, frais d'acquisition
2. **Consulter les KPIs** : dashboard en temps réel
3. **Créer des scénarios** : comparer différentes hypothèses
4. **Analyser la sensibilité** : identifier les paramètres les plus impactants
5. **Optimiser** : trouver les meilleures combinaisons
6. **Enregistrer et exporter** : sauvegarder le projet et générer des rapports

## Formules utilisées

### Revenus
```
Nuitées vendues = Jours par an × (Taux d'occupation / 100)
Revenus annuels = Tarif moyen par nuitée × Nuitées vendues
```

### Service de la dette
```
Paiement périodique = (Prêt × r × (1+r)^n) / ((1+r)^n - 1)
où r = taux périodique, n = nombre de paiements
```

### Rentabilité
```
Cashflow annuel = Revenus - Dépenses - Service de la dette
Cash-on-Cash (%) = (Cashflow annuel / Investissement initial) × 100
Cap Rate (%) = (NOI / Prix d'achat) × 100
où NOI = Revenus - Dépenses (sans dette)
```

## Licence

MIT

## Auteur

Développé pour l'analyse de rentabilité de chalets locatifs au Québec.
