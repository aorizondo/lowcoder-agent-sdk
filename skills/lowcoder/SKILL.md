---
name: lowcoder
description: Crea aplicaciones Lowcoder (low-code platform) desde código usando el SDK @aorizondo/lowcoder-agent-sdk-core o el MCP server @aorizondo/lowcoder-mcp-server. Usa esto cuando el usuario pida crear, modificar, listar o publicar dashboards, formularios, apps internas o paneles en Lowcoder. Cubre el catálogo completo de ~80 componentes nativos, queries (REST/JS/SQL), datasources (postgres/mysql/mongo/redis/s3/slack/openai/...), expresiones, plugins de usuario, SEO y deployment.
when_to_use: "El usuario pide crear/modificar/listar/publicar una app, dashboard, panel o formulario en Lowcoder. También cuando menciona 'low-code app', 'componente lowcoder', 'datasource lowcoder', 'plugin de lowcoder', o cuando quiere generar JSON DSL para una instancia Lowcoder. NO usar para apps en Retool, Appsmith, Tooljet u otras plataformas low-code distintas — son DSLs incompatibles."
license: MIT
version: 0.3.0
argument-hint: "<descripción de la app o acción Lowcoder>"

# ─── Anthropic Agent Skills (Claude Code, Claude Desktop, Claude API) ──────
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob

# ─── OMO / OpenCode plugin (auto-arranca el MCP al cargar el skill) ────────
# El sistema de skills de OMO (https://github.com/...) lee este campo y arranca
# automáticamente el MCP server. Equivalente a `mcp.json` en el mismo directorio.
mcp:
  lowcoder:
    command: npx
    args:
      - "-y"
      - "@aorizondo/lowcoder-mcp-server"
    env:
      LOWCODER_BASE_URL: "${LOWCODER_BASE_URL}"
      LOWCODER_API_KEY: "${LOWCODER_API_KEY}"
---

# Skill: lowcoder

Este skill te enseña a construir aplicaciones Lowcoder de forma fiable usando el SDK y el MCP server. Lowcoder es una plataforma low-code open source (alternativa a Retool/Appsmith). Las apps se representan como un **JSON DSL** complejo — generarlo a mano tiene tasa de error altísima, por eso existe este SDK que lo abstrae con una API fluida.

**Lee este archivo completo antes de tu primera app.** Es largo pero te ahorra horas de debug.

---

## 📦 Recursos disponibles en este skill

Este skill incluye archivos auxiliares en su directorio. En sistemas compatibles con `@path` (OMO, OpenCode) puedes referenciarlos directamente. Si tu agente NO soporta `@path`, lee los archivos manualmente con tu herramienta `Read` desde las rutas relativas al directorio del skill.

### references/ — Documentación detallada (mismas que `docs/` del repo)

| Archivo | Cuándo leerlo |
| --- | --- |
| @references/getting-started.md | Tutorial paso a paso de 10 min. Primera vez usando el SDK |
| @references/sdk-reference.md | Referencia completa de todos los métodos `LowcoderApp` y `LowcoderClient` |
| @references/mcp-server.md | Setup del MCP server y descripción de los tools |
| @references/datasources.md | Configuración de datasources (BD, APIs, SaaS, plugins JS) |
| @references/plugin-creation.md | Crear componentes plugins reutilizables para Lowcoder |
| @references/troubleshooting.md | Errores comunes y soluciones |
| @references/skill-installation.md | Cómo se instala este skill en distintos clientes |

### assets/dsl-templates/ — Plantillas de DSL para copiar y adaptar

| Archivo | Para qué |
| --- | --- |
| @assets/dsl-templates/kpi-card.json | KPI card con HTML estilizado. Reemplaza LABEL, VALUE_EXPR, TREND |
| @assets/dsl-templates/data-table.json | Tabla de datos con columnas. Reemplaza DATA_EXPR y `columns` |
| @assets/dsl-templates/line-chart.json | Line chart multi-serie. Reemplaza DATA_EXPR, X_KEY y series |
| @assets/dsl-templates/crud-form.json | Form input+input+select+button con disabled condicional |

### assets/preload/ — Snippets para `withPreload`

| Archivo | Para qué |
| --- | --- |
| @assets/preload/helpers.js | Helpers globales (`fmt.currency`, `fmt.compact`, `group`, `sumBy`, ...) — copia entero al `script` |
| @assets/preload/glass-theme.css | Tema premium: glass effect, gradientes, animaciones, responsive — copia entero al `css` |
| @assets/preload/seo-script.js | SEO completo con retries. Reemplaza TITLE, DESCRIPTION, OG_IMAGE |

### Ejemplos completos verificados (ejecutables)

Todos los ejemplos en `examples/` del repo están testeados end-to-end contra una instancia Lowcoder real (verificado en v0.3.0):

| # | Archivo | Verificado |
| --- | --- | --- |
| 01 | examples/01-hello-world.ts | ✅ |
| 02 | examples/02-dashboard-simple.ts | ✅ |
| 03 | examples/03-crud-users.ts | ✅ |
| 04 | examples/04-with-seo.ts | ✅ |
| 05 | examples/05-themed-dashboard.ts | ✅ |
| 06 | examples/06-mega-demo.ts | ✅ (~50 componentes) |
| 07 | examples/07-with-datasource.ts | ✅ (REST datasource real) |
| 08 | examples/08-postgres-crud.ts | ⚠️ requiere Postgres accesible (test connection se ejecuta antes de crear) |

Si el usuario pide algo similar a uno de esos casos, **léelo primero** (`Read` tool) y adáptalo en lugar de partir de cero.

---

---

## TABLA DE CONTENIDOS

