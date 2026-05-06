import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(145deg, #0d2208 0%, #1e3a12 40%, #2d5a1b 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    padding: 20,
  },
  card: {
    background: "#faf7f2",
    borderRadius: 24,
    padding: "48px 40px",
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
  },
  logo: { textAlign: "center", marginBottom: 28 },
  logoText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 38,
    color: "#1e3a12",
    fontStyle: "italic",
    margin: 0,
  },
  label: {
    fontSize: 11,
    color: "#888",
    marginBottom: 6,
    display: "block",
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    border: "1.5px solid #e0d8cc",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  },
  btn: (color = "#1e3a12") => ({
    width: "100%",
    padding: "14px",
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 20,
    letterSpacing: 0.5,
  }),
  error: {
    background: "#fde8e8",
    color: "#c0392b",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  locked: {
    background: "#fff3cd",
    color: "#856404",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
    border: "1px solid #ffc107",
  },
  success: {
    background: "#e8f7e8",
    color: "#27ae60",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  toggle: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#888",
  },
  toggleLink: {
    color: "#1e3a12",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "underline",
  },
  field: { marginBottom: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
};

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode]       = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [locked,  setLocked]  = useState(false);

  // Login fields
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "", phone: "", address: "",
  });

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleLogin() {
    if (!email || !password) { setError("Remplissez tous les champs"); return; }
    if (!EMAIL_RE.test(email)) { setError("Adresse email invalide"); return; }
    setLoading(true);
    const result = await login(email, password);
    if (!result.ok) { setError(result.error); setLocked(!!result.locked); }
    setLoading(false);
  }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError("Remplissez les champs obligatoires"); return;
    }
    if (!EMAIL_RE.test(form.email)) { setError("Adresse email invalide"); return; }
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas"); return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères"); return;
    }
    setLoading(true);
    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      address: form.address,
    });
    if (!result.ok) setError(result.error);
    setLoading(false);
  }

  function switchMode(m) {
    setMode(m);
    setError(""); setLocked(false);
    setEmail(""); setPassword("");
    setForm({ name: "", email: "", password: "", confirm: "", phone: "", address: "" });
  }

  function setF(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setError("");
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <p style={S.logoText}>
            salamsa<span style={{ color: "#e8a020" }}>.</span>
          </p>
          <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>
            {mode === "login" ? "Des produits frais, savoureux et accessibles" : "Créer votre compte client"}
          </p>
        </div>

        {/* ── CONNEXION ─────────────────────────────────────────── */}
        {mode === "login" && (
          <>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input
                style={S.input}
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Mot de passe</label>
              <input
                style={S.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {error && <div style={locked ? S.locked : S.error}>{locked ? "🔒 " : "⚠️ "}{error}</div>}

            <button
              style={{ ...S.btn(), opacity: loading || locked ? 0.7 : 1 }}
              onClick={handleLogin}
              disabled={loading || locked}
            >
              {loading ? "Connexion..." : "Se connecter →"}
            </button>

            <div style={S.toggle}>
              Pas encore de compte ?{" "}
              <span style={S.toggleLink} onClick={() => switchMode("register")}>
                S'inscrire
              </span>
            </div>
          </>
        )}

        {/* ── INSCRIPTION ───────────────────────────────────────── */}
        {mode === "register" && (
          <>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Nom complet *</label>
                <input
                  style={S.input}
                  placeholder="Votre nom"
                  value={form.name}
                  onChange={(e) => setF("name", e.target.value)}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Téléphone</label>
                <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e0d8cc", borderRadius: 10, background: "#fff", overflow: "hidden" }}>
                  <span style={{ padding: "12px 10px 12px 15px", fontSize: 13, color: "#555", fontWeight: 600, whiteSpace: "nowrap", borderRight: "1px solid #e0d8cc", background: "#f7f5f0" }}>+221</span>
                  <input
                    style={{ ...S.input, border: "none", borderRadius: 0, flex: 1 }}
                    placeholder="77 000 00 00"
                    value={form.phone.replace(/^\+221\s?/, "")}
                    onChange={(e) => setF("phone", e.target.value ? "+221 " + e.target.value.replace(/^\+221\s?/, "") : "")}
                  />
                </div>
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Email *</label>
              <input
                style={S.input}
                type="email"
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => setF("email", e.target.value)}
              />
            </div>

            <div style={S.field}>
              <label style={S.label}>Adresse de livraison</label>
              <input
                style={S.input}
                placeholder="Dakar, Médina..."
                value={form.address}
                onChange={(e) => setF("address", e.target.value)}
              />
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Mot de passe *</label>
                <input
                  style={S.input}
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setF("password", e.target.value)}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Confirmer *</label>
                <input
                  style={S.input}
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={(e) => setF("confirm", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>
            </div>

            {error && <div style={S.error}>{error}</div>}

            <button
              style={{ ...S.btn("#5a8a3c"), opacity: loading ? 0.7 : 1 }}
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "Création du compte..." : "Créer mon compte →"}
            </button>

            <div style={S.toggle}>
              Déjà un compte ?{" "}
              <span style={S.toggleLink} onClick={() => switchMode("login")}>
                Se connecter
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
