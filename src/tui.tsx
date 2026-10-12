// @ts-nocheck
/**
 * @jsxImportSource @opentui/solid
 *
 * OpenCode plugin (v1 and v2): renders the OpenCode Go quota (rolling 5h /
 * weekly / monthly) in the session sidebar.
 *
 * One file targets both plugin APIs:
 *   - v2: `setup(api)` registers a `sidebar.content` slot via `api.ui.slot`
 *     and subscribes with `api.data.on`.
 *   - v1: `tui(api)` registers a `sidebar_content` slot via
 *     `api.slots.register` and subscribes with `api.event.on`.
 *
 * It is intentionally self-contained (no local imports) and never imports the
 * plugin core package at runtime (neither `@opencode/plugin/tui` nor
 * `@opencode-ai/plugin/tui`), so the same file loads under both runtimes.
 * `Plugin.define` is an identity helper, so the exported object below is
 * exactly what v2 expects without the import. The same numbers and color scale
 * also live in src/format.js for the CLI.
 *
 * Register it in cli.json (v2) or tui.json (v1), by package name.
 */

import { createSignal, For, Show, type Accessor } from "solid-js"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const id = "opencode-go-rolling-usage"
const ENDPOINT = "https://opencode.ai/zen/go/v1/usage"
const REFRESH_MS = 90_000
const BAR_WIDTH = 22

// Color scale: verde <40%, amarillo 40-60%, naranja 60-80%, rojo >=80%.
const LEVEL_YELLOW_PCT = 40
const LEVEL_ORANGE_PCT = 60
const LEVEL_RED_PCT = 80

interface UsageWindow {
  status?: string
  percent?: number
  resetsAt?: string
}

interface GoUsage {
  rolling?: UsageWindow
  weekly?: UsageWindow
  monthly?: UsageWindow
}

type Snapshot =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "error"; message: string }
  | { status: "ok"; usage: GoUsage; at: number }

interface Palette {
  text: any
  muted: any
  border: any
  bg: any
  green: any
  yellow: any
  orange: any
  red: any
}

const WINDOWS: ReadonlyArray<{ key: keyof GoUsage; label: string }> = [
  { key: "rolling", label: "Rolling" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
]

function authFileCandidates(): string[] {
  if (process.env.OPENCODE_AUTH_JSON?.trim()) return [process.env.OPENCODE_AUTH_JSON.trim()]
  const home = homedir()
  const candidates: string[] = []
  if (process.env.XDG_DATA_HOME?.trim()) {
    candidates.push(join(process.env.XDG_DATA_HOME.trim(), "opencode", "auth.json"))
  }
  switch (process.platform) {
    case "darwin":
      candidates.push(join(home, "Library", "Application Support", "opencode", "auth.json"))
      break
    case "win32":
      candidates.push(
        join(process.env.LOCALAPPDATA || join(home, "AppData", "Local"), "opencode", "auth.json"),
      )
      break
  }
  candidates.push(join(home, ".local", "share", "opencode", "auth.json"))
  return [...new Set(candidates)]
}

async function resolveApiKey(): Promise<string | undefined> {
  const fromEnv = process.env.OPENCODE_API_KEY?.trim()
  if (fromEnv) return fromEnv
  for (const file of authFileCandidates()) {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"))
      for (const provider of ["opencode-go", "opencode"]) {
        const entry = parsed?.[provider]
        const key = typeof entry?.key === "string" ? entry.key : entry?.apiKey
        if (typeof key === "string" && key.trim()) return key.trim()
      }
    } catch {
      // try the next candidate location
    }
  }
  return undefined
}

