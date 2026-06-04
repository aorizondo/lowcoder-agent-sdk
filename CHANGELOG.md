# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y versionado semántico ([SemVer](https://semver.org/spec/v2.0.0.html)).

## [0.4.2] - 2026-06-03

### Fixed — diagnóstico raíz del "spinner infinito al hacer login"

- **`app.deploy({ upsert: true })`** — opt nueva que hace deploy idempotente preservando el `applicationId` entre redeploys. Es la solución arquitectónica al bug más insidioso del SDK previo.

### Root cause del bug

Tras login, el frontend de Lowcoder llamaba `GET /api/applications/{id}/view` con un appId que ya estaba en estado **RECYCLED** (no NORMAL). El backend respondía **HTTP 400 `code:5003 "Bad request"`** sin contexto, y el frontend hacía polling/retry indefinidamente — el usuario veía un spinner durante "varios minutos".

¿Por qué el appId estaba RECYCLED? Porque cada redeploy de la app destino (vía `app.deploy()` simple o `replaceByName: true`) **generaba un applicationId nuevo**. La app referenciante (Portal de Login) seguía apuntando al ID viejo, ya reciclado.

### Solución

`upsert: true` busca una app NORMAL con el mismo `title` y la **actualiza** con `client.updateApp()` — preservando el `applicationId`. Si no existe, cae al flujo normal de creación. Resultado: los redirects en otras apps siguen siendo válidos para siempre.

### Documentation

- **SKILL.md §13** — "App duplicada" reescrita con el bug del spinner infinito y comparación clara de `upsert` vs `replaceByName` vs default.
- **troubleshooting.md** nueva entrada extensa "Spinner azul infinito al cargar una app" con diagnóstico paso-a-paso vía devtools y código del patrón upsert para scripts que construyen DSL a mano.

### Verified

Tras aplicar `upsert: true` a las 4 apps del proyecto remesaBot + purga de 19 apps RECYCLED:
- Login `admin@solverius.cloud` → redirige a Panel Admin en **6 segundos** (antes: spinner indefinido)
- Tabla de clientes carga inmediatamente con tags de color
- Todas las request GET `/view` retornan 200 (antes: una de ellas 400 que rompía todo)

## [0.4.1] - 2026-06-03

### Fixed — bugs adicionales descubiertos verificando E2E las apps reales

- **`tableDSL` ahora añade `render` a cada column.** Sin esto, Lowcoder dibuja las filas pero las celdas quedan vacías (no auto-deduce del `dataIndex`). El SDK añade `{ render: { compType: "text"|"tag"|"link", comp: { text: "{{currentCell}}" } } }` según `isTag`/`isLink`.
  - Confirmado en `client/packages/lowcoder/src/comps/comps/tableComp/column/tableColumnComp.tsx:newPrimaryColumn`.
- **`selectDSL` ahora genera el formato correcto para options dinámicas.** Antes se pasaba como `{ type: "mapData", data: "..." }`, lo cual Lowcoder ignoraba y caía a defaults ("Option 1, 2"). Ahora produce `{ optionType: "map", manual: { manual: [] }, mapData: { data, mapData: { label, value } } }`.
  - Confirmado en `client/packages/lowcoder/src/comps/controls/optionsControl.tsx`.
- **`buttonDSL` warning si se usa `type: "submit"` sin `form`**. Lowcoder ramifica `handleClick` y omite `onEvent` cuando `type !== ""`, lo que hace que el click no haga nada (sin error, sin toast). El SDK emite `console.warn` cuando detecta el anti-patrón y soporta el nuevo opt `form` para botones dentro de un Form real.
  - Confirmado en `client/packages/lowcoder/src/comps/comps/buttonComp/buttonComp.tsx:201-209`.

### Added

- **`SelectOptionsMap` type** — interfaz nueva para options dinámicas: `{ data, label, value }` (strings con bindings `{{item.x}}`).
- **`ButtonOptions.form`** — referencia al form padre cuando se usa `type: "submit"` legítimamente.

### Documentation

- **SKILL.md §13 (Errores comunes)** ampliado con 3 entradas: tabla con celdas vacías, select dinámico con defaults, botón submit silencioso.
- **troubleshooting.md** sección "Errores de componentes" con 3 entradas nuevas y referencias al source de Lowcoder.

