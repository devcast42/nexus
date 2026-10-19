# Figuras del protocolo de evaluación, a partir de docs/evaluacion.json.
# Salida: PNG a 300 dpi, ancho de columna completo (16 cm), listas para Word.
import json, pathlib
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

D = json.load(open("docs/evaluacion.json"))
OUT = pathlib.Path("docs/figuras"); OUT.mkdir(parents=True, exist_ok=True)

AZUL, NARANJA, AQUA, VERDE = "#2a78d6", "#eb6834", "#1baf7a", "#008300"
TINTA, TINTA2, GRIS = "#0b0b0b", "#52514e", "#dcdcd8"
CM = 1/2.54
plt.rcParams.update({"font.size":9,"font.family":"DejaVu Sans","axes.edgecolor":TINTA2,
 "axes.labelcolor":TINTA,"text.color":TINTA,"xtick.color":TINTA2,"ytick.color":TINTA2,
 "axes.spines.top":False,"axes.spines.right":False,"figure.facecolor":"white","axes.facecolor":"white"})

def guardar(fig, nombre):
    fig.savefig(OUT/f"{nombre}.png", dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig); print(f"  docs/figuras/{nombre}.png")

# ── Figura 1. Cobertura de medición por dominio COBIT
d = D["e2_medicion"]; dom = d["porDominio"]
fig, ax = plt.subplots(figsize=(16*CM, 7*CM))
y = range(len(dom))[::-1]
nombres = {"EDM":"EDM","APO":"APO","BAI":"BAI","DSS":"DSS","MEA":"MEA"}
for i, (yy, x) in enumerate(zip(y, dom)):
    ax.barh(yy, x["measured"], height=.6, color=AZUL, zorder=3)
    ax.barh(yy, x["total"]-x["measured"], height=.6, left=x["measured"]+.12, color=GRIS, zorder=3)
    ax.text(x["total"]+.35, yy, f'{x["measured"]} de {x["total"]}', va="center", fontsize=8.5, color=TINTA2)
ax.set_yticks(list(y)); ax.set_yticklabels([nombres[x["code"]] for x in dom], fontweight="bold")
ax.set_xlabel("Objetivos de gobierno"); ax.set_xlim(0, 17)
ax.xaxis.set_major_locator(MaxNLocator(integer=True))
ax.set_title(f'Cobertura de medición: {d["cobertura"]["medidos"]} de {d["cobertura"]["total"]} objetivos '
             f'({d["cobertura"]["porcentaje"]} %) derivados de evidencia operativa', fontsize=9.5, loc="left", pad=12)
ax.legend(handles=[plt.Rectangle((0,0),1,1,color=AZUL), plt.Rectangle((0,0),1,1,color=GRIS)],
          labels=["Medido sobre evidencia", "Sin dato"], frameon=False, ncol=2, fontsize=8.5,
          loc="upper center", bbox_to_anchor=(.5, -.2))
ax.grid(axis="x", color=GRIS, lw=.6, zorder=0); ax.set_axisbelow(True)
guardar(fig, "fig1-cobertura")

# ── Figura 2. Discrepancias detectadas por regla
etiquetas = {"risk-over-appetite":"Riesgo sobre el apetito","change-without-evidence":"Cambio sin evidencia\nde aprobación",
 "control-ineffective":"Control inefectivo","recurring-incidents":"Incidentes recurrentes","sla-breach":"SLA incumplido",
 "security-data-exposure":"Evento de seguridad\ncon datos","security-uncontained-critical":"Crítico sin contención\nen 24 h"}
