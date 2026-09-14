# Guion de demostración — Nexus

Paso a paso para grabar un video del sistema partiendo de **una organización vacía**. Cada escena dice qué hacer, qué se ve y qué decir. Tiempo total estimado: 12–15 minutos.

## Antes de grabar

**1. Estado limpio.** Deja solo el marco COBIT, sin empresa:

```bash
pnpm company:fresh
```

Eso vacía operación, señales, firmas, catálogo, sistemas de IA y mandatos; anula la línea base de los 40 objetivos; y repone el mandato *Diseño base*. Lo que queda es COBIT, no datos.

**2. Identidad.** En `.env`, pon el nombre de la empresa y quién firma por el comité:

```
NEXT_PUBLIC_ORG_NAME="Corporación Andina S.A."
NEXT_PUBLIC_COMMITTEE_SIGNER="Lina Castillo"
NEXT_PUBLIC_COMMITTEE_ROLE="Gobierno de TI"
```

**3. Modelo.** Con `GROQ_API_KEY` Nexus delibera cada discrepancia con el modelo. Cada discrepancia tarda **entre 4 y 15 s** en aparecer argumentada (Groq es rápido; los reintentos por cuota son lo lento); el plan gratuito permite unas 2 por minuto. Para el video, deja pasar ese tiempo o corta. Si prefieres respuesta inmediata con texto de plantilla, `AUTHORING_BATCH=0`.

**4. Servidor.** `pnpm dev` y abre la URL. Reinícialo si cambiaste `.env`.

**5. Ensaya una vez.** Las escenas 5 a 8 dependen de que los datos que ingreses cumplan las condiciones de las reglas; están indicadas en cada una.

---

## Escena 1 · Un sistema que no inventa nada — *Command Center* · 1 min

**Qué se ve:** los cinco dominios en *"— sin dato"*, los 40 objetivos con *"sin dato"*, cobertura de medición *0 de 40*, cero decisiones pendientes.

**Qué decir:** *"Nexus no trae números. Un sistema de gobierno que muestra un 78% el primer día está inventando. Aquí cada indicador aparece solo cuando hay evidencia operativa que lo sostenga. Lo único que existe hoy es el marco: los 40 objetivos de COBIT 2019 y sus cinco dominios."*

Abre el detalle de cualquier objetivo (clic en la fila): *"Sin medición operativa · No hay línea base declarada, así que no se muestra ningún número."*

## Escena 2 · El comité fija el mandato — *Simulador* · 2 min

**Qué hacer:** recorre los 10 factores de diseño. Marca en *DF3 Perfil de riesgo* dos o tres categorías (p. ej. *Ataques lógicos* y *Gestión de datos*), en *DF4* un problema (*Shadow IT y shadow AI*), sube *DF7 Rol de TI → Estratégico* a 5. Mira cómo se reordena la priorización a la derecha. Baja el **apetito de riesgo a 3.0**. Escribe un nombre (*"Mandato 2026"*) y pulsa **Aplicar este diseño como mandato**.

**Qué decir:** *"Antes de operar, el comité decide bajo qué reglas opera Nexus: los diez factores de diseño de COBIT 2019 y el apetito de riesgo. Esto no es un dashboard: es el mandato. Todo lo que escale después, escala porque choca con lo que acabamos de fijar."*

Nota honesta si preguntan: los pesos de la matriz son calibración propia del proyecto, no las tablas licenciadas de ISACA; la estructura del cálculo sí sigue COBIT.

## Escena 3 · La organización da de alta su catálogo — *Operación → Servicios y proveedores, Controles* · 2 min

**Qué hacer:**
- **Dar de alta servicio:** código `WEB`, *Portal de clientes*, criticidad **Crítico**, propietario *Dirección Comercial*, disponibilidad 99.9, SLA crítico 60 min, alto 240 min.
- **Dar de alta servicio:** `ERP`, *ERP corporativo*, Crítico, *Dirección de Finanzas*, 99.9, 60 / 240.
- **Dar de alta proveedor:** `CLOUD`, *Nube Andina*, Crítico, *Infraestructura como servicio*.
- Pestaña **Controles → Definir control:** `01`, *Aprobación formal de cambios*, objetivo **BAI06**, responsable *Gerencia de Cambios*, cada 30 días. Y `02`, *Registro y clasificación de incidentes*, objetivo **DSS02**, *Mesa de Servicio*, 30 días.

**Qué decir:** *"Los maestros son de la empresa y los define la empresa: qué servicios presta, con qué compromisos, qué controles tiene y qué objetivo COBIT protege cada uno. Nada de esto viene sembrado."*

## Escena 4 · La primera evidencia — *Operación → Incidentes* · 1.5 min

