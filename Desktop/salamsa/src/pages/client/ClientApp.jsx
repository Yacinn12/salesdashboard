import { useState, useEffect, Fragment } from "react";
import { useAuth } from "../../context/AuthContext";
import { PRODUCTS, STATUS_COLORS, STATUS_ICONS, fmt } from "../../data/data";
import { useToast, ToastContainer } from "../../components/Toast";

const C = {
  page:  { fontFamily: "'DM Sans', sans-serif", background: "#faf7f2", minHeight: "100vh", color: "#1a1a1a" },
  nav:   { background: "#1e3a12", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 200, fontFamily: "'DM Sans', sans-serif" },
  tab:   (a) => ({ background: a ? "#5a8a3c" : "transparent", color: "#fff", border: a ? "none" : "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "6px 13px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }),
  card:  { background: "#fff", borderRadius: 14, border: "1px solid #ece6d8", padding: "18px 20px" },
  btn:   (c = "#1e3a12") => ({ background: c, color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", fontSize: 14 }),
  input: { width: "100%", padding: "11px 14px", border: "1.5px solid #e0d8cc", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" },
  label: { fontSize: 11, color: "#888", display: "block", marginBottom: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" },
};

const NAV_ITEMS = [
  ["accueil",       "Accueil"],
  ["commander",     "Commander"],
  ["récurrent",     "Récurrent"],
  ["mes-commandes", "Mes commandes"],
  ["profil",        "Profil"],
];

export default function ClientApp() {
  const { user, logout, orders, addOrder, updateUser, cancelOrder,
          verifyPassword, recurringSubs, addRecurringSub, updateRecurringSub, deleteRecurringSub } = useAuth();
  const { toasts, show: toast } = useToast();

  const [tab,          setTab]         = useState("accueil");
  const [menuOpen,     setMenuOpen]    = useState(false);
  const [isMobile,     setIsMobile]    = useState(window.innerWidth <= 700);
  const [cart,         setCart]        = useState({});
  const [search,       setSearch]      = useState("");
  const [orderFilter,  setOrderFilter] = useState("Toutes");
  const [address,      setAddress]     = useState(user.address || "");
  const [success,      setSuccess]     = useState(false);

  // Profil
  const [pForm,  setPForm]  = useState({ name: user.name, phone: user.phone || "", address: user.address || "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

  // Abonnement récurrent
  const myRsub = recurringSubs.find((s) => s.clientId === user.id);
  const [rsubEdit, setRsubEdit]   = useState(false);
  const [rsubForm, setRsubForm]   = useState({
    items:      [{ productId: "", productName: "", qty: 1, unitPrice: 0 }],
    recurrence: "mensuel",
    deliveryDay: 15,
    notes:      "",
    clientAddress: user.address || "",
  });

  const myOrders   = orders.filter((o) => o.clientId === user.id);
  const shownOrders = orderFilter === "Toutes" ? myOrders : myOrders.filter((o) => o.status === orderFilter);
  const cartTotal  = Object.entries(cart).reduce((s, [id, q]) => s + (PRODUCTS.find((p) => p.id === id)?.price || 0) * q, 0);
  const cartCount  = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalSpent = myOrders.filter((o) => o.status === "Livrée").reduce((s, o) => s + o.total, 0);

  // Sync profil form quand user change
  useEffect(() => {
    setPForm({ name: user.name, phone: user.phone || "", address: user.address || "" });
  }, [user.name, user.phone, user.address]);

  // Resize listener
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // ── Cart ─────────────────────────────────────────────────────────────────
  function add(id)    { setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 })); }
  function rmv(id)    { setCart((c) => { const n = { ...c }; n[id] > 1 ? n[id]-- : delete n[id]; return n; }); }

  // ── Commande ─────────────────────────────────────────────────────────────
  function placeOrder() {
    if (!address || cartCount === 0) return;
    const items = Object.entries(cart).map(([id, qty]) => {
      const p = PRODUCTS.find((x) => x.id === id);
      return { name: p.name, qty, price: p.price };
    });
    addOrder({
      id:         `CMD-${Date.now()}`,
      clientId:   user.id,
      client:     user.name,
      phone:      user.phone,
      address,
      items,
      total:      cartTotal + 1500,
      status:     "En attente",
      date:       new Date().toISOString().split("T")[0],
      abonnement: null,
    });
    setCart({});
    setSuccess(true);
    toast("Commande envoyée avec succès !");
  }

  function handleCancel(id) {
    cancelOrder(id);
    toast("Commande annulée", "warning");
  }

  // ── Profil ────────────────────────────────────────────────────────────────
  function saveProfile() {
    if (!pForm.name.trim()) { toast("Le nom est obligatoire", "error"); return; }
    updateUser(user.id, { name: pForm.name.trim(), phone: pForm.phone, address: pForm.address });
    toast("Profil mis à jour !");
  }

  function changePassword() {
    if (!verifyPassword(user.id, pwForm.current)) { toast("Mot de passe actuel incorrect", "error"); return; }
    if (pwForm.next.length < 6)                   { toast("Minimum 6 caractères", "error"); return; }
    if (pwForm.next !== pwForm.confirm)            { toast("Les mots de passe ne correspondent pas", "error"); return; }
    updateUser(user.id, { password: pwForm.next });
    setPwForm({ current: "", next: "", confirm: "" });
    toast("Mot de passe modifié !");
  }

  function goTo(t) { setTab(t); setMenuOpen(false); setSuccess(false); }

  // ── Produits filtrés ──────────────────────────────────────────────────────
  function byCategory(cat) {
    return PRODUCTS.filter(
      (p) => p.category === cat && (!search || p.name.toLowerCase().includes(search.toLowerCase()))
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={C.page}>

      {/* NAV */}
      <nav style={C.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 24 }}>🐓</span>
          <span style={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 20 }}>salamsa</span>
        </div>

        {/* Desktop tabs */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {NAV_ITEMS.map(([v, l]) => (
              <button key={v} style={C.tab(tab === v)} onClick={() => goTo(v)}>
                {l}
                {v === "commander" && cartCount > 0 && (
                  <span style={{ background: "#e8a020", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginLeft: 6, fontWeight: "bold" }}>{cartCount}</span>
                )}
              </button>
            ))}
            <button onClick={logout} style={{ ...C.tab(false), marginLeft: 6, borderColor: "rgba(255,255,255,0.2)" }}>Déconnexion</button>
          </div>
        )}

        {/* Hamburger */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </nav>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{ background: "#1a3310", borderBottom: "1px solid #2d5a1b", zIndex: 190, position: "sticky", top: 60 }}>
          {NAV_ITEMS.map(([v, l]) => (
            <button key={v} onClick={() => goTo(v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 24px", background: tab === v ? "#2d5a1b" : "transparent", color: "#fff", border: "none", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 15, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
              {l}
              {v === "commander" && cartCount > 0 && <span style={{ background: "#e8a020", borderRadius: 12, padding: "2px 8px", fontSize: 12, fontWeight: "bold" }}>{cartCount}</span>}
            </button>
          ))}
          <button onClick={logout} style={{ display: "block", width: "100%", padding: "14px 24px", background: "transparent", color: "#e8a020", border: "none", fontSize: 15, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
            Déconnexion
          </button>
        </div>
      )}

      {/* ── ACCUEIL ───────────────────────────────────────────────────────── */}
      {tab === "accueil" && (
        <div>
          <div style={{ background: "linear-gradient(135deg, #1e3a12, #4a7a2a)", color: "#fff", padding: "52px 28px", textAlign: "center" }}>
            <p style={{ fontSize: 13, letterSpacing: 3, color: "#b8d89a", textTransform: "uppercase", marginBottom: 10 }}>Bienvenue</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 32 : 42, margin: "0 0 12px", fontStyle: "italic" }}>
              Bonjour, {user.name.split(" ")[0]}<span style={{ color: "#e8a020" }}>.</span>
            </h1>
            <p style={{ color: "#c8e0b0", marginBottom: 28 }}>Volaille fraîche livrée à votre porte</p>
            <button style={{ ...C.btn("#e8a020"), color: "#1a1a1a", borderRadius: 30, padding: "14px 36px", fontSize: 15 }} onClick={() => goTo("commander")}>
              Commander maintenant →
            </button>
          </div>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 20px" }}>
            <h2 style={{ color: "#1e3a12", fontFamily: "'Playfair Display', serif", marginBottom: 24 }}>Nos produits</h2>
            {["Poulets entiers", "Découpés", "Produits Dérivés"].map((cat) => (
              <div key={cat} style={{ marginBottom: 28 }}>
                <h3 style={{ color: "#5a8a3c", borderBottom: "2px solid #e8e0d0", paddingBottom: 8, marginBottom: 14 }}>{cat}</h3>
                <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
                  {PRODUCTS.filter((p) => p.category === cat).map((p) => (
                    <div key={p.id} style={{ ...C.card, textAlign: "center" }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{p.emoji}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>{p.unit}</div>
                      <div style={{ color: "#8b1a1a", fontWeight: "bold", fontSize: 15 }}>{fmt(p.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── COMMANDER ─────────────────────────────────────────────────────── */}
      {tab === "commander" && (
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
              <h2 style={{ color: "#27ae60", fontFamily: "'Playfair Display', serif" }}>Commande envoyée !</h2>
              <p style={{ color: "#555" }}>Nous vous contacterons pour confirmer la livraison.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
                <button style={C.btn()} onClick={() => setSuccess(false)}>Nouvelle commande</button>
                <button style={C.btn("#5a8a3c")} onClick={() => goTo("mes-commandes")}>Voir mes commandes</button>
              </div>
            </div>
          ) : (
            <>
              {/* Barre de recherche */}
              <div style={{ marginBottom: 20 }}>
                <input
                  style={{ ...C.input, maxWidth: 360, display: "block" }}
                  placeholder="🔍 Rechercher un produit..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="commander-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
                <div>
                  <h2 style={{ color: "#1e3a12", fontFamily: "'Playfair Display', serif", marginBottom: 18 }}>Choisissez vos produits</h2>
                  {["Poulets entiers", "Découpés", "Produits Dérivés"].map((cat) => {
                    const prods = byCategory(cat);
                    if (!prods.length) return null;
                    return (
                      <div key={cat} style={{ marginBottom: 22 }}>
                        <h3 style={{ color: "#5a8a3c", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>{cat}</h3>
                        {prods.map((p) => (
                          <div key={p.id} style={{ ...C.card, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: 26 }}>{p.emoji}</span>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                                <div style={{ fontSize: 12, color: "#888" }}>{p.unit}</div>
                                <div>
                                  <span style={{ color: "#8b1a1a", fontWeight: "bold", fontSize: 15 }}>{fmt(p.price)}</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              {cart[p.id] ? (
                                <>
                                  <button onClick={() => rmv(p.id)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#f0e8d8", border: "none", cursor: "pointer", fontSize: 16 }}>−</button>
                                  <span style={{ width: 22, textAlign: "center", fontWeight: "bold" }}>{cart[p.id]}</span>
                                  <button onClick={() => add(p.id)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#5a8a3c", color: "#fff", border: "none", cursor: "pointer", fontSize: 16 }}>+</button>
                                </>
                              ) : (
                                <button onClick={() => { add(p.id); toast(`${p.name} ajouté`, "info"); }} style={{ ...C.btn("#1e3a12"), padding: "7px 16px", fontSize: 12 }}>Ajouter</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {!PRODUCTS.some((p) => !search || p.name.toLowerCase().includes(search.toLowerCase())) && (
                    <p style={{ color: "#aaa", textAlign: "center", padding: "20px 0" }}>Aucun produit trouvé</p>
                  )}
                </div>

                {/* Panier */}
                <div style={{ position: "sticky", top: 76 }}>
                  <div style={{ ...C.card, marginBottom: 14 }}>
                    <h3 style={{ margin: "0 0 14px", color: "#1e3a12" }}>🛒 Panier</h3>
                    {cartCount === 0 ? (
                      <p style={{ color: "#bbb", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Vide</p>
                    ) : (
                      <>
                        {Object.entries(cart).map(([id, qty]) => {
                          const p = PRODUCTS.find((x) => x.id === id);
                          return (
                            <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}>
                              <span>{p.emoji} {p.name} ×{qty}</span>
                              <span style={{ fontWeight: 600 }}>{fmt(p.price * qty)}</span>
                            </div>
                          );
                        })}
                        <div style={{ borderTop: "1px solid #ece6d8", marginTop: 10, paddingTop: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}><span>Livraison</span><span>1 500 F</span></div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 8, fontSize: 15 }}>
                            <span>Total</span>
                            <span style={{ color: "#8b1a1a" }}>{fmt(cartTotal + 1500)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {cartCount > 0 && (
                    <div style={C.card}>
                      <h3 style={{ margin: "0 0 12px", color: "#1e3a12" }}>📋 Livraison</h3>
                      <label style={C.label}>Adresse</label>
                      <input style={C.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dakar, Médina..." />
                      <button style={{ ...C.btn(), width: "100%", marginTop: 12 }} onClick={placeOrder}>Confirmer →</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── RÉCURRENT ─────────────────────────────────────────────────────── */}
      {tab === "récurrent" && (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 20px" }}>

          <h2 style={{ color: "#1e3a12", fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>Ma livraison récurrente</h2>
          <p style={{ color: "#888", marginBottom: 20 }}>Définissez une commande automatique (ex : 10 poulets le 15 de chaque mois)</p>

          {myRsub && !rsubEdit ? (
            /* ── Vue abonnement actif ── */
            <div style={{ ...C.card, borderLeft: "4px solid #5a8a3c" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                <div>
                  <span style={{ background: myRsub.active ? "#e8f7e8" : "#f5f5f5", color: myRsub.active ? "#27ae60" : "#aaa", borderRadius: 12, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>
                    {myRsub.active ? "● Actif" : "Inactif"}
                  </span>
                  <span style={{ fontSize: 13, color: "#555", marginLeft: 12 }}>
                    {myRsub.recurrence === "mensuel" && `Chaque mois le ${myRsub.deliveryDay}`}
                    {myRsub.recurrence === "hebdomadaire" && `Chaque semaine (jour ${myRsub.deliveryDay})`}
                    {myRsub.recurrence === "bimensuel" && `Deux fois/mois (jour ${myRsub.deliveryDay})`}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => {
                    setRsubForm({
                      items: myRsub.items.map((it) => ({ ...it })),
                      recurrence: myRsub.recurrence,
                      deliveryDay: myRsub.deliveryDay,
                      notes: myRsub.notes || "",
                      clientAddress: myRsub.clientAddress || user.address || "",
                    });
                    setRsubEdit(true);
                  }} style={{ ...C.btn("#5a8a3c"), padding: "7px 14px", fontSize: 12 }}>Modifier</button>
                  <button onClick={() => { deleteRecurringSub(myRsub.id); toast("Abonnement récurrent supprimé", "warning"); }}
                    style={{ background: "transparent", border: "1.5px solid #e74c3c", color: "#e74c3c", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                    Supprimer
                  </button>
                </div>
              </div>
              {myRsub.items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid #f0e8d8" }}>
                  <span>🐔 {it.productName} × {it.qty}</span>
                  <span style={{ fontWeight: 600, color: "#8b1a1a" }}>{fmt(it.unitPrice * it.qty)}</span>
                </div>
              ))}
              {myRsub.notes && <p style={{ fontSize: 12, color: "#888", marginTop: 10 }}>📝 {myRsub.notes}</p>}
              {myRsub.clientAddress && <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>📍 {myRsub.clientAddress}</p>}
            </div>
          ) : (myRsub && rsubEdit) || !myRsub ? (
            /* ── Formulaire création / édition ── */
            <div style={C.card}>
              <h4 style={{ color: "#1e3a12", margin: "0 0 18px" }}>{myRsub ? "Modifier l'abonnement" : "Créer un abonnement récurrent"}</h4>

              {/* Produits */}
              <label style={C.label}>Produits</label>
              {rsubForm.items.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select
                    style={{ ...C.input, padding: "10px 12px" }}
                    value={item.productId}
                    onChange={(e) => {
                      const prod = PRODUCTS.find((p) => p.id === e.target.value);
                      setRsubForm((f) => {
                        const items = [...f.items];
                        items[i] = { productId: prod?.id || "", productName: prod?.name || "", qty: items[i].qty, unitPrice: prod?.price || 0 };
                        return { ...f, items };
                      });
                    }}
                  >
                    <option value="">-- Choisir --</option>
                    {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                  </select>
                  <input
                    type="number" min="1" style={{ ...C.input, textAlign: "center" }}
                    value={item.qty}
                    onChange={(e) => setRsubForm((f) => {
                      const items = [...f.items];
                      items[i] = { ...items[i], qty: Math.max(1, Number(e.target.value)) };
                      return { ...f, items };
                    })}
                  />
                  {rsubForm.items.length > 1 && (
                    <button onClick={() => setRsubForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}
                      style={{ background: "#fde8e8", border: "none", borderRadius: 8, padding: "10px", cursor: "pointer", color: "#c0392b", fontWeight: 700 }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setRsubForm((f) => ({ ...f, items: [...f.items, { productId: "", productName: "", qty: 1, unitPrice: 0 }] }))}
                style={{ fontSize: 12, color: "#5a8a3c", background: "none", border: "1px dashed #5a8a3c", borderRadius: 8, padding: "6px 14px", cursor: "pointer", marginBottom: 18, fontFamily: "'DM Sans', sans-serif" }}>
                + Ajouter un produit
              </button>

              {/* Fréquence + jour */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={C.label}>Fréquence</label>
                  <select style={{ ...C.input, padding: "10px 12px" }} value={rsubForm.recurrence}
                    onChange={(e) => setRsubForm((f) => ({ ...f, recurrence: e.target.value, deliveryDay: e.target.value === "hebdomadaire" ? 1 : 15 }))}>
                    <option value="mensuel">Mensuel</option>
                    <option value="hebdomadaire">Hebdomadaire</option>
                    <option value="bimensuel">Bimensuel (2×/mois)</option>
                  </select>
                </div>
                <div>
                  <label style={C.label}>{rsubForm.recurrence === "hebdomadaire" ? "Jour de la semaine" : "Jour du mois"}</label>
                  {rsubForm.recurrence === "hebdomadaire" ? (
                    <select style={{ ...C.input, padding: "10px 12px" }} value={rsubForm.deliveryDay}
                      onChange={(e) => setRsubForm((f) => ({ ...f, deliveryDay: Number(e.target.value) }))}>
                      {["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"].map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="number" min="1" max="28" style={C.input} value={rsubForm.deliveryDay}
                      onChange={(e) => setRsubForm((f) => ({ ...f, deliveryDay: Math.min(28, Math.max(1, Number(e.target.value))) }))} />
                  )}
                </div>
              </div>

              {/* Adresse livraison */}
              <div style={{ marginBottom: 14 }}>
                <label style={C.label}>Adresse de livraison</label>
                <input style={C.input} value={rsubForm.clientAddress}
                  onChange={(e) => setRsubForm((f) => ({ ...f, clientAddress: e.target.value }))}
                  placeholder="Dakar, Médina..." />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 18 }}>
                <label style={C.label}>Notes pour le livreur</label>
                <input style={C.input} value={rsubForm.notes}
                  onChange={(e) => setRsubForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Sonner deux fois, livraison avant 8h..." />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button style={C.btn()} onClick={() => {
                  const validItems = rsubForm.items.filter((it) => it.productId);
                  if (!validItems.length) { toast("Ajoutez au moins un produit", "error"); return; }
                  const payload = {
                    clientId: user.id, clientName: user.name,
                    clientPhone: user.phone, clientAddress: rsubForm.clientAddress || user.address,
                    items: validItems, recurrence: rsubForm.recurrence,
                    deliveryDay: rsubForm.deliveryDay, active: true, notes: rsubForm.notes,
                  };
                  if (myRsub) {
                    updateRecurringSub(myRsub.id, payload);
                    toast("Abonnement récurrent mis à jour !");
                  } else {
                    addRecurringSub(payload);
                    toast("Abonnement récurrent créé !");
                  }
                  setRsubEdit(false);
                }}>
                  {myRsub ? "Enregistrer" : "Créer l'abonnement"}
                </button>
                {myRsub && (
                  <button onClick={() => setRsubEdit(false)}
                    style={{ background: "#f4f4f4", border: "none", borderRadius: 10, padding: "12px 22px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#555" }}>
                    Annuler
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── MES COMMANDES ─────────────────────────────────────────────────── */}
      {tab === "mes-commandes" && (
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}>
          <h2 style={{ color: "#1e3a12", fontFamily: "'Playfair Display', serif", marginBottom: 20 }}>Mes commandes</h2>

          {/* Filtre statut */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 20 }}>
            {["Toutes", "En attente", "Confirmée", "En livraison", "Livrée", "Annulée"].map((s) => (
              <button key={s} onClick={() => setOrderFilter(s)} style={{ background: orderFilter === s ? (STATUS_COLORS[s] || "#1e3a12") : "#fff", color: orderFilter === s ? "#fff" : "#555", border: "1px solid #e0d8cc", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                {STATUS_ICONS[s] ? STATUS_ICONS[s] + " " : ""}{s}
              </button>
            ))}
          </div>

          {shownOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>📦</div>
              <p style={{ color: "#aaa" }}>Aucune commande {orderFilter !== "Toutes" ? `"${orderFilter}"` : "pour l'instant"}</p>
              {orderFilter === "Toutes" && <button style={C.btn()} onClick={() => goTo("commander")}>Passer ma première commande →</button>}
            </div>
          ) : (
            shownOrders.map((o) => (
              <div key={o.id} style={{ ...C.card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 18 }}>{STATUS_ICONS[o.status]}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{o.id}</span>
                      <span style={{ background: STATUS_COLORS[o.status] + "22", color: STATUS_COLORS[o.status], fontSize: 11, padding: "2px 10px", borderRadius: 10 }}>{o.status}</span>
                      {o.abonnement && <span style={{ background: "#f0f7e8", color: "#2d5a1b", fontSize: 11, padding: "2px 8px", borderRadius: 10 }}>⭐ {o.abonnement}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>📅 {o.date} · 📍 {o.address}</div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                      {o.items.map((it, i) => <span key={i} style={{ marginRight: 10 }}>• {it.name} ×{it.qty}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: "bold", color: "#8b1a1a", fontSize: 17 }}>{fmt(o.total)}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>livraison incluse</div>
                    {o.status === "En attente" && (
                      <button onClick={() => handleCancel(o.id)} style={{ background: "transparent", border: "1.5px solid #e74c3c", color: "#e74c3c", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
                <OrderTimeline status={o.status} />
              </div>
            ))
          )}
        </div>
      )}

      {/* ── PROFIL ────────────────────────────────────────────────────────── */}
      {tab === "profil" && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 20px" }}>
          {/* Carte identité */}
          <div style={{ ...C.card, marginBottom: 20, background: "linear-gradient(135deg,#1e3a12,#4a7a2a)", color: "#fff", textAlign: "center", padding: "32px 24px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#e8a020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: "bold", margin: "0 auto 14px", color: "#1a1a1a" }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: "#b8d89a", marginBottom: 12 }}>{user.email}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#e8a020" }}>{myOrders.length}</div>
                <div style={{ fontSize: 11, color: "#b8d89a" }}>commandes</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#e8a020" }}>{fmt(totalSpent)}</div>
                <div style={{ fontSize: 11, color: "#b8d89a" }}>total dépensé</div>
              </div>
            </div>
          </div>

          {/* Infos personnelles */}
          <div style={{ ...C.card, marginBottom: 16 }}>
            <h3 style={{ color: "#1e3a12", margin: "0 0 18px" }}>Informations personnelles</h3>
            {[["name","Nom complet"],["address","Adresse de livraison"]].map(([f, l]) => (
              <div key={f} style={{ marginBottom: 14 }}>
                <label style={C.label}>{l}</label>
                <input style={C.input} value={pForm[f]} onChange={(e) => setPForm({ ...pForm, [f]: e.target.value })} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={C.label}>Téléphone</label>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e0d8cc", borderRadius: 9, background: "#fff", overflow: "hidden" }}>
                <span style={{ padding: "11px 10px 11px 14px", fontSize: 13, color: "#555", fontWeight: 600, whiteSpace: "nowrap", borderRight: "1px solid #e0d8cc", background: "#f7f5f0" }}>+221</span>
                <input style={{ ...C.input, border: "none", borderRadius: 0, flex: 1 }}
                  placeholder="77 000 00 00"
                  value={pForm.phone.replace(/^\+221\s?/, "")}
                  onChange={(e) => setPForm({ ...pForm, phone: e.target.value ? "+221 " + e.target.value.replace(/^\+221\s?/, "") : "" })} />
              </div>
            </div>
            <button style={C.btn()} onClick={saveProfile}>Enregistrer</button>
          </div>

          {/* Changer mot de passe */}
          <div style={C.card}>
            <h3 style={{ color: "#1e3a12", margin: "0 0 18px" }}>Changer le mot de passe</h3>
            {[["current","Mot de passe actuel"],["next","Nouveau mot de passe"],["confirm","Confirmer le nouveau"]].map(([f, l]) => (
              <div key={f} style={{ marginBottom: 14 }}>
                <label style={C.label}>{l}</label>
                <input type="password" style={C.input} value={pwForm[f]} onChange={(e) => setPwForm({ ...pwForm, [f]: e.target.value })} />
              </div>
            ))}
            <button style={C.btn("#5a8a3c")} onClick={changePassword}>Modifier le mot de passe</button>
          </div>
        </div>
      )}

      <footer style={{ background: "#1e3a12", color: "#a0c080", padding: "18px", textAlign: "center", marginTop: 40, fontSize: 12 }}>
        🐓 Salamsa Volaille — 77 625 90 90 · @Salamsavolaille
      </footer>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ── Barre de progression commande ─────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: "En attente",   icon: "⏳", label: "Attente"   },
  { key: "Confirmée",    icon: "✅", label: "Confirmée"  },
  { key: "En livraison", icon: "🚴", label: "En cours"   },
  { key: "Livrée",       icon: "📦", label: "Livrée"     },
];

function OrderTimeline({ status }) {
  if (status === "Annulée") return (
    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#fde8e8", borderRadius: 8 }}>
      <span>❌</span>
      <span style={{ color: "#c0392b", fontSize: 12, fontWeight: 600 }}>Commande annulée</span>
    </div>
  );

  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {TIMELINE_STEPS.map((step, i) => (
          <Fragment key={step.key}>
            {/* Cercle étape */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i <= idx ? "#5a8a3c" : "#ece6d8",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: i === idx ? "0 0 0 4px #d0eabc" : "none",
                transition: "all .3s",
                fontSize: 13,
              }}>
                {i < idx  && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                {i === idx && <span>{step.icon}</span>}
                {i > idx  && <span style={{ color: "#ccc", fontSize: 11, fontWeight: 600 }}>{i + 1}</span>}
              </div>
              <span style={{
                fontSize: 9, marginTop: 5,
                color: i <= idx ? "#2d5a1b" : "#bbb",
                fontWeight: i === idx ? 700 : 400,
                textAlign: "center", whiteSpace: "nowrap",
                letterSpacing: 0.3,
              }}>
                {step.label}
              </span>
            </div>
            {/* Ligne de connexion */}
            {i < TIMELINE_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginTop: 13,
                background: i < idx ? "#5a8a3c" : "#ece6d8",
                transition: "background .3s",
              }} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
