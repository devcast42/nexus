# Nexus — AI Governance Command Center

Sistema de gobierno de TI basado en **COBIT 2019** en el que los indicadores no se declaran: se **miden** sobre una capa operativa real, agentes especializados por dominio negocian las discrepancias, y el comité de gobierno firma solo lo que no cabe en el mandato vigente.

Proyecto académico para el curso de Gobierno de TI. Organización ficticia: Corporación Andina S.A.

## La idea en una frase

```
operación → medición → regla → negociación → decisión → operación
```

1. Alguien registra un hecho —un incidente, un cambio, un riesgo— en la **mesa de trabajo**, o lo produce el generador de actividad por la misma API.
2. El gobierno **mide**: la mitad de los 40 objetivos COBIT se deriva de esa evidencia (20 con la actividad generada), cada uno con su tamaño de muestra. Los demás muestran su línea base y se marcan como tal. La propia cobertura de medición es lo que mide MEA01.
3. Las **reglas** comparan la operación con el mandato: un riesgo por encima del apetito, un cambio sin evidencia, un control inefectivo. Producen negociaciones entre agentes; las que caben en el mandato se resuelven solas, las que exigirían cambiarlo **escalan al comité**.
4. El comité **firma** una rama, y la firma ejecuta una operación: detener el proyecto, aceptar el riesgo, adjuntar la evidencia.
5. La medición cambia porque la operación cambió, y el **copiloto** lo explica citando los hechos.

## Lo que hace que no sea una demo

**Datos maestros se siembran; datos transaccionales no.** El catálogo de servicios, los proveedores y la definición de controles se siembran como en cualquier organización. Los incidentes, cambios, riesgos, proyectos, eventos de seguridad, pruebas de control y mediciones **solo entran por `POST /api/operations`**, con validación, autor y hora. Ni la interfaz ni el generador de actividad tocan SQL.

**Las negociaciones existen porque hay un hecho que las sostiene.** No están escritas: las genera [`lib/governance-rules.ts`](lib/governance-rules.ts) y se retiran cuando el hecho se corrige, salvo que el comité ya las haya firmado.

**Una decisión no suma un número: ejecuta una operación.** Con puntajes medidos, un "+8" no significa nada. Y una firma que ya ejecutó operaciones no se deshace: se revierte con otra decisión.

**El apetito de riesgo es parte del mandato**, ajustable en el simulador. Con apetito 3.5 el riesgo del proyecto Atlas (3.4) es un aviso; con 3.0 escala. Escala porque el comité cambió el umbral, no porque estuviera escrito.

## Módulos

| Vista | Qué hace |
|---|---|
| **Command Center** | Salud de los 5 dominios y los 40 objetivos (medido vs. línea base), decisiones pendientes con las dos posiciones de los agentes y el principio COBIT que arbitra, registro de decisiones |
| **Operación** | Mesa de trabajo: incidentes, cambios, riesgos, proyectos, seguridad, controles, servicios y proveedores. Lista, filtros, detalle y acciones; cada pantalla dice a qué objetivo alimenta |
| **Agentes** | Red multiagente y las negociaciones —resueltas y escaladas— tal como las produjeron las reglas |
| **Simulador** | Los 10 factores de diseño de COBIT 2019 (DF1–DF10, 64 valores) recalculan la prioridad de los 40 objetivos. "Aplicar" fija el mandato bajo el que operan los agentes |
| **Copiloto** | Responde solo desde una instantánea del estado leída en el servidor; distingue puntaje medido de línea base y dice cuándo el sistema no registra algo |
| **Gobierno de IA** | Registro de sistemas de IA de la organización con riesgo, controles recomendados y aceptados |

## Puesta en marcha

