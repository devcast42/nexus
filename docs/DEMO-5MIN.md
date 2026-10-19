# Guion de 5 minutos — Nexus

Versión corta del [guion completo](DEMO.md) para un video de **5:00**. La idea: mostrar el ciclo entero una sola vez y bien, no todas las funciones. Lo que no aporta al ciclo se prepara **antes de grabar**.

## Antes de grabar (fuera de cámara, ~5 min)

1. `pnpm company:fresh` y `pnpm dev`.
2. **Simulador:** marca en DF3 *Ataques lógicos* y *Gestión de datos*, en DF4 *Shadow IT y shadow AI*, sube DF7 a 5, baja el **apetito de riesgo a 3.0**, nombre *"Mandato 2026"*, **Aplicar**.
3. **Operación → Servicios:** alta de `ERP` *ERP corporativo*, Crítico, *Dirección de Finanzas*, 99.9, 60 / 240.
4. **Operación → Proyectos:** *"Atlas — modernización del core comercial"*, *Dirección Comercial*, 1.800.000, fin a 6 meses.
5. **Copiloto:** haz una pregunta cualquiera para confirmar que responde (calienta la clave).
6. Deja abierto **Command Center**. Debe mostrar todo *"sin dato"*: el mandato, el servicio y el proyecto no miden nada por sí solos. Eso es exactamente lo que quieres que se vea al empezar.

Tiempos del modelo: cada deliberación tarda **4–10 s** con Haiku. En el guion están marcados como *[espera]*: habla durante ese lapso, no lo cortes en silencio.

---

## 0:00 – 0:35 · Qué es — *Command Center*

*"Nexus es un centro de mando de gobierno de TI para Corporación Andina, sobre COBIT 2019. Lo que ven es una organización recién creada: cinco dominios, cuarenta objetivos, y ningún número. Nexus no inventa indicadores; cada uno aparece cuando hay evidencia operativa que lo sostenga. El comité ya fijó su mandato —los diez factores de diseño y un apetito de riesgo de 3.0— y dio de alta un servicio y un proyecto. Nada de eso mide nada todavía. Ahora va a pasar algo."*

## 0:35 – 2:30 · El ciclo completo — *Operación → Cambios* y *Command Center*

**Hacer:** *Solicitar cambio* en *ERP corporativo*, tipo **Emergencia**, *"Parche urgente del módulo contable"*. Ábrelo, **Desplegar a producción** con *Con evidencia de aprobación* **desmarcada**.

*[espera 4–10 s]* — mientras: *"Acaba de entrar un hecho por la única puerta que tiene el sistema: una operación con autor y hora. En este momento una regla lo está comparando con el mandato y Nexus está deliberando."*

Confirmación verde: *"1 operación registrada · CHG-0001 · 1 escalada al comité"*.

**Ir a Command Center.** Señala la decisión pendiente.

*"Un cambio de emergencia se desplegó sin evidencia de aprobación. Nexus, el único agente, analiza el hecho desde dos lentes: desde auditoría, revertir; desde gestión de cambios, el despliegue es estable. Concluye que ninguna postura cabe en el mandato sin que decida el comité. Y el comité soy yo: exigir evidencia, o aceptar como excepción."*

**Pulsar *Exigir evidencia*.** Baja al registro de decisiones: *"exigencia registrada"*.

*"Firmar no fabrica el cumplimiento. El comité exigió; el cambio sigue sin evidencia y BAI06 lo sigue midiendo como no conforme."*

**Ir a Operación → Cambios**, abrir CHG-0001, **Adjuntar evidencia de aprobación**. **Volver a Command Center:** BAI06 medido al 100 %, cobertura 2 de 40.

*"La medición cambió porque el hecho cambió, no porque alguien firmara. Decidir arriba, ejecutar abajo, medir lo que de verdad pasó. Ese es el sistema entero: operación, medición, regla, deliberación, decisión, operación."*

## 2:30 – 3:40 · El mandato manda — *Operación → Riesgos*

**Hacer:** *Levantar riesgo*: *"Riesgo residual del proyecto Atlas"*, categoría *Programas y proyectos*, proyecto **Atlas**, impacto **5**, probabilidad **4**, mitigaciones planificadas 4. El formulario muestra el residual **4.0 en rojo** contra el apetito 3.0. Registrar.

*[espera]* — *"El umbral que va a citar Nexus, 3.0, lo fijó el comité en el simulador. Con el apetito en 3.5 esto sería un aviso, no una decisión."*

**Command Center:** la decisión APO ↔ EDM. *"Desde riesgo, suspender. Desde dirección, es un proyecto aprobado por el comité: se lo remite."* **Pulsar *Detener Atlas*.** **Operación → Proyectos:** Atlas está **Detenido**.

*"La firma cambió el estado del proyecto en la base. Es real."*

## 3:40 – 4:15 · Cómo trabaja Nexus — *Nexus*

Señala la última corrida (discrepancias, escaladas, deliberadas con el modelo, tiempo), los cinco lentes en fila, la actividad.

*"No hay una red de agentes: hay uno, Nexus, que mira cada hecho desde cinco mandatos de dominio y expone la tensión entre ellos. Las reglas deterministas detectan; Nexus delibera con un modelo de lenguaje; el comité decide. Cada paso queda registrado en orden y con hora."*

## 4:15 – 4:45 · El copiloto no inventa — *Copiloto*

**Pregunta:** *"¿De dónde sale el puntaje de BAI06?"* → *"MEDIDO: cambios desplegados con evidencia — 1 de 1 (n=1)"*.

*"Responde desde una instantánea del estado real y distingue lo medido de lo que no tiene dato. Con n=1 avisa que se interprete con cautela."*

Si te sobran 15 s: *"¿Cuál es el presupuesto de TI para 2027?"* → *"El estado de gobierno no lo registra."* — *"Y cuando no sabe, lo dice."*

## 4:45 – 5:00 · Cierre — *Command Center*

*"Empezamos vacíos. Todo lo que hay ahora entró por una operación, se midió sobre evidencia, y lo que no cabía en el mandato lo firmó el comité. Nexus."*

---

## Qué dejé fuera y por qué

Incidentes, seguridad, pruebas de control y el simulador en vivo están en el guion completo. En cinco minutos, una segunda escalada del mismo tipo no enseña nada nuevo; el riesgo sí, porque muestra que el mandato del comité es lo que decide qué escala. Si el profesor pregunta por seguridad o controles, la respuesta es que siguen el mismo ciclo con reglas propias, y lo puedes mostrar en vivo.

## Si algo no sale

- **Texto genérico y *"plantilla de la regla"*** → el modelo no respondió; el ciclo es el mismo. Pulsa cualquier acción para que la siguiente evaluación lo delibere.
- **"Ninguna regla se disparó"** → el cambio debe estar **desplegado sin evidencia**; el riesgo debe tener **residual > 3.0** (impacto × probabilidad ÷ 5).
- **Volver a empezar** → `pnpm company:fresh` y repite la preparación.