datos = {x["regla"]: x for x in D["e3_reglas"]["porRegla"]}
r = [{"regla":k, **datos.get(k, {"escaladas":0,"resueltas":0})} for k in etiquetas]
r = sorted(r, key=lambda x: (x["escaladas"]+x["resueltas"], x["escaladas"]))
fig, ax = plt.subplots(figsize=(16*CM, 8.5*CM))
y = range(len(r))
for yy, x in zip(y, r):
    izq = 0
    if x["escaladas"]:
        ax.barh(yy, x["escaladas"], height=.55, color=NARANJA, zorder=3)
        ax.text(x["escaladas"]/2, yy, x["escaladas"], va="center", ha="center", color="white", fontsize=8.5, fontweight="bold")
        izq = x["escaladas"]+.06
    if x["resueltas"]:
        ax.barh(yy, x["resueltas"], height=.55, left=izq, color=AQUA, zorder=3)
        ax.text(izq+x["resueltas"]/2, yy, x["resueltas"], va="center", ha="center", color="white", fontsize=8.5, fontweight="bold")
    if not x["escaladas"] and not x["resueltas"]:
        ax.text(.06, yy, "no se activó en este escenario", va="center", fontsize=8, color=TINTA2, style="italic")
ax.set_yticks(list(y)); ax.set_yticklabels([etiquetas[x["regla"]] for x in r], fontsize=8.5)
ax.set_ylim(-.65, len(r)-.35)
ax.set_xlabel("Discrepancias"); ax.set_xlim(0, max(3, max(x["escaladas"]+x["resueltas"] for x in r)+.6))
ax.xaxis.set_major_locator(MaxNLocator(integer=True))
e, s_ = D["e3_reglas"]["escaladas"], D["e3_reglas"]["resueltas"]
ax.set_title(f"Las siete reglas sobre 90 días de operación: {e} discrepancias escaladas al comité\ny {s_} resueltas dentro del mandato",
             fontsize=9.5, loc="left", pad=10)
ax.legend(handles=[plt.Rectangle((0,0),1,1,color=NARANJA), plt.Rectangle((0,0),1,1,color=AQUA)],
          labels=["Escalada al comité", "Resuelta dentro del mandato"], frameon=False, ncol=2, fontsize=8.5,
          loc="upper center", bbox_to_anchor=(.5, -.16))
ax.grid(axis="x", color=GRIS, lw=.6, zorder=0); ax.set_axisbelow(True)
guardar(fig, "fig2-reglas")

# ── Figura 3. Ciclo cerrado: la firma no mueve la medición; el hecho sí
c = D["e4_cicloCerrado"]
vals = [c["t0_trasDesplegarSinEvidencia"]["score"], c["t1_trasLaFirmaDelComite"]["score"], c["t2_trasAdjuntarEvidencia"]["score"]]
pasos = ["Cambio desplegado\nsin evidencia", "Firma del comité\n(0 operaciones)", "Evidencia adjuntada\npor la operación"]
fig, ax = plt.subplots(figsize=(16*CM, 7.5*CM))
ax.plot([0,1,2], vals, color=AZUL, lw=2, zorder=3, marker="o", markersize=9,
        markerfacecolor="white", markeredgewidth=2, markeredgecolor=AZUL)
for i, v in enumerate(vals):
    ax.annotate(f"{v}", (i, v), textcoords="offset points", xytext=(0,14), ha="center", fontsize=10, fontweight="bold", color=TINTA)
ax.annotate("sin cambio", xy=(.5, vals[0]), xytext=(.5, vals[0]-2.2), ha="center", fontsize=8.5, color=TINTA2)
ax.annotate(f"+{vals[2]-vals[1]}", xy=(1.5, (vals[1]+vals[2])/2), xytext=(1.62, (vals[1]+vals[2])/2-.6),
            fontsize=9, color=VERDE, fontweight="bold")
ax.set_xticks([0,1,2]); ax.set_xticklabels(pasos, fontsize=8.5)
ax.set_xlim(-.35, 2.35); ax.set_ylim(min(vals)-4, max(vals)+4)
ax.set_ylabel(f'BAI06 · cambios con evidencia\nde aprobación (n = {c["t0_trasDesplegarSinEvidencia"]["sample"]})', fontsize=8.5)
ax.set_title("La firma del comité no modifica la medición; el hecho operativo sí", fontsize=9.5, loc="left", pad=12)
ax.grid(axis="y", color=GRIS, lw=.6, zorder=0); ax.set_axisbelow(True)
guardar(fig, "fig3-ciclo-cerrado")

