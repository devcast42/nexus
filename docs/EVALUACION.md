# Demostración y evaluación — resultados medidos

Generado por `pnpm evaluate` (2026-10-19). Datos crudos en `docs/evaluacion.json`,
figuras en `docs/figuras/`. Corrida reproducible: semilla 42, periodo de 90 días,
modelo `claude-haiku-4-5-20251001` (anthropic), versión de prompt 6.

## Protocolo

El artefacto se evaluó mediante una **demostración instrumentada**: se ejecutó el sistema sobre
un escenario controlado y se midió su comportamiento en los tres puntos que interrogan las
preguntas de investigación. Cinco etapas:

1. **Estado inicial.** La organización se reinicia sin ningún hecho registrado.
2. **Alta del catálogo.** Servicios, proveedores y controles se dan de alta por la API de
   operaciones. No hay escritura directa a la base en ninguna etapa del protocolo.
3. **Operación.** Un generador reproduce 90 días de actividad con semilla 42,
   llamando a la misma API que usa la mesa de trabajo.
4. **Medición.** Se registran cobertura, muestras, discrepancias por regla, autoría y latencia.
5. **Ciclo cerrado y repetición.** Se instrumenta una discrepancia de principio a fin y se repite
   5 veces una misma deliberación para separar lo invariante de lo variable.

## Estado inicial: el sistema no parte de ningún número

Antes de registrar hechos, **0 de 40 objetivos** presentan medición, ningún dominio muestra salud
y no existe discrepancia ni decisión alguna. Que ningún indicador exista sin evidencia que lo
sostenga es, por tanto, verificable por construcción y no una declaración de intenciones.

## Escenario (Tabla 3)

| Registro | Cantidad |
|---|---|
| Servicios | 8 |
| Proveedores | 6 |
| Controles | 16 |
| Incidentes | 71 |
| Cambios | 30 |
| Riesgos | 6 |
| Proyectos | 3 |
| Eventos de seguridad | 13 |
| Pruebas de control | 39 |
| Mediciones de SLA | 24 |
| Evaluaciones de proveedor | 6 |
| **Total de registros** | **222** |

315 operaciones validadas produjeron esos registros; las restantes son seguimientos —resolver,
desplegar, mitigar, contener— sobre entidades ya creadas.

## PI1 · Indicadores derivados de la evidencia (Tabla 4, Figuras 5 y 8)

De los 40 objetivos de gobierno, **21 (52.5 %)**
se derivan de la operación registrada; los 19 restantes
se muestran explícitamente como *sin dato*.

| Dominio | Objetivos medidos | Total |
|---|---|---|
| EDM | 1 | 5 |
| APO | 6 | 14 |
| BAI | 6 | 11 |
| DSS | 5 | 6 |
| MEA | 3 | 4 |

Cada indicador declara la métrica que lo calcula, la evidencia que lo sostiene y el tamaño de su
muestra: **0 indicadores** carecen de alguno de los tres. La muestra
mediana es **n = 6** (rango 1–71),
y la interfaz advierte cautela cuando n < 5. La cobertura es, en sí misma, un objetivo medido:
MEA01 informa qué proporción del sistema está efectivamente medida.

## PI2 · Reglas deterministas y deliberación del modelo (Tabla 5, Figuras 6 y 9)

Las siete reglas produjeron **7 discrepancias**: 4 escaladas al
comité, 3 resueltas dentro del mandato y 2 avisos informativos sin
decisión asociada.

| Regla | Escaladas | Resueltas |
|---|---|---|
| Riesgo con residual sobre el apetito | 0 | 0 |
| Cambio en producción sin evidencia de aprobación | 2 | 0 |
| Control probado como inefectivo | 1 | 0 |
| Incidentes recurrentes en un servicio | 0 | 2 |
| Periodo con SLA incumplido | 0 | 1 |
| Evento de seguridad con datos involucrados | 1 | 0 |
| Evento crítico sin contención en 24 h | 0 | 0 |

