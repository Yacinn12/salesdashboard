import { createContext, useContext, useRef, useState, useEffect } from "react";
import { supabase, supabaseNoSession } from "../lib/supabase";
import { SEED_STOCK } from "../data/data";

const AuthContext  = createContext(null);
const LOCKOUT_KEY  = "salamsa_lockout";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

// ── DB → app mappers ──────────────────────────────────────────────────────
function mapOrder(r) {
  return { ...r, clientId: r.client_id, items: r.items || [] };
}
function mapProfile(r) {
  return {
    id: r.id, email: r.email, name: r.name,
    phone: r.phone || "", address: r.address || "",
    role: r.role, abonnement: r.abonnement || null,
  };
}
function mapPurchase(r) {
  return { ...r, supplierId: r.supplier_id, supplierName: r.supplier_name, items: r.items || [] };
}
function mapStock(rows) {
  const obj = {};
  rows.forEach((r) => {
    obj[r.product_id] = {
      productName: r.product_name,
      qty: r.qty,
      alert: r.alert,
      avgPurchasePrice: r.avg_purchase_price,
    };
  });
  return obj;
}
function mapSub(r) {
  return {
    ...r,
    clientId:  r.client_id,
    clientName: r.client_name,
    nextDate:  r.next_date,
    createdAt: r.created_at,
    items:     r.items || [],
  };
}

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [appReady,      setAppReady]      = useState(false);
  const [orders,        setOrders]        = useState([]);
  const [users,         setUsers]         = useState([]);
  const [auditLogs,     setAuditLogs]     = useState([]);
  const [suppliers,     setSuppliers]     = useState([]);
  const [purchases,     setPurchases]     = useState([]);
  const [stock,         setStock]         = useState(SEED_STOCK);
  const [recurringSubs, setRecurringSubs] = useState([]);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user && !userRef.current) {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            setUser(profile);
            await loadAllData(profile);
          }
        } else if (!session) {
          setUser(null);
          clearLocalData();
        }
        setAppReady(true);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Realtime: orders (admin/superadmin) ───────────────────────────────────
  useEffect(() => {
    if (!user || user.role === "client") return;
    const ch = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT")
          setOrders((p) => [mapOrder(payload.new), ...p]);
        if (payload.eventType === "UPDATE")
          setOrders((p) => p.map((o) => o.id === payload.new.id ? mapOrder(payload.new) : o));
        if (payload.eventType === "DELETE")
          setOrders((p) => p.filter((o) => o.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id, user?.role]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function fetchProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    return data ? mapProfile(data) : null;
  }

  async function loadAllData(currentUser) {
    if (!currentUser) return;

    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (currentUser.role === "client") q = q.eq("client_id", currentUser.id);
    const { data: ordersData } = await q;
    if (ordersData) setOrders(ordersData.map(mapOrder));

    if (currentUser.role === "client") return;

    const [uRes, sRes, pRes, stRes, subRes, aRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("suppliers").select("*").order("created_at", { ascending: true }),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
      supabase.from("stock").select("*"),
      supabase.from("recurring_subs").select("*").order("created_at", { ascending: true }),
      supabase.from("audit_logs").select("*").order("date", { ascending: false }).limit(300),
    ]);

    if (uRes.data)   setUsers(uRes.data.map(mapProfile));
    if (sRes.data)   setSuppliers(sRes.data);
    if (pRes.data)   setPurchases(pRes.data.map(mapPurchase));
    if (stRes.data)  setStock(mapStock(stRes.data));
    if (subRes.data) setRecurringSubs(subRes.data.map(mapSub));
    if (aRes.data)   setAuditLogs(aRes.data);
  }

  function clearLocalData() {
    setOrders([]); setUsers([]); setAuditLogs([]);
    setSuppliers([]); setPurchases([]); setStock(SEED_STOCK); setRecurringSubs([]);
  }

  async function addAudit(action, details = {}, actor = null) {
    const src = actor || userRef.current;
    const entry = {
      id:        "aud_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      date:      new Date().toISOString(),
      user_id:   src?.id   || "system",
      user_name: src?.name || "Système",
      user_role: src?.role || "system",
      action,
      details,
    };
    setAuditLogs((prev) => [entry, ...prev].slice(0, 300));
    supabase.from("audit_logs").insert(entry);
  }

  async function clearAudit() {
    setAuditLogs([]);
    await supabase.from("audit_logs").delete().neq("id", "___never___");
  }

  // ── Connexion ──────────────────────────────────────────────────────────────
  async function login(email, password) {
    let lockouts = {};
    try { lockouts = JSON.parse(localStorage.getItem(LOCKOUT_KEY)) || {}; } catch {}
    const lock = lockouts[email];
    if (lock?.until > Date.now()) {
      const mins = Math.ceil((lock.until - Date.now()) / 60000);
      return { ok: false, error: `Compte bloqué. Réessayez dans ${mins} min.`, locked: true };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const attempts = (lock?.attempts || 0) + 1;
      const until    = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ ...lockouts, [email]: { attempts, until } }));
      if (attempts >= MAX_ATTEMPTS)
        return { ok: false, error: "Trop de tentatives. Compte bloqué 5 minutes.", locked: true };
      const left = MAX_ATTEMPTS - attempts;
      return { ok: false, error: `Email ou mot de passe incorrect. ${left} tentative(s) restante(s).` };
    }

    const updated = { ...lockouts };
    delete updated[email];
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(updated));

    const profile = await fetchProfile(data.user.id);
    if (!profile) return { ok: false, error: "Profil introuvable. Contactez l'administrateur." };

    setUser(profile);
    await loadAllData(profile);
    await addAudit("Connexion", { role: profile.role }, profile);
    return { ok: true };
  }

  async function verifyPassword(userId, plainPassword) {
    const target = users.find((u) => u.id === userId) || user;
    if (!target) return false;
    const temp = supabaseNoSession;
    const { error } = await temp.auth.signInWithPassword({ email: target.email, password: plainPassword });
    return !error;
  }

  // ── Inscription ────────────────────────────────────────────────────────────
  async function register({ name, email, password, phone, address }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone: phone || "", address: address || "", role: "client" },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already"))
        return { ok: false, error: "Cet email est déjà utilisé" };
      return { ok: false, error: error.message };
    }

    const profile = {
      id: data.user.id, email, name,
      phone: phone || "", address: address || "",
      role: "client", abonnement: null,
    };
    setUser(profile);
    await loadAllData(profile);
    await addAudit("Inscription", { email }, profile);
    return { ok: true };
  }

  async function logout() {
    await addAudit("Déconnexion");
    await supabase.auth.signOut();
    setUser(null);
    clearLocalData();
  }

  // ── Stock ──────────────────────────────────────────────────────────────────
  async function addToStock(items) {
    const { data: rows } = await supabase.from("stock").select("*");
    if (!rows) return;
    for (const { productName, qty, unitPrice } of items) {
      const row = rows.find((r) => r.product_name === productName);
      if (!row) continue;
      const newQty = (row.qty || 0) + qty;
      const newAvg = newQty > 0
        ? ((row.avg_purchase_price || 0) * (row.qty || 0) + unitPrice * qty) / newQty
        : unitPrice;
      await supabase.from("stock")
        .update({ qty: newQty, avg_purchase_price: Math.round(newAvg) })
        .eq("product_id", row.product_id);
    }
    const { data: fresh } = await supabase.from("stock").select("*");
    if (fresh) setStock(mapStock(fresh));
  }

  async function deductFromStock(items) {
    const { data: rows } = await supabase.from("stock").select("*");
    if (!rows) return;
    for (const { name, qty } of items) {
      const row = rows.find((r) => r.product_name === name);
      if (!row) continue;
      const newQty = Math.max(0, (row.qty || 0) - qty);
      await supabase.from("stock").update({ qty: newQty }).eq("product_id", row.product_id);
    }
    const { data: fresh } = await supabase.from("stock").select("*");
    if (fresh) setStock(mapStock(fresh));
  }

  async function updateStockItem(productId, updates) {
    const dbUpdates = {};
    if (updates.qty              !== undefined) dbUpdates.qty               = updates.qty;
    if (updates.alert            !== undefined) dbUpdates.alert             = updates.alert;
    if (updates.avgPurchasePrice !== undefined) dbUpdates.avg_purchase_price = updates.avgPurchasePrice;
    await supabase.from("stock").update(dbUpdates).eq("product_id", productId);
    setStock((prev) => ({ ...prev, [productId]: { ...prev[productId], ...updates } }));
    await addAudit("Stock modifié", { productId, ...updates });
  }

  // ── Commandes ─────────────────────────────────────────────────────────────
  async function addOrder(order) {
    const dbOrder = {
      id:         order.id,
      client:     order.client,
      client_id:  order.clientId || null,
      date:       order.date,
      status:     order.status,
      total:      order.total,
      phone:      order.phone    || "",
      address:    order.address  || "",
      abonnement: order.abonnement || null,
      items:      order.items,
    };
    const { error } = await supabase.from("orders").insert(dbOrder);
    if (!error && userRef.current?.role === "client") {
      setOrders((p) => [order, ...p]);
    }
    await addAudit("Commande créée", { id: order.id, client: order.client, total: order.total });
  }

  async function updateOrderStatus(id, status) {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders((p) => p.map((o) => o.id === id ? { ...o, status } : o));
    if (status === "Livrée") {
      const order = orders.find((o) => o.id === id);
      if (order) await deductFromStock(order.items);
    }
    await addAudit("Statut modifié", { orderId: id, statut: status });
  }

  async function deleteOrder(id) {
    await supabase.from("orders").delete().eq("id", id);
    setOrders((p) => p.filter((o) => o.id !== id));
    await addAudit("Commande supprimée", { orderId: id });
  }

  async function cancelOrder(id) {
    const order = orders.find((o) => o.id === id);
    if (!order || order.clientId !== user?.id || order.status !== "En attente") return;
    await supabase.from("orders").update({ status: "Annulée" }).eq("id", id);
    setOrders((p) => p.map((o) => o.id === id ? { ...o, status: "Annulée" } : o));
    await addAudit("Commande annulée", { orderId: id });
  }

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  async function addUser(u) {
    // Use a session-less client to avoid overriding the current admin session
    const { data, error } = await supabaseNoSession.auth.signUp({
      email:    u.email,
      password: u.password,
      options: {
        data: { name: u.name, phone: u.phone || "", address: u.address || "", role: u.role },
      },
    });
    if (error) { console.error("addUser:", error.message); return; }
    const newUser = {
      id: data.user.id, email: u.email, name: u.name,
      phone: u.phone || "", address: u.address || "",
      role: u.role, abonnement: null,
    };
    setUsers((prev) => [...prev, newUser]);
    await addAudit("Utilisateur créé", { nom: u.name, email: u.email, role: u.role });
  }

  async function updateUser(id, updates) {
    const safe = { ...updates };
    delete safe.password;
    await supabase.from("profiles").update(safe).eq("id", id);
    setUsers((p) => p.map((u) => u.id === id ? { ...u, ...safe } : u));
    setUser((prev) => prev?.id === id ? { ...prev, ...safe } : prev);
    await addAudit("Utilisateur modifié", { userId: id, champs: Object.keys(updates).join(", ") });
  }

  async function deleteUser(id) {
    const target = users.find((u) => u.id === id);
    await supabase.from("profiles").delete().eq("id", id);
    setUsers((p) => p.filter((u) => u.id !== id));
    await addAudit("Utilisateur supprimé", { nom: target?.name, email: target?.email });
  }

  // ── Fournisseurs ──────────────────────────────────────────────────────────
  async function addSupplier(sup) {
    const newSup = { ...sup, id: "sup_" + Date.now() };
    await supabase.from("suppliers").insert(newSup);
    setSuppliers((p) => [...p, newSup]);
    await addAudit("Fournisseur ajouté", { nom: sup.name });
    return newSup;
  }

  async function updateSupplier(id, updates) {
    await supabase.from("suppliers").update(updates).eq("id", id);
    setSuppliers((p) => p.map((s) => s.id === id ? { ...s, ...updates } : s));
    await addAudit("Fournisseur modifié", { id, ...updates });
  }

  async function deleteSupplier(id) {
    const target = suppliers.find((s) => s.id === id);
    await supabase.from("suppliers").delete().eq("id", id);
    setSuppliers((p) => p.filter((s) => s.id !== id));
    await addAudit("Fournisseur supprimé", { nom: target?.name });
  }

  // ── Achats ────────────────────────────────────────────────────────────────
  async function addPurchase(purchase) {
    const newP = { ...purchase, id: "ACH-" + String(Date.now()).slice(-6) };
    const dbP = {
      id:            newP.id,
      supplier_id:   newP.supplierId   || null,
      supplier_name: newP.supplierName || "",
      date:          newP.date,
      status:        newP.status,
      total:         newP.total,
      items:         newP.items,
      notes:         newP.notes || "",
    };
    await supabase.from("purchases").insert(dbP);
    setPurchases((p) => [newP, ...p]);
    if (newP.status === "reçu") await addToStock(newP.items);
    await addAudit("Achat enregistré", { id: newP.id, fournisseur: newP.supplierName, total: newP.total });
    return newP;
  }

  async function updatePurchaseStatus(id, status) {
    const wasPending = purchases.find((p) => p.id === id)?.status !== "reçu";
    await supabase.from("purchases").update({ status }).eq("id", id);
    setPurchases((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    if (status === "reçu" && wasPending) {
      const purchase = purchases.find((p) => p.id === id);
      if (purchase) await addToStock(purchase.items);
    }
    await addAudit("Statut achat modifié", { id, status });
  }

  async function deletePurchase(id) {
    await supabase.from("purchases").delete().eq("id", id);
    setPurchases((p) => p.filter((x) => x.id !== id));
    await addAudit("Achat supprimé", { id });
  }

  // ── Abonnements récurrents ────────────────────────────────────────────────
  async function addRecurringSub(sub) {
    const id  = "rsub_" + Date.now();
    const now = new Date().toISOString().slice(0, 10);
    const dbSub = {
      id,
      client_id:   sub.clientId  || null,
      client_name: sub.clientName,
      phone:       sub.phone     || "",
      address:     sub.address   || "",
      items:       sub.items,
      frequency:   sub.frequency,
      next_date:   sub.nextDate  || null,
      status:      sub.status    || "actif",
      created_at:  now,
    };
    await supabase.from("recurring_subs").insert(dbSub);
    const mapped = mapSub(dbSub);
    setRecurringSubs((p) => [...p, mapped]);
    await addAudit("Abonnement récurrent créé", { client: sub.clientName });
    return mapped;
  }

  async function updateRecurringSub(id, updates) {
    const dbUpdates = {};
    if (updates.status    !== undefined) dbUpdates.status    = updates.status;
    if (updates.nextDate  !== undefined) dbUpdates.next_date = updates.nextDate;
    if (updates.items     !== undefined) dbUpdates.items     = updates.items;
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    await supabase.from("recurring_subs").update(dbUpdates).eq("id", id);
    setRecurringSubs((p) => p.map((s) => s.id === id ? { ...s, ...updates } : s));
    await addAudit("Abonnement récurrent modifié", { id });
  }

  async function deleteRecurringSub(id) {
    await supabase.from("recurring_subs").delete().eq("id", id);
    setRecurringSubs((p) => p.filter((s) => s.id !== id));
    await addAudit("Abonnement récurrent supprimé", { id });
  }

  return (
    <AuthContext.Provider value={{
      user, appReady, login, logout, register, verifyPassword,
      orders, addOrder, updateOrderStatus, deleteOrder, cancelOrder,
      users, addUser, updateUser, deleteUser,
      auditLogs, clearAudit,
      suppliers, addSupplier, updateSupplier, deleteSupplier,
      purchases, addPurchase, updatePurchaseStatus, deletePurchase,
      stock, updateStockItem,
      recurringSubs, addRecurringSub, updateRecurringSub, deleteRecurringSub,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
