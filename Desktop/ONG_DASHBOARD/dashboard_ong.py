import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from dash import Dash, html, dcc, Input, Output, callback
import dash
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PREFERRED_FILES = ["ong_sahel_avenir_2026.xlsx", "ong_sahel_avenir_2024.xlsx"]
DATA_FILE = next((BASE_DIR / f for f in PREFERRED_FILES if (BASE_DIR / f).is_file()), None)
# ── Données ───────────────────────────────────────────────────────────────────
if DATA_FILE is not None:
    print(f"ℹ️ Chargement des données depuis {DATA_FILE}")
else:
    print(f"⚠️  Aucun fichier trouvé dans {BASE_DIR} ({', '.join(PREFERRED_FILES)}), génération de données de démonstration.")

if DATA_FILE:
    df_act    = pd.read_excel(DATA_FILE, sheet_name="Activités")
    df_budget = pd.read_excel(DATA_FILE, sheet_name="Budget")
    df_impact = pd.read_excel(DATA_FILE, sheet_name="Impact régional")
else:
    regions = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kolda", "Kaolack", "Fatick", "Matam","M'bour","Louga","Tambacounda","Kédougou"]
    activites = ["Semences", "Irrigation", "Formation", "Santé", "Education"]
    mois_num = list(range(1, 13))

    rows = []
    for region in regions:
        for activite in activites:
            for mois in mois_num:
                rows.append({
                    "region": region,
                    "activite": activite,
                    "mois_num": mois,
                    "beneficiaires_planifies": np.random.randint(50, 500),
                    "beneficiaires_realises": np.random.randint(30, 550),
                })
    df_act = pd.DataFrame(rows)

    rows = []
    for region in regions:
        for composante in ["Composante 1", "Composante 2", "Composante 3", "Composante 4", "Composante 5"]:
            for mois in mois_num:
                rows.append({
                    "region": region,
                    "composante": composante,
                    "mois_num": mois,
                    "budget_planifie": np.random.randint(2_000_000, 20_000_000),
                    "depenses_reelles": np.random.randint(1_500_000, 22_000_000),
                })
    df_budget = pd.DataFrame(rows)

    rows = []
    for region in regions:
        rows.append({
            "region": region,
            "menages_touches": np.random.randint(1000, 15000),
            "taux_couverture": np.random.uniform(30, 95),
            "enfants_pris_charge": np.random.randint(500, 8000),
        })
    df_impact = pd.DataFrame(rows)

BUDGET_TOTAL = 850_000_000
REGIONS      = sorted(df_act["region"].unique())
ACTIVITES    = sorted(df_act["activite"].unique())
MOIS_LABELS  = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"]

# ── Palette ───────────────────────────────────────────────────────────────────
TEAL   = "#0F286E"
TEAL_M = "#1D9E75"
TEAL_L = "#5DCAA5"
DARK   = "#0D1117"
DARK2  = "#161B22"
DARK3  = "#21262D"
GRAY   = "#8B949E"
GRAY_L = "#C9D1D9"
WHITE  = "#F0F6FC"
AMBER  = "#D29922"
RED    = "#F85149"
PURPLE = "#7C6FCD"

PLOT_LAYOUT = dict(
    plot_bgcolor=DARK2, paper_bgcolor="rgba(0,0,0,0)",
    font=dict(family="'DM Sans','Segoe UI',sans-serif", color=GRAY_L, size=12),
    margin=dict(t=40, b=30, l=50, r=20),
    legend=dict(font=dict(size=11), orientation="h", y=1.12),
)

def fmt_fcfa(n):
    if n >= 1_000_000_000: return f"{n/1_000_000_000:.2f}Md"
    if n >= 1_000_000:     return f"{n/1_000_000:.0f}M"
    if n >= 1_000:         return f"{n/1_000:.0f}k"
    return str(int(n))

def fmt_full(n):
    return f"{n:,.0f} FCFA"

# ── App ───────────────────────────────────────────────────────────────────────
app = Dash(__name__, suppress_callback_exceptions=True)
app.title = "Dashboard ONG — Sahel Avenir 2026"

