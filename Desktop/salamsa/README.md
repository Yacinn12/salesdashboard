# 🐓 Salamsa Volaille — Plateforme de gestion

Application React complète avec 3 interfaces séparées selon le rôle.

---

## 🚀 Installation rapide

### 1. Prérequis
- **Node.js** installé sur votre PC (télécharger sur https://nodejs.org)
- **VS Code** ouvert sur ce dossier

### 2. Installer les dépendances
Ouvrez le terminal dans VS Code (`Ctrl + ù` ou `Terminal > Nouveau terminal`) :
```bash
npm install
```

### 3. Lancer le projet
```bash
npm start
```
→ L'application s'ouvre sur **http://localhost:3000**

---

## 🔑 Comptes de connexion

| Rôle         | Email                  | Mot de passe |
|--------------|------------------------|--------------|
| 👤 Client    | fatou@email.com        | client123    |
| 👤 Client 2  | moussa@email.com       | client123    |
| ⚙️ Admin     | admin@salamsa.sn       | admin2026    |
| 👑 SuperAdmin | super@salamsa.sn      | super2026    |

---

## 📁 Structure des fichiers

```
salamsa/
├── public/
│   └── index.html              ← Page HTML principale
├── src/
│   ├── index.js                ← Point d'entrée React
│   ├── App.jsx                 ← Routeur + gestion des rôles
│   ├── context/
│   │   └── AuthContext.jsx     ← État global (auth, commandes, users)
│   ├── data/
│   │   └── data.js             ← Produits, plans, utilisateurs demo
│   └── pages/
│       ├── LoginPage.jsx       ← Page de connexion (tous les rôles)
│       ├── client/
│       │   └── ClientApp.jsx   ← Interface CLIENT
│       ├── admin/
│       │   └── AdminApp.jsx    ← Interface ADMIN
│       └── superadmin/
│           └── SuperAdminApp.jsx ← Interface SUPER ADMIN
└── package.json
```

---

## 🎯 Fonctionnalités par rôle

### 👤 Client
- Accueil avec ses infos et abonnement actif
- Catalogue produits avec réductions automatiques selon abonnement
- Panier + commande avec adresse de livraison
- Historique de SES commandes uniquement

### ⚙️ Admin
- Dashboard avec statistiques globales
- Liste de TOUTES les commandes
- Filtrer par statut / rechercher par client
- Changer le statut d'une commande
- Voir détail complet de chaque commande

### 👑 Super Admin
- Dashboard complet (commandes + utilisateurs + abonnements)
- Gestion complète des commandes (modifier + supprimer)
- Gestion des utilisateurs (ajouter, modifier rôle, abonnement, supprimer)
- Vue abonnements avec revenus mensuels estimés
- Paramètres de la plateforme

---

## 🔧 Personnaliser

### Modifier les produits et prix
→ Éditer `src/data/data.js`, tableau `PRODUCTS`

### Modifier les plans d'abonnement
→ Éditer `src/data/data.js`, tableau `PLANS`

### Ajouter de vrais utilisateurs
→ Ajouter dans `src/data/data.js`, tableau `DEMO_USERS`

### Connecter une vraie base de données
En production, remplacez les fonctions `login()`, `addOrder()` etc. dans
`src/context/AuthContext.jsx` par des appels à votre API (Firebase, Supabase, etc.)

---

## 📞 Contact
Salamsa Volaille — 77 625 90 90 · @Salamsavolaille
