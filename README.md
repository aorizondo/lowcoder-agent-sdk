# lowcoder-agent-sdk

> Crea aplicaciones [Lowcoder](https://github.com/lowcoder-org/lowcoder) completas desde código TypeScript en lugar de arrastrar elementos. Diseñado específicamente para que agentes de IA (Claude, Cursor, GPT, etc.) generen apps Lowcoder con alta tasa de éxito.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@aorizondo/lowcoder-agent-sdk-core.svg)](https://www.npmjs.com/package/@aorizondo/lowcoder-agent-sdk-core)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![SafeSkill 93/100](https://img.shields.io/badge/SafeSkill-93%2F100_Verified%20Safe-brightgreen)](https://safeskill.dev/scan/aorizondo-lowcoder-agent-sdk)

## Por qué existe

Los agentes de IA tienen una tasa de error muy alta al generar JSON directamente — Lowcoder requiere una estructura DSL compleja con grid keys aleatorias, event handlers con formato específico, y campos crípticos como `bodyType: "application/json"` o `datasourceId: "#JS_CODE"`. Este SDK convierte llamadas fluent como `app.addButton(id, {...})` en el JSON DSL correcto, eliminando los errores.

## Componentes del proyecto

Este monorepo contiene tres piezas que funcionan juntas:

| Paquete | npm | Para qué sirve |
| --- | --- | --- |
| **SDK Core** | [`@aorizondo/lowcoder-agent-sdk-core`](https://www.npmjs.com/package/@aorizondo/lowcoder-agent-sdk-core) | Librería TypeScript que un script Node usa para construir el DSL programáticamente |
| **MCP Server** | [`@aorizondo/lowcoder-mcp-server`](https://www.npmjs.com/package/@aorizondo/lowcoder-mcp-server) | Servidor Model Context Protocol que expone tools al agente IA para crear apps, listar, configurar SEO, etc. |
| **Claude Skill** | [`skills/lowcoder/`](skills/lowcoder/) | Skill instalable en Claude Code, Claude Desktop o Claude.ai que enseña al agente cómo usar el SDK y el MCP |

## Quick start (30 segundos)

### 1. Instala el SDK

```bash
npm install @aorizondo/lowcoder-agent-sdk-core
```

### 2. Crea una app

```typescript
import { LowcoderApp, LowcoderClient } from "@aorizondo/lowcoder-agent-sdk-core";

const app = new LowcoderApp("Mi Dashboard")
  .addText("title", { text: "## Mi primera app" })
  .addButton("loadBtn", { text: "Cargar", onClick: "loadUsers" })
  .addTable("users", {
    data: "{{loadUsers.data}}",
    columns: [
      { title: "Nombre", dataIndex: "name" },
      { title: "Email", dataIndex: "email" },
    ],
  })
  .addFetchQuery("loadUsers", {
    url: "https://jsonplaceholder.typicode.com/users",
    triggerType: "automatic",
  });

const client = new LowcoderClient({
  baseUrl: "https://tu-lowcoder.ejemplo.com",
  apiKey: process.env.LOWCODER_API_KEY!,
});

// orgId opcional — se auto-detecta del usuario autenticado
const result = await app.deploy(client);
console.log("App creada:", result.applicationInfoView.applicationId);
```

### 3. (Opcional) Configura el MCP para agentes IA

```json
// ~/.claude/mcp.json o equivalente
{
  "mcpServers": {
    "lowcoder": {
      "command": "npx",
      "args": ["-y", "@aorizondo/lowcoder-mcp-server"],
      "env": {
        "LOWCODER_BASE_URL": "https://tu-lowcoder.ejemplo.com",
        "LOWCODER_API_KEY": "tu-api-key"
      }
    }
  }
}
```

### 4. (Opcional) Instala el Skill para Claude Code

```bash
# Personal (todas las apps)
mkdir -p ~/.claude/skills/lowcoder
curl -L https://raw.githubusercontent.com/aorizondo/lowcoder-agent-sdk/main/skills/lowcoder/SKILL.md \
  -o ~/.claude/skills/lowcoder/SKILL.md
```

O por proyecto en `.claude/skills/lowcoder/SKILL.md`.

## Documentación

| Tema | Archivo |
| --- | --- |
| Primeros pasos detallados | [docs/getting-started.md](docs/getting-started.md) |
| Referencia del SDK (todos los componentes) | [docs/sdk-reference.md](docs/sdk-reference.md) |
| MCP Server: setup y tools | [docs/mcp-server.md](docs/mcp-server.md) |
| **Datasources** (conexiones BD/API/SaaS) | [docs/datasources.md](docs/datasources.md) |
| Skill: instalación en Claude Code/Desktop/.ai | [docs/skill-installation.md](docs/skill-installation.md) |
| Crear plugins de componentes para Lowcoder | [docs/plugin-creation.md](docs/plugin-creation.md) |
| FAQ y troubleshooting | [docs/troubleshooting.md](docs/troubleshooting.md) |
| Ejemplos completos | [examples/](examples/) |

## Estado del proyecto

| Pieza | Estado | Versión |
| --- | --- | --- |
| SDK Core (genera DSL) | ✅ Estable | 0.1.0 |
| Componentes nativos | ✅ ~25 wrappers + soporte raw | 0.1.0 |
| MCP Server | ✅ 7 tools | 0.1.0 |
| Claude Skill | ✅ Anthropic + skillz formats | 0.1.0 |
| Tested contra Lowcoder | 2.7.6 | — |

## Compatibilidad con Lowcoder

Requiere Lowcoder **2.7.0+** (en versiones anteriores las queries JS fallan por un bug upstream en el routing de datasources especiales `#JS_CODE`).

## Licencia

MIT © [Antonio Orizondo Leyva](https://github.com/aorizondo)

Lowcoder es marca registrada de Lowcoder Software Ltd. Este proyecto es independiente y no está afiliado con Lowcoder.