**Qué hacer:** **Abrir incidente** en *Portal de clientes*, severidad **Alta**, título *"Caída parcial del portal"*. Aparece `INC-0001`. Ábrelo desde la fila y pulsa **Resolver incidente**. Vuelve a *Command Center*.

**Qué se ve:** DSS02 y DSS03 pasan de *sin dato* a **medido · n=1**, el dominio DSS muestra un número, cobertura *3 de 40*. MEA01 —*desempeño monitoreado*— también aparece: mide cuánto del sistema está medido.

**Qué decir:** *"Un solo hecho y el gobierno empieza a medir. Abre DSS02: dice exactamente sobre qué se calcula —1 de 1 incidentes dentro del tiempo comprometido— y con qué muestra. Con n=1 la interfaz avisa que se interprete con cautela. Eso es trazabilidad: cualquier número lleva al hecho que lo produjo."*

## Escena 5 · Nexus delibera y el comité decide — *Operación → Cambios* · 3 min

**Qué hacer:** **Solicitar cambio** en *ERP corporativo*, tipo **Emergencia**, título *"Parche urgente del módulo contable"*. Ábrelo y **Desplegar a producción** con la casilla *Con evidencia de aprobación* **desmarcada**.

**Qué se ve:** la confirmación verde — *"1 operación registrada · CHG-0001 · 1 escalada al comité"*. Tarda entre 4 y 15 s porque en ese lapso la regla detectó y Nexus deliberó. Si quieres mostrar ese trabajo paso a paso, está en *Nexus → Actividad reciente* y en *Ver más*; el pie de cada discrepancia dice *"deliberación de Nexus con openai/gpt-oss-120b"* cuando lo escribió el modelo, o *"plantilla de la regla"* si la cuota no alcanzó.

Ve a **Command Center**: la decisión pendiente muestra el hecho, **el análisis de Nexus desde dos lentes —auditoría y cambio— argumentado con los datos**, por qué escala bajo BAI06, y dos ramas: *Exigir evidencia* / *Aceptar como excepción*, cada una con su consecuencia.

**Qué decir:** *"La regla detecta. Nexus analiza desde dos mandatos en tensión: desde auditoría, revertir; desde cambio, el despliegue es estable. Es un solo agente mirando el mismo hecho con dos criterios, y concluye que ninguna postura cabe en el mandato sin que el comité decida. El comité soy yo."*

Pulsa **Exigir evidencia**. La negociación pasa al *Registro de decisiones* con *"exigencia registrada"*. **El cambio sigue sin evidencia** — el comité exigió, no adjuntó — y BAI06 sigue midiéndolo como no conforme.

*"Firmar no fabrica el cumplimiento. El comité exige; quien tiene la evidencia la pone."*

Ahora actúa como operación: *Operación → Cambios*, abre el cambio y pulsa **Adjuntar evidencia de aprobación**. Vuelve a *Command Center*: **BAI06 aparece medido al 100%**.

*"La medición cambió porque el hecho cambió, no porque alguien firmara. Esa separación —decidir arriba, ejecutar abajo, medir lo que de verdad pasó— es el sistema entero."*

## Escena 6 · El riesgo que supera el apetito — *Operación → Proyectos, Riesgos* · 2.5 min

**Qué hacer:** **Iniciar proyecto:** *"Atlas — modernización del core comercial"*, patrocinador *Dirección Comercial*, presupuesto 1.800.000, fin planificado a 6 meses. Luego en *Riesgos* → **Levantar riesgo:** *"Riesgo residual del proyecto Atlas"*, categoría *Programas y proyectos*, proyecto **Atlas**, impacto **5**, probabilidad **4**, mitigaciones planificadas 4. El formulario ya muestra el residual estimado **4.0 en rojo** contra el apetito 3.0.

**Qué se ve:** escala. En *Command Center*, Nexus analiza **desde APO y desde EDM**: el lente de riesgo pide suspender; el lente de dirección defiende un proyecto aprobado por el comité y **remite la decisión al comité**. Ramas: *Detener Atlas* / *Aceptar el riesgo*.

**Qué decir:** *"El umbral que cita Nexus —3.0— lo fijé yo en la escena 2. Si el comité hubiera dejado el apetito en 3.5, este riesgo sería un aviso. Escala porque el comité lo decidió así, no porque el sistema lo tenga escrito."*

Pulsa **Detener Atlas**. En *Proyectos*, Atlas está **Detenido**. *"Eso es real: la decisión cambió el estado del proyecto en la base."*

Opcional: en *Riesgos*, abre el riesgo y **marca una mitigación**. Cuando el residual baje del apetito, la negociación se retira sola. Se ve en *Nexus → Actividad*: *"Nexus retiró… el hecho se corrigió"*.

## Escena 7 · Un evento de seguridad con datos — *Operación → Seguridad* · 1.5 min

**Qué hacer:** **Registrar evento**, tipo *Fuga de credenciales*, severidad **Alta**, marca **Involucró información corporativa**.