### Why

Tras la verificación E2E con browseros se confirmó que TODAS las apps tienen el mismo trio de bugs estructurales: tabla sin render → celdas vacías; select dinámico con string → "Option 1, 2"; botón type:submit sin form → click muerto. Ninguno produce error visible. Ahora el SDK los previene automáticamente y la doc explica cómo diagnosticar si aparecen en otro contexto.

### Verified

E2E con admin@solverius.cloud → login redirige a Panel Admin Clientes → tabla muestra clientes reales (Cliente Test 1 pending, Cliente Test 2 active con tags) → click fila abre drawer con detalles + botones contextuales (Activar disabled si active, etc.) → Mi Instancia muestra "No tienes instancia" → Admin Pagos muestra form con select de clientes dinámico funcionando.

## [0.4.0] - 2026-06-03

### Fixed — bugs descubiertos al verificar apps reales en navegador

- **`addTempState()` ahora serializa correctamente** el valor inicial. Antes, pasar `addTempState("view", "login")` producía `view.value === "null"` en runtime porque el DSL se construía con formato anidado `{ name, comp: { value } }` cuando Lowcoder espera formato FLAT `{ name, value: JSON.stringify(initial) }`. Esto rompía cualquier toggle de vistas, contadores, modal visibility, etc.
- **`label: "string"` ahora se normaliza** automáticamente a `label: { text: "string", align: "left" }` en `addComponent()`. Antes, componentes como `password`, `numberInput`, etc. recibían string y mostraban "Label" literal o vacío.

### Added

- **`LowcoderClient.setAppPublicToAll(appId, publicToAll)`** — marca la app pública (cualquier visitante anónimo puede verla). Imprescindible para apps de login/registro y landing pages.
- **`LowcoderClient.setAppPublicToMarketplace(appId, bool)`** — equivalente para el marketplace.
- **`LowcoderApp.deploy(client, orgId, opts)` extendido** con nuevas opciones:
  - `replaceByName: true` — elimina apps anteriores con el mismo `title` antes de crear (deploy idempotente, evita acumular duplicados al iterar)
  - `publicToAll: true` — combina create + publish + public-to-all en una sola llamada
- **`LowcoderApp.addPassword(id, opts)`** — helper específico para inputs de password (acepta los mismos opts que `addInput`).

### Documentation

- **SKILL.md §8 (Estado: tempStates)** reescrito explicando el formato flat + JSON-stringify que Lowcoder espera internamente.
- **SKILL.md §13 (Errores comunes)** ampliado con 7 entradas nuevas: app no pública, tempState "null", uuid casts, deploy duplicado, IDs hardcoded, hidden no cascada, label objeto.
- **SKILL.md §14 (Buenas prácticas)** ampliada con 8 secciones de ejemplos +/-: deploy idempotente, cross-app references, SQL casts, toggle de vistas (3 patrones), tempStates correctos, labels, race conditions con `.then()`.
- **troubleshooting.md** nueva sección "Errores de estado y bindings" con 5 entradas detalladas y fixes con código.

### Why

Verificación E2E en navegador (browseros) reveló bugs estructurales que las queries por sí solas no exponen: `loginUser` retornaba 1 fila correcta pero la UI mostraba doble vista solapada porque `currentView.value` no se inicializaba ("null"). El SDK ahora produce apps que SE VEN correctamente, no solo apps cuyo backend responde 200 OK.

## [0.3.1] - 2026-06-03

### Fixed

- **`deleteApp(appId)`** ahora usa el path correcto `/api/v1/applications/recycle/{id}` (antes intentaba `/{id}/recycle` que da 404 → traducido a `code:5000 "Service is busy"` por Lowcoder).

### Added

- `LowcoderClient.recycleApp(appId)` — soft-delete (mueve a papelera). Path: `PUT /api/v1/applications/recycle/{id}`
- `LowcoderClient.restoreApp(appId)` — restaurar de papelera. Path: `PUT /api/v1/applications/restore/{id}`
- `LowcoderClient.listRecycledApps()` — lista la papelera
- `LowcoderClient.deleteAppPermanently(appId)` — DELETE permanente (requiere recycle previo)
- Entrada en `troubleshooting.md` documentando que `code: 5000 "Service is busy"` es realmente un 404 disfrazado, con tabla de paths conocidos.

