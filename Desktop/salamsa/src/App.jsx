import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import LoginPage     from "./pages/LoginPage";
import ClientApp     from "./pages/client/ClientApp";
import AdminApp      from "./pages/admin/AdminApp";
import SuperAdminApp from "./pages/superadmin/SuperAdminApp";

function AppRouter() {
  const { user, appReady } = useAuth();

  if (!appReady) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0d2208 0%, #1e3a12 40%, #2d5a1b 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
      }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, color: "#faf7f2", fontStyle: "italic", margin: 0 }}>
          salamsa<span style={{ color: "#e8a020" }}>.</span>
        </p>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#e8a020", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (user.role === "client")     return <ClientApp />;
  if (user.role === "admin")      return <AdminApp />;
  if (user.role === "superadmin") return <SuperAdminApp />;
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<AppRouter />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