**Qué se ve:** la confirmación dice *1 escalada al comité*; en *Command Center* escala bajo APO13. desde APO, activar el protocolo de brecha; desde DSS, contener y evaluar antes de disparar notificaciones externas. Firma **Activar protocolo**: queda registrado a nombre del comité. Luego, como SOC, en *Operación → Seguridad* pulsa **Contener** sobre el evento: **DSS05** lo mide en ese momento, no al firmar.

**Qué decir:** *"Activar un protocolo de brecha compromete a la empresa frente a terceros. Nexus no lo decide. Un evento sin datos y de severidad media solo generaría un aviso a las 48 horas: no todo merece una decisión."*

## Escena 8 · Un control que falla — *Operación → Controles* · 1 min

**Qué hacer:** en `CTL-02` pulsa **Probar**, resultado **Inefectivo**, evidencia *"5 de 10 incidentes sin clasificar"*. El formulario avisa antes: *"Una prueba inefectiva escala al comité por MEA02"*.

**Qué se ve:** la discrepancia **MEA ↔ DSS** escala bajo MEA02 —Nexus desde auditoría contra Nexus desde operación—, y **MEA02** aparece medido con la efectividad de las pruebas. DSS02 conserva su medición propia sobre incidentes: cuando un objetivo tiene métrica específica, el control alimenta a MEA02 y no la sustituye. *"El auditor no da por bueno un control que no protege; operación defiende que la remediación está en curso. Otra vez, lo decide el comité."*

## Escena 9 · Cómo trabaja Nexus — *Nexus* · 1.5 min

**Qué se ve:** la última corrida de Nexus: mandato aplicado, cuántas discrepancias, escaladas, resueltas, retiradas, cuántas deliberó con el modelo y en cuánto tiempo. Los cinco **lentes** en una fila, con estado derivado de lo que Nexus levantó desde cada uno. Las discrepancias con filtro. La actividad reciente y **Ver más** → la vista detallada, agrupada por corrida, con filtro por lente.

**Qué decir:** *"Nexus es el único agente. No hay una red de agentes negociando: hay un agente que analiza cada hecho desde cinco mandatos de dominio, expone la tensión entre ellos, y aplica el mandato del comité. Las reglas detectan, Nexus delibera, el comité decide. Cada paso queda registrado en orden."*

Honesto si preguntan: Nexus no vigila por su cuenta; reacciona a lo que se registra. Las reglas deterministas deciden cuándo hay discrepancia y si escala; el modelo pone la voz a los lentes.

## Escena 10 · El copiloto responde con los hechos — *Copiloto* · 1.5 min

**Pregunta 1:** *"¿Qué decisiones esperan mi firma?"* → lista exactamente las pendientes, con sus ramas.
**Pregunta 2:** *"¿De dónde sale el puntaje de BAI06?"* → *"MEDIDO: cambios desplegados con evidencia — 1 de 1 (n=1)"*.
**Pregunta 3:** *"¿Cuál es el presupuesto de TI para 2027?"* → *"El estado de gobierno no lo registra."*

**Qué decir:** *"Responde solo desde una instantánea del estado leída en el servidor. Distingue lo medido de lo que no tiene dato. Y cuando no sabe, lo dice: la tercera pregunta es la prueba."*

## Escena 11 · Cierre · 30 s

Vuelve a *Command Center*. Recorre con el cursor: cobertura de medición, decisiones firmadas en el registro, gauges que antes decían *sin dato*.

*"Empezamos con un sistema vacío. Todo lo que hay ahora entró por una operación con autor y hora, se midió sobre evidencia, y lo que no cabía en el mandato lo firmó el comité. Operación → medición → regla → negociación → decisión → operación."*

---

## Si algo no sale

| Síntoma | Causa | Qué hacer |
|---|---|---|
| La discrepancia aparece con texto genérico y *"plantilla de la regla"* | Límite de Groq (8k tokens/min) o sin clave | Espera 30 s y pulsa cualquier acción: la siguiente evaluación la delibera. O acepta la plantilla: el ciclo es el mismo |
| Registré algo y *"ninguna regla se disparó"* | El dato no cumple la condición | Revisa la regla: cambio **desplegado sin evidencia**; riesgo con **residual > apetito** (impacto×probabilidad÷5); evento **con información** o crítico >24 h; control **Inefectivo** |
| Un dominio sigue en *sin dato* | Ningún objetivo suyo tiene medición | Registra un hecho de ese dominio o prueba un control que proteja uno de sus objetivos |
| Quiero volver a empezar | — | `pnpm company:fresh` |
| Quiero la empresa de ejemplo con 90 días de historia | — | `pnpm company:wipe && pnpm db:seed` y luego `OPERATIONS_URL=http://localhost:<puerto>/api/operations pnpm ops:generate` |