1. [Decisión: SDK vs MCP](#1-decisión-sdk-vs-mcp)
2. [Setup inicial (5 min)](#2-setup-inicial-5-min)
3. [Anatomía de una app Lowcoder](#3-anatomía-de-una-app-lowcoder)
4. [Workflow recomendado paso a paso](#4-workflow-recomendado-paso-a-paso)
5. [Catálogo completo de componentes](#5-catálogo-completo-de-componentes)
6. [Queries: REST, JS, SQL — cuándo usar cada uno](#6-queries-rest-js-sql--cuándo-usar-cada-uno)
6.5. [Datasources (conexiones reutilizables)](#65-datasources-conexiones-reutilizables)
7. [Expresiones `{{ }}` y bindings](#7-expresiones---y-bindings)
8. [Estado: tempStates y transformers](#8-estado-tempstates-y-transformers)
9. [Layout: auto vs manual, grid de 24 cols](#9-layout-auto-vs-manual-grid-de-24-cols)
10. [Tema visual: preload CSS + animaciones](#10-tema-visual-preload-css--animaciones)
11. [SEO completo](#11-seo-completo)
12. [Plugins de usuario (componentes reutilizables)](#12-plugins-de-usuario-componentes-reutilizables)
13. [Errores comunes y cómo evitarlos](#13-errores-comunes-y-cómo-evitarlos)
14. [Buenas prácticas](#14-buenas-prácticas)
15. [Referencia rápida MCP tools](#15-referencia-rápida-mcp-tools)
16. [Ejemplos completos](#16-ejemplos-completos)
17. [Checklist final antes de decir "listo"](#17-checklist-final-antes-de-decir-listo)

---

## 1. Decisión: SDK vs MCP

Antes de hacer nada, elige el camino correcto:

### Usar **MCP tools** cuando

- El usuario quiere algo rápido (1-15 componentes)
- No necesitas lógica condicional compleja en el momento de construir la app
- Quieres iterar interactivamente ("añade ahora una columna a la tabla")
- No tienes acceso al filesystem para escribir scripts

### Usar **SDK TypeScript** cuando

- La app tiene >20 componentes
- Generas el contenido programáticamente (un loop por cada item de un array)
- Necesitas componer/reutilizar partes entre apps (helpers, factories)
- Quieres versionar la app en git como código

**Regla práctica:** empieza con MCP. Si el MCP request crece mucho o el agente empieza a equivocarse, migra a un script TypeScript.

---

## 2. Setup inicial (5 min)

### 2.1 Credenciales que vas a necesitar

Solo necesitas **dos cosas** obligatorias. El `orgId` se auto-detecta:

| Variable | Obligatoria | Cómo obtenerla |
| --- | --- | --- |
| `LOWCODER_BASE_URL` | ✅ | La URL de la instancia (ej: `https://lowcoder.empresa.com`). Sin trailing slash |
| `LOWCODER_API_KEY` | ✅ | Avatar superior derecho → **My Profile** → tab **API Keys** → **Create new** → copia el JWT token |
| `LOWCODER_ORG_ID` | ❌ opcional | Si la omites, el SDK la auto-detecta usando el endpoint `/api/v1/users/me` |

### 2.2 Cómo obtener el `orgId` (si lo necesitas explícito)

Tienes **3 formas**, ordenadas de más fácil a más manual:

**Opción 1 — MCP tool (recomendada si tienes MCP instalado):**

```
get_my_orgs()
// Devuelve: { currentOrgId: "...", orgs: [...], hint: "Para crear apps usa orgId: ..." }
```

**Opción 2 — SDK (en TypeScript):**

```typescript
const client = new LowcoderClient({ baseUrl, apiKey });
const orgId = await client.getCurrentOrgId();
// O todas las orgs del usuario:
const orgs = await client.listMyOrgs();
console.log(orgs[0].id, orgs[0].name, orgs[0].isCurrent);
```

**Opción 3 — curl directo:**

```bash
curl -s -H "Authorization: Bearer $LOWCODER_API_KEY" \
  "$LOWCODER_BASE_URL/api/v1/users/me" \
  | jq -r '.data.currentOrgId'
```

**Mejor aún: no se lo pidas al usuario.** Llama `get_my_orgs` o `getCurrentOrgId()` automáticamente al iniciar. Solo pídelo si el usuario tiene varias orgs y necesitas confirmar cuál usar.

### 2.2 Setup MCP (modo recomendado para sesiones interactivas)

```jsonc
// Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
// Claude Code: claude mcp add lowcoder ...
{
  "mcpServers": {
    "lowcoder": {
      "command": "npx",
      "args": ["-y", "@aorizondo/lowcoder-mcp-server"],
      "env": {
        "LOWCODER_BASE_URL": "https://tu-lowcoder.ejemplo.com",
        "LOWCODER_API_KEY": "tu-token-aquí"
      }
    }
  }
}
```

Reinicia el cliente. Verifica que `mcp__lowcoder__create_app` aparece en la lista de tools.

### 2.3 Setup SDK (para scripts)

```bash
npm install @aorizondo/lowcoder-agent-sdk-core
# o si tu proyecto usa pnpm/yarn equivalente
```

```typescript
import { LowcoderApp, LowcoderClient } from "@aorizondo/lowcoder-agent-sdk-core";
```

Para ejecutar scripts ad-hoc: `npx tsx mi-script.ts` (no compiles, ejecuta directo).

---

## 3. Anatomía de una app Lowcoder

Una app Lowcoder es un JSON con esta estructura interna (el SDK abstrae todo esto — solo necesitas entender el modelo mental):

```jsonc
{
  "ui": {
    "items": {
      "<hex8>": { "compType": "button", "name": "btn1", "comp": { "text": "Click", ... } },
      "<hex8>": { "compType": "table",  "name": "tbl1", "comp": { "data": "{{q.data}}" } }
    },
    "layout": {
      "<hex8>": { "i": "<hex8>", "x": 0, "y": 0, "w": 6, "h": 6 },
      "<hex8>": { "i": "<hex8>", "x": 0, "y": 6, "w": 24, "h": 40 }
    }
  },
  "queries": [
    { "id": "js:<24chars>", "compType": "js", "name": "loadUsers", "datasourceId": "#JS_CODE", "comp": { "script": "..." } }
  ],
  "tempStates": [...],
  "transformers": [],
  "settings": { "title": "Mi App", "gridColumns": 24, ... },
  "preload": { "script": "...", "css": "..." }
}
```

Cosas a recordar:
- **Los `<hex8>` son aleatorios** generados por el SDK (formato `Math.random()*0xffffffff` en hex)
- **Las queries JS necesitan `id` con prefijo `"js:"`** o no se ejecutan (Lowcoder las routea a sandbox cliente)
- **Las queries JS necesitan `datasourceId: "#JS_CODE"`** (system static)
- **El grid es 24 columnas**, alto en unidades de 8px

El SDK pone todo esto correcto automáticamente. Si construyes el JSON a mano, vas a sufrir.

---

## 4. Workflow recomendado paso a paso

### Paso 1: Entender qué quiere el usuario

Antes de tocar nada, asegúrate de saber:
- **¿Qué datos** muestra la app? (API pública, base de datos, datos hardcoded)
- **¿Qué acciones** debe poder hacer? (solo leer, crear/editar, filtros)
- **¿Privada o pública?** (afecta si llamas `deploy_app` al final)

**NO necesitas pedir el orgId** — se auto-detecta. Solo pregunta por orgId si:
- El usuario tiene varios workspaces y necesitas confirmar cuál
- `get_my_orgs` devuelve múltiples orgs con roles distintos
- El usuario explícitamente menciona "crear esto en mi workspace X"

Si tienes el MCP: llama `get_my_orgs` al primer turno y muéstrale al usuario las opciones si hay más de una.

### Paso 2: Descubrir el `orgId` y los componentes disponibles (solo MCP)

```text
get_my_orgs()           → te devuelve currentOrgId del workspace activo
get_component_types()   → te devuelve los ~80 tipos disponibles
```

- **`get_my_orgs`** evita pedir el orgId al usuario. Si el array `orgs` tiene >1 entrada con roles distintos, sí pregunta al usuario cuál usar.
- **`get_component_types`** sirve para confirmar qué `compType` válidos puedes usar. Útil cuando el usuario pide algo no obvio ("gráfico de embudo" → confirmar que es `funnelChart`).

### Paso 3: Diseñar layout mental antes de codear

Lowcoder usa grid de **24 columnas** horizontales × filas de 8px alto. Antes de escribir código, dibuja mentalmente:

```
┌─────────────────────────────────────────┐  fila y=0
│  HERO TITLE (w=18)        │ LOGO (w=6) │   alto h=12
├─────────────────────────────────────────┤  y=12
│ KPI1 │ KPI2 │ KPI3 │ KPI4 (w=6 c/u)    │   h=18
├─────────────────────────────────────────┤  y=30
│      LINE CHART       │ BAR CHART       │   h=40
│      (w=12)           │ (w=12)          │
├─────────────────────────────────────────┤  y=70
│      TABLA (w=24)                       │   h=40
└─────────────────────────────────────────┘
```

Esto te ahorra `at: { x, y, w, h }` calculados a ojo. Sin `at` el SDK auto-posiciona pero los charts grandes pueden quedar mal.

### Paso 4: Crear la app

**Opción A: MCP** (rápido, app simple)

```jsonc
// Paso 4a: descubrir orgId (solo primera vez)
get_my_orgs()
// → { currentOrgId: "69b44...", orgs: [...], hint: "Para crear apps usa orgId: ..." }

// Paso 4b: crear la app usando ese orgId
create_app({
  "title": "Dashboard de Ventas",
  "orgId": "69b44...",         // el currentOrgId de la respuesta anterior
  "components": [...],
  "queries": [...],
  "settings": { "category": "Business" }
})
```

**Opción B: SDK TypeScript** (apps complejas, con lógica)

```typescript
// dashboard.ts — ejecutar: npx tsx dashboard.ts
import { LowcoderApp, LowcoderClient } from "@aorizondo/lowcoder-agent-sdk-core";

const app = new LowcoderApp("Dashboard de Ventas")
  .withSettings({ category: "Business", description: "..." })
  // ...
  ;

const client = new LowcoderClient({
  baseUrl: process.env.LOWCODER_BASE_URL!,
  apiKey: process.env.LOWCODER_API_KEY!,
});
// orgId opcional — auto-detectado del workspace activo del usuario.
// replaceByName: true → elimina apps anteriores con el mismo nombre (deploy idempotente).
const result = await app.deploy(client, undefined, { replaceByName: true });
console.log(`✅ ${process.env.LOWCODER_BASE_URL}/apps/${result.applicationInfoView.applicationId}/edit`);
```

> **💡 Sin `replaceByName: true`** cada ejecución del script crea una app NUEVA. Vas a acumular duplicados rápido si iteras desarrollo. Para deploys repetibles (CI, scripts) úsalo siempre. Para preservar el `appId` exacto entre deploys (los redirects de otras apps dependen de él), usa `client.updateApp(appId, dsl)` con el ID guardado en config.

### Paso 5: Configurar SEO (opcional pero recomendado para apps públicas)

```
configure_seo({
  appId: "...",
  title: "Dashboard de Ventas — Mi Empresa",
  description: "Métricas en tiempo real...",
  ogImage: "https://...",
  jsonLdType: "WebApplication"
})
```

### Paso 6: Publicar (si va a ser usada por usuarios finales)

```
deploy_app({ appId: "..." })
```

### Paso 7: Verificar abriendo el editor

Dale al usuario la URL `${baseUrl}/apps/${appId}/edit` y dile **explícitamente**:
- Modo edit: ve el layout pero las queries automáticas NO se ejecutan
- Modo `/view`: las queries SÍ se ejecutan, ahí ve la app "viva"

---

## 5. Catálogo completo de componentes

Los tamaños mostrados son `w × h` por defecto. Puedes overridear con `at: { x, y, w?, h? }`.

### Inputs (formularios)

| `type` | Opciones clave | Tamaño |
| --- | --- | --- |
| `input` | `label, placeholder, defaultValue, required, allowClear, maxLength` | 6×6 |
| `password` | igual que input | 6×6 |
| `textArea` | `minRows, maxRows, maxLength` | 6×24 |
| `numberInput` | `min, max, step, defaultValue` | 6×6 |
| `select` | `options: [{label, value}]`, `defaultValue, allowClear, showSearch` | 6×5 |
| `multiSelect` | igual que select pero array | 6×5 |
| `checkbox` | `label, defaultValue` | 4×5 |
| `radio` | `options, defaultValue` | 6×20 |
| `switch` | `label, defaultValue` | 6×5 |
| `slider` | `min, max, step, defaultValue` | 6×5 |
| `rangeSlider` | igual + array | 6×5 |
| `rating` | `max, defaultValue` | 6×5 |
| `date` | `placeholder, required` | 6×5 |
| `dateRange` | igual + array | 10×5 |
| `time`, `timeRange` | hora/rango de hora | 6×5 / 10×5 |
| `autocomplete` | `options, placeholder` | 6×5 |
| `segmentedControl` | toggle visual estilo iOS | 6×5 |
| `cascader`, `treeSelect`, `tree`, `transfer` | selecciones jerárquicas | varios |
| `richTextEditor` | editor WYSIWYG (HTML) | 12×40 |
| `colorPicker` | selector de color | 6×5 |
| `fileUpload` | sube archivo (base64) | 6×5 |
| `form` | wrapper de validación | 12×50 |
| `jsonSchemaForm` | form auto-generado desde JSON Schema | 12×50 |

### Display estático

| `type` | Opciones clave | Tamaño |
| --- | --- | --- |
| `text` | `text` (Markdown + HTML + `{{ }}`), `autoHeight` | 6×24 |
| `image` | `src, altText` | 6×25 |
| `icon` | `icon: "/icon:antd/dashboard-outlined"`, `iconSize` | 3×5 |
| `qrCode` | `value: "https://..."` | 5×20 |
| `jsonLottie` | `value` (URL JSON Lottie), `autoPlay, loop` | 6×25 |
| `divider` | `title, align` | 24×3 |
| `progress` | `value, status: success\|active\|exception\|normal` | 6×5 |
| `progressCircle` | igual | 5×10 |
| `audio`, `video` | `src` | varios |
| `shape` | formas SVG | 6×25 |
| `mermaid` | `diagram: "graph LR\n  A --> B"` | 12×40 |
| `timeline` | timeline visual | 12×40 |

### Tablas y datos

| `type` | Opciones clave | Tamaño |
| --- | --- | --- |
| `table` | `data, columns: [{title, dataIndex, isTag?, isLink?, editable?}], pageSize, showFilter, showDownload` | 12×40 |
| `tableLite` | versión más ligera | 12×40 |
| `pivotTable` | tabla pivote | 12×40 |
| `jsonExplorer` | árbol expandible de JSON | 12×40 |
| `jsonEditor` | editor de JSON con validación | 12×40 |
| `listView` | lista de cards renderizables. Dentro usa `currentItem.fieldName` | 12×40 |

### Charts (todos basados en Apache ECharts)

| `type` | Opciones clave |
| --- | --- |
| `lineChart` | `data, xAxisKey, yAxisKeys: ["serie1", "serie2"], title, stacked` |
| `barChart` | igual que line |
| `pieChart` | `data, labelKey, valueKey, donut: true/false` |
| `scatterChart` | `data, xAxisKey, yAxisKey` |
| `funnelChart` | `data, labelKey, valueKey` (Visitas→Carrito→Compra) |
| `radarChart` | `data, indicatorKey, valueKeys: [...]` |
| `heatmapChart` | `data, xAxisKey, yAxisKey, valueKey` |
| `gaugeChart` | `value: 0-100, min, max, unit` — **buggy en versiones antiguas**, prefiere `progressCircle` |
| `candleStickChart` | velas OHLC |
| `sankeyChart`, `sunburstChart`, `treemapChart`, `themeriverChart`, `treeChart`, `graphChart` | visualizaciones avanzadas |
| `chart` | chart genérico legacy (evítalo, usa los especializados) |

**Para configuración ECharts avanzada** (custom tooltips, colores específicos): usa el modo JSON inyectando un `echartsOption` con el JSON completo.

### Botones y acciones

| `type` | Opciones clave | Tamaño |
| --- | --- | --- |
| `button` | `text, type: ""\|"submit", onClick: "queryName", disabled, loading, tooltip` | 6×6 |
| `controlButton`, `toggleButton`, `dropdown` | variantes | varios |
| `link` | `text, onClick: "queryName"` o `href: "https://..."` | 3×5 |
| `iconButton` | `prefixIcon, text?, type, shape: circle\|round\|default` | 3×5 |
| `floatingButton` | botón flotante con `buttons: [{id, label, icon, onClick}]` | 5×5 |
| `menu` | menú dropdown | 6×5 |

### Layout y contenedores

| `type` | Opciones clave | Tamaño |
| --- | --- | --- |
| `container` | wrapper simple | 12×25 |
| `card` | container con sombra. `title, showHoverEffect` | 8×40 |
| `collapsibleContainer` | expand/collapse | 12×25 |
| `tabbedContainer` | tabs con `tabs: [{label, key}]` | 24×50 |
| `modal` | popup con `title, okText, cancelText`. Apertura: `modal1.setVisible(true)` | overlay |
| `drawer` | panel lateral. Apertura: `drawer1.openDrawer()` o `setVisible(true)` | overlay |
| `responsiveLayout`, `columnLayout`, `splitLayout`, `pageLayout` | layouts predefinidos | varios |
| `grid`, `listView` | repeticiones de items | 12×40 |

### Navegación

| `type` | Opciones clave |
| --- | --- |
| `navigation` | menú superior |
| `step` | wizard de pasos |

### Project management

| `type` | Opciones clave |
| --- | --- |
| `calendar` | `events: [{id, title, start, end, color?}]`, `defaultView: month\|week\|day` |
| `kanban` | tablero con columnas drag-drop |
| `ganttChart` | gantt con tareas |
| `hillchart` | hill chart estilo Basecamp |
| `bpmnEditor` | diagramas BPMN |
| `timer` | cronómetro/countdown. `defaultValue (ms), format: "HH:mm:ss", type: stopwatch\|countdown` |

### Files

| `type` | Opciones clave |
| --- | --- |
| `file` | indicador de archivo |
| `fileViewer` | renderiza PDF/Office |
| `fileUpload` | input de archivo, `accept, maxFileSize` |

### Colaboración

| `type` | Opciones clave |
| --- | --- |
| `meeting` | room de videoconferencia (Agora) |
| `sharingcomponent`, `videocomponent` | streams |
| `avatar` | `src, text, shape: circle\|square, size: large\|default\|small\|<num>` |
| `avatarGroup` | grupo de avatares |
| `comment`, `mention` | comments con `@menciones` |

### Otros útiles

| `type` | Opciones clave |
| --- | --- |
| `iframe` | `src: "https://...", height` |
| `scanner` | QR/barcode reader |
| `signature` | firma digital |
| `tour` | onboarding guiado |
| `openLayersGeoMap`, `chartsGeoMap` | mapas |
| `multiTags` | input de tags |

---

## 6. Queries: REST, JS, SQL — cuándo usar cada uno

### ⚡ Resumen rápido

| Tipo | Cuándo usar | Requiere config previa? |
| --- | --- | --- |
| **`fetch` (MCP) / `addFetchQuery` (SDK)** | APIs públicas (jsonplaceholder, dummyjson, APIs internas con CORS abierto) | NO — funciona inmediato |
| **`js`** | Lógica custom, orquestación de varias queries, transformaciones | NO |
| **`restApi`** | API con datasource (auth, base URL, headers compartidos) | SÍ — datasource configurado en Lowcoder UI primero |
| **`mysql`/`postgres`/etc.** | Bases de datos | SÍ — datasource configurado |

### 6.1 `fetch` query (la más útil para empezar)

```jsonc
// MCP:
{
  "id": "loadUsers",
  "type": "fetch",
  "options": {
    "url": "https://jsonplaceholder.typicode.com/users",
    "method": "GET",
    "triggerType": "automatic"
  }
}
```

```typescript
// SDK:
app.addFetchQuery("loadUsers", {
  url: "https://jsonplaceholder.typicode.com/users",
  triggerType: "automatic",
});
```

El SDK lo convierte internamente en un JS query con `fetch(...).then(...)`. **Funciona sin configurar datasource.**

### 6.2 `js` query (lógica custom)

**⚠️ DOS REGLAS CRÍTICAS:**

1. **El script NO puede usar `await` top-level.** Lowcoder envuelve el script en `function() { ... }` no-async. Usa `return promise.then(...)`.
2. **El SDK genera automáticamente el `queryId` con prefijo `"js:"`**. Si construyes el JSON a mano, hazlo igual o el script no se ejecuta.

```typescript
// CORRECTO:
app.addJsQuery("processData", {
  script: `return loadUsers.run().then(function(users) {
  return users.filter(function(u) { return u.active; });
});`,
  triggerType: "manual",
});

// INCORRECTO (await top-level):
// script: `const users = await loadUsers.run(); return users.filter(...);`  ❌
```

### 6.3 `restApi` (datasource configurado)

Solo si el usuario tiene un datasource REST configurado en la UI de Lowcoder (Data Sources → New). Necesitas el `datasourceId` real.

```typescript
app.addRestQuery("createUser", {
  url: "/users",                          // relativo a la base URL del datasource
  method: "POST",
  headers: { "X-Custom": "value" },
  body: { name: "{{nameInput.value}}" },
  bodyType: "application/json",           // ⚠️ MIME completo, NO "json"
  datasourceId: "abc123...",              // ID real del datasource
  triggerType: "manual",
});
```

**`bodyType` válidos:** `"application/json"`, `"text/plain"`, `"application/x-www-form-urlencoded"`, `"multipart/form-data"`, `"none"`. El SDK acepta aliases (`"json"`, `"raw"`, `"form"`, `"urlencoded"`).

### 6.4 SQL (`mysql`, `postgres`, etc.)

```typescript
app.addSqlQuery("loadUsers", {
  // NO uses comillas alrededor del binding: Lowcoder convierte {{x}} en un
  // prepared statement (?) y JDBC pasa el valor como parámetro escapado.
  sql: "SELECT * FROM users WHERE status = {{statusFilter.value}}",
  datasourceId: "abc123...",   // requerido
  dbType: "postgres",
  triggerType: "automatic",
});
```

**⚠️ Reglas críticas para SQL en Lowcoder + PostgreSQL:**

| Tipo de columna | Patrón correcto | Por qué |
| --- | --- | --- |
| `varchar`/`text` | `WHERE name = {{x}}` | Lowcoder hace `?` + bind como String → OK |
| `int`/`numeric` | `WHERE qty = {{x}}` | Bind directo como Number |
| **`uuid`** | `WHERE id = {{x}}::uuid` | JDBC pasa String, postgres NO auto-castea |
| `jsonb` | `WHERE data @> {{x}}::jsonb` | Idem cast explícito |
| `LIKE` con wildcards | `WHERE name LIKE {{'%' + filter.value + '%'}}` | Eval JS en cliente |
| **NO HAGAS** | `WHERE id = '{{x}}'` ❌ | Las comillas convierten en literal — el `?` se ignora |

```typescript
// ❌ ANTI-PATRÓN — falla con "operator does not exist: uuid = character varying"
sql: "SELECT * FROM instances WHERE user_id = '{{currentUser.id}}'"

// ✅ CORRECTO
sql: "SELECT * FROM instances WHERE user_id = {{currentUser.id}}::uuid"

// ✅ INSERT con UUID + columnas tipadas
sql: "INSERT INTO payments (user_id, amount) VALUES ({{cliente.value}}::uuid, {{monto.value}}) RETURNING id"
```

### 6.5 `triggerType`

| Valor | Comportamiento |
| --- | --- |
| `"automatic"` | Se ejecuta al cargar la app y cuando cambia cualquier `{{ }}` dependiente |
| `"manual"` | Solo se ejecuta cuando se llama `queryName.run()` desde un event handler u otra query |
| `"onPageLoad"` | (alias de automatic en algunas versiones) |

**Recomendación:** queries de lectura → `automatic`. Queries de escritura (crear/editar) → `manual`, disparadas por un botón.

### 6.6 Estados de query (accesibles en `{{ }}`)

```javascript
{{queryName.data}}        // los datos retornados
{{queryName.isFetching}}  // true mientras se ejecuta — perfecto para loading de botones
{{queryName.error}}       // mensaje de error si falló
{{queryName.code}}        // código de estado interno
```

---

## 6.5. Datasources (conexiones reutilizables)

> Doc completa: [docs/datasources.md](https://github.com/aorizondo/lowcoder-agent-sdk/blob/main/docs/datasources.md)
> Doc oficial Lowcoder: <https://docs.lowcoder.cloud/lowcoder-documentation/connect-your-data/data-source-basics>

Un **datasource** es una conexión configurada (BD, API, SaaS) que tus queries reutilizan. **Para queries simples NO necesitas crear uno** — usa `addFetchQuery()` o `addJsQuery()` que apuntan al datasource virtual `#JS_CODE`.

### Crea un datasource cuando

- Tienes credenciales que compartir entre múltiples queries (auth, base URL, headers comunes)
- Conectas a una BD relacional (postgres, mysql, mssql, oracle, mariadb, clickHouse, snowflake)
- Conectas a MongoDB, Redis o Elasticsearch
- Quieres usar un plugin del node-service (S3, Slack, Jira, OpenAI, Stripe, etc. — ~60 disponibles)

### Tipos disponibles

**SQL:** `postgres`, `mysql`, `mariadb`, `mssql`, `oracle`, `clickHouse`, `snowflake`
**NoSQL/Search:** `mongodb`, `redis`, `es` (Elasticsearch)
**HTTP:** `restApi`, `graphql`
**SaaS:** `googleSheets`, `smtp`
**Plugins JS (~60):** `s3`, `slack`, `jira`, `openAi`, `stripe`, `shopify`, `twilio`, `sendGrid`, `notion`, `asana`, `github`, `gitlab`, `firebase`, `supabaseApi`, `bigQuery`, `athena`, `dynamodb`, `couchdb`, `huggingFaceEndpoint`, etc.

### Flujo recomendado desde MCP

```text
1. list_datasource_types({})           → ver qué tipos están disponibles
2. list_datasources({})                → ver si ya existe uno reusable
3. list_js_plugins({ appId })          → si es plugin JS, descubre el schema exacto
4. test_datasource({...})              → valida credenciales SIN crear
5. create_datasource({...})            → crea con testFirst=true (default)
6. addSqlQuery/addRestQuery con datasourceId: ds.id
```

### Ejemplos rápidos (SDK)

```typescript
import { datasource, LowcoderClient } from "@aorizondo/lowcoder-agent-sdk-core";

const orgId = await client.getCurrentOrgId();

// PostgreSQL
const pgDs = await client.createDatasource(
  datasource("Prod Postgres")
    .postgres({
      host: "db.example.com",
      database: "app_prod",
      username: "lowcoder",
      password: "s3cr3t",
      usingSsl: true,
    })
    .inOrg(orgId)
    .build()
);

// REST API con auth Basic
const stripeDs = await client.createDatasource(
  datasource("Stripe")
    .restApi({
      url: "https://api.stripe.com",
      authConfig: { type: "BASIC_AUTH", username: "sk_live_xxx", password: "" },
    })
    .inOrg(orgId)
    .build()
);

// MongoDB con URI
const mongoDs = await client.createDatasource(
  datasource("Mongo Atlas")
    .mongodb({ usingUri: true, uri: "mongodb+srv://user:pwd@cluster.example.net/db" })
    .inOrg(orgId)
    .build()
);

// Plugin JS (S3)
const s3Ds = await client.createDatasource(
  datasource("My S3")
    .jsPlugin("s3", {
      accessKey: "AKIA...",
      secretKey: "...",
      region: "us-east-1",
    })
    .inOrg(orgId)
    .build()
);
```

### Usar el datasource en queries

```typescript
app.addSqlQuery("loadUsers", {
  sql: "SELECT * FROM users WHERE status = '{{status.value}}'",
  datasourceId: pgDs.id,      // ← ID del datasource
  dbType: "postgres",
  triggerType: "automatic",
});

app.addRestQuery("getStripeCustomer", {
  url: "/v1/customers/{{customerId.value}}",  // relativo a base URL del datasource
  method: "GET",
  datasourceId: stripeDs.id,
  triggerType: "manual",
});
```

### ⚠️ Reglas de seguridad CRÍTICAS

1. **Lowcoder no devuelve passwords en GET.** En `updateDatasource`, **omite** los campos `password`, `uri`, `serviceAccount` para preservar los valores guardados. Si los incluyes con `null` o `""` los borrarías.
2. **Nunca pegues passwords reales en logs o conversación.** Si el usuario te los da, pásalos a `create_datasource` y luego olvídalos.
3. **Las queries JS corren en el navegador** — cualquier secret hardcodeado en un JS query es visible al usuario. Para auth usa REST queries con datasource + `authConfig`.

### Errores comunes

| Síntoma | Causa | Fix |
| --- | --- | --- |
| `Test connection failed: connection refused` | Host/puerto incorrectos o firewall | Verifica desde un cliente externo (psql, mongo-shell, curl) |
| `Datasource cannot be found` al ejecutar query | `datasourceId` apunta a un ID inexistente | Lista con `list_datasources` y verifica el ID |
| Datasource creado pero queries fallan con 401 | Password se borró en update por enviar `null` | Re-crea o usa la UI para corregir |
| Plugin JS desconocido (ej "saleforce") | Plugin no instalado en este node-service | Usa `list_datasource_types` para ver disponibles |
| Lowcoder no soporta el plugin que necesitas | Es un plugin EE o no implementado | Crea el datasource como `restApi` apuntando a la API del SaaS |

### Limitaciones conocidas (OSS)

- `BEARER_TOKEN_AUTH` y `OAUTH2` (client-credentials/auth-code) **no implementados** en REST plugin OSS. Workaround: usa `BASIC_AUTH` o pon el `Authorization` header manualmente
- `OAUTH2_INHERIT_FROM_LOGIN` SÍ funciona si la org tiene SSO configurado
- `streamApi` (WebSocket) y `alasql` son client-only, no persisten como datasource

---

## 7. Expresiones `{{ }}` y bindings

Todo lo que pongas entre `{{ }}` se evalúa como JavaScript en el navegador con acceso a todos los componentes y queries.

### Casos comunes

```javascript
// Bind directo
"{{loadUsers.data}}"

// Transformación
"{{loadUsers.data.map(u => ({label: u.name, value: u.id}))}}"

// Acceso a fila seleccionada de tabla
"{{usersTable.selectedRow.email}}"

// Valor de input
"{{nameInput.value}}"

// Condicional para visibility/disabled
"{{!form1.valid}}"
"{{usersTable.selectedRow === undefined}}"

// Currentuser, urlparams
"{{currentUser.name}}"
"{{urlParams.id}}"

// Format con librerías globales (dayjs, lodash, numbro, uuid, papaparse)
"{{dayjs(record.createdAt).format('YYYY-MM-DD')}}"
"{{numbro(record.amount).formatCurrency('$0,0.00')}}"
"{{lodash.groupBy(loadUsers.data, 'role')}}"
"{{uuid.v4()}}"

// Helpers que tú defines en preload.script
"{{fmt.currency(loadCarts.data.total)}}"
```

### Tip de oro

Si un agente está construyendo expresiones complejas con `?.` (optional chaining), úsalo siempre cuando lees `query.data`:

```javascript
// ✅ Seguro durante el primer render (data aún no llegó)
"{{loadUsers.data?.length || 0}}"

// ❌ Crashea si data === undefined
"{{loadUsers.data.length}}"
```

---

## 8. Estado: tempStates y transformers

### Temporary State

Almacena valores intermedios. Se accede vía `{{stateName.value}}`.

```typescript
app.addTempState("currentPage", 1);
app.addTempState("currentView", "login");
app.addTempState("selectedFilters", { status: "all", category: null });
app.addTempState("isModalOpen", false);
```

**Actualizar desde JS queries:**

```javascript
// En un script JS query
currentPage.setValue(currentPage.value + 1);
currentView.setValue("register");
selectedFilters.setIn(["status"], "active");
isModalOpen.setValue(true);
```

**⚠️ Detalles de serialización (que el SDK ya maneja por ti):**

Internamente Lowcoder serializa los tempStates en formato **flat** (no anidado en `comp`)
y el `value` se almacena **JSON-stringified**:

```json
// En el DSL, Lowcoder espera:
{
  "tempStates": [
    { "name": "currentView", "value": "\"login\"" },     // ✅ string JSON-encoded
    { "name": "counter", "value": "42" },                 // ✅ number como JSON
    { "name": "isOpen", "value": "false" },               // ✅ bool como JSON
    { "name": "filter", "value": "{\"status\":\"active\"}" }
  ]
}

// ❌ NO esto (lo que parece "natural"):
{ "tempStates": [{ "name": "currentView", "comp": { "value": "login" } }] }
// → produce currentView.value === "null" en runtime
```

Si construyes el DSL a mano (sin `addTempState`), aplica `JSON.stringify(initialValue)`
y pon el resultado en el campo `value` a nivel raíz, no dentro de `comp`.

### Transformers

Funciones puras que transforman datos sin side effects. Útil para derivar valores complejos.

```typescript
// El SDK aún no tiene wrapper directo, pero puedes inyectarlos via DSL crudo
// O preferir un JS query manual que retorna el cálculo
```

### Cuándo usar qué

- **TempState** para valores que el usuario controla (paginación, filtros, modo)
- **JS query manual** cuando necesitas lógica con dependencias
- **Transformer** para fórmulas puras reutilizables

---

## 9. Layout: auto vs manual, grid de 24 cols

### Auto layout (sin `at`)

El SDK hace bin-packing first-fit: coloca cada componente en el primer espacio libre. Bueno para prototipos rápidos pero los charts grandes pueden quedar mal.

```typescript
app
  .addText("title", { text: "Hola" })
  .addButton("btn", { text: "Click" })
  // Sin especificar at — el SDK los coloca
  ;
```

### Manual layout (con `at`)

Te da control total. **Recomendado para apps presentables.**

```typescript
app.addText("title", { text: "## Hero", at: { x: 0, y: 0, w: 24, h: 8 } });
app.addText("kpi1",  { text: "...", at: { x: 0, y: 8, w: 6, h: 18 } });
app.addText("kpi2",  { text: "...", at: { x: 6, y: 8, w: 6, h: 18 } });
```

### Reglas del grid

- **24 columnas** horizontales
- **`h` en unidades de 8px** (`h: 5` = 40px)
- **No solapamiento** entre componentes
- **El alto crece dinámicamente** según contenido (texto con autoHeight)
- **Modales/Drawers** no entran en el grid (son overlay)

### Tamaños recomendados

- KPI card: `w: 6, h: 18`
- Chart pequeño: `w: 8, h: 40`
- Chart grande: `w: 12, h: 40`
- Tabla: `w: 24, h: 50`
- Botón en toolbar: `w: 4, h: 6`
- Input con label: `w: 6, h: 8`
- Divider con título de sección: `w: 24, h: 3`

---

## 10. Tema visual: preload CSS + animaciones

Apps profesionales necesitan estilo. Inyecta CSS y JS globales con `withPreload`:

```typescript
app.withPreload({
  script: `
    // Helpers globales accesibles en {{ }}
    window.fmt = {
      currency: n => new Intl.NumberFormat('es-MX', {style:'currency', currency:'USD'}).format(n || 0),
      compact:  n => new Intl.NumberFormat('en', {notation:'compact'}).format(n || 0),
      date:     d => new Date(d).toLocaleDateString('es-MX'),
    };
  `,
  css: `
    body {
      background: linear-gradient(135deg, #f5f7ff, #ecf0ff);
      font-family: 'Inter', -apple-system, sans-serif;
    }

    /* Glass effect en cards */
    .ui-comp-card, [class*="CardWrapper"] {
      backdrop-filter: blur(12px);
      background: rgba(255,255,255,0.85) !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 32px rgba(99,102,241,0.08) !important;
      transition: all 0.3s;
    }
    .ui-comp-card:hover { transform: translateY(-2px); }

    /* Botones con gradiente */
    .ui-comp-button .ant-btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
      border: none !important;
    }

    /* Animaciones de entrada */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .react-grid-item { animation: fadeInUp 0.5s ease-out both; }
    .react-grid-item:nth-child(2) { animation-delay: 0.1s; }
    .react-grid-item:nth-child(3) { animation-delay: 0.2s; }

    /* Responsive móvil */
    @media (max-width: 768px) {
      .ui-comp-text h1 { font-size: 1.75rem !important; }
    }
  `
});
```

### Selectores CSS útiles

| Selector | Para qué |
| --- | --- |
| `.ui-comp-{type}` | Todos los componentes de un tipo (ej: `.ui-comp-table`) |
| `.{componentId}` | Un componente específico por su nombre (ej: `.kpi1`) |
| `.react-grid-item` | Cada celda del grid |
| `[class*="CardWrapper"]` | Wrapper interno de cards |
| `.ant-btn`, `.ant-table`, `.ant-input` | Clases internas de Ant Design |

---

## 11. SEO completo

Lowcoder es una SPA — el HTML inicial NO tiene los datos. **Limitación inherente**: el contenido dinámico (`{{query.data}}`) no aparece en el HTML inicial, por lo que Google necesita renderizar JS para indexarlo (lo hace, pero más lento).

**Lo que SÍ puedes optimizar:**

### Opción A: Tool `configure_seo` (recomendado, idempotente)

```jsonc
configure_seo({
  appId: "...",
  title: "Dashboard de Ventas — Mi Empresa",      // <60 chars
  description: "Plataforma de análisis de ventas...", // <160 chars
  ogImage: "https://cdn.../og-1200x630.jpg",
  canonical: "https://miapp.com/dashboard",
  siteName: "Mi Empresa",
  themeColor: "#6366f1",
  jsonLdType: "WebApplication",   // o "WebPage", "SoftwareApplication", "Organization"
  twitterCard: true
})
```

Inyecta automáticamente: `<title>`, `<meta description>`, OpenGraph completo, Twitter Card, JSON-LD Schema.org, canonical, theme-color, robots, viewport. Idempotente — llámalo varias veces sin duplicar.

### Opción B: Preload script manual

```javascript
function setMeta(name, value, attr = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute("content", value);
}
function safeApply() {
  document.title = "Mi App";
  setMeta("description", "...");
  setMeta("og:title", "Mi App", "property");
  // ...
}
safeApply();
setTimeout(safeApply, 500);   // Lowcoder pisa meta tags durante carga, re-aplicar
setTimeout(safeApply, 2000);
```

### Para SEO crítico real

Embebe la app dentro de un sitio Next.js que haga SSR del shell semántico y use `LowcoderAppView` solo para la parte interactiva. Lowcoder por sí solo no hará SSR.

---

## 12. Plugins de usuario (componentes reutilizables)

Los plugins son componentes React empaquetados como paquetes npm que el usuario instala en su Lowcoder una vez. Después se usan como cualquier componente nativo.

### Usar un plugin instalado

```typescript
// Si el usuario tiene instalado mi-paquete que exporta el componente MyWidget:
app.addComponent("widget1", "my-paquete/MyWidget", {
  // opciones específicas del plugin
});
```

### Descubrir qué plugins tiene instalados

Llama `get_app_dsl({ appId: "alguna-app-existente", simplified: false })` y busca compTypes con formato `"npm-package/CompName"` o nombres no listados en este skill — esos son plugins.

### Crear un plugin nuevo

```bash
yarn create lowcoder-plugin nombre-del-plugin
cd nombre-del-plugin
```

Estructura mínima en `src/index.ts`:

```typescript
import {
  UICompBuilder,
  stringExposingStateControl,
  withExposingConfigs,
  NameConfig,
  Section,
} from "lowcoder-sdk";

const childrenMap = {
  value: stringExposingStateControl("value", ""),
  title: stringExposingStateControl("title", "Hola"),
};

const MyComp = new UICompBuilder(childrenMap, (props) => (
  <div className="my-widget">
    <h3>{props.title.value}</h3>
    <p>{props.value.value}</p>
  </div>
))
  .setPropertyViewFn((children) => (
    <Section name="Basic">
      {children.title.propertyView({ label: "Título" })}
      {children.value.propertyView({ label: "Valor" })}
    </Section>
  ))
  .build();

export default {
  my_widget: withExposingConfigs(MyComp, [new NameConfig("value", "")]),
};
```

Sección en `package.json`:

```json
{
  "lowcoder": {
    "comps": {
      "my_widget": { "name": "Mi Widget", "icon": "./icons/icon.png" }
    }
  }
}
```

Build y publish: `yarn build --publish`.

Instalar en Lowcoder: **Insert → Extensions → Add npm plugin** → buscar el paquete.

---

## 13. Errores comunes y cómo evitarlos

### ❌ "Datasource cannot be found"
**Causa:** queries JS sin `datasourceId: "#JS_CODE"`, o REST queries sin datasource registrado.
**Fix:** usa `addFetchQuery()` que pone todo correcto, o asegúrate de poner `datasourceId: "#JS_CODE"` para JS.

### ❌ "await is only valid in async functions"
**Causa:** script JS query con `await` top-level.
**Fix:** usa `return fetch(...).then(...)` en lugar de `const r = await fetch(...)`.

### ❌ "Service is busy" en endpoints
**Causa A:** Lowcoder < 2.7.0 tiene un bug donde `#JS_CODE` no se resuelve.
**Fix:** actualiza a 2.7.6+.
**Causa B:** node-service caído.
**Fix:** `docker ps` y reiniciar el container del node-service.

### ❌ Component "Not Found" en /view
**Causa:** charts especializados (`lineChart`, etc.) son componentes remotos cargados desde `lowcoder-comps` npm. Si la app no se ha publicado, en `/view` puede fallar la carga.
**Fix:** primero usa `/edit` para confirmar render, luego `deploy_app` y prueba `/view`.

### ❌ KPIs muestran 0 / "No data"
**Causa A:** estás en `/edit` (las queries automáticas no corren).
**Fix:** ve a `/view`.
**Causa B:** la expresión `{{ }}` accede a `data` antes de que cargue.
**Fix:** usa `?.` y default: `{{loadUsers.data?.length || 0}}`.

### ❌ Gauge chart no muestra mis datos
**Causa:** gaugeChart requiere `echartsOption` con estructura compleja específica por subtipo.
**Fix:** usa `progressCircle` con `value: N` — visualmente similar y funciona siempre.

### ❌ "Cannot construct instance of `java.lang.String[]`"
**Causa:** estás llamando `/api/query/execute` desde curl/script con `path` como string en lugar de array.
**Fix:** `path: ["queries", "loadUsers"]` (array). El SDK ya lo hace bien — solo es problema si construyes el request a mano.

### ❌ Tabla muestra "[object Object]" en una columna
**Causa:** `dataIndex` apunta a un objeto, no a primitiva.
**Fix:** usa notación de path: `dataIndex: "company.name"` para nested objects.

### ❌ Tabla renderea filas pero las celdas están vacías
**Causa:** las columnas necesitan un campo `render` con `{{currentCell}}` para mostrar el valor. Sin `render`, Lowcoder dibuja las filas pero no sabe qué pintar — el `dataIndex` solo indica de dónde leer el dato, no cómo renderizarlo.
**Fix:** el SDK 0.4+ añade `render` automáticamente. Si construyes el DSL a mano:
```json
{ "title": "Nombre", "dataIndex": "name", "key": "name",
  "render": { "compType": "text", "comp": { "text": "{{currentCell}}" } } }
```
Para columnas con `isTag: true` usa `compType: "tag"` (pinta colores según valor único). Para links: `compType: "link"`.

### ❌ Select dinámico muestra "Option 1", "Option 2" en lugar de mis opciones reales
**Causa:** pasaste options como string `"{{query.data?.map(...)}}"` pero Lowcoder espera un objeto estructurado con `optionType: "map"` + `mapData`.
**Fix con SDK 0.4+:** pasa un objeto `{ data, label, value }` con bindings `{{item.x}}`:
```typescript
app.addSelect("userSelect", {
  options: {
    data: "{{loadUsers.data}}",
    label: "{{item.name}}",
    value: "{{item.id}}",
  },
});
```
Para options estáticas, sigue usando array `[{label, value}, ...]`.

### ❌ El botón submit del form no funciona / no ejecuta su onClick
**Causa:** Lowcoder trata `type: "submit"` como **submit del form referenciado** y **omite completamente** `onEvent`. Si el botón NO está dentro de un Form (o no tiene `form: "myForm"`), el click no hace nada — `submitForm(props.form)` no encuentra qué submitear y la acción muere en silencio. **No hay error en consola, no hay toast, el botón vuelve a estado normal.**

Confirmado en source: [client/packages/lowcoder/src/comps/comps/buttonComp/buttonComp.tsx:201-209](https://github.com/lowcoder-org/lowcoder/blob/main/client/packages/lowcoder/src/comps/comps/buttonComp/buttonComp.tsx#L201-L209):
```typescript
if (isDefault(props.type)) {
  handleClickEvent();        // ejecuta tu onEvent
} else {
  submitForm(editorState, props.form);  // ignora onEvent, busca el form
}
```

**Fix opción A (recomendado para login/registro fuera de Form):** usa botón normal sin `type`:
```typescript
app.addButton("loginBtn", {
  text: "Iniciar Sesión",
  onClick: "doLogin",   // ✅ ejecuta la query
  // SIN type:"submit"
});
```

**Fix opción B (si quieres el botón dentro de un Form real):** envuelve el botón en `addComponent("loginForm", "form", { items, layout })` y referencia el form:
```typescript
app.addButton("loginBtn", {
  text: "Iniciar Sesión",
  type: "submit",
  form: "loginForm",   // referencia el ID del Form padre
  onClick: "doLogin",
});
```

El SDK 0.4+ emite un `console.warn` si detecta `type: "submit" + onClick` sin `form`.

### ❌ El `bodyType: "json"` da error
**Causa:** Lowcoder requiere MIME type completo.
**Fix:** `"application/json"`. El SDK acepta el alias `"json"` y lo traduce.

### ❌ Meta tags SEO se sobreescriben
**Causa:** Lowcoder pone sus defaults DESPUÉS de tu preload script.
**Fix:** usa `configure_seo` tool (incluye retries con setTimeout 500ms, 2s, 5s).

### ❌ App pública pide login (anónimos no entran)
**Causa:** la app no está marcada `publicToAll: true`. Por defecto Lowcoder requiere auth.
**Fix:** llama `client.setAppPublicToAll(appId, true)` o usa `app.deploy(client, undefined, { publicToAll: true })`. Imprescindible para portales de login/registro y landing pages.

### ❌ `currentView.value === "null"` (string literal) en runtime
**Causa:** estás construyendo tempStates con formato anidado `{ name, comp: { value } }`. Lowcoder espera FLAT y JSON-stringified.
**Fix:** usa `addTempState("name", value)` del SDK (lo hace bien). Si construyes a mano: `{ name: "currentView", value: JSON.stringify("login") }`. Ver §8 para detalles.

### ❌ `operator does not exist: uuid = character varying` en PostgreSQL
**Causa:** comillas alrededor del binding o falta `::uuid` cast.
**Fix:** `WHERE id = {{x}}::uuid` (sin comillas + cast). Detalles en §6.4.

### ❌ App duplicada en cada `deploy()` / Spinner infinito tras login
**Causa:** `deploy()` por defecto crea una app NUEVA con nuevo `applicationId` cada vez. Si otras apps tienen ese ID hardcoded en redirects/links, cada redeploy genera apps "huérfanas" RECYCLED y los enlaces apuntan a IDs que ya no son NORMAL. El endpoint `/api/applications/{id}/view` retorna **HTTP 400** con mensaje opaco "Bad request", y el frontend Lowcoder se queda en spinner haciendo polling indefinido (parecen "minutos cargando").

**Fix (SDK 0.4.2+) — UPSERT preserva el `applicationId`:**
```typescript
// ✅ Si existe app NORMAL con el mismo título → update preservando ID. Si no, create.
const result = await app.deploy(client, undefined, {
  upsert: true,
  publish: true,
});

// ❌ Cada redeploy genera ID nuevo → rompe enlaces de otras apps
const result = await app.deploy(client);

// ❌ Casi tan malo: replaceByName recicla el ID conocido y crea otro distinto
const result = await app.deploy(client, undefined, { replaceByName: true });
```

Para apps que construyen el DSL a mano (sin `app.deploy()`):
```typescript
const existing = (await client.listApps(orgId)).find(
  a => a.name === APP_NAME && a.applicationStatus === "NORMAL"
);
if (existing) {
  await client.updateApp(existing.applicationId, dsl, { publish: true });
} else {
  const r = await client.createApp({ name: APP_NAME, orgId, applicationType: 1, editingApplicationDSL: dsl });
  await client.publishApp(r.applicationInfoView.applicationId);
}
```

### ❌ Apps que se referencian (redirects, links) rompen tras redeploy
**Causa:** IDs hardcoded `/apps/abc123/view` cambian cuando recreas la app destino.
**Fix:** descubre los IDs dinámicamente:
```typescript
const allApps = await client.listApps(orgId);
const adminId = allApps.find(a => a.name === "Admin" && a.applicationStatus === "NORMAL")?.applicationId;
```

### ❌ `hidden: "{{x !== 'login'}}"` no oculta los hijos del card
**Causa:** en Lowcoder, `hidden` SOLO oculta el componente exacto. Los inputs son **hermanos** del card en el grid (no hijos anidados), por lo que el card desaparece pero los inputs siguen visibles.
**Fix correcto:** poner `hidden` en CADA componente que quieras ocultar (input, button, link, text...). NO solo en el card contenedor. O usar un `container` real con `items + layout` anidados (cuya visibilidad sí cascada).

### ❌ Label de input vacío o "Label" como texto
**Causa:** pasaste `label: "Mi etiqueta"` (string) a un componente que espera `label: { text: "Mi etiqueta" }` (object). Algunos componentes (input estándar) aceptan ambos; otros (password, numberInput) requieren el objeto.
**Fix:** el SDK ya normaliza string → object automáticamente en `addComponent()`. Si construyes a mano, usa `{ text: "..." }`.

### ❌ Snapshot del browser muestra inputs ocultos como "visible"
**Causa:** Lowcoder no usa `display: none` en componentes con `hidden=true` — los oculta visualmente con CSS pero el DOM sigue ahí. Herramientas como Selenium/snapshots los detectan.
**Fix:** usa el screenshot real para validar UI, no solo el snapshot textual. Verifica `getBoundingClientRect()` o `offsetParent === null` para presencia real.

---

## 14. Buenas prácticas

### Naming

- **IDs en camelCase descriptivo:** `loadUsers`, `salesTable`, `nameInput`. Evita `q1`, `btn1`, `comp123`.
- **Queries con verbo:** `loadX`, `saveX`, `deleteX`, `searchX`. Facilita leer el código.

### Estructura

- **Una sección visual = un divider con `title`**. Da estructura clara.
- **KPIs siempre en fila al tope** después del hero.
- **Filtros sobre la tabla, nunca debajo**.
- **CTAs (Crear/Guardar) abajo a la derecha del form**, no en medio.

### Datos

- **Siempre `?.` al acceder a `query.data`**. Evita crashes en el primer render.
- **Defaults explícitos:** `{{loadUsers.data || []}}` para evitar errores en `.map()`.
- **`isFetching` en botones de acción:** `loading: "{{saveRecord.isFetching}}"`.

### UX

- **Feedback visible:** `loading`, `disabled` condicional, `tooltip` en acciones críticas.
- **Confirmación para destructivos:** queries DELETE/UPDATE con `confirmationModal` (en el JSON).
- **Estados vacíos:** las tablas muestran "No data" por defecto; texto de ayuda si lo necesitas.

### Performance

- **Tablas grandes:** `pageSize: 10-20`, `showFilter: true`. Lowcoder pagina lado cliente por default.
- **Queries pesadas:** ponlas `manual` y dispara con botón "Cargar".
- **Charts con muchos datos:** preprocesa en un JS query (groupBy, aggregate) antes de pasarlos al chart.

### Versiones

- **Verifica versión Lowcoder ≥ 2.7.0** antes de empezar. Versiones anteriores tienen bugs críticos con queries JS.

### SEO

- **Llama `configure_seo` después de `create_app`** para apps públicas.
- **Title <60 chars, description <160 chars** (límites de Google).
- **`ogImage` 1200x630px** para Open Graph.

### Seguridad

- **NUNCA hardcodees secretos en queries JS** — usa env vars del datasource.
- **Las queries JS corren en el navegador del usuario** — cualquier secret en el script es público.
- **Para API calls con auth, usa REST query con datasource configurado**, no fetch JS.

### Deploy idempotente

```typescript
// ❌ MAL — acumula apps duplicadas cada vez que ejecutas el script
const result = await app.deploy(client);

// ✅ BIEN — elimina apps anteriores con el mismo nombre, publica + público si aplica
const result = await app.deploy(client, undefined, {
  replaceByName: true,    // elimina duplicados previos
  publish: true,           // publica la versión (necesario para algunas features de /view)
  publicToAll: true,       // solo para apps públicas (login, registro, landing)
});
```

### Cross-app references (redirects, links)

```typescript
// ❌ MAL — IDs hardcoded se rompen tras redeploy
const APP_ID_ADMIN = "6a1fde3dec32cf26f7e98b19";  // se quedó stale tras redeploy

// ✅ BIEN — descubrir IDs dinámicamente desde la lista
const allApps = await client.listApps(orgId);
const adminApp = allApps.find(a => a.name === "Panel Admin" && a.applicationStatus === "NORMAL");
if (!adminApp) throw new Error("Deploy 'Panel Admin' primero");
const APP_ID_ADMIN = adminApp.applicationId;
```

**Orden de deploy importa:** primero las apps destino, luego las que las referencian.

### SQL con PostgreSQL: UUIDs y otros tipos

```typescript
// ❌ MAL — comillas convierten el binding en literal, no parámetro
app.addSqlQuery("getUser", {
  sql: "SELECT * FROM users WHERE id = '{{currentUser.id}}'",
});

// ❌ MAL — sin comillas pero sin cast → "operator does not exist: uuid = character varying"
app.addSqlQuery("getUser", {
  sql: "SELECT * FROM users WHERE id = {{currentUser.id}}",
});

// ✅ BIEN — sin comillas + cast explícito
app.addSqlQuery("getUser", {
  sql: "SELECT * FROM users WHERE id = {{currentUser.id}}::uuid",
});
```

Aplica el mismo patrón a `jsonb`, `timestamp`, arrays. Para `LIKE`, la expresión completa va dentro del binding:

```typescript
sql: "SELECT * FROM users WHERE name ILIKE {{'%' + search.value + '%'}}"  // ✅
```

### Toggle de vistas (login/registro, tabs, modos)

```typescript
// ❌ MAL — el hidden del card NO oculta los inputs hermanos en el grid
app
  .addCard("loginCard", { hidden: "{{view.value !== 'login'}}", at: { x:6, y:0, w:12, h:40 } })
  .addInput("emailInput", { at: { x:7, y:5, w:10, h:8 } })   // ← se ve siempre
  .addCard("regCard", { hidden: "{{view.value !== 'register'}}", at: { x:6, y:0, w:12, h:40 } })
  .addInput("nameInput", { at: { x:7, y:5, w:10, h:8 } });    // ← se ve siempre

// ✅ BIEN opción A — repetir `hidden` en TODOS los componentes
const hideLogin = "{{view.value !== 'login'}}";
const hideReg = "{{view.value !== 'register'}}";
app
  .addCard("loginCard", { hidden: hideLogin, at: { x:6, y:0, w:12, h:40 } })
  .addInput("emailInput", { hidden: hideLogin, at: { x:7, y:5, w:10, h:8 } })
  .addCard("regCard", { hidden: hideReg, at: { x:6, y:0, w:12, h:40 } })
  .addInput("nameInput", { hidden: hideReg, at: { x:7, y:5, w:10, h:8 } });

// ✅ BIEN opción B — separar visualmente en distintos `y` (no solapar)
app
  .addCard("loginCard", { hidden: hideLogin, at: { x:6, y:0,  w:12, h:40 } })
  .addInput("emailInput", { hidden: hideLogin, at: { x:7, y:5,  w:10, h:8 } })
  .addCard("regCard",   { hidden: hideReg,   at: { x:6, y:50, w:12, h:50 } })
  .addInput("nameInput", { hidden: hideReg,   at: { x:7, y:55, w:10, h:8 } });

// ✅ BIEN opción C — usar `container` con items+layout anidados (hijos heredan visibilidad)
app.addComponent("loginContainer", "container", {
  hidden: hideLogin,
  items: { [k1]: { compType: "input", name: "emailInput", comp: {...} } },
  layout: { [k1]: { i: k1, x: 0, y: 0, w: 24, h: 8 } },
  at: { x: 6, y: 0, w: 12, h: 40 },
});
```

### Inicialización correcta de tempStates

```typescript
// ❌ MAL si construyes el DSL a mano sin usar addTempState
{ tempStates: [{ name: "view", comp: { value: "login" } }] }  // resulta en value === "null"

// ✅ BIEN — usa addTempState() que ya lo hace por ti
app.addTempState("view", "login");        // string
app.addTempState("count", 0);              // number
app.addTempState("isOpen", false);         // bool
app.addTempState("filter", { ok: true });  // object

// ✅ BIEN — si construyes a mano: flat + JSON.stringify
{ tempStates: [{ name: "view", value: JSON.stringify("login") }] }
```

### Labels en componentes de input

```typescript
// ❌ Antes del SDK 0.4 (o si construyes a mano) — falla en password, numberInput
{ label: "Contraseña" }   // queda como texto literal "Label" o vacío

// ✅ BIEN — formato objeto que el SDK normaliza
{ label: { text: "Contraseña", align: "left" } }

// ✅ EQUIVALENTE — el SDK 0.4+ acepta string y lo normaliza
app.addPassword("pw", { label: "Contraseña" })
app.addInput("email", { label: "Email" })
```

### Patrón addRecord seguido de refresh

```typescript
// ❌ MAL — race condition, el refresh puede correr antes del insert
btn.onClick → run insert + run reload (en paralelo)

// ✅ BIEN — encadena con .then(), asegura orden
.addJsQuery("saveAndReload", {
  script: `return insertRecord.run().then(function() {
    return loadRecords.run();
  }).then(function() {
    message.success("Guardado");
  }).catch(function(err) {
    message.error("Error: " + err.message);
  });`,
  triggerType: "manual",
})
```

---

## 15. Referencia rápida MCP tools

### `get_my_orgs()`

Sin argumentos. Devuelve las organizaciones (workspaces) del usuario autenticado.

**Úsalo cuando NO sepas qué `orgId` usar.** Auto-descubre vía `/api/v1/users/me`.

→ `{ userId, username, currentOrgId, orgs: [{ orgId, name, role, isCurrent, isAutoGenerated }], hint: "..." }`

El campo `currentOrgId` es exactamente el que necesitas para `create_app`. Si el array `orgs` tiene más de un elemento, pregunta al usuario cuál usar.

### `get_component_types()`

Sin argumentos. Retorna lista de los ~80 tipos. **Llamar primero** si dudas qué `type` usar.

### `create_app(input)`

```typescript
{
  title: string,
  orgId: string,
  components: Array<{
    id: string,
    type: string,           // "button", "table", "lineChart", etc.
    options?: object,        // específico por tipo
    layout?: { x, y, w?, h? }
  }>,
  queries?: Array<{
    id: string,
    type: "fetch" | "js" | "restApi" | "mysql" | "postgres" | "mssql" | ...,
    options: object
  }>,
  settings?: { description?, category?, gridPaddingX?, ... },
  publish?: boolean,
  folderId?: string
}
// → { appId, name, url }
```

### `update_app(input)`

Igual que `create_app` pero con `appId` en lugar de `title+orgId`. **Añade** sin eliminar lo existente.

### `list_apps({ orgId? })`

→ `Array<{ appId, name, type, status, createdAt }>`

### `get_app_dsl({ appId, simplified? })`

- `simplified: true` → resumen legible de componentes y queries
- `simplified: false` → DSL JSON completo

### `deploy_app({ appId })`

Publica la app. Útil cuando creaste con `publish: false`.

### `configure_seo(input)`

```typescript
{
  appId: string,
  title: string,
  description: string,
  ogImage?: string,
  canonical?: string,
  siteName?: string,
  themeColor?: string,           // default "#6366f1"
  jsonLdType?: "WebApplication" | "WebPage" | "SoftwareApplication" | "Organization",
  twitterCard?: boolean,         // default true
  preserveCss?: boolean          // default true — mantiene tu CSS preload
}
// → { seoConfigured: true, tags: [...] }
```

### Tools de Datasources

| Tool | Para qué |
| --- | --- |
| `list_datasources({ orgId?, type?, name? })` | Lista los datasources existentes |
| `list_datasource_types({ orgId? })` | Lista todos los tipos disponibles (incluyendo plugins JS) |
| `list_js_plugins({ appId })` | Schema EXACTO de cada plugin JS (s3, slack, jira, openAi, ...) |
| `test_datasource({ type, datasourceConfig, orgId? })` | Prueba conexión SIN crear |
| `create_datasource({ name, type, datasourceConfig, orgId?, testFirst? })` | Crea. Por defecto prueba conexión antes (testFirst=true) |
| `update_datasource({ id, name?, datasourceConfig? })` | Actualiza. **OMITE** password/uri/serviceAccount para preservar |
| `delete_datasource({ id })` | Soft-delete |
| `get_datasource_structure({ id, ignoreCache? })` | Tablas/columnas (solo SQL/Mongo) |
| `list_datasource_permissions({ id })` | Permisos del datasource |
| `grant_datasource_permission({ id, role, userIds?, groupIds? })` | Otorgar viewer/editor/owner |

---

## 16. Ejemplos completos

### 16.1 Dashboard simple via MCP

```jsonc
// Primero descubre el orgId (solo la primera vez):
get_my_orgs()  // → currentOrgId: "..."

create_app({
  "title": "Mi Primer Dashboard",
  "orgId": "<el currentOrgId de get_my_orgs>",
  "components": [
    { "id": "title", "type": "text",
      "options": { "text": "## 📊 Dashboard de Ventas" },
      "layout": { "x": 0, "y": 0, "w": 24, "h": 8 } },

    { "id": "kpi1", "type": "text",
      "options": { "text": "<div style='font-size:11px;text-transform:uppercase;color:#64748b'>Usuarios</div><div style='font-size:2rem;font-weight:700;color:#6366f1'>{{loadUsers.data?.length || 0}}</div>" },
      "layout": { "x": 0, "y": 8, "w": 6, "h": 18 } },

    { "id": "kpi2", "type": "text",
      "options": { "text": "<div style='font-size:11px;text-transform:uppercase;color:#64748b'>Productos</div><div style='font-size:2rem;font-weight:700;color:#6366f1'>{{loadProducts.data?.total || 0}}</div>" },
      "layout": { "x": 6, "y": 8, "w": 6, "h": 18 } },

    { "id": "chart", "type": "barChart",
      "options": {
        "title": "Productos por categoría",
        "data": "{{loadProducts.data?.products ? Object.entries(loadProducts.data.products.reduce((a,p)=>{a[p.category]=(a[p.category]||0)+1;return a;},{})).map(([k,v])=>({categoria:k, cantidad:v})) : []}}",
        "xAxisKey": "categoria",
        "yAxisKeys": ["cantidad"]
      },
      "layout": { "x": 12, "y": 8, "w": 12, "h": 30 } },

    { "id": "users", "type": "table",
      "options": {
        "data": "{{loadUsers.data}}",
        "columns": [
          { "title": "ID", "dataIndex": "id" },
          { "title": "Nombre", "dataIndex": "name" },
          { "title": "Email", "dataIndex": "email" },
          { "title": "Empresa", "dataIndex": "company.name" }
        ],
        "pageSize": 10
      },
      "layout": { "x": 0, "y": 38, "w": 24, "h": 50 } }
  ],
  "queries": [
    { "id": "loadUsers", "type": "fetch",
      "options": { "url": "https://jsonplaceholder.typicode.com/users", "triggerType": "automatic" } },
    { "id": "loadProducts", "type": "fetch",
      "options": { "url": "https://dummyjson.com/products?limit=30", "triggerType": "automatic" } }
  ],
  "settings": { "category": "Business", "description": "Dashboard demo" }
})
```

### 16.2 CRUD completo via SDK

```typescript
// crud-users.ts — ejecutar: npx tsx crud-users.ts
import { LowcoderApp, LowcoderClient } from "@aorizondo/lowcoder-agent-sdk-core";

const app = new LowcoderApp("Gestión de Usuarios")
  .withSettings({ category: "Business" })

  // Hero
  .addText("title", { text: "## 👥 Usuarios", at: { x: 0, y: 0, w: 24, h: 8 } })
  .addDivider("d1", { at: { x: 0, y: 8, w: 24, h: 3 } })

  // Form de creación
  .addInput("nameInput", { label: "Nombre", required: true, at: { x: 0, y: 11, w: 8, h: 8 } })
  .addInput("emailInput", { label: "Email", placeholder: "user@example.com", at: { x: 8, y: 11, w: 8, h: 8 } })
  .addSelect("roleSelect", {
    label: "Rol",
    options: [
      { label: "Admin", value: "admin" },
      { label: "Usuario", value: "user" },
    ],
    defaultValue: "user",
    at: { x: 16, y: 11, w: 5, h: 8 },
  })
  .addButton("createBtn", {
    text: "Crear usuario",
    type: "submit",
    onClick: "createUser",
    disabled: "{{!nameInput.value || !emailInput.value}}",
    loading: "{{createUser.isFetching}}",
    at: { x: 21, y: 11, w: 3, h: 8 },
  })

  // Tabla
  .addDivider("d2", { title: "Usuarios existentes", align: "left", at: { x: 0, y: 19, w: 24, h: 3 } })
  .addTable("usersTable", {
    data: "{{loadUsers.data}}",
    columns: [
      { title: "ID", dataIndex: "id" },
      { title: "Nombre", dataIndex: "name" },
      { title: "Email", dataIndex: "email" },
      { title: "Teléfono", dataIndex: "phone" },
      { title: "Ciudad", dataIndex: "address.city" },
    ],
    pageSize: 10,
    at: { x: 0, y: 22, w: 24, h: 50 },
  })

  // Queries
  .addFetchQuery("loadUsers", {
    url: "https://jsonplaceholder.typicode.com/users",
    triggerType: "automatic",
  })
  .addJsQuery("createUser", {
    script: `return fetch("https://jsonplaceholder.typicode.com/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: nameInput.value,
    email: emailInput.value,
    role: roleSelect.value,
  }),
}).then(function(res) {
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
});`,
    triggerType: "manual",
  });

const client = new LowcoderClient({
  baseUrl: process.env.LOWCODER_BASE_URL!,
  apiKey: process.env.LOWCODER_API_KEY!,
});
const result = await app.deploy(client);  // orgId auto-detectado
console.log(`✅ ${process.env.LOWCODER_BASE_URL}/apps/${result.applicationInfoView.applicationId}/edit`);
```

### 16.3 Dashboard con SEO + tema premium

Ver [examples/06-mega-demo.ts](https://github.com/aorizondo/lowcoder-agent-sdk/blob/main/examples/06-mega-demo.ts) en el repo — 50+ componentes con glass effect, gradientes, animaciones, mermaid, charts especializados, y SEO completo.

---

## 17. Checklist final antes de decir "listo"

- [ ] La app se creó correctamente (recibí `appId` del MCP/SDK)
- [ ] Abrí la URL del editor y vi los componentes esperados
- [ ] Las queries cargan datos en `/view` (no `/edit`)
- [ ] Los KPIs muestran números reales, no "0" o "[object Object]"
- [ ] Los charts renderizan ejes y series correctas
- [ ] Si el usuario pidió SEO → llamé `configure_seo`
- [ ] Si el usuario quiere publicarla → llamé `deploy_app`
- [ ] Si las queries fallan → verifiqué versión Lowcoder >= 2.7.0
- [ ] Si el usuario pidió tema visual → usé `withPreload` con CSS
- [ ] Le di al usuario la URL final con instrucciones claras (edit vs view)
- [ ] Documenté en mi respuesta qué tools del MCP usé (transparencia)

---

## Apéndice: limitaciones conocidas

| Limitación | Workaround |
| --- | --- |
| Lowcoder <2.7.0 no soporta `#JS_CODE` → queries JS fallan | Actualizar a 2.7.0+ |
| `gaugeChart` requiere config ECharts compleja | Usar `progressCircle` con `value` (visualmente similar) |
| `/view` requiere que charts especializados estén "publicados" | Usar `/edit` primero, luego `deploy_app` |
| SPA = SEO limitado (Google indexa pero más lento) | Embed en Next.js con SSR si SEO es crítico |
| `await` top-level no funciona en JS queries | Usar `.then()` y `return` la Promise |
| Queries automatic no se ejecutan en /edit | Probar en /view para confirmar carga |
| `bodyType: "json"` no funciona | Usar `"application/json"` o el alias del SDK |
| El frontend cachea componentes remotos | Hard refresh (`Ctrl+Shift+R`) tras cambios de plugins |