Requisitos: Node 20+, `pnpm`, una base Postgres (el proyecto usa [Neon](https://neon.tech)).

```bash
pnpm install
cp .env.example .env        # y pega tu DATABASE_URL
pnpm db:push                # crea las 22 tablas
pnpm db:seed                # objetivos COBIT, agentes, factores de diseño, maestros operativos
pnpm dev
```

Con la app corriendo, genera 90 días de actividad operativa **por la API**:

```bash
OPERATIONS_URL=http://localhost:3000/api/operations pnpm ops:generate
```

Es reproducible: misma semilla, misma historia (`ACTIVITY_SEED`, `ACTIVITY_DAYS`). Para volver a empezar sin tocar maestros ni mandatos:

```bash
pnpm ops:reset
```

### Copiloto

Necesita una credencial. Anthropic por defecto; Groq si solo existe su clave.

```
ANTHROPIC_API_KEY=sk-ant-...     # claude-opus-5
# o
GROQ_API_KEY=gsk_...             # openai/gpt-oss-120b, o el que pongas en GROQ_MODEL
COPILOT_PROVIDER=groq            # fuerza uno u otro
```

El mismo anclaje a los datos alimenta a ambos: cambiar de proveedor es una variable de entorno.

## Scripts

| Script | Qué hace |
|---|---|
| `db:push` | Aplica el esquema de [`lib/db/schema.ts`](lib/db/schema.ts) |
| `db:seed` | Siembra referencia y maestros. Idempotente: no pisa decisiones, evaluaciones ni mandatos |
| `db:studio` | Explorador de tablas de Drizzle |
| `ops:generate` | Actividad operativa por HTTP contra `OPERATIONS_URL` |
| `ops:reset` | Vacía lo transaccional y las señales derivadas |

## Dónde está cada cosa

```
lib/
  db/schema.ts            22 tablas: gobierno, factores de diseño, capa operativa
  db/queries.ts           carga todo y deriva salud, cobertura y modelos de vista
  operations.ts           única puerta de escritura operativa, con validación
  governance-metrics.ts   cómo se mide cada objetivo y sobre cuánta evidencia
  governance-rules.ts     reglas que producen negociaciones y avisos
  health.ts               una sola regla de salud para servidor y cliente
  cobit-design.ts         factores DF1–DF10 y la matriz de pesos
  copilot-context.ts      la instantánea que se le entrega al modelo
app/api/
  operations/             POST: registra hechos · GET: resumen
  governance/evaluate/    POST: reevalúa las reglas a mano
  copilot/                POST: chat con streaming
components/operations/    la mesa de trabajo, un panel por entidad
scripts/                  generador de actividad y reseteo
```

## Lo que conviene saber antes de sustentarlo

- **Los pesos de los factores de diseño son una calibración propia de este proyecto**, no las tablas del COBIT 2019 Design Toolkit de ISACA, que son material licenciado. La estructura del cálculo sí sigue el modelo de COBIT —suma ponderada y normalización a importancia relativa— y los pesos viven en la tabla `design_factor_weights` para poder sustituirlos por los oficiales sin tocar el motor.
- **El generador produce actividad plausible, no real.** Sigue siendo simulación, pero simulación *de la operación por la API*, no siembra del gobierno. Integrar una fuente real (Jira, GitHub, ServiceNow) sería reemplazar el generador sin tocar nada más.
- **No hay autenticación.** `decided_by` es un valor por defecto. Mientras el registro de decisiones sea la evidencia de gobierno, saber quién firmó es lo que le da valor; es el paso siguiente si el proyecto sigue.
- **Los agentes no razonan por inferencia.** Las negociaciones son la salida de reglas deterministas sobre la operación. Lo que se demuestra es la arquitectura —qué se mide, qué escala, quién firma— no un agente autónomo.

## Stack

Next.js 16 (App Router, Server Components y Server Actions) · React 19 · TypeScript · Tailwind 4 · shadcn/ui sobre Base UI · Drizzle ORM · Postgres en Neon · Recharts · SDKs de Anthropic y Groq.
