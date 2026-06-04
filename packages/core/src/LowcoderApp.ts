import { DslBuilder, type BuildInput, type QueryEntry } from "./dsl/DslBuilder.js";
import type {
  UICompType,
  ResourceType,
  LowcoderDSL,
  AppSettingsDSL,
  PreloadDSL,
  TempStateDSL,
  ApplicationView,
  LayoutPos,
} from "./dsl/types.js";
import type { ComponentEntry } from "./layout/AutoLayout.js";
import type {
  ButtonOptions, InputOptions, TextAreaOptions, TextOptions,
  TableOptions, SelectOptions, NumberInputOptions, CheckboxOptions,
  DividerOptions, ImageOptions, ContainerOptions, ChartOptions,
  CardOptions, BarLineChartOptions, PieChartOptions, GaugeChartOptions,
  RadarChartOptions, FunnelChartOptions, HeatmapChartOptions,
  LinkOptions, IconOptions, IconButtonOptions, FloatingButtonOptions,
  ProgressOptions, TimerOptions, AvatarOptions, MermaidOptions,
  JsonLottieOptions, SliderOptions,
} from "./dsl/components/index.js";
import type { RestApiQueryOptions } from "./dsl/queries/restApiQuery.js";
import type { JsQueryOptions } from "./dsl/queries/jsQuery.js";
import { jsFetchScript } from "./dsl/queries/jsQuery.js";
import type { SqlQueryOptions } from "./dsl/queries/sqlQuery.js";
import { LowcoderClient } from "./LowcoderClient.js";

type WithAt<T> = T & { at?: LayoutPos };

export class LowcoderApp {
  private readonly title: string;
  private readonly components: ComponentEntry[] = [];
  private readonly queries: QueryEntry[] = [];
  private readonly tempStates: TempStateDSL[] = [];
  private appSettings: Partial<AppSettingsDSL> = {};
  private appPreload: Partial<PreloadDSL> = {};

  constructor(title: string) {
    this.title = title;
  }

  // ─── Componentes ──────────────────────────────────────────────────────────