# ── Layout ────────────────────────────────────────────────────────────────────
app.layout = html.Div(style={"background": DARK, "minHeight": "100vh", "fontFamily": "'DM Sans','Segoe UI',sans-serif"}, children=[

    # Header
    html.Div(style={
        "background": f"linear-gradient(135deg, #0a2e24 0%, {TEAL} 100%)",
        "padding": "1.25rem 2rem",
        "borderBottom": f"1px solid rgba(29,158,117,0.3)",
        "display": "flex", "justifyContent": "space-between", "alignItems": "center"
    }, children=[
        html.Div([
            html.H1("Tableau de Bord de Pilotage", style={"color": WHITE, "fontSize": "1.35rem", "fontWeight": "600", "margin": "0 0 3px"}),
            html.P("ONG Sahel Avenir · Programme Sécurité Alimentaire & Nutrition · Sénégal 2026",
                   style={"color": "rgba(159,225,203,0.85)", "fontSize": "0.78rem", "margin": 0}),
        ]),
        html.Div([
            html.Span("Bailleur : UE + USAID", style={"background": "rgba(255,255,255,0.12)", "border": "1px solid rgba(255,255,255,0.2)", "padding": "5px 14px", "borderRadius": "20px", "fontSize": "0.75rem", "color": WHITE, "marginRight": "8px"}),
            html.Span("Budget : 850M FCFA", style={"background": TEAL_M, "padding": "5px 14px", "borderRadius": "20px", "fontSize": "0.75rem", "color": WHITE, "fontWeight": "500"}),
        ])
    ]),

    # Filtres
    html.Div(style={"background": DARK2, "borderBottom": f"1px solid {DARK3}", "padding": "0.9rem 2rem", "display": "flex", "gap": "1.5rem", "alignItems": "center"}, children=[
        html.Div([
            html.Label("Région", style={"fontSize": "0.7rem", "color": GRAY, "display": "block", "marginBottom": "4px", "textTransform": "uppercase", "letterSpacing": "0.06em"}),
            dcc.Dropdown(id="filter-region",
                options=[{"label": "Toutes les régions", "value": "ALL"}] + [{"label": r, "value": r} for r in REGIONS],
                value="ALL", clearable=False,
                style={"width": "200px", "fontSize": "13px"},
            )
        ]),
        html.Div([
            html.Label("Activité", style={"fontSize": "0.7rem", "color": GRAY, "display": "block", "marginBottom": "4px", "textTransform": "uppercase", "letterSpacing": "0.06em"}),
            dcc.Dropdown(id="filter-activite",
                options=[{"label": "Toutes les activités", "value": "ALL"}] + [{"label": a, "value": a} for a in ACTIVITES],
                value="ALL", clearable=False,
                style={"width": "300px", "fontSize": "13px"},
            )
        ]),
        html.Div([
            html.Label("Période", style={"fontSize": "0.7rem", "color": GRAY, "display": "block", "marginBottom": "4px", "textTransform": "uppercase", "letterSpacing": "0.06em"}),
            dcc.RangeSlider(id="filter-mois", min=1, max=12, step=1, value=[1, 12],
                marks={i: {"label": MOIS_LABELS[i-1], "style": {"color": GRAY, "fontSize": "11px"}} for i in range(1, 13)},
                tooltip={"always_visible": False},
            )
        ], style={"flex": 1}),
    ]),

    # KPIs
    html.Div(id="kpis", style={"display": "grid", "gridTemplateColumns": "repeat(6,1fr)", "gap": "12px", "padding": "1.25rem 2rem 0"}),

    # Charts Row 1
    html.Div(style={"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "16px", "padding": "1.25rem 2rem 0"}, children=[
        html.Div(id="chart-benef-mois", style={"background": DARK2, "borderRadius": "12px", "border": f"1px solid {DARK3}", "padding": "1rem"}),
        html.Div(id="chart-budget-cumul", style={"background": DARK2, "borderRadius": "12px", "border": f"1px solid {DARK3}", "padding": "1rem"}),
    ]),

    # Charts Row 2
    html.Div(style={"display": "grid", "gridTemplateColumns": "3fr 2fr", "gap": "16px", "padding": "1.25rem 2rem 0"}, children=[
        html.Div(id="chart-region", style={"background": DARK2, "borderRadius": "12px", "border": f"1px solid {DARK3}", "padding": "1rem"}),
        html.Div(id="chart-activite", style={"background": DARK2, "borderRadius": "12px", "border": f"1px solid {DARK3}", "padding": "1rem"}),
    ]),

    # Charts Row 3
    html.Div(style={"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "16px", "padding": "1.25rem 2rem 0"}, children=[
        html.Div(id="chart-budget-comp", style={"background": DARK2, "borderRadius": "12px", "border": f"1px solid {DARK3}", "padding": "1rem"}),
        html.Div(id="chart-impact", style={"background": DARK2, "borderRadius": "12px", "border": f"1px solid {DARK3}", "padding": "1rem"}),
    ]),

    # Footer
    html.Div("Dashboard réalisé par Yiiniyé Yacinn Joseph DIASSO — Consultant Business Analyst & Data Strategy · Dakar, Sénégal · 2026 · Données fictives à des fins de démonstration",
             style={"textAlign": "center", "padding": "1.5rem", "fontSize": "0.68rem", "color": "#484F58", "borderTop": f"1px solid {DARK3}", "marginTop": "1.5rem"}),
])