async function fetchUsage(key: string): Promise<GoUsage> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    })
    if (res.status === 401) throw new Error("API key rejected")
    if (res.status === 403) throw new Error("no Go subscription")
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    const usage = body?.usage
    if (!usage || typeof usage !== "object") throw new Error("unexpected response")
    return usage as GoUsage
  } finally {
    clearTimeout(timer)
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function progressBar(percent: number): { filled: string; empty: string } {
  const filled = Math.round((clamp(percent) / 100) * BAR_WIDTH)
  return { filled: "█".repeat(filled), empty: "░".repeat(BAR_WIDTH - filled) }
}

function countdown(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return ""
  const target = Date.parse(resetsAt)
  if (!Number.isFinite(target)) return ""
  const ms = target - now
  if (ms <= 0) return "now"
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// v2 hands us the resolved theme (RGBA tokens); v1 used flat named tokens plus
// hardcoded level colors. Normalise both into a single palette.
function toPalette(theme: any): Palette {
  if (theme && theme.text && theme.text.default !== undefined) {
    return {
      text: theme.text.default,
      muted: theme.text.subdued,
      border: theme.border.default,
      bg: theme.background.surface.offset,
      green: theme.text.feedback.success.default,
      yellow: theme.text.feedback.warning.default,
      orange: theme.hue.orange[700],
      red: theme.text.feedback.error.default,
    }
  }
  return {
    text: theme?.text,
    muted: theme?.textMuted,
    border: theme?.border,
    bg: theme?.backgroundElement,
    green: "#3fb950",
    yellow: "#e3b341",
    orange: "#f0883e",
    red: "#f85149",
  }
}

function levelColor(percent: number, palette: Palette): any {
  const p = clamp(percent)
  if (p >= LEVEL_RED_PCT) return palette.red
  if (p >= LEVEL_ORANGE_PCT) return palette.orange
  if (p >= LEVEL_YELLOW_PCT) return palette.yellow
  return palette.green
}

function Row(props: { label: string; get: () => UsageWindow | undefined; palette: Palette; now: number }) {
  const palette = () => props.palette
  const percent = () => clamp(props.get()?.percent ?? 0)
  const has = () => typeof props.get()?.percent === "number"
  const color = () => levelColor(percent(), palette())
  const bars = () => progressBar(percent())
  const reset = () => countdown(props.get()?.resetsAt, props.now)

  return (
    <box flexDirection="column" marginBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg={palette().muted}>{props.label.padEnd(8)}</text>
          <text fg={has() ? color() : palette().muted} bg={palette().bg}>
            {has() ? ` ${percent()}% used ` : "   —   "}
          </text>
        </box>
        <text fg={palette().muted}>{reset() ? `resets ${reset()}` : ""}</text>
      </box>
      <box flexDirection="row">
        <text fg={color()}>{bars().filled}</text>
        <text fg={palette().border}>{bars().empty}</text>
      </box>
    </box>
  )
}

function GoUsageWidget(props: { snapshot: Accessor<Snapshot>; palette: Palette }) {
  const palette = () => props.palette
  const snap = () => props.snapshot()
  const usage = () => (snap().status === "ok" ? snap().usage : undefined)
  const now = () => (snap().status === "ok" ? snap().at : Date.now())

  return (
    <Show when={snap().status !== "hidden"}>
      <box flexDirection="column">
        <box flexDirection="row">
          <text fg={palette().text}>Go usage</text>
          <text fg={palette().muted}> · quota</text>
        </box>
        <Show
          when={snap().status === "ok"}
          fallback={
            <text fg={palette().muted}>
              {snap().status === "error" ? "usage unavailable" : "loading…"}
            </text>
          }
        >
          <For each={WINDOWS}>
            {(w) => <Row label={w.label} get={() => usage()?.[w.key]} palette={palette()} now={now()} />}
          </For>
        </Show>
      </box>
    </Show>
  )
}

function build() {
  const [snapshot, setSnapshot] = createSignal<Snapshot>({ status: "loading" })
  let disposed = false
  let apiKey: string | undefined
  let keyLoaded = false

  async function refresh() {
    if (disposed) return
    if (!keyLoaded) {
      apiKey = await resolveApiKey()
      keyLoaded = true
    }
    if (!apiKey) {
      setSnapshot({ status: "hidden" })
      return
    }
    try {
      const usage = await fetchUsage(apiKey)
      if (disposed) return
      setSnapshot({ status: "ok", usage, at: Date.now() })
    } catch (error) {
      if (disposed) return
      const message = error instanceof Error ? error.message : String(error)
      // Keep the last known values when a refresh fails.
      if (snapshot().status === "ok") return
      setSnapshot({ status: "error", message })
    }
  }

  function startRefreshLoop(subscribeIdle: (handler: () => void) => () => void) {
    const offIdle = subscribeIdle(() => void refresh())
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    void refresh()
    return () => {
      clearInterval(timer)
      offIdle()
    }
  }

  // OpenCode v2 entrypoint: `{ id, setup }`.
  function setup(api: any) {
    const offSlot = api.ui.slot({
      append: "sidebar.content",
      render: () => <GoUsageWidget snapshot={snapshot} palette={toPalette(api.theme)} />,
    })
    const stop = startRefreshLoop((handler) => api.data.on("session.idle", handler))
    return () => {
      disposed = true
      stop()
      offSlot()
    }
  }

  // OpenCode v1 entrypoint: `{ id, tui }`.
  async function tui(api: any) {
    api.slots.register({
      id,
      order: 95,
      slots: {
        sidebar_content(ctx: any) {
          return (
            <GoUsageWidget snapshot={snapshot} palette={toPalette(ctx.theme?.current ?? ctx.theme)} />
          )
        },
      },
    })
    const stop = startRefreshLoop((handler) => api.event.on("session.idle", handler))
    const dispose = () => {
      disposed = true
      stop()
    }
    if (api.lifecycle?.onDispose) api.lifecycle.onDispose(dispose)
    return dispose
  }

  return { id, setup, tui }
}

// `Plugin.define` is an identity helper; exporting the object directly keeps
// this file loadable by both the v1 and v2 plugin runtimes.
export default build()
