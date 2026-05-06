import { fmt } from "../data/data";

function formatPhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("221")) return cleaned;
  if (cleaned.startsWith("0")) return "221" + cleaned.slice(1);
  return "221" + cleaned;
}

function buildWhatsAppText(order) {
  const lines = [
    `🧾 *FACTURE SALAMSA*`,
    `📋 Commande : ${order.id}`,
    `📅 Date : ${order.date}`,
    `👤 Client : ${order.client}`,
    `📍 Adresse : ${order.address || "—"}`,
    ``,
    `*Détail de la commande :*`,
    ...order.items.map((it) => `  • ${it.name} × ${it.qty}  →  ${fmt(it.price * it.qty)}`),
    ``,
    `💰 *Total : ${fmt(order.total)}*`,
    ``,
    `Merci pour votre confiance ! 🙏`,
    `salamsa.sn`,
  ];
  return lines.join("\n");
}

function printInvoice(order) {
  const rows = order.items
    .map(
      (it) => `<tr>
        <td>${it.name}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:right">${fmt(it.price)}</td>
        <td style="text-align:right">${fmt(it.price * it.qty)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture ${order.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; padding: 40px; max-width: 680px; margin: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand { font-size: 32px; font-style: italic; color: #1e3a12; font-weight: 700; }
    .brand span { color: #e8a020; }
    .inv-meta { text-align: right; font-size: 13px; color: #555; }
    .inv-meta strong { display: block; font-size: 18px; color: #222; margin-bottom: 4px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; font-weight: 600; }
    .client-box { background: #f7f7f7; border-radius: 10px; padding: 14px 18px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #1e3a12; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; letter-spacing: 0.5px; }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    tr:last-child td { border-bottom: none; }
    .total-row { background: #f0f7e8; font-weight: 700; font-size: 16px; }
    .total-row td { padding: 14px 12px; }
    .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #aaa; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 6px;
      background: ${order.status === "Livrée" ? "#e8f7e8" : "#fff3cd"};
      color: ${order.status === "Livrée" ? "#27ae60" : "#856404"}; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">salamsa<span>.</span></div>
      <div style="font-size:12px;color:#888;margin-top:4px">Des produits frais &amp; savoureux</div>
    </div>
    <div class="inv-meta">
      <strong>${order.id}</strong>
      Date : ${order.date}<br/>
      <span class="badge">${order.status}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Informations client</div>
    <div class="client-box">
      <strong>${order.client}</strong><br/>
      ${order.phone ? `📞 ${order.phone}<br/>` : ""}
      ${order.address ? `📍 ${order.address}` : ""}
      ${order.abonnement ? `<br/>Abonnement : <strong>${order.abonnement}</strong>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Produits commandés</div>
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th style="text-align:center">Qté</th>
          <th style="text-align:right">Prix unit.</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3">TOTAL</td>
          <td style="text-align:right">${fmt(order.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    Merci pour votre confiance — salamsa.sn
  </div>
  <script>window.print();</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: 20,
  },
  modal: {
    background: "#fff", borderRadius: 20, width: "100%", maxWidth: 540,
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    padding: "22px 28px 16px",
    borderBottom: "1px solid #eee",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  title:    { fontSize: 18, fontWeight: 700, color: "#1e3a12" },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa", lineHeight: 1 },
  body:     { padding: "20px 28px" },
  brand:    { fontFamily: "'Playfair Display', serif", fontSize: 28, fontStyle: "italic", color: "#1e3a12", marginBottom: 4 },
  meta:     { fontSize: 13, color: "#888", marginBottom: 16 },
  clientBox:{ background: "#f7f7f7", borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 20 },
  table:    { width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 },
  th:       { background: "#1e3a12", color: "#fff", padding: "8px 10px", textAlign: "left", fontSize: 11, letterSpacing: 0.5 },
  td:       { padding: "9px 10px", borderBottom: "1px solid #eee" },
  totalRow: { background: "#f0f7e8", fontWeight: 700, fontSize: 15 },
  actions:  { display: "flex", gap: 12, padding: "16px 28px 24px", borderTop: "1px solid #eee", flexWrap: "wrap" },
  btnPrint: {
    flex: 1, minWidth: 120, padding: "12px", background: "#1e3a12", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  btnWA: {
    flex: 1, minWidth: 120, padding: "12px", background: "#25D366", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
};

export default function InvoiceModal({ order, onClose }) {
  if (!order) return null;

  function handleWhatsApp() {
    const phone = formatPhone(order.phone);
    const text  = buildWhatsAppText(order);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="invoice-overlay" style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="invoice-modal" style={S.modal}>
        <div style={S.header}>
          <span style={S.title}>Facture — {order.id}</span>
          <button style={S.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={S.body}>
          <div style={S.brand}>salamsa<span style={{ color: "#e8a020" }}>.</span></div>
          <div style={S.meta}>
            Date : <strong>{order.date}</strong> &nbsp;·&nbsp; Statut : <strong>{order.status}</strong>
          </div>

          <div style={S.clientBox}>
            <strong>{order.client}</strong>
            {order.phone && <> &nbsp;·&nbsp; {order.phone}</>}
            {order.address && <div style={{ marginTop: 3, color: "#555" }}>{order.address}</div>}
            {order.abonnement && (
              <div style={{ marginTop: 3, color: "#5a8a3c", fontSize: 12 }}>Abonnement {order.abonnement}</div>
            )}
          </div>

          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Produit</th>
                <th style={{ ...S.th, textAlign: "center" }}>Qté</th>
                <th style={{ ...S.th, textAlign: "right" }}>Unit.</th>
                <th style={{ ...S.th, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i}>
                  <td style={S.td}>{it.name}</td>
                  <td style={{ ...S.td, textAlign: "center" }}>{it.qty}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{fmt(it.price)}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{fmt(it.price * it.qty)}</td>
                </tr>
              ))}
              <tr style={S.totalRow}>
                <td style={{ ...S.td, borderBottom: "none" }} colSpan={3}>TOTAL</td>
                <td style={{ ...S.td, textAlign: "right", borderBottom: "none" }}>{fmt(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={S.actions}>
          <button style={S.btnPrint} onClick={() => printInvoice(order)}>
            🖨️ Imprimer / PDF
          </button>
          {order.phone && (
            <button style={S.btnWA} onClick={handleWhatsApp}>
              📲 WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