### Why

El usuario notó que apps de prueba creadas durante verificación no podían borrarse. Diagnóstico mostró que el path REST `/{id}/recycle` no existe en Lowcoder 2.7.6 — el correcto es `/recycle/{id}`. Lowcoder devuelve `code:5000` para CUALQUIER 404 lo cual oculta este tipo de errores. Documentado para evitar la trampa en el futuro.

## [0.3.0] - 2026-06-03

### Added — Soporte completo de datasources

- **SDK Core** (`@aorizondo/lowcoder-agent-sdk-core`)
  - 13 nuevos métodos en `LowcoderClient`:
    - CRUD: `createDatasource`, `getDatasource`, `updateDatasource`, `deleteDatasource`
    - Discovery: `listDatasources`, `listDatasourcesByOrg`, `listJsPlugins`, `listDatasourceTypes`
    - Test: `testDatasource` (prueba conexión sin crear)
    - Estructura: `getDatasourceStructure` (tablas/columnas para SQL/Mongo)
    - Dynamic: `getDatasourceDynamicConfig` (para plugins JS con `extra()`)
    - Permisos: `listDatasourcePermissions`, `grantDatasourcePermissions`, `updateDatasourcePermission`, `revokeDatasourcePermission`
  - Nuevo **`DatasourceBuilder`** fluido con shortcut `datasource(name)`:
    - `.postgres({...})`, `.mysql({...})`, `.mariadb({...})`, `.mssql({...})`, `.oracle({...})`, `.clickHouse({...})`, `.snowflake({...})`
    - `.mongodb({...})`, `.redis({...})`, `.elasticsearch({...})`
    - `.restApi({...})`, `.graphql({...})`
    - `.smtp({...})`, `.googleSheets({...})`
    - `.jsPlugin(pluginId, config)` para cualquier plugin del node-service (~60: s3, slack, jira, openAi, stripe, etc.)
  - Exports nuevos de tipos: `DatasourceType`, `Datasource`, `DatasourceConfig`, `DataSourcePluginMeta`, `DatasourcePermission`, `SYSTEM_STATIC_DATASOURCE_IDS`, etc.

- **MCP Server** (`@aorizondo/lowcoder-mcp-server`)
  - 10 tools nuevos:
    - `list_datasources` — lista los datasources de la org
    - `list_datasource_types` — tipos disponibles (incluye plugins JS)
    - `list_js_plugins` — schema EXACTO de cada plugin JS
    - `test_datasource` — valida conexión sin crear
    - `create_datasource` — crea con test connection automático (testFirst=true)
    - `update_datasource` — actualiza preservando secrets
    - `delete_datasource` — soft-delete
    - `get_datasource_structure` — tablas/columnas
    - `list_datasource_permissions` — permisos
    - `grant_datasource_permission` — viewer/editor/owner

- **Docs y skill**
  - Nueva sección **6.5 Datasources** en `SKILL.md` con catálogo completo, ejemplos por tipo, flujo recomendado y warnings de seguridad
  - Nuevo `docs/datasources.md` — referencia completa de ~600 líneas con todos los configs, opciones de auth, SSL, OAuth inherit, plugins JS, permisos
  - Tabla de tools MCP actualizada en `SKILL.md` y `mcp-server.md`
  - 2 ejemplos nuevos: `07-with-datasource.ts` (REST API) y `08-postgres-crud.ts` (PostgreSQL completo)

### Verified

- Test live contra Lowcoder 2.7.6 self-hosted: crear datasource REST API + listarlo + crear app que lo usa, todo funciona.

### Source

Confirmado contra el código fuente Java de Lowcoder (`server/api-service/.../{DatasourceController,UpsertDatasourceRequest,*DatasourceConfig}.java`) y el código TypeScript del cliente (`client/packages/lowcoder/src/api/datasourceApi.ts`). La doc oficial está incompleta para configs detallados.

## [0.2.0] - 2026-06-03

### Added

