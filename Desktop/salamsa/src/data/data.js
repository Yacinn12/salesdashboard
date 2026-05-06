// ─── PRODUITS ─────────────────────────────────────────────────────────────
export const PRODUCTS = [
  { id: "p1", category: "Poulets entiers", name: "Poulet entier 1–1.2 kg",   price: 3000, unit: "pièce",         emoji: "🐔" },
  { id: "p2", category: "Poulets entiers", name: "Poulet entier 1.3–1.5 kg", price: 3500, unit: "pièce",         emoji: "🐔" },
  { id: "p3", category: "Poulets entiers", name: "Poulet entier 1.6–1.8 kg", price: 4000, unit: "pièce",         emoji: "🐔" },
  { id: "p4", category: "Découpés",        name: "Blancs de poulet",          price: 5500, unit: "1 kg",          emoji: "🍗" },
  { id: "p5", category: "Découpés",        name: "Cuisses de poulet",         price: 3500, unit: "1 kg / 3 pcs",  emoji: "🍗" },
  { id: "p6", category: "Découpés",        name: "Pilons de poulet",          price: 3500, unit: "1 kg / 5 pcs",  emoji: "🍖" },
  { id: "p7", category: "Découpés",        name: "Ailes de poulet",           price: 3500, unit: "1 kg / 15 pcs", emoji: "🍗" },
  { id: "p8", category: "Produits Dérivés",name: "Tablette 30 œufs",          price: 3300, unit: "tablette",      emoji: "🥚" },
];

// ─── STATUTS ──────────────────────────────────────────────────────────────
export const STATUS_COLORS = {
  "En attente":   "#e8a020",
  "Confirmée":    "#3a7bd5",
  "En livraison": "#9b59b6",
  "Livrée":       "#27ae60",
  "Annulée":      "#e74c3c",
};
export const STATUS_ICONS = {
  "En attente":   "⏳",
  "Confirmée":    "✅",
  "En livraison": "🚴",
  "Livrée":       "📦",
  "Annulée":      "❌",
};

// ─── COMMANDES INITIALES ──────────────────────────────────────────────────
export const SEED_ORDERS = [];

// ─── UTILISATEURS DEMO ────────────────────────────────────────────────────
export const DEMO_USERS = [
  { id: "admin1",     email: "admin@salamsa.sn",  password: "Admin@2026!", role: "admin",      name: "Admin Salamsa",  phone: "+221 77 625 90 90", address: "", abonnement: null },
  { id: "superadmin", email: "super@salamsa.sn",  password: "Super@2026!", role: "superadmin", name: "Patron Salamsa", phone: "+221 77 625 90 90", address: "", abonnement: null },
];

// ─── FOURNISSEURS ─────────────────────────────────────────────────────────
export const SEED_SUPPLIERS = [];

// ─── ACHATS ───────────────────────────────────────────────────────────────
export const SEED_PURCHASES = [];

// ─── STOCK ────────────────────────────────────────────────────────────────
export const SEED_STOCK = {
  p1: { productName: "Poulet entier 1–1.2 kg",   qty: 0, alert: 5,  avgPurchasePrice: 2300 },
  p2: { productName: "Poulet entier 1.3–1.5 kg", qty: 0, alert: 8,  avgPurchasePrice: 2800 },
  p3: { productName: "Poulet entier 1.6–1.8 kg", qty: 0, alert: 6,  avgPurchasePrice: 3200 },
  p4: { productName: "Blancs de poulet",          qty: 0, alert: 5,  avgPurchasePrice: 4200 },
  p5: { productName: "Cuisses de poulet",         qty: 0, alert: 8,  avgPurchasePrice: 2500 },
  p6: { productName: "Pilons de poulet",          qty: 0, alert: 8,  avgPurchasePrice: 2400 },
  p7: { productName: "Ailes de poulet",           qty: 0, alert: 10, avgPurchasePrice: 2200 },
  p8: { productName: "Tablette 30 œufs",          qty: 0, alert: 3,  avgPurchasePrice: 2500 },
};

// ─── ABONNEMENTS RÉCURRENTS ───────────────────────────────────────────────
export const SEED_RECURRING_SUBS = [];

// ─── HELPER FORMAT ────────────────────────────────────────────────────────
export const fmt = (n) => Number(n).toLocaleString("fr-FR") + " F";
