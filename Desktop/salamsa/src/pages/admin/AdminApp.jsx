import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { STATUS_COLORS, STATUS_ICONS, fmt } from "../../data/data";
import { downloadCSV } from "../../utils/csv";
import InvoiceModal from "../../components/InvoiceModal";

const C = {
  page:  { fontFamily: "'DM Sans', sans-serif", background: "#f4f6f8", minHeight: "100vh", color: "#1a1a1a" },
  nav:   { background: "#1e2d3a", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 },
  card:  (border = "#e0e8f0") => ({ background: "#fff", borderRadius: 14, border: `1px solid ${border}`, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }),
  tab:   (a) => ({ background: a ? "#2a7db5" : "transparent", color: "#fff", border: a ? "none" : "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "7px 18px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }),
  btn:   (bg = "#1e2d3a") => ({ background: bg, color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", fontSize: 13 }),
  badge: (status) => ({ background: STATUS_COLORS[status] + "20", color: STATUS_COLORS[status], fontSize: 11, padding: "3px 10px", borderRadius: 10, fontWeight: 600, display: "inline-block" }),
};

// ── Graphique barres horizontal ───────────────────────────────────────────
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

export default function AdminApp() {
  const { user, logout, orders, updateOrderStatus } = useAuth();
  const [tab,          setTab]         = useState("dashboard");
  const [filter,       setFilter]      = useState("Toutes");
  const [selected,     setSelected]    = useState(null);
  const [search,       setSearch]      = useState("");
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const stats = {
    total:     orders.length,
    attente:   orders.filter((o) => o.status === "En attente").length,
    livraison: orders.filter((o) => o.status === "En livraison").length,
    livrees:   orders.filter((o) => o.status === "Livrée").length,
    revenue:   orders.filter((o) => o.status === "Livrée").reduce((s, o) => s + o.total, 0),
    today:     orders.filter((o) => o.date === today).length,
  };

  // Revenus 7 derniers jours
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const revenueByDay = last7.map((date) => ({
    label:    date.slice(5).replace("-", "/"),
    value:    orders.filter((o) => o.date === date && o.status === "Livrée").reduce((s, o) => s + o.total, 0),
    color:    "#27ae60",
    isAmount: true,
  }));

  const filtered = orders.filter((o) => {
    const ms = filter === "Toutes" || o.status === filter;
    const mq = !search || o.client.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
    return ms && mq;
  });

  function changeStatus(id, s) {
    updateOrderStatus(id, s);
    if (selected?.id === id) setSelected((p) => ({ ...p, status: s }));
  }

  return (
    <div style={C.page}>
      {/* NAV */}
      <nav style={C.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🐓</span>
          <div>
            <span style={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18 }}>salamsa</span>
            <span style={{ color: "#7a9bb5", fontSize: 11, marginLeft: 10, background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "2px 8px" }}>ADMIN</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[["dashboard","📊 Dashboard"],["commandes","📋 Commandes"]].map(([v, l]) => (
            <button key={v} style={C.tab(tab === v)} onClick={() => setTab(v)}>
              {l}
              {v === "commandes" && stats.attente > 0 && (
                <span style={{ background: "#e8a020", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginLeft: 7, fontWeight: "bold", color: "#fff" }}>
                  {stats.attente}
                </span>
              )}
            </button>
          ))}
          <div style={{ color: "#7a9bb5", fontSize: 13, marginLeft: 10 }}>👤 {user.name}</div>
          <button onClick={logout} style={{ ...C.tab(false), marginLeft: 4 }}>Déconnexion</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div>
            <h2 style={{ color: "#1e2d3a", marginBottom: 4 }}>Tableau de bord</h2>
            <p style={{ color: "#888", marginBottom: 24 }}>Vue globale des activités Salamsa</p>

            {/* KPI */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
              {[
                ["📦", "Total commandes",    stats.total,             "#3a7bd5", false],
                ["💰", "Chiffre d'affaires", stats.revenue,           "#27ae60", true],
                ["📅", "Commandes du jour",  stats.today,             "#9b59b6", false],
                ["⏳", "En attente",          stats.attente,           "#e8a020", false],
                ["🚴", "En livraison",        stats.livraison,         "#2980b9", false],
                ["✅", "Livrées",             stats.livrees,           "#27ae60", false],
              ].map(([icon, label, val, color, isAmt]) => (
                <div key={label} style={{ ...C.card(), borderLeft: `4px solid ${color}`, display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 28 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontSize: 24, fontWeight: "bold", color }}>{isAmt ? fmt(val) : val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Graphiques */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={C.card()}>
                <h3 style={{ margin: "0 0 18px", color: "#1e2d3a" }}>Commandes par statut</h3>
                <DonutChart size={140} data={Object.entries(STATUS_COLORS).map(([s, color]) => ({
                  label: STATUS_ICONS[s] + " " + s,
                  value: orders.filter((o) => o.status === s).length,
                  color,
                }))} />
              </div>
              <div style={C.card()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <h3 style={{ margin: 0, color: "#1e2d3a" }}>Revenus 7 derniers jours</h3>
                  <span style={{ background: "#e8f8ee", color: "#27ae60", fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 8 }}>
                    {fmt(revenueByDay.reduce((s, d) => s + d.value, 0))}
                  </span>
                </div>
                <ColumnChart data={revenueByDay} height={160} />
              </div>
            </div>

            {/* Dernières commandes */}
            <div style={C.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, color: "#1e2d3a" }}>Dernières commandes</h3>
                <button style={C.btn("#2a7db5")} onClick={() => setTab("commandes")}>Voir toutes →</button>
              </div>
              {orders.slice(0, 6).map((o) => (
                <div key={o.id} onClick={() => { setSelected(o); setTab("commandes"); }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f4f8", cursor: "pointer" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 18 }}>{STATUS_ICONS[o.status]}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{o.client}</div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>{o.id} · {o.date}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "bold", color: "#8b1a1a" }}>{fmt(o.total)}</div>
                    <span style={C.badge(o.status)}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMMANDES ─────────────────────────────────────────────────── */}
        {tab === "commandes" && (
          <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 20 }}>
            <div>
              <h2 style={{ color: "#1e2d3a", marginBottom: 20 }}>Gestion des commandes</h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <input placeholder="🔍 Rechercher client / ID..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: "9px 14px", border: "1.5px solid #e0e8f0", borderRadius: 20, fontSize: 13, outline: "none", width: 220, fontFamily: "'DM Sans', sans-serif" }} />
                {["Toutes", ...Object.keys(STATUS_COLORS)].map((s) => (
                  <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? (STATUS_COLORS[s] || "#1e2d3a") : "#fff", color: filter === s ? "#fff" : "#555", border: "1px solid #e0e8f0", borderRadius: 20, padding: "7px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                    {s !== "Toutes" ? STATUS_ICONS[s] + " " : ""}{s}
                  </button>
                ))}
                <button onClick={() => downloadCSV(filtered.map((o) => ({ ID: o.id, Client: o.client, Date: o.date, Statut: o.status, Adresse: o.address, Téléphone: o.phone, Total: o.total })), `commandes_${today}.csv`)}
                  style={{ background: "#27ae60", color: "#fff", border: "none", borderRadius: 20, padding: "7px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, marginLeft: "auto" }}>
                  ↓ Export CSV
                </button>
              </div>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Aucune commande trouvée</div>
              ) : filtered.map((o) => (
                <div key={o.id} onClick={() => setSelected(selected?.id === o.id ? null : o)}
                  style={{ ...C.card(selected?.id === o.id ? "#2a7db5" : "#e0e8f0"), marginBottom: 10, cursor: "pointer", borderWidth: selected?.id === o.id ? 2 : 1, transition: "all .15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 20 }}>{STATUS_ICONS[o.status]}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{o.client}</div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>{o.id} · {o.date} · 📍 {o.address}</div>
                        {o.abonnement && <span style={{ background: "#f0f7e8", color: "#2d5a1b", fontSize: 11, padding: "2px 8px", borderRadius: 10 }}>⭐ {o.abonnement}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", color: "#8b1a1a", fontSize: 16 }}>{fmt(o.total)}</div>
                      <span style={C.badge(o.status)}>{o.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selected && (
              <div style={{ ...C.card(), position: "sticky", top: 76, maxHeight: "85vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                  <h3 style={{ margin: 0, color: "#1e2d3a" }}>{selected.id}</h3>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#aaa" }}>✕</button>
                </div>
                <Section label="Client"><strong>{selected.client}</strong><br /><span style={{ fontSize: 13, color: "#555" }}>📞 {selected.phone}</span></Section>
                <Section label="Adresse"><span style={{ fontSize: 13 }}>📍 {selected.address}</span></Section>
                <Section label="Articles commandés">
                  {selected.items.map((it, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid #f4f6f8" }}>
                      <span>{it.name} ×{it.qty}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(it.price * it.qty)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 8, fontSize: 15 }}>
                    <span>Total</span><span style={{ color: "#8b1a1a" }}>{fmt(selected.total)}</span>
                  </div>
                </Section>
                <Section label="Changer le statut">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {Object.keys(STATUS_COLORS).map((s) => (
                      <button key={s} onClick={() => changeStatus(selected.id, s)}
                        style={{ background: selected.status === s ? STATUS_COLORS[s] : "#f4f6f8", color: selected.status === s ? "#fff" : "#444", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, textAlign: "left", fontWeight: selected.status === s ? 700 : 400 }}>
                        {STATUS_ICONS[s]} {s}
                      </button>
                    ))}
                  </div>
                </Section>
                <button onClick={() => setInvoiceOrder(selected)}
                  style={{ width: "100%", padding: "11px", background: "#1e3a12", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                  🧾 Voir la facture
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
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