- **SDK Core** (`@aorizondo/lowcoder-agent-sdk-core`)
  - `LowcoderClient.getCurrentUser()` — devuelve el usuario autenticado completo, incluyendo todas las organizaciones a las que pertenece y la activa (`currentOrgId`)
  - `LowcoderClient.getCurrentOrgId()` — atajo para obtener solo el orgId del workspace activo
  - `LowcoderClient.listMyOrgs()` — lista todas las orgs del usuario con flag `isCurrent` y rol, ordenadas con la activa primero
  - Tipos: `CurrentUserResponse`, `OrgInfo`, `OrgAndRole` exportados desde el package
- **MCP Server** (`@aorizondo/lowcoder-mcp-server`)
  - Nuevo tool **`get_my_orgs`** — descubre el orgId del usuario sin que tenga que ir a la UI

### Changed

- **`LowcoderApp.deploy(client, orgId?, opts?)`** — `orgId` ahora es opcional. Si se omite, se auto-detecta llamando `client.getCurrentOrgId()` internamente
- Documentación reescrita:
  - `SKILL.md` ya no pide al agente que solicite orgId al usuario por defecto
  - `getting-started.md` con 3 métodos prácticos para obtener orgId
  - `mcp-server.md` documenta el nuevo tool `get_my_orgs`
  - `sdk-reference.md` actualizado con los nuevos métodos del cliente
  - Todos los ejemplos en `examples/` ahora usan `deploy(client)` sin orgId
- `skill.json`: `LOWCODER_ORG_ID` movido de `env` (obligatoria) a `optionalEnv`

### Why

Reportado por usuario: la documentación pedía `LOWCODER_ORG_ID` pero nunca explicaba cómo obtenerlo, y de hecho la API REST de Lowcoder ya lo expone vía `/api/v1/users/me` con `currentOrgId`. El SDK ahora abstrae esto completamente.

## [0.1.0] - 2026-06-02

### Added

- **SDK Core** (`@aorizondo/lowcoder-agent-sdk-core`)
  - Clase `LowcoderApp` con builder fluido para construir el DSL de apps
  - ~25 wrappers de componentes nativos (button, input, table, charts, etc.)
  - Soporte para los ~80 tipos vía `addComponent(id, type, opts)` genérico
  - Layout automático bin-packing en grid de 24 cols, con override manual `at: { x, y, w?, h? }`
  - Queries: `addFetchQuery` (recomendado), `addJsQuery`, `addRestQuery`, `addSqlQuery`, `addQuery` genérico
  - Auto-resolución de `datasourceId` para JS queries (`#JS_CODE`) y REST queries sin datasource
  - Auto-generación de `queryId` con prefijo `js:` para queries JS (requerido por Lowcoder)
  - `LowcoderClient` con autenticación API key o email+password
  - `withSettings()`, `withPreload()` para configuración global
  - Soporte para `bodyType` aliases (`"json"` → `"application/json"`)
- **MCP Server** (`@aorizondo/lowcoder-mcp-server`)
  - 6 tools: `get_component_types`, `create_app`, `update_app`, `list_apps`, `get_app_dsl`, `deploy_app`, `configure_seo`
  - Tool `configure_seo` idempotente con re-aplicación en 500ms/2s/5s para sobrescribir defaults de Lowcoder
  - Aceptación de `type: "fetch"` en queries como atajo a JS query con fetch
- **Claude Skill**
  - `skills/lowcoder/SKILL.md` con ~600 líneas estilo manual de usuario
  - Soporte tri-formato: Anthropic Agent Skills + skillz.sh + Claude Code plugin marketplace
- **Documentación**
  - 6 docs detalladas en `docs/`: getting-started, sdk-reference, mcp-server, skill-installation, plugin-creation, troubleshooting
  - 6 ejemplos completos en `examples/`: hello-world, dashboard-simple, crud-users, with-seo, themed-dashboard, mega-demo (50+ componentes)

### Known issues

- Lowcoder **<2.7.0** tiene un bug upstream donde `getById()` no maneja `#JS_CODE` → ninguna query JS funciona. Solución: actualizar a 2.7.0+
- `gaugeChart` requiere config ECharts compleja por subtipo → workaround: usar `progressCircle` con `value: N` para visualizar porcentajes

[0.2.0]: https://github.com/aorizondo/lowcoder-agent-sdk/releases/tag/v0.2.0
[0.1.0]: https://github.com/aorizondo/lowcoder-agent-sdk/releases/tag/v0.1.0