# ── Figura 4. Tamaño de muestra de cada indicador
objs = sorted(D["e2_medicion"]["objetivos"], key=lambda o: -o["muestra"])
fig, ax = plt.subplots(figsize=(16*CM, 7*CM))
x = range(len(objs))
ax.bar(x, [o["muestra"] for o in objs], color=[AZUL if o["muestra"] >= 5 else NARANJA for o in objs], width=.62, zorder=3)
med = D["e2_medicion"]["muestra"]["mediana"]
ax.axhline(med, color=TINTA2, lw=1, ls=(0,(4,3)), zorder=4)
ax.text(len(objs)-.4, med+1.6, f"mediana n = {med}", ha="right", fontsize=8.5, color=TINTA2)
ax.set_xticks(list(x)); ax.set_xticklabels([o["codigo"] for o in objs], rotation=90, fontsize=7.5)
ax.set_ylabel("Observaciones (n)")
ax.set_title("Tamaño de la muestra que sostiene cada indicador; en naranja, los que exigen cautela (n < 5)",
             fontsize=9.5, loc="left", pad=12)
ax.grid(axis="y", color=GRIS, lw=.6, zorder=0); ax.set_axisbelow(True)
guardar(fig, "fig4-muestras")

# ── Figura 5. Repetición de una misma deliberación: qué no varía y qué sí
e5 = D.get("e5_estabilidad")
if e5 and e5.get("textos"):
    STOP = set("de la el los las un una que en y a por con se del al es su sus para no sin lo como más ya o".split())
    def pal(t):
        import re
        return {w for w in re.sub(r"[^a-záéíóúñ\s]", " ", t.lower()).split() if len(w) > 3 and w not in STOP}
    tx = [t["initiator"] for t in e5["textos"]]
    pares = []
    for i in range(len(tx)):
        for j in range(i+1, len(tx)):
            a, b = pal(tx[i]), pal(tx[j])
            pares.append(round(100*len(a & b)/len(a | b), 1) if a | b else 0)
    med = sorted(pares)[len(pares)//2]
    fig, ax = plt.subplots(figsize=(16*CM, 6*CM))
    ax.scatter(pares, [1]*len(pares), s=70, color=AZUL, alpha=.75, zorder=3, edgecolors="white", linewidths=1.2)
    ax.scatter([100], [2], s=70, color=NARANJA, zorder=3, edgecolors="white", linewidths=1.2)
    ax.axvline(med, color=TINTA2, lw=1, ls=(0,(4,3)), zorder=2)
    ax.text(med-2, 1.42, f"mediana {med} %", ha="right", fontsize=8.5, color=TINTA2)
    ax.set_yticks([2, 1])
    ax.set_yticklabels(["Estructura normativa\n(objetivo, principio, resultado,\nlentes y operaciones)",
                        "Texto del argumento\n(similitud léxica entre\ncada par de repeticiones)"], fontsize=8.5)
    ax.set_ylim(.4, 2.6); ax.set_xlim(-2, 105); ax.set_xlabel("Coincidencia entre repeticiones (%)")
    ax.text(97, 2.3, "idéntica en 5 de 5", ha="right", fontsize=8.5, color=NARANJA, fontweight="bold")
    ax.set_title(f'Una misma discrepancia deliberada {e5["repeticiones"]} veces: la decisión no varía; la redacción sí',
                 fontsize=9.5, loc="left", pad=12)
    ax.grid(axis="x", color=GRIS, lw=.6, zorder=0); ax.set_axisbelow(True)
    guardar(fig, "fig5-estabilidad")