Dos reglas no se activaron en este escenario, lo que ilustra que el disparo depende de los hechos
y del mandato vigente, no del sistema.

**Cobertura de la deliberación.** Las 7 discrepancias fueron argumentadas por
el modelo (0 quedaron con la plantilla de la regla). La latencia mediana por
deliberación fue de **6.5 s**
(rango 5.4–7.0 s).

**Confinamiento estructural.** Al repetir 5 veces la deliberación de una misma
discrepancia con hechos idénticos, lo que la regla fija permaneció invariante porque **no forma
parte de la salida del modelo**: el objetivo invocado (BAI06), el principio
que dirime, el resultado (escalated), los dos lentes en tensión
(MEA ↔ BAI) y las operaciones que ejecutará cada rama se determinan
antes de llamar al modelo y no se le ofrecen como campo editable. La variabilidad se confinó a la
redacción: la similitud léxica entre pares de repeticiones fue de
**19 %** (rango
11.8–26.9 %), es decir,
cinco argumentos distintos para una misma decisión. La post-validación —que sustituye por la
plantilla cualquier texto que cite un objetivo COBIT ajeno a la discrepancia— no se activó en
ninguna de las 5 repeticiones.

**Degradación sin pérdida de señal.** En una corrida previa del mismo protocolo, el proveedor del
modelo rechazó la autenticación en todas las llamadas. Las 7 discrepancias se
registraron igualmente con la plantilla de la regla, marcadas como tales (`authoredBy = "rule"`),
y el ciclo de gobierno se completó sin interrupción: **ninguna señal se perdió por la
indisponibilidad del modelo**. La deliberación es una capa explicativa, no un punto único de falla.

## PI3 · De la firma a la operación (Tabla 6, Figura 7)

Se instrumentó una discrepancia completa sobre BAI06 —*cambios desplegados con evidencia de
aprobación*— midiendo el indicador en tres momentos:

| Momento | Operaciones ejecutadas | BAI06 |
|---|---|---|
| Cambio desplegado sin evidencia | — | 90 |
| Firma del comité («Exigir evidencia retroactiva al Equipo») | 0 | 90 |
| Evidencia adjuntada desde la operación | 1 | 93 |

La firma del comité **no modificó la medición**: la rama aprobada registra una exigencia y no
ejecuta operación alguna. El indicador se movió únicamente cuando cambió el hecho operativo
(n = 29 en los tres momentos). Esto distingue
empíricamente a Nexus de los sistemas donde la aprobación de un responsable constituye, por sí
misma, la evidencia de cumplimiento.

Cuando la rama firmada sí define operaciones —detener un proyecto, aceptar formalmente un riesgo—,
la firma las ejecuta sobre los registros operativos y la reevaluación posterior de las reglas parte
de ese nuevo estado. En ambos casos la relación es la misma: la decisión actúa sobre los hechos, y
la medición observa los hechos.

## Figuras

| Figura | Archivo | Qué muestra |
|---|---|---|
| 5 | `fig1-cobertura.png` | Cobertura de medición por dominio COBIT |
| 6 | `fig2-reglas.png` | Discrepancias por regla: escaladas frente a resueltas |
| 7 | `fig3-ciclo-cerrado.png` | BAI06 antes de la firma, tras la firma y tras la evidencia |
| 8 | `fig4-muestras.png` | Tamaño de muestra de cada indicador medido |
| 9 | `fig5-estabilidad.png` | Repetición de una deliberación: estructura invariante, redacción variable |

## Lo que esta evaluación no levanta

La operación procede de un generador con semilla fija, no de una organización real; no hubo
usuarios ni comparación con otras herramientas; la calidad argumental del modelo se caracterizó en
variabilidad y confinamiento, pero no se evaluó con rúbrica de expertos; y la repetición se hizo
sobre una sola discrepancia. La numeración de la tabla de amenazas del artículo debe corregirse:
es la Tabla 7, no la Tabla 8.