  addButton(id: string, opts: WithAt<ButtonOptions> = {}): this {
    return this.addComponent(id, "button", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addInput(id: string, opts: WithAt<InputOptions> = {}): this {
    return this.addComponent(id, "input", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addTextArea(id: string, opts: WithAt<TextAreaOptions> = {}): this {
    return this.addComponent(id, "textArea", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addText(id: string, opts: WithAt<TextOptions>): this {
    return this.addComponent(id, "text", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addTable(id: string, opts: WithAt<TableOptions>): this {
    return this.addComponent(id, "table", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addSelect(id: string, opts: WithAt<SelectOptions> = {}): this {
    return this.addComponent(id, "select", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addMultiSelect(id: string, opts: WithAt<SelectOptions> = {}): this {
    return this.addComponent(id, "multiSelect", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addNumberInput(id: string, opts: WithAt<NumberInputOptions> = {}): this {
    return this.addComponent(id, "numberInput", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addCheckbox(id: string, opts: WithAt<CheckboxOptions> = {}): this {
    return this.addComponent(id, "checkbox", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addDivider(id: string, opts: WithAt<DividerOptions> = {}): this {
    return this.addComponent(id, "divider", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addImage(id: string, opts: WithAt<ImageOptions>): this {
    return this.addComponent(id, "image", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addContainer(id: string, opts: WithAt<ContainerOptions> = {}): this {
    return this.addComponent(id, "container", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addChart(id: string, opts: WithAt<ChartOptions>): this {
    return this.addComponent(id, "chart", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  // ─── Componentes avanzados ────────────────────────────────────────────────

  addCard(id: string, opts: WithAt<CardOptions> = {}): this {
    return this.addComponent(id, "card", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addBarChart(id: string, opts: WithAt<BarLineChartOptions>): this {
    return this.addComponent(id, "barChart", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addLineChart(id: string, opts: WithAt<BarLineChartOptions>): this {
    return this.addComponent(id, "lineChart", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addPieChart(id: string, opts: WithAt<PieChartOptions>): this {
    return this.addComponent(id, "pieChart", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addGaugeChart(id: string, opts: WithAt<GaugeChartOptions>): this {
    return this.addComponent(id, "gaugeChart", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addRadarChart(id: string, opts: WithAt<RadarChartOptions>): this {
    return this.addComponent(id, "radarChart", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addFunnelChart(id: string, opts: WithAt<FunnelChartOptions>): this {
    return this.addComponent(id, "funnelChart", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addHeatmapChart(id: string, opts: WithAt<HeatmapChartOptions>): this {
    return this.addComponent(id, "heatmapChart", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addLink(id: string, opts: WithAt<LinkOptions>): this {
    return this.addComponent(id, "link", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addIcon(id: string, opts: WithAt<IconOptions>): this {
    return this.addComponent(id, "icon", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addIconButton(id: string, opts: WithAt<IconButtonOptions>): this {
    return this.addComponent(id, "iconButton", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addFloatingButton(id: string, opts: WithAt<FloatingButtonOptions> = {}): this {
    return this.addComponent(id, "floatingButton", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addProgress(id: string, opts: WithAt<ProgressOptions>): this {
    return this.addComponent(id, "progress", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addProgressCircle(id: string, opts: WithAt<ProgressOptions>): this {
    return this.addComponent(id, "progressCircle", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addTimer(id: string, opts: WithAt<TimerOptions> = {}): this {
    return this.addComponent(id, "timer", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addAvatar(id: string, opts: WithAt<AvatarOptions> = {}): this {
    return this.addComponent(id, "avatar", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addMermaid(id: string, opts: WithAt<MermaidOptions>): this {
    return this.addComponent(id, "mermaid", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addJsonLottie(id: string, opts: WithAt<JsonLottieOptions>): this {
    return this.addComponent(id, "jsonLottie", opts as unknown as Record<string, unknown> & { at?: LayoutPos });
  }

  addSlider(id: string, opts: WithAt<SliderOptions> = {}): this {
    return this.addComponent(id, "slider", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  addRangeSlider(id: string, opts: WithAt<SliderOptions> = {}): this {
    return this.addComponent(id, "rangeSlider", opts as Record<string, unknown> & { at?: LayoutPos });
  }

  /**
   * Añade un input de password (separate de `input` porque Lowcoder usa un compType
   * distinto con validación específica). Acepta los mismos opts que `addInput`.
   */
  addPassword(id: string, opts: WithAt<InputOptions> = {}): this {
    return this.addComponent(id, "password" as UICompType, opts as Record<string, unknown> & { at?: LayoutPos });
  }

  /**
   * Añade cualquier tipo de componente usando su compType nativo de Lowcoder.
   *
   * Normaliza `label: "string"` → `label: { text: "string", align: "left" }`
   * SOLO para componentes que no tienen un helper dedicado (los helpers como
   * `addInput`, `addNumberInput`, `addSelect` ya manejan label internamente).
   * Componentes raros (`password`, `cascader`, etc.) suelen necesitar el wrapper.
   */
  addComponent(
    id: string,
    type: UICompType | string,
    opts: { at?: LayoutPos } & Record<string, unknown> = {}
  ): this {
    const { at, ...rest } = opts as { at?: LayoutPos } & Record<string, unknown>;
    // Normaliza label string → { text: "..." } solo para tipos sin helper propio.
    // Los helpers (input, select, etc.) lo normalizan ellos mismos.
    const TYPES_WITH_HELPER_LABEL = new Set([
      "input", "textArea", "numberInput", "select", "multiSelect", "checkbox", "slider",
    ]);
    if (typeof rest.label === "string" && !TYPES_WITH_HELPER_LABEL.has(type)) {
      rest.label = { text: rest.label, align: "left" };
    }
    this.components.push({ id, compType: type as UICompType, options: rest, at });
    return this;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  addRestQuery(id: string, opts: RestApiQueryOptions): this {
    this.queries.push({ id, type: "restApi", options: opts as unknown as Record<string, unknown> });
    return this;
  }

  addJsQuery(id: string, opts: JsQueryOptions): this {
    this.queries.push({ id, type: "js", options: opts as unknown as Record<string, unknown> });
    return this;
  }

  /**
   * Atajo: añade una JS query que hace `fetch()` a una URL pública y devuelve el JSON.
   * Útil cuando la instancia Lowcoder no tiene datasources REST configurados.
   * Funciona sin configuración adicional — el código se ejecuta en el browser.
   */
  addFetchQuery(
    id: string,
    opts: {
      url: string;
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      headers?: Record<string, string>;
      body?: unknown;
      triggerType?: "automatic" | "manual" | "onPageLoad";
    }
  ): this {
    const script = jsFetchScript({
      url: opts.url,
      method: opts.method,
      headers: opts.headers,
      body: opts.body,
    });
    this.queries.push({
      id,
      type: "js",
      options: { script, triggerType: opts.triggerType ?? "automatic" },
    });
    return this;
  }

  addSqlQuery(id: string, opts: SqlQueryOptions & { dbType?: "mysql" | "postgres" | "mssql" }): this {
    const type = opts.dbType ?? "mysql";
    this.queries.push({ id, type: type as ResourceType, options: opts as unknown as Record<string, unknown> });
    return this;
  }

  /** Añade cualquier tipo de query */
  addQuery(id: string, type: ResourceType, opts: Record<string, unknown>): this {
    this.queries.push({ id, type, options: opts });
    return this;
  }

  // ─── Estado temporal ──────────────────────────────────────────────────────

  /**
   * Añade un estado temporal (similar a useState en React).
   *
   * **IMPORTANTE:** Lowcoder serializa el valor del tempState como JSON-stringified
   * porque internamente usa `jsonValueControl`. Si pasas `"login"`, Lowcoder espera
   * recibir `"\"login\""` (string JSON-encoded). Este método aplica el `JSON.stringify`
   * automáticamente para que puedas escribir simplemente:
   *
   * ```typescript
   * app.addTempState("currentView", "login");   // string
   * app.addTempState("counter", 0);              // number
   * app.addTempState("isOpen", false);           // bool
   * app.addTempState("filter", { status: "active" }); // object
   * ```
   *
   * Si pasas `undefined`, el tempState se inicializa como JSON `null` (compatible
   * con la UI de Lowcoder cuando creas un tempState sin valor).
   */
  addTempState(name: string, initialValue: unknown): this {
    // CRÍTICO: Lowcoder serializa los tempStates en formato FLAT, no anidado en `comp`.
    // El value debe ser JSON-stringified (porque internamente usa jsonValueControl).
    // Estructura esperada por el servidor: { name, value }
    // (No { name, comp: { value } } — eso queda como string "null" al normalizar)
    const value = JSON.stringify(initialValue ?? null);
    this.tempStates.push({ name, value } as any);
    return this;
  }

  // ─── Configuración ────────────────────────────────────────────────────────

  withSettings(settings: Partial<AppSettingsDSL>): this {
    this.appSettings = { ...this.appSettings, ...settings };
    return this;
  }

  withPreload(preload: Partial<PreloadDSL>): this {
    this.appPreload = { ...this.appPreload, ...preload };
    return this;
  }

  // ─── Salida ───────────────────────────────────────────────────────────────

  build(): LowcoderDSL {
    const input: BuildInput = {
      title: this.title,
      components: this.components,
      queries: this.queries,
      tempStates: this.tempStates,
      settings: this.appSettings,
      preload: this.appPreload,
    };
    return DslBuilder.build(input);
  }

  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  /**
   * Despliega la app a una instancia Lowcoder.
   *
   * @param client - LowcoderClient configurado
   * @param orgId  - Opcional. Si se omite, se auto-detecta usando
   *                 `client.getCurrentOrgId()` (la org activa del usuario actual)
   * @param opts   - folderId, publish, replaceByName, publicToAll opcionales.
   *                 - `replaceByName: true` → elimina (recycle) apps anteriores con el mismo title.
   *                 - `publish: true` → publica la versión (necesario para /view de apps no-públicas también).
   *                 - `publicToAll: true` → cualquier visitante anónimo puede ver la app
   *                   (imprescindible para login/registro públicos o landing pages).
   */
  async deploy(
    client: LowcoderClient,
    orgId?: string,
    opts?: {
      folderId?: string;
      publish?: boolean;
      replaceByName?: boolean;
      publicToAll?: boolean;
      /**
       * Deploy idempotente: si existe una app NORMAL con el mismo `title`,
       * la **actualiza** preservando su `applicationId`. Si no existe, la crea.
       *
       * **Esto es MUY IMPORTANTE** cuando otras apps referencian este appId en
       * redirects/links — sin esto, cada redeploy genera un nuevo ID y rompe
       * los enlaces de las demás apps. Si lo combinas con `replaceByName: true`
       * antes, las versiones antiguas RECYCLED se purgan primero.
       *
       * Toma precedencia sobre `replaceByName` cuando hay un match NORMAL.
       */
      upsert?: boolean;
    }
  ): Promise<ApplicationView> {
    const dsl = this.build();
    const resolvedOrgId = orgId ?? (await client.getCurrentOrgId());

    // Upsert: busca una app NORMAL existente con el mismo title y actualízala.
    if (opts?.upsert) {
      const allApps = await client.listApps(resolvedOrgId);
      const existing = allApps.find(
        (a: any) => a.name === this.title && a.applicationStatus === "NORMAL"
      );
      if (existing) {
        const appId = (existing as any).applicationId;
        await client.updateApp(appId, dsl, { publish: opts.publish });
        if (opts?.publicToAll) {
          await client.setAppPublicToAll(appId, true);
        }
        // Re-fetch para devolver el view completo, consistente con createApp.
        return client.getApp(appId);
      }
      // No existe NORMAL — cae al flujo de creación.
    }

    if (opts?.replaceByName) {
      const allApps = await client.listApps(resolvedOrgId);
      for (const old of allApps.filter((a: any) => a.name === this.title)) {
        try { await client.deleteApp((old as any).applicationId); } catch { /* swallow */ }
      }
    }
    const app = await client.createApp({
      name: this.title,
      orgId: resolvedOrgId,
      applicationType: 1,
      editingApplicationDSL: dsl,
      folderId: opts?.folderId,
    });
    const appId = app.applicationInfoView.applicationId;
    if (opts?.publish) {
      await client.publishApp(appId);
    }
    if (opts?.publicToAll) {
      await client.setAppPublicToAll(appId, true);
    }
    return app;
  }
}
