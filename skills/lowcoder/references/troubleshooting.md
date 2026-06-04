# Troubleshooting

Soluciones a errores comunes. Si encuentras un caso no cubierto, abre un [issue](https://github.com/aorizondo/lowcoder-agent-sdk/issues).

## Errores de queries

### `Datasource cannot be found` o `Datasource #JS_CODE cannot be found`

**Causa:** Lowcoder versión <2.7.0 — bug upstream donde `getById()` no maneja el ID especial `#JS_CODE`.

**Fix:** actualiza Lowcoder a 2.7.0 o superior. En Easypanel:

1. Service → cambiar imagen a `lowcoderorg/lowcoder-ce-api-service:2.7.6`
2. Lo mismo para `lowcoder-ce-node-service:2.7.6` y `lowcoder-ce-frontend:2.7.6`
3. Deploy

Datos en MongoDB son compatibles, no se pierden.

### `await is only valid in async functions and the top level bodies of modules`

**Causa:** tu script JS query usa `await` directo. Lowcoder envuelve el script en `function() { ... }` no-async.

**Fix:** usa `.then()` y `return` la Promise.

```javascript
// ❌ Mal
const res = await fetch("https://api.example.com/users");
return await res.json();

// ✅ Bien
return fetch("https://api.example.com/users").then(function(res) {
  return res.json();
});
```

Si usas `addJsQuery()` del SDK, asegúrate de aplicar este patrón al script. `addFetchQuery()` ya lo hace correctamente.

### Query JS no se ejecuta (sin error, sin datos)

**Causa:** el `queryId` no empieza con `"js:"`. Lowcoder detecta queries JS por el prefijo del ID.

**Fix:** el SDK actual hace esto automático. Si construyes el JSON a mano, asegúrate:

```json
{ "id": "js:abc123...", "compType": "js", ... }
```

### `Type definition error: Cannot construct instance of java.lang.String[]`

**Causa:** estás llamando `/api/query/execute` con `path` como string.

**Fix:** `path` debe ser array: `path: ["queries", "loadUsers"]` o `path: []` para queries en la raíz.

### `Oops! Service is busy, please try again later.` (code 5000)

**El mensaje es engañoso.** Lowcoder retorna `code: 5000` + HTTP 500 para **CUALQUIER 404 NOT_FOUND**, no solo para errores del backend. El `GlobalExceptionHandler` los uniforma.

**Diagnóstico:**

```bash
docker logs --since 1m <lowcoder-api-service-container> | grep -A 3 ERROR
```

Si ves `ResponseStatusException: 404 NOT_FOUND` → el path está mal escrito o cambió entre versiones.

**Causa A:** estás llamando un endpoint que NO existe en esta versión.

**Casos conocidos** (paths que parecen lógicos pero NO existen):

| ❌ Path equivocado | ✅ Path correcto |
| --- | --- |
| `PUT /api/v1/applications/{id}/recycle` | `PUT /api/v1/applications/recycle/{id}` |
| `PUT /api/v1/applications/{id}/restore` | `PUT /api/v1/applications/restore/{id}` |
| `GET /api/v1/info/healthz` | (no existe en OSS) |
| `GET /api/v1/info/version` | (no existe en OSS) |

**Fix:** usa el SDK que ya tiene los paths correctos (`client.recycleApp`, `client.restoreApp`, etc.) o consulta el OpenAPI de tu instancia: `GET /api/docs/openapi.json`.

**Causa B:** node-service caído (solo afecta endpoints que llaman al node-service: `/api/query/execute`, `/api/datasources/test` con SQL, etc.).

**Fix:** `docker ps | grep node-service` — si no aparece o está reiniciándose, reinícialo desde Easypanel.

### `operator does not exist: uuid = character varying` (PostgreSQL)

**Causa:** estás interpolando un UUID como string. Lowcoder convierte `{{x}}` en un **prepared statement** (`?`) y JDBC pasa el valor como `String`. PostgreSQL no auto-castea `varchar → uuid` cuando la columna es `uuid`.

**Fix:** usa el cast explícito `::uuid` **sin comillas** alrededor del binding:

```sql
-- ❌ Mal — comillas convierten el ? en literal string, no en parámetro
WHERE id = '{{currentUser.id}}'

-- ❌ Mal — sin cast, falla con "operator does not exist: uuid = character varying"
WHERE id = {{currentUser.id}}

-- ✅ Bien — cast explícito, sin comillas
WHERE id = {{currentUser.id}}::uuid

-- ✅ También válido — castea la columna a text
WHERE id::text = {{currentUser.id}}
```

Aplica también a `INSERT`/`UPDATE`:

```sql
INSERT INTO payments (user_id, amount) VALUES ({{clienteSelect.value}}::uuid, {{montoInput.value}})
UPDATE users SET status='active' WHERE id = {{selectedRow.id}}::uuid
```

**Regla general:** todas las columnas tipadas (`uuid`, `jsonb`, `timestamp`, arrays) requieren cast explícito en bindings.

### Bindings con expresiones JS complejas no se evalúan en SQL

**Causa:** Lowcoder evalúa el contenido de `{{...}}` como expresión JS en el cliente y lo manda al servidor como prepared parameter. Funciona, pero el **debug es confuso** si pruebas vía `/api/query/execute` directamente — el servidor busca la key literal en `params`.

**Fix en SQL:** las expresiones JS complejas SÍ funcionan en el frontend:

```sql
-- ✅ funciona — Lowcoder envía la key literal con el valor evaluado
WHERE u.status LIKE {{'%' + statusFilter.value + '%'}}
WHERE created_at > {{moment().subtract(7, 'days').toISOString()}}
```

Pero si testeas directo con `curl /api/query/execute`, debes mandar `params: [{key: "'%' + statusFilter.value + '%'", value: "%active%"}]` — la KEY es la expresión completa, el VALUE es lo que el cliente habría evaluado.

### Deploy crea apps duplicadas en cada ejecución

**Causa:** `LowcoderApp.deploy(client)` siempre crea una app nueva — no es idempotente.

**Fix:** elimina las versiones previas antes de deployar (búsqueda por nombre):

```typescript
const APP_NAME = "Mi Dashboard";
const orgId = await client.getCurrentOrgId();
const allApps = await client.listApps(orgId);
for (const old of allApps.filter((a: any) => a.name === APP_NAME)) {
  try { await client.deleteApp(old.applicationId); } catch { /* ignore */ }
}
const result = await app.deploy(client);
```

Esto borra (recycle) tanto las activas como las que ya estaban recicladas con el mismo nombre. Si quieres preservar el ID estable entre deploys, usa `client.updateApp(appId, dsl)` con un appId guardado en config.

### Apps que se referencian entre sí (redirects, links) con IDs hardcoded

**Causa:** typical anti-pattern — `window.open('/apps/abc123/view')` con un ID que cambió en el último redeploy.

**Fix:** descubre los IDs dinámicamente al deployar el script que los referencia:

```typescript
const allApps = await client.listApps(orgId);
const adminApp = allApps.find(a => a.name === "Panel Admin" && a.applicationStatus === "NORMAL");
if (!adminApp) throw new Error("Panel Admin no encontrada — deploy primero");
const APP_ID_ADMIN = adminApp.applicationId;
// ...usa APP_ID_ADMIN en los redirects del DSL
```

Orden de deploy importa: primero apps "destino", luego las que las referencian.

### Spinner azul infinito al cargar una app (no termina nunca)

**Causa más común:** un redirect (vía `window.top.location.href` o link) apunta a un `applicationId` que ya está RECYCLED o DELETED. El frontend de Lowcoder hace fetch a `/api/applications/{id}/view`, recibe **HTTP 400** (`code:5003 "Bad request"` con mensaje genérico), pero la UI no muestra el error — solo deja el spinner colgado mientras hace polling/retry de otras requests adyacentes.

**Diagnóstico rápido:**
1. Devtools → Network tab → buscar request `GET /api/applications/.../view` en rojo (400)
2. Devtools → Console → ver "Failed to load resource: 400" con la URL del appId problemático
3. Verifica el status del app:
   ```typescript
   const apps = await client.listApps(orgId);
   const target = apps.find(a => a.applicationId === "<el-id-problematico>");
   console.log(target?.applicationStatus); // si es "RECYCLED" o "DELETED" → este es el bug
   ```

**Causa raíz:** `app.deploy()` por defecto crea una app NUEVA cada vez (con un appId nuevo). Si otras apps tienen ese appId hardcoded en sus redirects, cada redeploy rompe los enlaces. Las apps "viejas" quedan RECYCLED pero los redirects siguen apuntándoles.

**Fix correcto (SDK 0.4.2+):** usa `upsert: true` para preservar el `applicationId` entre redeploys:

```typescript
// ✅ Correcto — preserva appId. Si existe NORMAL con el mismo título, lo actualiza
const result = await app.deploy(client, undefined, {
  upsert: true,
  publish: true,
});

// ❌ Anti-patrón — cada redeploy genera un appId nuevo
const result = await app.deploy(client);

// ❌ Casi tan malo — replaceByName recicla la app vieja (que tenía el ID conocido)
//    y crea una nueva con un ID distinto. Los redirects siguen rotos.
const result = await app.deploy(client, undefined, { replaceByName: true });
```

Para apps que NO usan `app.deploy()` (construyen el DSL a mano), implementa el patrón upsert:

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

**Por qué Lowcoder no muestra error:** el endpoint `/view` devuelve 400 con mensaje opaco "Bad request" (no "esta app está en papelera"). El frontend lo trata como error transitorio y reintenta. El usuario ve un spinner que parece tardar "minutos" pero en realidad es retry hasta timeout.

### Queries REST fallan con 401

**Causa:** el `datasourceId` apunta a un datasource que no existe o no tienes permisos.

**Fix:** verifica con `get_app_dsl({ appId, simplified: false })` el `datasourceId` real. Si es REST sin datasource configurado, usa **`addFetchQuery()`** (JS interno) en lugar de `addRestQuery()`.

## Errores de estado y bindings

### TempState devuelve string `"null"` o no se inicializa con el valor que pasé

**Causa:** Lowcoder serializa los tempStates en un formato muy específico que **no es intuitivo**:
1. El campo `value` debe estar al **nivel raíz** del objeto, NO anidado en `comp.value`.
2. El valor debe ser **JSON-stringified** (porque internamente usa `jsonValueControl`).

**❌ Formato que falla** (resulta en `currentView.value === "null"`):
```json
{ "tempStates": [{ "name": "currentView", "comp": { "value": "login" } }] }
```

**✅ Formato correcto:**
```json
{ "tempStates": [
  { "name": "currentView", "value": "\"login\"" },   // string JSON-encoded
  { "name": "count", "value": "42" },                // number como JSON
  { "name": "isOpen", "value": "false" },            // bool como JSON
  { "name": "filter", "value": "{\"status\":\"active\"}" }
]}
```

**Fix automático:** usa `app.addTempState(name, value)` del SDK (0.4+) — aplica `JSON.stringify(value ?? null)` y pone el campo flat. Si construyes el DSL a mano, replica ese patrón.

### `hidden: true` en un card NO oculta los inputs/botones dentro del grid

**Causa:** en el grid de Lowcoder, los inputs son **hermanos** del card (en el mismo nivel del grid), no hijos anidados del card. El `hidden` solo afecta al componente exacto donde se aplica.

**Síntoma:** ves el card desaparecer pero los inputs/botones que pusiste "encima" siguen visibles.

**Fix opción A (más simple):** repite `hidden` en cada componente:
```typescript
const hideLogin = "{{currentView.value !== 'login'}}";
app
  .addCard("loginCard", { hidden: hideLogin, at: { ... } })
  .addInput("emailInput", { hidden: hideLogin, at: { ... } })
  .addInput("passwordInput", { hidden: hideLogin, at: { ... } })
  .addButton("loginBtn", { hidden: hideLogin, at: { ... } });
```

**Fix opción B (más limpio):** usa un `container` real con `items + layout` anidados — la visibilidad sí cascada:
```typescript
const k1 = genGridKey(), k2 = genGridKey();
app.addComponent("loginContainer", "container", {
  hidden: hideLogin,
  items: {
    [k1]: { compType: "input", name: "emailInput", comp: { label: { text: "Email" } } },
    [k2]: { compType: "button", name: "loginBtn", comp: { text: "Login" } },
  },
  layout: {
    [k1]: { i: k1, x: 0, y: 0, w: 24, h: 8 },
    [k2]: { i: k2, x: 0, y: 10, w: 24, h: 6 },
  },
  at: { x: 0, y: 0, w: 24, h: 40 },
});
```

**Fix opción C:** separar visualmente las vistas en distintos `y` (no solapar) para evitar confusión visual cuando el hidden no funciona perfecto.

### App pública pide login a visitantes anónimos

**Causa:** la app no está marcada como `publicToAll: true`. Por defecto Lowcoder protege las apps detrás del SSO.

**Fix:**
```typescript
// SDK 0.4+
await app.deploy(client, undefined, { publicToAll: true });

// O sobre una app existente
await client.setAppPublicToAll(appId, true);
```

**Cuándo usar:** apps de login/registro (paradoja: el login mismo NO puede requerir login), landing pages, formularios públicos de contacto.

### Tabla muestra filas pero todas las celdas están vacías

**Causa:** las columnas del DSL necesitan un campo `render` con `{{currentCell}}` para mostrar el valor. Sin `render`, Lowcoder dibuja la fila pero NO sabe qué pintar en cada celda (no auto-deduce del `dataIndex`).

**DSL ✅ correcto:**

```json
{
  "title": "Nombre",
  "dataIndex": "name",
  "key": "name",
  "render": { "compType": "text", "comp": { "text": "{{currentCell}}" } }
}
```

**DSL ❌ que falla:**

```json
{
  "title": "Nombre",
  "dataIndex": "name",
  "key": "name"
}
```

**Fix:** SDK 0.4+ añade `render` automáticamente. Si construyes el DSL a mano, replica el patrón. Para columnas con `isTag: true` usa `compType: "tag"` (color por valor). Para links: `compType: "link"`.

Confirmado en source: [client/packages/lowcoder/src/comps/comps/tableComp/column/tableColumnComp.tsx:newPrimaryColumn](https://github.com/lowcoder-org/lowcoder/blob/main/client/packages/lowcoder/src/comps/comps/tableComp/column/tableColumnComp.tsx).

### Select muestra "Option 1", "Option 2" en lugar de mis opciones dinámicas

**Causa:** estás pasando las options como string crudo `"{{query.data?.map(...)}}"` pero el formato esperado por Lowcoder es un objeto estructurado con `optionType: "map"` + `mapData`.

**Formato ❌ que falla** (queda en defaults "Option 1, 2"):

```json
{
  "options": "{{loadUsers.data?.map(function(u) { return {label: u.name, value: u.id}; }) || []}}"
}
```

O peor (lo que el SDK <0.4 generaba):

```json
{
  "options": { "type": "mapData", "data": "{{...}}" }
}
```

**Formato ✅ correcto:**

```json
{
  "options": {
    "optionType": "map",
    "manual": { "manual": [] },
    "mapData": {
      "data": "{{loadUsers.data}}",
      "mapData": { "label": "{{item.name}}", "value": "{{item.id}}" }
    }
  }
}
```

**Fix con SDK 0.4+:** pasa un objeto `{ data, label, value }` en lugar de string:

```typescript
app.addSelect("userSelect", {
  label: "Usuario",
  options: {
    data: "{{loadUsers.data}}",
    label: "{{item.name}}",
    value: "{{item.id}}",
  },
});
```

Para options estáticas, usa array:

```typescript
app.addSelect("statusFilter", {
  label: "Estado",
  options: [
    { label: "Todos", value: "%" },
    { label: "Activo", value: "active" },
  ],
});
```

Confirmado en source: [client/packages/lowcoder/src/comps/controls/optionsControl.tsx](https://github.com/lowcoder-org/lowcoder/blob/main/client/packages/lowcoder/src/comps/controls/optionsControl.tsx).

### Botón con `type: "submit"` ignora el `onClick` y no hace nada

**El bug más silencioso del DSL de Lowcoder.** El click responde visualmente (botón se "presiona") pero NO ejecuta nada — sin error, sin toast, sin request en Network.

**Causa raíz** (confirmada en source `buttonComp.tsx:201-209`):

```typescript
const handleClick = useCallback(() => {
  if (!mountedRef.current) return;
  try {
    if (isDefault(props.type)) {
      handleClickEvent();           // ✅ ejecuta tu onEvent (queries, scripts)
    } else {
      submitForm(editorState, props.form);  // ❌ ignora onEvent; busca el form
    }
  } catch (error) {
    console.error("Error in button click handler:", error);
  }
}, [props.type, props.onEvent, props.form, editorState]);
```

Cuando `type !== ""` (ej: `"submit"`), Lowcoder ejecuta `submitForm(props.form)`. Si `props.form` apunta a un Form inexistente (o no se pasó), la acción muere sin error.

**Diagnóstico:**
1. Lee el DSL del botón: `client.getApp(appId)` → `ui.items[btnKey].comp.type` — si dice `"submit"` y no hay `form`, ese es el bug
2. Compara con un botón hermano que SÍ funciona: si el otro tiene `type: ""` o no tiene `type`, confirmado
3. Cambia temporalmente el botón malo a `type: ""` y prueba — si funciona, era esto

**Fix opción A (recomendado para botones sueltos):** quita `type`:
```typescript
// ❌ Mal — pierde onClick
app.addButton("loginBtn", { text: "Login", type: "submit", onClick: "doLogin" });

// ✅ Bien
app.addButton("loginBtn", { text: "Login", onClick: "doLogin" });
```

**Fix opción B (si quieres usar Form):** envuelve los inputs+botón en un `addComponent("loginForm", "form", { items, layout })` y referencia el form:
```typescript
app.addButton("loginBtn", {
  text: "Login",
  type: "submit",
  form: "loginForm",    // ID del Form padre
  onClick: "doLogin",
});
```

El SDK 0.4+ emite `console.warn` cuando detecta este anti-patrón.

### Inputs ocultos aparecen como "visible" en snapshots de browser

**Causa:** Lowcoder NO usa `display: none` para los componentes con `hidden=true`. Los oculta visualmente con CSS pero el DOM permanece. Herramientas como Selenium, Puppeteer snapshots o screen readers los detectan.

**Fix:**
- Para validación visual: usa `getBoundingClientRect()` y verifica que el viewport los muestre (los wrappers padre tienen `height: 0` cuando ocultos).
- Para tests: query `[aria-hidden="true"]` o evalúa `el.offsetParent === null`.
- No te confíes del snapshot textual del DOM para confirmar visibilidad — toma screenshot real.

## Errores de componentes

### `Error: Component XxxChart Not Found` (en `/view`)

**Causa:** los charts especializados (`lineChart`, `barChart`, etc.) son componentes remotos del paquete `lowcoder-comps`. En modo `/view` se cargan dinámicamente — si tu app no se ha publicado o hay un problema de red al cargar el bundle, falla.

**Fix:**

1. Verifica que la app esté publicada: `deploy_app({ appId })`
2. Verifica console del browser para ver qué URL falló (típicamente `/api/npm/registry/...`)
3. Si es 500 en ese endpoint, el api-service no puede contactar al node-service. Revisa logs del api-service

### Tabla muestra `[object Object]` en una columna

**Causa:** `dataIndex` apunta a un objeto, no a una primitiva.

**Fix:** usa notación path para acceder a campos anidados:

```typescript
columns: [
  { title: "Ciudad", dataIndex: "address.city" },          // ✅
  { title: "Compañía", dataIndex: "company.name" },        // ✅
  { title: "Ciudad", dataIndex: "address" },               // ❌ muestra [object Object]
]
```

### Gauge chart no muestra mis datos / muestra default 60%

**Causa:** `gaugeChart` requiere un `echartsOption` con estructura ECharts compleja específica por subtipo (Default/Stage/Grade/Clock/Barometer/etc.).

**Fix:** usa `progressCircle` si solo necesitas mostrar un % (visualmente similar y funciona always):

```typescript
app.addProgressCircle("cpu", { value: 68, at: { ... } });
```

### Progress bar siempre al 60% sin mis datos

**Causa:** estás pasando `value: { value: 60 }` (objeto envuelto) en lugar del valor directo.

**Fix:** el SDK ya pasa `value` como string. Si construyes a mano:

```typescript
"value": "60"        // ✅ string o número
"value": 60          // ✅
"value": { value: 60 }  // ❌ Lowcoder lo ignora y usa el default
```

### Componentes no se renderizan en `/edit`

**Causa:** errores de carga del bundle remoto, o un componente con `compType` inválido.

**Fix:**

1. Abre devtools del navegador → tab Network. Busca requests fallidos
2. Verifica el `compType` con `get_component_types()` — typos como `lineChar` vs `lineChart` rompen todo

### Componentes con auto-layout se solapan

**Causa:** el auto-layout del SDK es bin-packing first-fit. Si tienes componentes muy grandes (h:50+) sin posición manual, pueden acumularse mal.

**Fix:** especifica `at` para los componentes grandes (tablas, charts grandes). El SDK auto-posiciona los pequeños alrededor.

## Errores de SEO

### Title y meta description aparecen como los default de Lowcoder

**Causa:** Lowcoder inyecta sus meta tags DESPUÉS de tu preload script. Tu script corrió primero, Lowcoder pisó tus valores.

**Fix:** usa `configure_seo` tool (incluye retries con `setTimeout` a 500ms, 2s, 5s para re-aplicar).

Si construyes preload manual, replica el patrón:

```javascript
function safeApply() {
  document.title = "Mi App";
  setMeta("description", "...");
  // ...
}
safeApply();
setTimeout(safeApply, 500);
setTimeout(safeApply, 2000);
setTimeout(safeApply, 5000);
```

### OG image no aparece al compartir

**Causa A:** la URL no es absoluta o no es accesible públicamente.

**Fix:** usa URL absoluta HTTPS, verifica que sea accesible sin autenticación.

**Causa B:** Lowcoder requiere autenticación para ver la app, los crawlers no pueden ver el HTML con tus meta tags.

**Fix:** marca la app como pública: `client.updateApp(appId, dsl)` con `publicToAll: true` en createApp request, o desde la UI.

## Errores de deployment

### `Authentication failed`

**Causa:** API key inválida o expirada.

**Fix:** regenera el API key desde la UI: Profile → API Keys → Create new key. Actualiza la variable de entorno.

### App creada pero no aparece en la UI

**Causa:** la app se creó en otra organización.

**Fix:** verifica `orgId`. Lista las apps con `list_apps()` y revisa los `orgId` de las existentes.

### `Insufficient permissions`

**Causa:** el usuario del API key no tiene rol Editor/Owner en la organización.

**Fix:** desde la UI, asigna rol adecuado al usuario o usa el API key de otro usuario con permisos.

## Errores del SDK / build

### `Cannot find module '@aorizondo/lowcoder-agent-sdk-core'`

**Causa:** no instalado o tipo de import incorrecto.

**Fix:**

```bash
npm install @aorizondo/lowcoder-agent-sdk-core
```

Verifica `package.json` de tu proyecto tenga `"type": "module"` para usar `import`. Si usas CommonJS, usa `require()`.

### TypeScript errors al usar el SDK

**Causa:** TypeScript estricto rechaza algunas propiedades por la tipificación abierta del DSL.

**Fix:** asegúrate de tener `"moduleResolution": "NodeNext"` y `"module": "NodeNext"` en tu `tsconfig.json`.

### `npx tsx` falla con `Cannot use import outside a module`

**Causa:** tu `package.json` no tiene `"type": "module"`.

**Fix:**

```bash
npm pkg set type=module
```

O usa `npx tsx --no-warnings script.ts` con extensión `.mts`.

## Errores de versiones

### Mi instancia Lowcoder es 2.6.5 — ¿necesito actualizar?

**Sí, fuertemente recomendado.** En 2.6.5 las queries JS fallan completamente por un bug upstream. Actualiza a 2.7.0+ siguiendo la sección "Datasource cannot be found" arriba.

### `Component X is deprecated`

**Causa:** algunos componentes legacy fueron renombrados (ej: `chart` → `lineChart` específicos).

**Fix:** revisa el catálogo en [sdk-reference.md](sdk-reference.md) y usa el equivalente moderno.

## Debugging

### Ver el DSL generado antes de desplegar

```typescript
console.log(app.toJSON());
// O guardarlo a archivo para inspección
fs.writeFileSync("debug.json", app.toJSON());
```

### Comparar con una app que funciona

```typescript
const working = await client.getApp("app-id-que-funciona");
fs.writeFileSync("working.json", JSON.stringify(working.applicationDSL, null, 2));
```

Luego compara campo por campo con tu output.

### Logs del servidor (vía SSH al VPS)

```bash
docker logs --tail 100 -f $(docker ps -q --filter name=lowcoder-api-service)
docker logs --tail 100 -f $(docker ps -q --filter name=lowcoder-node-service)
```

### Test endpoint sin agente

```bash
curl -X POST https://tu-lowcoder.com/api/v1/applications \
  -H "Authorization: Bearer $LOWCODER_API_KEY" \
  -H "Content-Type: application/json" \
  -d @app-debug.json
```

## Pedir ayuda

Si el problema persiste:

1. Verifica versión Lowcoder (debe ser ≥2.7.0)
2. Verifica versión SDK (`npm list @aorizondo/lowcoder-agent-sdk-core`)
3. Captura logs del api-service y node-service
4. Captura el DSL generado (`app.toJSON()`)
5. Abre [issue](https://github.com/aorizondo/lowcoder-agent-sdk/issues) con esos datos
