import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { PRODUCTS, STATUS_COLORS, STATUS_ICONS, fmt } from "../../data/data";
import { downloadCSV } from "../../utils/csv";
import InvoiceModal from "../../components/InvoiceModal";

const DAY_NAMES = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

function computeNextDelivery(sub) {
  const now = new Date();
  const d = new Date(now);
  if (sub.recurrence === "hebdomadaire") {
    const target = sub.deliveryDay;
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
  } else {
    const day = sub.deliveryDay;
    d.setDate(day);
    if (d <= now) d.setMonth(d.getMonth() + 1);
    if (sub.recurrence === "bimensuel") {
      const mid = new Date(now); mid.setDate(day);
      if (mid <= now) mid.setMonth(mid.getMonth() + 1);
      const end = new Date(now); end.setDate(day + 15 > 28 ? 28 : day + 15);
      if (end <= now) end.setMonth(end.getMonth() + 1);
      return mid < end ? mid : end;
    }
  }
  return d;
}

const C = {
  page:     { fontFamily: "'DM Sans', sans-serif", background: "#f4f6f8", minHeight: "100vh", color: "#1a1a1a" },
  nav:      { background: "#1e2d3a", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid #152330" },
  sidebar:  { width: 220, background: "#fff", minHeight: "calc(100vh - 64px)", padding: "20px 0", borderRight: "1px solid #e0e8f0", position: "fixed", top: 64, left: 0, bottom: 0 },
  main:     { marginLeft: 220, padding: "28px" },
  card:     (border = "#e0e8f0") => ({ background: "#fff", border: `1px solid ${border}`, borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }),
  sideItem: (a) => ({ display: "flex", alignItems: "center", gap: 10, padding: "11px 22px", cursor: "pointer", fontSize: 14, color: a ? "#1e2d3a" : "#666", background: a ? "#f0f4f8" : "transparent", borderLeft: `3px solid ${a ? "#2a7db5" : "transparent"}`, fontWeight: a ? 700 : 400, transition: "all .15s" }),
  btn:      (bg = "#1e2d3a") => ({ background: bg, color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", fontSize: 13 }),
  badge:    (c) => ({ background: c + "18", color: c, fontSize: 11, padding: "3px 10px", borderRadius: 10, fontWeight: 600, display: "inline-block" }),
  input:    { background: "#fff", border: "1.5px solid #e0e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1a1a1a", fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" },
  label:    { fontSize: 11, color: "#888", display: "block", marginBottom: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" },
};

const ROLE_COLORS = { client: "#3a7bd5", admin: "#e8a020", superadmin: "#e74c3c" };
const ROLE_ICONS  = { client: "👤", admin: "⚙️", superadmin: "👑" };

function BarChart({ data, height = 10 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d) => (
        <div key={d.label} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "#555" }}>{d.label}</span>
            <span style={{ fontWeight: 700, color: d.color || "#1e2d3a" }}>{d.isAmount ? fmt(d.value) : d.value}</span>
          </div>
          <div style={{ background: "#e8f0f8", borderRadius: 6, height }}>
            <div style={{ width: `${(d.value / max) * 100}%`, background: d.color || "#2a7db5", height, borderRadius: 6, transition: "width .5s ease", minWidth: d.value > 0 ? 4 : 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
}


function ColumnChart({ data, height = 150 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barH = height - 36;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, paddingTop: 8 }}>
      {data.map((d) => {
        const h = Math.max((d.value / max) * barH, d.value > 0 ? 4 : 0);
        return (
          <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ fontSize: 10, color: d.color || "#2a7db5", fontWeight: 700, marginBottom: 3, textAlign: "center", lineHeight: 1.2 }}>
              {d.value > 0 ? (d.isAmount ? fmt(d.value) : d.value) : ""}
            </div>
            <div style={{ width: "100%", height: h, background: d.color || "#2a7db5", borderRadius: "4px 4px 0 0", transition: "height .5s ease" }} />
            <div style={{ fontSize: 10, color: "#888", marginTop: 5, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", maxWidth: 56 }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>Aucune donnée</div>;
  const cx = size / 2, cy = size / 2, r = size * 0.38, ir = size * 0.22;
  let angle = -Math.PI / 2;
  const slices = data.filter((d) => d.value > 0).map((d) => {
    const a0 = angle;
    const sweep = (d.value / total) * 2 * Math.PI;
    angle += sweep;
    const a1 = angle;
    const large = sweep > Math.PI ? 1 : 0;
    const path = [
      `M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}`,
      `A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`,
      `L ${cx + ir * Math.cos(a1)} ${cy + ir * Math.sin(a1)}`,
      `A ${ir} ${ir} 0 ${large} 0 ${cx + ir * Math.cos(a0)} ${cy + ir * Math.sin(a0)}`,
      "Z",
    ].join(" ");
    return { ...d, path };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((s) => (
          <path key={s.label} d={s.path} fill={s.color} opacity={0.9}>
            <title>{s.label} : {s.value}</title>
          </path>
        ))}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize={17} fontWeight="bold" fill="#1e2d3a">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#aaa">total</text>
      </svg>
      <div style={{ flex: 1 }}>
        {data.filter((d) => d.value > 0).map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#555" }}>{d.label}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 12, color: d.color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminApp() {
  const {
    user, logout,
    orders, addOrder, updateOrderStatus, deleteOrder,
    users, addUser, updateUser, deleteUser,
    auditLogs, clearAudit,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    purchases, addPurchase, updatePurchaseStatus, deletePurchase,
    stock, updateStockItem,
    recurringSubs,
  } = useAuth();
  const [tab,           setTab]    = useState("dashboard");
  const [period,        setPeriod] = useState("7j");
  const [selectedOrder, setSelO]   = useState(null);
  const [selectedUser,  setSelU]   = useState(null);
  const [filterStatus,  setFS]     = useState("Toutes");
  const [filterRole,    setFR]     = useState("Tous");
  const [search,        setSrch]   = useState("");
  const [showNewUser,   setShowNU] = useState(false);
  const [newUser,       setNU]     = useState({ name: "", email: "", password: "", phone: "", address: "", role: "client", abonnement: null });
  const [newPw,         setNewPw]  = useState("");
  const [invoiceOrd,    setInvOrd]  = useState(null);
  const [tabAchats,     setTabAch]  = useState("achats");
  const [supForm,       setSupForm] = useState(null);
  const [pchForm,       setPchForm] = useState(null);
  const [isMobile,      setIsMob]   = useState(window.innerWidth <= 900);

  useEffect(() => {
    const fn = () => setIsMob(window.innerWidth <= 900);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  // Stats fixes (indépendantes de la période)
  const stats = {
    clients: users.filter((u) => u.role === "client").length,
    admins:  users.filter((u) => u.role === "admin").length,
  };

  // Filtrage par période
  const periodStart = (() => {
    const d = new Date();
    if (period === "7j")  { d.setDate(d.getDate() - 6);  return d.toISOString().split("T")[0]; }
    if (period === "30j") { d.setDate(d.getDate() - 29); return d.toISOString().split("T")[0]; }
    if (period === "90j") { d.setDate(d.getDate() - 89); return d.toISOString().split("T")[0]; }
    return null;
  })();
  const periodOrders = periodStart ? orders.filter((o) => o.date >= periodStart) : orders;

  const dashStats = {
    orders:    periodOrders.length,
    revenue:   periodOrders.filter((o) => o.status === "Livrée").reduce((s, o) => s + o.total, 0),
    attente:   periodOrders.filter((o) => o.status === "En attente").length,
    livraison: periodOrders.filter((o) => o.status === "En livraison").length,
    livrees:   periodOrders.filter((o) => o.status === "Livrée").length,
    today:     periodOrders.filter((o) => o.date === today).length,
  };

  // Graphique revenus adaptatif selon la période
  const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  const revenueChartData = (() => {
    if (period === "7j") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const date = d.toISOString().split("T")[0];
        return { label: date.slice(5).replace("-", "/"), value: periodOrders.filter((o) => o.date === date && o.status === "Livrée").reduce((s, o) => s + o.total, 0), color: "#27ae60", isAmount: true };
      });
    }
    if (period === "30j") {
      return Array.from({ length: 4 }, (_, i) => {
        const wEnd = new Date(); wEnd.setDate(wEnd.getDate() - (3 - i) * 7);
        const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6);
        return { label: `Sem ${i + 1}`, value: periodOrders.filter((o) => o.date >= wStart.toISOString().split("T")[0] && o.date <= wEnd.toISOString().split("T")[0] && o.status === "Livrée").reduce((s, o) => s + o.total, 0), color: "#27ae60", isAmount: true };
      });
    }
    const n = period === "90j" ? 3 : 6;
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (n - 1 - i));
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { label: MONTHS[d.getMonth()], value: (period === "tout" ? orders : periodOrders).filter((o) => o.date.startsWith(mStr) && o.status === "Livrée").reduce((s, o) => s + o.total, 0), color: "#27ae60", isAmount: true };
    });
  })();

  // Top produits filtrés par période
  const periodProdCounts = {};
  periodOrders.forEach((o) => o.items.forEach((it) => {
    periodProdCounts[it.name] = (periodProdCounts[it.name] || 0) + it.qty;
  }));
  const periodTopProducts = Object.entries(periodProdCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value]) => ({ label: name.length > 22 ? name.slice(0, 22) + "…" : name, value, color: "#9b59b6" }));

  const filteredOrders = orders.filter((o) => {
    const ms = filterStatus === "Toutes" || o.status === filterStatus;
    const mq = !search || o.client.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
    return ms && mq;
  });

  const filteredUsers = users.filter((u) => {
    const mr = filterRole === "Tous" || u.role === filterRole;
    const mq = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search);
    return mr && mq;
  });

  function changeStatus(id, s) {
    updateOrderStatus(id, s);
    if (selectedOrder?.id === id) setSelO((p) => ({ ...p, status: s }));
  }

  function handleAddUser() {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    addUser({ ...newUser, id: "user_" + Date.now() });
    setNU({ name: "", email: "", password: "", phone: "", address: "", role: "client", abonnement: null });
    setShowNU(false);
  }

  const NAV_ITEMS = [
    ["dashboard",    "📊", "Dashboard"],
    ["commandes",    "📋", "Commandes"],
    ["utilisateurs", "👥", "Utilisateurs"],
    ["fournisseurs", "🏭", "Fournisseurs"],
    ["achats",       "💳", "Achats & Stock"],
    ["calendrier",   "📅", "Calendrier"],
    ["audit",        "🔍", "Journal d'audit"],
    ["parametres",   "🔧", "Paramètres"],
  ];

  const AUDIT_COLORS = {
    "Connexion":                    "#27ae60",
    "Déconnexion":                  "#95a5a6",
    "Inscription":                  "#3a7bd5",
    "Commande créée":               "#9b59b6",
    "Statut modifié":               "#e8a020",
    "Commande supprimée":           "#e74c3c",
    "Commande annulée":             "#e74c3c",
    "Utilisateur créé":             "#27ae60",
    "Utilisateur modifié":          "#2980b9",
    "Utilisateur supprimé":         "#e74c3c",
    "Mot de passe modifié":         "#e8a020",
    "Fournisseur ajouté":           "#27ae60",
    "Fournisseur modifié":          "#2980b9",
    "Fournisseur supprimé":         "#e74c3c",
    "Achat enregistré":             "#9b59b6",
    "Statut achat modifié":         "#e8a020",
    "Achat supprimé":               "#e74c3c",
    "Stock modifié":                "#e8a020",
    "Abonnement récurrent créé":    "#27ae60",
    "Abonnement récurrent modifié": "#2980b9",
    "Abonnement récurrent supprimé":"#e74c3c",
  };

  return (
    <div style={C.page}>
      {/* NAV */}
      <nav style={C.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 26 }}>🐓</span>
          <div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 20, color: "#fff" }}>salamsa</span>
            <span style={{ color: "#e8a020", fontSize: 11, marginLeft: 8, background: "rgba(232,160,32,0.15)", border: "1px solid #e8a020", borderRadius: 10, padding: "2px 10px", fontWeight: 700 }}>SUPER ADMIN</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 13, color: "#7a9bb5" }}>👑 {user.name}</div>
          <button onClick={logout} style={{ ...C.btn("#2a3a4a"), border: "1px solid #3a4a5a" }}>Déconnexion</button>
        </div>
      </nav>

      {/* MOBILE NAV (visible ≤ 900px) */}
      <div className="sa-mobile-nav">
        <div className="sa-mobile-nav-inner">
          {NAV_ITEMS.map(([v, icon, label]) => (
            <button key={v} className={`sa-mobile-nav-btn${tab === v ? " active" : ""}`}
              onClick={() => { setTab(v); setSrch(""); }}>
              {icon} {label}
            </button>
          ))}
          <button className="sa-mobile-nav-btn" onClick={logout}
            style={{ background: "#fde8e8", color: "#e74c3c" }}>
            ⏏ Déco
          </button>
        </div>
      </div>

      <div style={{ display: "flex" }}>
        {/* SIDEBAR */}
        <aside className="sa-sidebar" style={C.sidebar}>
          <div style={{ padding: "0 22px 14px", borderBottom: "1px solid #e0e8f0", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Navigation</div>
          </div>
          {NAV_ITEMS.map(([v, icon, label]) => (
            <div key={v} style={C.sideItem(tab === v)} onClick={() => { setTab(v); setSrch(""); }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </aside>

        {/* MAIN */}
        <main className="sa-main" style={C.main}>

          {/* ── DASHBOARD ──────────────────────────────────────────────── */}
          {tab === "dashboard" && (
            <div>
              {/* Header + filtre période */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
                <div>
                  <h2 style={{ color: "#1e2d3a", margin: 0 }}>Vue d'ensemble</h2>
                  <p style={{ color: "#888", margin: "4px 0 0" }}>Plateforme Salamsa Volaille · {today}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#aaa", marginRight: 2 }}>Période :</span>
                  {[["7j","7 jours"], ["30j","30 jours"], ["90j","3 mois"], ["tout","Tout"]].map(([v, l]) => (
                    <button key={v} onClick={() => setPeriod(v)} style={{ background: period === v ? "#1e2d3a" : "#fff", color: period === v ? "#fff" : "#555", border: `1px solid ${period === v ? "#1e2d3a" : "#e0e8f0"}`, borderRadius: 20, padding: "7px 16px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: period === v ? 600 : 400, transition: "all .15s" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pills résumé */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ background: "#e8f8ee", border: "1px solid #c0e8cc", borderRadius: 10, padding: "6px 16px", fontSize: 13, color: "#27ae60", fontWeight: 600 }}>
                  💰 {fmt(dashStats.revenue)} de revenus
                </div>
                <div style={{ background: "#fff4e0", border: "1px solid #f0d888", borderRadius: 10, padding: "6px 16px", fontSize: 13, color: "#e8a020", fontWeight: 600 }}>
                  ⏳ {dashStats.attente} en attente
                </div>
                <div style={{ background: "#f0f4f8", border: "1px solid #dce4ec", borderRadius: 10, padding: "6px 16px", fontSize: 13, color: "#666" }}>
                  📦 {dashStats.orders} commande(s) sur la période
                </div>
              </div>

              {/* KPI — 4 colonnes × 2 lignes */}
              <div className="kpi-4" style={{ marginBottom: 20 }}>
                {[
                  ["👤", "Clients",             stats.clients,        "#3a7bd5", false],
                  ["💰", "Chiffre d'affaires",   dashStats.revenue,    "#27ae60", true ],
                  ["📅", "Commandes aujourd'hui",dashStats.today,      "#9b59b6", false],
                  ["📦", "Total commandes",       dashStats.orders,     "#3a7bd5", false],
                  ["⏳", "En attente",            dashStats.attente,    "#e8a020", false],
                  ["🚴", "En livraison",          dashStats.livraison,  "#2980b9", false],
                  ["✅", "Livrées",               dashStats.livrees,    "#27ae60", false],
                ].map(([icon, label, val, color, isAmt]) => (
                  <div key={label} style={{ ...C.card(color + "33"), borderLeft: `4px solid ${color}`, display: "flex", alignItems: "center", gap: 12, padding: "16px 18px" }}>
                    <span style={{ fontSize: 26 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: "bold", color }}>{isAmt ? fmt(val) : val}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenus (large) + Statuts */}
              <div className="chart-grid-2" style={{ marginBottom: 16 }}>
                <div style={C.card()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, color: "#1e2d3a" }}>
                      Revenus — {period === "7j" ? "7 derniers jours" : period === "30j" ? "4 dernières semaines" : period === "90j" ? "3 derniers mois" : "6 derniers mois"}
                    </h3>
                    <span style={{ background: "#e8f8ee", color: "#27ae60", fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 8 }}>
                      {fmt(revenueChartData.reduce((s, d) => s + d.value, 0))}
                    </span>
                  </div>
                  <ColumnChart data={revenueChartData} height={160} />
                </div>
                <div style={C.card()}>
                  <h3 style={{ margin: "0 0 16px", color: "#1e2d3a" }}>Statuts commandes</h3>
                  <DonutChart size={130} data={Object.entries(STATUS_COLORS).map(([s, color]) => ({
                    label: STATUS_ICONS[s] + " " + s,
                    value: periodOrders.filter((o) => o.status === s).length,
                    color,
                  }))} />
                </div>
              </div>

              {/* 2 colonnes */}
              <div className="chart-grid-2" style={{ marginBottom: 16 }}>
                <div style={C.card()}>
                  <h3 style={{ margin: "0 0 14px", color: "#1e2d3a" }}>🏆 Top produits commandés</h3>
                  {periodTopProducts.length
                    ? <BarChart data={periodTopProducts} />
                    : <p style={{ color: "#aaa", fontSize: 13 }}>Aucune commande sur la période</p>}
                </div>
                <div style={C.card()}>
                  <h3 style={{ margin: "0 0 14px", color: "#1e2d3a" }}>👥 Répartition utilisateurs</h3>
                  <DonutChart size={130} data={["client", "admin", "superadmin"].map((r) => ({
                    label: ROLE_ICONS[r] + " " + r.charAt(0).toUpperCase() + r.slice(1),
                    value: users.filter((u) => u.role === r).length,
                    color: ROLE_COLORS[r],
                  }))} />
                </div>
              </div>

              {/* Dernières commandes de la période */}
              <div style={C.card()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, color: "#1e2d3a" }}>
                    Dernières commandes
                    {periodOrders.length < orders.length && <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>({periodOrders.length} sur la période)</span>}
                  </h3>
                  <button style={C.btn("#2a7db5")} onClick={() => setTab("commandes")}>Voir toutes →</button>
                </div>
                {periodOrders.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Aucune commande sur cette période</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f4f6f8" }}>
                        {["ID", "Client", "Date", "Adresse", "Statut", "Total"].map((h) => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periodOrders.slice(0, 6).map((o) => (
                        <tr key={o.id} style={{ borderTop: "1px solid #f0f4f8", cursor: "pointer" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          onClick={() => { setTab("commandes"); setSelO(o); }}>
                          <td style={{ padding: "10px 14px", color: "#bbb", fontSize: 12, fontFamily: "monospace" }}>{o.id}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{o.client}</td>
                          <td style={{ padding: "10px 14px", color: "#888" }}>{o.date}</td>
                          <td style={{ padding: "10px 14px", color: "#888", fontSize: 12 }}>📍 {o.address}</td>
                          <td style={{ padding: "10px 14px" }}><span style={C.badge(STATUS_COLORS[o.status])}>{STATUS_ICONS[o.status]} {o.status}</span></td>
                          <td style={{ padding: "10px 14px", fontWeight: "bold", color: "#27ae60" }}>{fmt(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── COMMANDES ─────────────────────────────────────────────── */}
          {tab === "commandes" && (
            <div className={`split-panel ${selectedOrder ? "with-detail" : "no-detail"}`}>
              <div>
                <h2 style={{ color: "#1e2d3a", marginBottom: 20 }}>Toutes les commandes</h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <input placeholder="🔍 Client / ID..." value={search} onChange={(e) => setSrch(e.target.value)}
                    style={{ ...C.input, width: 200 }} />
                  {["Toutes", ...Object.keys(STATUS_COLORS)].map((s) => (
                    <button key={s} onClick={() => setFS(s)} style={{ background: filterStatus === s ? (STATUS_COLORS[s] || "#1e2d3a") : "#fff", color: filterStatus === s ? "#fff" : "#555", border: "1px solid #e0e8f0", borderRadius: 20, padding: "7px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                      {s !== "Toutes" ? STATUS_ICONS[s] + " " : ""}{s}
                    </button>
                  ))}
                  <button onClick={() => downloadCSV(filteredOrders.map((o) => ({ ID: o.id, Client: o.client, Date: o.date, Statut: o.status, Adresse: o.address, Téléphone: o.phone, Total: o.total })), `commandes_${today}.csv`)}
                    style={{ ...C.btn("#27ae60"), marginLeft: "auto", borderRadius: 20, padding: "7px 16px" }}>
                    ↓ Export CSV
                  </button>
                </div>
                {filteredOrders.map((o) => (
                  <div key={o.id} onClick={() => setSelO(selectedOrder?.id === o.id ? null : o)}
                    style={{ ...C.card(selectedOrder?.id === o.id ? "#2a7db5" : "#e0e8f0"), marginBottom: 8, cursor: "pointer", transition: "all .15s", borderWidth: selectedOrder?.id === o.id ? 2 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 18 }}>{STATUS_ICONS[o.status]}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: "#1a1a1a" }}>{o.client}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>{o.id} · {o.date} · {o.address}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", gap: 10, alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: "bold", color: "#27ae60", fontSize: 16 }}>{fmt(o.total)}</div>
                          <span style={C.badge(STATUS_COLORS[o.status])}>{o.status}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Supprimer cette commande ?")) { deleteOrder(o.id); setSelO(null); } }}
                          style={{ background: "#fde8e8", border: "1px solid #f5c6c6", color: "#e74c3c", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedOrder && (
                <div className="detail-panel" style={{ ...C.card(), position: isMobile ? "relative" : "sticky", top: 76, maxHeight: isMobile ? "none" : "85vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, color: "#1e2d3a" }}>{selectedOrder.id}</h3>
                    <button onClick={() => setSelO(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#aaa" }}>✕</button>
                  </div>
                  <Section label="Client"><strong>{selectedOrder.client}</strong><br /><span style={{ color: "#666", fontSize: 13 }}>📞 {selectedOrder.phone}</span></Section>
                  <Section label="Adresse"><span style={{ fontSize: 13 }}>📍 {selectedOrder.address}</span></Section>
                  <Section label="Articles">
                    {selectedOrder.items.map((it, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid #f0f4f8" }}>
                        <span>{it.name} ×{it.qty}</span>
                        <span style={{ fontWeight: 600, color: "#27ae60" }}>{fmt(it.price * it.qty)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 8, fontSize: 15 }}>
                      <span>Total</span><span style={{ color: "#27ae60" }}>{fmt(selectedOrder.total)}</span>
                    </div>
                  </Section>
                  <Section label="Statut">
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.keys(STATUS_COLORS).map((s) => (
                        <button key={s} onClick={() => changeStatus(selectedOrder.id, s)}
                          style={{ background: selectedOrder.status === s ? STATUS_COLORS[s] : "#f4f6f8", color: selectedOrder.status === s ? "#fff" : "#444", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, textAlign: "left", fontWeight: selectedOrder.status === s ? 700 : 400 }}>
                          {STATUS_ICONS[s]} {s}
                        </button>
                      ))}
                    </div>
                  </Section>
                  <button onClick={() => setInvOrd(selectedOrder)}
                    style={{ width: "100%", padding: "11px", background: "#1e3a12", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                    🧾 Voir la facture
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── UTILISATEURS ──────────────────────────────────────────── */}
          {tab === "utilisateurs" && (
            <div className={`split-panel ${selectedUser ? "with-detail" : "no-detail"}`}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ color: "#1e2d3a", margin: 0 }}>Gestion des utilisateurs</h2>
                  <button style={C.btn("#27ae60")} onClick={() => setShowNU(true)}>+ Ajouter</button>
                </div>

                {showNewUser && (
                  <div style={{ ...C.card("#27ae60"), marginBottom: 16 }}>
                    <h3 style={{ color: "#27ae60", margin: "0 0 16px" }}>Nouvel utilisateur</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[["name","Nom complet"],["email","Email"],["password","Mot de passe"],["address","Adresse"]].map(([f, l]) => (
                        <div key={f}><label style={C.label}>{l}</label><input style={C.input} value={newUser[f]} onChange={(e) => setNU({ ...newUser, [f]: e.target.value })} /></div>
                      ))}
                      <div>
                        <label style={C.label}>Téléphone</label>
                        <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e0e8f0", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
                          <span style={{ padding: "10px 8px 10px 12px", fontSize: 12, color: "#555", fontWeight: 600, whiteSpace: "nowrap", borderRight: "1px solid #e0e8f0", background: "#f4f6f8" }}>+221</span>
                          <input style={{ ...C.input, border: "none", borderRadius: 0, flex: 1 }} placeholder="77 000 00 00"
                            value={(newUser.phone || "").replace(/^\+221\s?/, "")}
                            onChange={(e) => setNU({ ...newUser, phone: e.target.value ? "+221 " + e.target.value.replace(/^\+221\s?/, "") : "" })} />
                        </div>
                      </div>
                      <div>
                        <label style={C.label}>Rôle</label>
                        <select style={C.input} value={newUser.role} onChange={(e) => setNU({ ...newUser, role: e.target.value })}>
                          <option value="client">Client</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                      <button style={C.btn("#27ae60")} onClick={handleAddUser}>Créer</button>
                      <button style={{ ...C.btn("#6c757d") }} onClick={() => setShowNU(false)}>Annuler</button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <input placeholder="🔍 Nom / Email..." value={search} onChange={(e) => setSrch(e.target.value)} style={{ ...C.input, width: 200 }} />
                  {["Tous","client","admin","superadmin"].map((r) => (
                    <button key={r} onClick={() => setFR(r)} style={{ background: filterRole === r ? (ROLE_COLORS[r] || "#1e2d3a") : "#fff", color: filterRole === r ? "#fff" : "#555", border: "1px solid #e0e8f0", borderRadius: 20, padding: "7px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                      {r !== "Tous" ? ROLE_ICONS[r] + " " : ""}{r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>

                {filteredUsers.map((u) => (
                  <div key={u.id} onClick={() => setSelU(selectedUser?.id === u.id ? null : u)}
                    style={{ ...C.card(selectedUser?.id === u.id ? "#2a7db5" : "#e0e8f0"), marginBottom: 8, cursor: "pointer", transition: "all .15s", borderWidth: selectedUser?.id === u.id ? 2 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 26 }}>{ROLE_ICONS[u.role]}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: "#1a1a1a" }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>{u.email} · {u.phone || "—"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={C.badge(ROLE_COLORS[u.role])}>{u.role}</span>
                        <button onClick={(e) => { e.stopPropagation(); const isSA = u.role === "superadmin"; const saCount = users.filter(x => x.role === "superadmin").length; if (isSA && saCount <= 1) { alert("Impossible de supprimer le dernier super admin."); return; } if (window.confirm(`Supprimer ${u.name} ?`)) { deleteUser(u.id); setSelU(null); } }}
                          style={{ background: "#fde8e8", border: "1px solid #f5c6c6", color: "#e74c3c", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedUser && (
                <div className="detail-panel" style={{ ...C.card(), position: isMobile ? "relative" : "sticky", top: 76, maxHeight: isMobile ? "none" : "85vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, color: "#1e2d3a" }}>Modifier utilisateur</h3>
                    <button onClick={() => setSelU(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#aaa" }}>✕</button>
                  </div>
                  {[["name","Nom complet"],["email","Email"],["address","Adresse"]].map(([f, l]) => (
                    <div key={f} style={{ marginBottom: 12 }}>
                      <label style={C.label}>{l}</label>
                      <input style={C.input} value={selectedUser[f] || ""} onChange={(e) => { const u = { ...selectedUser, [f]: e.target.value }; setSelU(u); updateUser(u.id, { [f]: e.target.value }); }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 12 }}>
                    <label style={C.label}>Téléphone</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e0e8f0", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
                      <span style={{ padding: "10px 8px 10px 12px", fontSize: 12, color: "#555", fontWeight: 600, whiteSpace: "nowrap", borderRight: "1px solid #e0e8f0", background: "#f4f6f8" }}>+221</span>
                      <input style={{ ...C.input, border: "none", borderRadius: 0, flex: 1 }} placeholder="77 000 00 00"
                        value={(selectedUser.phone || "").replace(/^\+221\s?/, "")}
                        onChange={(e) => {
                          const val = e.target.value ? "+221 " + e.target.value.replace(/^\+221\s?/, "") : "";
                          const u = { ...selectedUser, phone: val }; setSelU(u); updateUser(u.id, { phone: val });
                        }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={C.label}>Rôle</label>
                    <select style={C.input} value={selectedUser.role} onChange={(e) => { const u = { ...selectedUser, role: e.target.value }; setSelU(u); updateUser(u.id, { role: e.target.value }); }}>
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                  <Section label="Changer le mot de passe">
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="password" placeholder="Nouveau mot de passe" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                        style={{ ...C.input, flex: 1 }} />
                      <button style={C.btn("#e8a020")} onClick={() => { if (newPw.length < 6) return; updateUser(selectedUser.id, { password: newPw }); setNewPw(""); }}>OK</button>
                    </div>
                    {newPw.length > 0 && newPw.length < 6 && <p style={{ color: "#e74c3c", fontSize: 11, margin: "4px 0 0" }}>Minimum 6 caractères</p>}
                  </Section>

                  <Section label="Commandes du client">
                    {orders.filter((o) => o.clientId === selectedUser.id).length === 0 ? (
                      <p style={{ color: "#aaa", fontSize: 13 }}>Aucune commande</p>
                    ) : orders.filter((o) => o.clientId === selectedUser.id).map((o) => (
                      <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid #f0f4f8", color: "#555" }}>
                        <span>{STATUS_ICONS[o.status]} {o.id} · {o.date}</span>
                        <span style={{ color: "#27ae60", fontWeight: 600 }}>{fmt(o.total)}</span>
                      </div>
                    ))}
                  </Section>
                </div>
              )}
            </div>
          )}

          {/* ── FOURNISSEURS ──────────────────────────────────────────── */}
          {tab === "fournisseurs" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ color: "#1e2d3a", margin: 0 }}>Base fournisseurs</h2>
                <button style={C.btn("#27ae60")} onClick={() => setSupForm({ name: "", contact: "", phone: "", address: "", products: [], notes: "" })}>
                  + Ajouter
                </button>
              </div>

              {supForm !== null && (
                <div style={{ ...C.card("#27ae60"), marginBottom: 20 }}>
                  <h3 style={{ color: "#27ae60", margin: "0 0 16px" }}>{supForm.id ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    {[["name","Nom"], ["contact","Contact"], ["address","Ville / Adresse"]].map(([f, l]) => (
                      <div key={f}>
                        <label style={C.label}>{l}</label>
                        <input style={C.input} value={supForm[f] || ""} onChange={(e) => setSupForm((p) => ({ ...p, [f]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label style={C.label}>Téléphone</label>
                      <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e0e8f0", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
                        <span style={{ padding: "10px 8px 10px 12px", fontSize: 12, color: "#555", fontWeight: 600, whiteSpace: "nowrap", borderRight: "1px solid #e0e8f0", background: "#f4f6f8" }}>+221</span>
                        <input style={{ ...C.input, border: "none", borderRadius: 0, flex: 1 }}
                          placeholder="77 000 00 00"
                          value={(supForm.phone || "").replace(/^\+221\s?/, "")}
                          onChange={(e) => setSupForm((p) => ({ ...p, phone: e.target.value ? "+221 " + e.target.value.replace(/^\+221\s?/, "") : "" }))} />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={C.label}>Notes</label>
                    <input style={C.input} value={supForm.notes || ""} onChange={(e) => setSupForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Jours de livraison, conditions..." />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={C.btn("#27ae60")} onClick={() => {
                      if (!supForm.name) return;
                      if (supForm.id) updateSupplier(supForm.id, supForm);
                      else addSupplier(supForm);
                      setSupForm(null);
                    }}>{supForm.id ? "Enregistrer" : "Créer"}</button>
                    <button style={C.btn("#6c757d")} onClick={() => setSupForm(null)}>Annuler</button>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                {suppliers.map((s) => (
                  <div key={s.id} style={C.card()}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1e2d3a" }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>📍 {s.address}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setSupForm({ ...s })} style={{ background: "#f0f4f8", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "#555" }}>✏️</button>
                        <button onClick={() => { if (window.confirm(`Supprimer ${s.name} ?`)) deleteSupplier(s.id); }}
                          style={{ background: "#fde8e8", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "#e74c3c" }}>🗑</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
                      <span>👤 {s.contact}</span> &nbsp;·&nbsp; <span>📞 {s.phone}</span>
                    </div>
                    {s.products?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                        {s.products.map((p) => (
                          <span key={p} style={{ background: "#f0f4f8", borderRadius: 8, padding: "3px 9px", fontSize: 11, color: "#555" }}>{p}</span>
                        ))}
                      </div>
                    )}
                    {s.notes && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>📝 {s.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ACHATS & STOCK ────────────────────────────────────────── */}
          {tab === "achats" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ color: "#1e2d3a", margin: 0 }}>Achats & Stock</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["achats","💳 Achats"],["stock","📦 Stock"]].map(([v, l]) => (
                    <button key={v} onClick={() => setTabAch(v)} style={{ background: tabAchats === v ? "#1e2d3a" : "#fff", color: tabAchats === v ? "#fff" : "#555", border: "1px solid #e0e8f0", borderRadius: 20, padding: "8px 18px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: tabAchats === v ? 600 : 400 }}>{l}</button>
                  ))}
                </div>
              </div>

              {/* SUB-TAB ACHATS */}
              {tabAchats === "achats" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <button style={C.btn("#27ae60")} onClick={() => setPchForm({
                      supplierId: "", supplierName: "", date: new Date().toISOString().slice(0,10),
                      items: [{ productName: "", qty: 1, unitPrice: 0, total: 0 }],
                      total: 0, status: "reçu", notes: "",
                    })}>+ Nouvel achat</button>
                  </div>

                  {pchForm && (
                    <div style={{ ...C.card("#27ae60"), marginBottom: 20 }}>
                      <h3 style={{ color: "#27ae60", margin: "0 0 16px" }}>Enregistrer un achat</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                        <div>
                          <label style={C.label}>Fournisseur</label>
                          <select style={C.input} value={pchForm.supplierId}
                            onChange={(e) => {
                              const sup = suppliers.find((s) => s.id === e.target.value);
                              setPchForm((p) => ({ ...p, supplierId: e.target.value, supplierName: sup?.name || "" }));
                            }}>
                            <option value="">-- Choisir --</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={C.label}>Date</label>
                          <input type="date" style={C.input} value={pchForm.date} onChange={(e) => setPchForm((p) => ({ ...p, date: e.target.value }))} />
                        </div>
                        <div>
                          <label style={C.label}>Statut</label>
                          <select style={C.input} value={pchForm.status} onChange={(e) => setPchForm((p) => ({ ...p, status: e.target.value }))}>
                            <option value="commandé">Commandé</option>
                            <option value="reçu">Reçu</option>
                          </select>
                        </div>
                      </div>

                      <label style={C.label}>Articles</label>
                      {pchForm.items.map((item, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                          <select style={C.input} value={item.productName}
                            onChange={(e) => setPchForm((f) => {
                              const items = [...f.items];
                              items[i] = { ...items[i], productName: e.target.value, total: items[i].qty * items[i].unitPrice };
                              return { ...f, items };
                            })}>
                            <option value="">-- Produit --</option>
                            {PRODUCTS.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                          <input type="number" min="1" placeholder="Qté" style={C.input} value={item.qty}
                            onChange={(e) => setPchForm((f) => {
                              const items = [...f.items];
                              const qty = Number(e.target.value);
                              items[i] = { ...items[i], qty, total: qty * items[i].unitPrice };
                              const total = items.reduce((s, x) => s + x.total, 0);
                              return { ...f, items, total };
                            })} />
                          <input type="number" min="0" placeholder="Prix unit." style={C.input} value={item.unitPrice}
                            onChange={(e) => setPchForm((f) => {
                              const items = [...f.items];
                              const unitPrice = Number(e.target.value);
                              items[i] = { ...items[i], unitPrice, total: items[i].qty * unitPrice };
                              const total = items.reduce((s, x) => s + x.total, 0);
                              return { ...f, items, total };
                            })} />
                          {pchForm.items.length > 1 && (
                            <button onClick={() => setPchForm((f) => {
                              const items = f.items.filter((_, j) => j !== i);
                              return { ...f, items, total: items.reduce((s, x) => s + x.total, 0) };
                            })} style={{ background: "#fde8e8", border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer", color: "#e74c3c" }}>✕</button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setPchForm((f) => ({ ...f, items: [...f.items, { productName: "", qty: 1, unitPrice: 0, total: 0 }] }))}
                        style={{ fontSize: 12, color: "#27ae60", background: "none", border: "1px dashed #27ae60", borderRadius: 8, padding: "6px 14px", cursor: "pointer", marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
                        + Ajouter un article
                      </button>

                      <div style={{ marginBottom: 12 }}>
                        <label style={C.label}>Notes</label>
                        <input style={C.input} value={pchForm.notes} onChange={(e) => setPchForm((p) => ({ ...p, notes: e.target.value }))} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 700, color: "#27ae60", fontSize: 16 }}>Total : {fmt(pchForm.total)}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={C.btn("#27ae60")} onClick={() => {
                            if (!pchForm.supplierName || !pchForm.items[0].productName) return;
                            addPurchase(pchForm);
                            setPchForm(null);
                          }}>Enregistrer</button>
                          <button style={C.btn("#6c757d")} onClick={() => setPchForm(null)}>Annuler</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {purchases.map((p) => (
                    <div key={p.id} style={{ ...C.card(), marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e2d3a" }}>{p.supplierName}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>{p.id} · {p.date}</div>
                          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                            {p.items.map((it, i) => (
                              <span key={i} style={{ background: "#f0f4f8", borderRadius: 8, padding: "3px 10px", fontSize: 12 }}>
                                {it.productName} ×{it.qty} @ {fmt(it.unitPrice)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                          <div style={{ fontWeight: "bold", fontSize: 15, color: "#27ae60" }}>{fmt(p.total)}</div>
                          <select value={p.status} onChange={(e) => updatePurchaseStatus(p.id, e.target.value)}
                            style={{ ...C.input, width: "auto", padding: "5px 10px", fontSize: 12 }}>
                            <option value="commandé">Commandé</option>
                            <option value="reçu">Reçu</option>
                          </select>
                          <button onClick={() => { if (window.confirm("Supprimer cet achat ?")) deletePurchase(p.id); }}
                            style={{ background: "#fde8e8", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "#e74c3c" }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SUB-TAB STOCK */}
              {tabAchats === "stock" && (
                <div style={C.card()}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f4f6f8" }}>
                        {["Produit","Stock","Seuil alerte","Prix achat moy.","Prix vente","Marge","Ajustement"].map((h) => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PRODUCTS.map((prod) => {
                        const s = stock[prod.id];
                        if (!s) return null;
                        const margin = prod.price > 0 ? Math.round(((prod.price - s.avgPurchasePrice) / prod.price) * 100) : 0;
                        const low = s.qty <= s.alert;
                        return (
                          <tr key={prod.id} style={{ borderTop: "1px solid #f0f4f8", background: low ? "#fff8f0" : "transparent" }}>
                            <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                              {prod.emoji} {prod.name}
                              {low && <span style={{ marginLeft: 8, background: "#ffe4c4", color: "#e8a020", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>⚠️ Bas</span>}
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <input type="number" min="0" value={s.qty}
                                onChange={(e) => updateStockItem(prod.id, { qty: Math.max(0, Number(e.target.value)) })}
                                style={{ ...C.input, width: 70, padding: "6px 10px", textAlign: "center" }} />
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <input type="number" min="0" value={s.alert}
                                onChange={(e) => updateStockItem(prod.id, { alert: Math.max(0, Number(e.target.value)) })}
                                style={{ ...C.input, width: 70, padding: "6px 10px", textAlign: "center" }} />
                            </td>
                            <td style={{ padding: "12px 14px", color: "#555" }}>{fmt(s.avgPurchasePrice)}</td>
                            <td style={{ padding: "12px 14px", fontWeight: 600 }}>{fmt(prod.price)}</td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ background: margin >= 20 ? "#e8f7e8" : margin >= 0 ? "#fff8e0" : "#fde8e8", color: margin >= 20 ? "#27ae60" : margin >= 0 ? "#e8a020" : "#e74c3c", borderRadius: 8, padding: "3px 10px", fontWeight: 700, fontSize: 13 }}>
                                {margin}%
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", fontSize: 12, color: "#888" }}>auto via achats/livraisons</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CALENDRIER ABONNEMENTS ────────────────────────────────── */}
          {tab === "calendrier" && (
            <div>
              <h2 style={{ color: "#1e2d3a", marginBottom: 6 }}>Calendrier des livraisons récurrentes</h2>
              <p style={{ color: "#888", marginBottom: 24 }}>{recurringSubs.filter((s) => s.active).length} abonnement(s) actif(s)</p>

              {recurringSubs.length === 0 ? (
                <div style={{ ...C.card(), textAlign: "center", padding: "48px 0", color: "#aaa" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                  Aucun abonnement récurrent configuré
                </div>
              ) : (
                [...recurringSubs]
                  .sort((a, b) => computeNextDelivery(a) - computeNextDelivery(b))
                  .map((sub) => {
                    const nextDate = computeNextDelivery(sub);
                    const daysLeft = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
                    const soon = daysLeft <= 3;
                    const subTotal = sub.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
                    const waText = encodeURIComponent(
                      `Bonjour ${sub.clientName} 👋\n\nRappel : votre livraison récurrente est prévue le ${nextDate.toLocaleDateString("fr-FR")}.\n\n` +
                      sub.items.map((it) => `• ${it.productName} × ${it.qty}`).join("\n") +
                      `\n\nTotal estimé : ${fmt(subTotal)}\n\nMerci — salamsa.sn`
                    );
                    const phone = (sub.clientPhone || "").replace(/\s/g, "").replace(/^0/, "221");
                    return (
                      <div key={sub.id} style={{ ...C.card(soon ? "#e8a020" : "#e0e8f0"), marginBottom: 12, borderWidth: soon ? 2 : 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: "#1e2d3a" }}>{sub.clientName}</span>
                              <span style={{ background: sub.active ? "#e8f7e8" : "#f5f5f5", color: sub.active ? "#27ae60" : "#aaa", borderRadius: 10, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                                {sub.active ? "Actif" : "Inactif"}
                              </span>
                              {soon && <span style={{ background: "#fff3cd", color: "#e8a020", borderRadius: 10, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>⚡ Dans {daysLeft}j</span>}
                            </div>
                            <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>
                              📅 Prochaine livraison : <strong>{nextDate.toLocaleDateString("fr-FR")}</strong>
                              &nbsp;·&nbsp;
                              {sub.recurrence === "mensuel" && `Mensuel le ${sub.deliveryDay}`}
                              {sub.recurrence === "hebdomadaire" && `Hebdo · ${DAY_NAMES[sub.deliveryDay]}`}
                              {sub.recurrence === "bimensuel" && `Bimensuel · jour ${sub.deliveryDay}`}
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {sub.items.map((it, i) => (
                                <span key={i} style={{ background: "#f0f4f8", borderRadius: 8, padding: "3px 10px", fontSize: 12 }}>
                                  🐔 {it.productName} × {it.qty}
                                </span>
                              ))}
                            </div>
                            {sub.notes && <div style={{ marginTop: 8, fontSize: 12, color: "#888", fontStyle: "italic" }}>📝 {sub.notes}</div>}
                            {sub.clientAddress && <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>📍 {sub.clientAddress}</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                            <div style={{ fontWeight: 700, color: "#27ae60", fontSize: 15 }}>{fmt(subTotal)}</div>
                            {phone && (
                              <a href={`https://wa.me/${phone}?text=${waText}`} target="_blank" rel="noreferrer"
                                style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 9, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
                                📲 Rappel WhatsApp
                              </a>
                            )}
                            <button onClick={() => {
                              const items = sub.items.map((it) => ({ name: it.productName, qty: it.qty, price: it.unitPrice }));
                              const newOrder = {
                                id: `CMD-${Date.now()}`, clientId: sub.clientId, client: sub.clientName,
                                phone: sub.clientPhone, address: sub.clientAddress,
                                items, total: subTotal + 1500, status: "En attente",
                                date: new Date().toISOString().slice(0,10), abonnement: "Récurrent",
                              };
                              addOrder(newOrder);
                              alert(`Commande ${newOrder.id} créée pour ${sub.clientName}`);
                            }}
                              style={{ background: "#1e2d3a", color: "#fff", border: "none", borderRadius: 9, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                              ➕ Générer commande
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* ── JOURNAL D'AUDIT ───────────────────────────────────────── */}
          {tab === "audit" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h2 style={{ color: "#1e2d3a", margin: 0 }}>Journal d'audit</h2>
                  <p style={{ color: "#888", margin: "4px 0 0" }}>{auditLogs.length} événement(s) enregistré(s)</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => downloadCSV(
                    auditLogs.map((l) => ({
                      Date:       new Date(l.date).toLocaleString("fr-FR"),
                      Utilisateur: l.userName,
                      Rôle:       l.userRole,
                      Action:     l.action,
                      Détails:    Object.entries(l.details).map(([k, v]) => `${k}: ${v}`).join(" | "),
                    })), `audit_${today}.csv`)}
                    style={C.btn("#2a7db5")}>
                    ↓ Export CSV
                  </button>
                  <button onClick={() => { if (window.confirm("Effacer tout le journal ?")) clearAudit(); }}
                    style={{ ...C.btn("#e74c3c") }}>
                    🗑 Effacer
                  </button>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <div style={{ ...C.card(), textAlign: "center", padding: "48px 0", color: "#aaa" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                  Aucune activité enregistrée
                </div>
              ) : (
                <div style={C.card()}>
                  {auditLogs.map((log, i) => {
                    const color = AUDIT_COLORS[log.action] || "#888";
                    const det   = Object.entries(log.details);
                    return (
                      <div key={log.id} style={{ display: "flex", gap: 14, padding: "13px 0", borderBottom: i < auditLogs.length - 1 ? "1px solid #f0f4f8" : "none", alignItems: "flex-start" }}>
                        {/* Icône colorée */}
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: color + "18", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                          {log.action === "Connexion" ? "🔑"
                            : log.action === "Déconnexion" ? "🚪"
                            : log.action === "Inscription" ? "👤"
                            : log.action.includes("supprimé") || log.action.includes("annulée") ? "🗑"
                            : log.action.includes("créé") || log.action.includes("créée") ? "✨"
                            : log.action.includes("modifié") ? "✏️"
                            : "📋"}
                        </div>

                        {/* Contenu */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{log.userName}</span>
                            <span style={C.badge(AUDIT_COLORS[log.userRole] || "#888")}>{log.userRole}</span>
                            <span style={{ color: "#888", fontSize: 13 }}>→</span>
                            <span style={{ fontWeight: 600, color }}>{log.action}</span>
                          </div>
                          {det.length > 0 && (
                            <div style={{ fontSize: 12, color: "#888", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                              {det.map(([k, v]) => (
                                <span key={k}><span style={{ color: "#aaa" }}>{k} :</span> {String(v)}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div style={{ fontSize: 11, color: "#bbb", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {new Date(log.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PARAMÈTRES ────────────────────────────────────────────── */}
          {tab === "parametres" && (
            <div style={{ maxWidth: 600 }}>
              <h2 style={{ color: "#1e2d3a", marginBottom: 24 }}>Paramètres de la plateforme</h2>
              <div style={{ ...C.card(), marginBottom: 16 }}>
                <h3 style={{ color: "#e8a020", margin: "0 0 16px" }}>Informations Salamsa</h3>
                {[["Nom de l'entreprise","Salamsa Volaille"],["Téléphone","77 625 90 90"],["Frais de livraison","1 500 F"],["Horaires","Lun–Sam, 7h–19h"]].map(([l, v]) => (
                  <div key={l} style={{ marginBottom: 12 }}>
                    <label style={C.label}>{l}</label>
                    <input style={C.input} defaultValue={v} />
                  </div>
                ))}
                <button style={C.btn("#27ae60")}>Enregistrer</button>
              </div>
              <div style={C.card()}>
                <h3 style={{ color: "#e8a020", margin: "0 0 12px" }}>Comptes de démonstration</h3>
                <p style={{ color: "#888", fontSize: 13, margin: "0 0 12px" }}>Ces identifiants sont dans <code style={{ color: "#e8a020" }}>src/data/data.js</code></p>
                {[["⚙️ Admin","admin@salamsa.sn","Admin@2026!"],["👑 Super Admin","super@salamsa.sn","Super@2026!"]].map(([r,e,p]) => (
                  <div key={e} style={{ fontSize: 12, padding: "7px 0", borderBottom: "1px solid #f0f4f8", color: "#555", display: "flex", justifyContent: "space-between" }}>
                    <span>{r}</span><span style={{ color: "#aaa" }}>{e} / {p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      <InvoiceModal order={invoiceOrd} onClose={() => setInvOrd(null)} />
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