# ── Callbacks ─────────────────────────────────────────────────────────────────
@app.callback(
    Output("kpis", "children"),
    Output("chart-benef-mois", "children"),
    Output("chart-budget-cumul", "children"),
    Output("chart-region", "children"),
    Output("chart-activite", "children"),
    Output("chart-budget-comp", "children"),
    Output("chart-impact", "children"),
    Input("filter-region", "value"),
    Input("filter-activite", "value"),
    Input("filter-mois", "value"),
)
def update(region, activite, mois_range):
    m1, m2 = mois_range

    # Filtres activités
    dfa = df_act.copy()
    if region != "ALL":  dfa = dfa[dfa["region"] == region]
    if activite != "ALL": dfa = dfa[dfa["activite"] == activite]
    dfa = dfa[(dfa["mois_num"] >= m1) & (dfa["mois_num"] <= m2)]

    # Filtres budget
    dfb = df_budget[(df_budget["mois_num"] >= m1) & (df_budget["mois_num"] <= m2)].copy()

    # ── KPIs ──────────────────────────────────────────────────────────────────
    total_realises  = dfa["beneficiaires_realises"].sum()
    total_planifies = dfa["beneficiaires_planifies"].sum()
    taux_real       = total_realises / total_planifies * 100 if total_planifies else 0
    total_dep       = dfb["depenses_reelles"].sum()
    taux_absorp     = total_dep / BUDGET_TOTAL * 100
    total_plan_b    = dfb["budget_planifie"].sum()
    ecart_budget    = total_dep - total_plan_b
    nb_regions      = dfa["region"].nunique()

    def kpi(label, value, sub, color, border_color):
        return html.Div(style={
            "background": DARK2, "border": f"1px solid {DARK3}",
            "borderLeft": f"3px solid {border_color}",
            "borderRadius": "12px", "padding": "1rem 1.1rem"
        }, children=[
            html.Div(label, style={"fontSize": "0.68rem", "color": GRAY, "textTransform": "uppercase", "letterSpacing": "0.06em", "marginBottom": "6px"}),
            html.Div(value, style={"fontSize": "1.4rem", "fontWeight": "600", "color": color, "marginBottom": "3px"}),
            html.Div(sub,   style={"fontSize": "0.7rem", "color": GRAY}),
        ])

    kpis = [
        kpi("Bénéficiaires atteints", f"{total_realises:,}", f"sur {total_planifies:,} planifiés", TEAL_M, TEAL_M),
        kpi("Taux de réalisation",    f"{taux_real:.1f}%",  "vs objectif programme", TEAL_L if taux_real >= 90 else AMBER, TEAL_M),
        kpi("Dépenses cumulées",      f"{fmt_fcfa(total_dep)} FCFA", f"sur 850M budget total", WHITE, PURPLE),
        kpi("Ecart budgétaire",       f"{fmt_fcfa(ecart_budget)} FCFA", f"{fmt_fcfa(total_plan_b)} budget planifié", RED if ecart_budget > 0 else TEAL_M, RED if ecart_budget > 0 else TEAL_M),
        kpi("Taux d'absorption",      f"{taux_absorp:.1f}%", "du budget programme", AMBER, AMBER),
        kpi("Régions couvertes",      str(nb_regions),      "sur 8 régions cibles", TEAL_L, TEAL),
    ]

    # ── Chart 1 : Bénéficiaires mensuel ───────────────────────────────────────
    bm = dfa.groupby("mois_num").agg(planifie=("beneficiaires_planifies","sum"), realise=("beneficiaires_realises","sum")).reset_index()
    bm["label"] = [MOIS_LABELS[i-1] for i in bm["mois_num"]]
    bm["couleur"] = bm.apply(lambda r: TEAL_M if r["realise"]/r["planifie"] >= 0.9 else (AMBER if r["realise"]/r["planifie"] >= 0.75 else RED), axis=1)

    fig1 = go.Figure()
    fig1.add_trace(go.Bar(x=bm["label"], y=bm["realise"], name="Réalisés", marker_color=bm["couleur"].tolist(), marker_line_width=0,
        hovertemplate="<b>%{x}</b><br>Réalisés : %{y:,}<br>Planifiés : %{customdata:,}<extra></extra>", customdata=bm["planifie"]))
    fig1.add_trace(go.Scatter(x=bm["label"], y=bm["planifie"], mode="lines+markers", name="Objectif",
        line=dict(color=GRAY, dash="dot", width=1.5), marker=dict(size=5, color=GRAY)))
    fig1.update_layout(**PLOT_LAYOUT, title=dict(text="Bénéficiaires atteints vs objectifs", font=dict(size=13, color=WHITE), x=0),
        yaxis=dict(showgrid=True, gridcolor=DARK3, color=GRAY), xaxis=dict(color=GRAY), height=290)

    # ── Chart 2 : Budget cumulé ───────────────────────────────────────────────
    bc = dfb.groupby("mois_num").agg(planifie=("budget_planifie","sum"), realise=("depenses_reelles","sum")).reset_index()
    bc["label"] = [MOIS_LABELS[i-1] for i in bc["mois_num"]]
    bc["cum_plan"] = bc["planifie"].cumsum()
    bc["cum_real"] = bc["realise"].cumsum()

    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(x=bc["label"], y=bc["cum_plan"], name="Budget planifié cumulé",
        line=dict(color=GRAY, dash="dot", width=1.5), mode="lines+markers", marker=dict(size=5)))
    fig2.add_trace(go.Scatter(x=bc["label"], y=bc["cum_real"], name="Dépenses réelles cumulées",
        line=dict(color=TEAL_M, width=2.5), mode="lines+markers", marker=dict(size=6, color=TEAL_M),
        fill="tozeroy", fillcolor="rgba(15,110,86,0.12)"))
    fig2.update_layout(**PLOT_LAYOUT, title=dict(text="Exécution budgétaire cumulée", font=dict(size=13, color=WHITE), x=0),
        yaxis=dict(showgrid=True, gridcolor=DARK3, color=GRAY, tickformat=",.0f"), xaxis=dict(color=GRAY), height=290)

    # ── Chart 3 : Couverture par région ──────────────────────────────────────
    rg = dfa.groupby("region").agg(planifie=("beneficiaires_planifies","sum"), realise=("beneficiaires_realises","sum")).reset_index()
    rg["taux"] = rg["realise"] / rg["planifie"] * 100
    rg = rg.sort_values("realise", ascending=True)

    fig3 = go.Figure()
    fig3.add_trace(go.Bar(x=rg["realise"], y=rg["region"], orientation="h", name="Réalisés",
        marker=dict(color=rg["realise"], colorscale=[[0,"#0a2e24"],[1,TEAL_L]], line_width=0),
        hovertemplate="<b>%{y}</b><br>Réalisés : %{x:,}<br>Taux : %{customdata:.1f}%<extra></extra>", customdata=rg["taux"]))
    fig3.update_layout(**{**PLOT_LAYOUT, "margin": dict(t=40,b=30,l=120,r=20)}, title=dict(text="Bénéficiaires atteints par région", font=dict(size=13, color=WHITE), x=0),
        xaxis=dict(showgrid=True, gridcolor=DARK3, color=GRAY), yaxis=dict(color=GRAY), height=310)

    # ── Chart 4 : Taux réalisation par activité ────────────────────────────
    av = dfa.groupby("activite").agg(planifie=("beneficiaires_planifies","sum"), realise=("beneficiaires_realises","sum")).reset_index()
    av["taux"] = av["realise"] / av["planifie"] * 100
    av = av.sort_values("taux", ascending=True)
    av["couleur"] = av["taux"].apply(lambda x: TEAL_M if x >= 90 else (AMBER if x >= 75 else RED))
    av["label_court"] = av["activite"].apply(lambda x: x[:28]+"…" if len(x) > 28 else x)

    fig4 = go.Figure(go.Bar(
        x=av["taux"], y=av["label_court"], orientation="h",
        marker_color=av["couleur"].tolist(), marker_line_width=0,
        hovertemplate="<b>%{customdata}</b><br>Taux : %{x:.1f}%<extra></extra>", customdata=av["activite"]
    ))
    fig4.add_vline(x=90, line_dash="dot", line_color=GRAY, line_width=1, annotation_text="90%", annotation_font_color=GRAY, annotation_font_size=10)
    fig4.update_layout(**{**PLOT_LAYOUT, "margin": dict(t=40,b=30,l=210,r=20)}, title=dict(text="Taux de réalisation par activité", font=dict(size=13, color=WHITE), x=0),
        xaxis=dict(showgrid=True, gridcolor=DARK3, color=GRAY, ticksuffix="%", range=[0,115]),
        yaxis=dict(color=GRAY), height=310)

    # ── Chart 5 : Budget par composante ───────────────────────────────────────
    bc2 = dfb.groupby("composante").agg(planifie=("budget_planifie","sum"), realise=("depenses_reelles","sum")).reset_index()
    bc2["ecart_pct"] = (bc2["realise"] - bc2["planifie"]) / bc2["planifie"] * 100
    bc2 = bc2.sort_values("planifie", ascending=False)
    colors5 = [TEAL_M, PURPLE, AMBER, "#185FA5", "#3B6D11"]

    fig5 = go.Figure()
    fig5.add_trace(go.Bar(name="Planifié", x=bc2["composante"], y=bc2["planifie"],
        marker_color=DARK3, marker_line_color=GRAY, marker_line_width=0.8,
        hovertemplate="Planifié : %{customdata}<extra></extra>", customdata=bc2["planifie"].apply(lambda x: fmt_fcfa(x)+" FCFA")))
    fig5.add_trace(go.Bar(name="Réalisé", x=bc2["composante"], y=bc2["realise"],
        marker_color=[TEAL_M, PURPLE, AMBER, "#185FA5", "#3B6D11"][:len(bc2)], marker_line_width=0,
        hovertemplate="Réalisé : %{customdata[0]}<br>Taux : %{customdata[1]:.1f}%<extra></extra>",
        customdata=list(zip(bc2["realise"].apply(lambda x: fmt_fcfa(x)+" FCFA"), (bc2["realise"]/bc2["planifie"]*100)))))
    fig5.update_layout(**{**PLOT_LAYOUT, "margin": dict(t=40,b=30,l=120,r=20)}, barmode="group",
        title=dict(text="Exécution budgétaire par composante", font=dict(size=13, color=WHITE), x=0),
        yaxis=dict(showgrid=True, gridcolor=DARK3, color=GRAY, tickformat=",.0f"),
        xaxis=dict(color=GRAY, tickangle=-15, tickfont=dict(size=10)), height=310)

    # ── Chart 6 : Indicateurs d'impact (scatter) ──────────────────────────────
    dfi = df_impact.copy()
    if region != "ALL": dfi = dfi[dfi["region"] == region]

    fig6 = go.Figure()
    fig6.add_trace(go.Bar(
        x=dfi["region"], y=dfi["menages_touches"], name="Ménages touchés",
        marker_color=TEAL_M, marker_line_width=0,
        hovertemplate="<b>%{x}</b><br>Ménages touchés : %{y:,}<br>Couverture : %{customdata:.1f}%<extra></extra>",
        customdata=dfi["taux_couverture"]
    ))
    fig6.add_trace(go.Scatter(
        x=dfi["region"], y=dfi["enfants_pris_charge"], name="Enfants pris en charge",
        yaxis="y2", mode="lines+markers",
        line=dict(color=AMBER, width=2), marker=dict(size=7, color=AMBER),
        hovertemplate="<b>%{x}</b><br>Enfants pris en charge : %{y:,}<extra></extra>"
    ))
    fig6.update_layout(**PLOT_LAYOUT,
        title=dict(text="Indicateurs d'impact par région", font=dict(size=13, color=WHITE), x=0),
        yaxis=dict(showgrid=True, gridcolor=DARK3, color=GRAY, title="Ménages"),
        yaxis2=dict(overlaying="y", side="right", color=AMBER, showgrid=False, title="Enfants"),
        xaxis=dict(color=GRAY), height=310)

    cfg = {"displayModeBar": False}
    return (
        kpis,
        dcc.Graph(figure=fig1, config=cfg),
        dcc.Graph(figure=fig2, config=cfg),
        dcc.Graph(figure=fig3, config=cfg),
        dcc.Graph(figure=fig4, config=cfg),
        dcc.Graph(figure=fig5, config=cfg),
        dcc.Graph(figure=fig6, config=cfg),
    )


if __name__ == "__main__":
    print("\n✓ Dashboard ONG prêt.")
    print("  Ouvre http://127.0.0.1:8050 dans ton navigateur\n")
    app.run(debug=False, port=8050)
