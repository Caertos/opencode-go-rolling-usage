# opencode-go-rolling-usage

<p align="center">
  <img src="https://img.shields.io/npm/v/opencode-go-rolling-usage?color=blue&label=npm%20package" alt="npm version"/>
  <img src="https://img.shields.io/npm/dt/opencode-go-rolling-usage?color=green&label=downloads" alt="npm downloads"/>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node >= 18"/>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="license MIT"/>
</p>

> **Vigila tu cuota de OpenCode Go —rolling (5h), semanal y mensual— en tu terminal y en el sidebar de la TUI de OpenCode.**

`opencode-go-rolling-usage` consulta el endpoint oficial de uso de OpenCode Go y
muestra cuánto has consumido de cada ventana de suscripción, con una barra de
progreso con código de colores y una cuenta atrás hasta el próximo reinicio.
Incluye dos frontends sobre la misma ruta de datos:

- **CLI** — `ogr show` imprime la tabla (o JSON) en cualquier terminal.
- **Plugin TUI** — un widget de sidebar para la TUI de OpenCode.

```text

OpenCode Go usage

  Rolling   62% used   ██████████████░░░░░░░░   resets in 3h 30m
  Weekly    28% used   ██████░░░░░░░░░░░░░░░░   resets in 3d 2h
  Monthly   62% used   ██████████████░░░░░░░░   resets in 16d 2h

```

## Escala de color

| Uso         | Color    |
| ----------- | -------- |
| < 40%       | verde    |
| 40% – 59%   | amarillo |
| 60% – 79%   | naranja  |
| ≥ 80%       | rojo     |

## Requisitos

- **Node.js >= 18** — el CLI usa el `fetch` global.
- **Una suscripción de OpenCode Go** con la API key guardada — ejecuta
  `opencode auth login` una vez, o exporta `OPENCODE_API_KEY`.
- **Linux, macOS o Windows** — las mismas plataformas que la TUI de OpenCode. Las
  credenciales se buscan en el directorio de datos de la plataforma
  (`~/.local/share`, `~/Library/Application Support`, `%LOCALAPPDATA%`), y la
  config de la TUI en `$XDG_CONFIG_HOME`/`~/.config/opencode`.

## Instalación

### npm

```bash
npm install -g opencode-go-rolling-usage
# o
pnpm add -g opencode-go-rolling-usage
```

Esto instala dos comandos: `opencode-go-rolling-usage` y su alias corto `ogr`.

### Homebrew

```bash
brew tap caertos/tap
brew install opencode-go-rolling-usage
```

### Sin instalar

```bash
npx opencode-go-rolling-usage show
# o
pnpm dlx opencode-go-rolling-usage show
```

## Uso

```bash
ogr                          # equivalente a `ogr show`
ogr show                     # imprime la tabla de cuotas
ogr --json                   # payload crudo en JSON (scripts, status bars)
ogr --no-color               # texto plano
ogr --help
ogr --version
```

`opencode-go-rolling-usage` es la forma larga de `ogr`; ambas aceptan las mismas
opciones:

| Opción             | Descripción                                       |
| ------------------ | ------------------------------------------------- |
| `--json`           | Imprime el payload crudo en JSON                  |
| `--key <key>`      | Usa esta API key en vez de la guardada            |
| `--base-url <url>` | Sobrescribe la URL base de la API de uso          |
| `--color`          | Fuerza colores ANSI                               |
| `--no-color`       | Desactiva los colores ANSI                        |
| `-h, --help`       | Muestra la ayuda                                  |
| `-v, --version`    | Muestra la versión                                |

### De dónde sale la API key

Por orden de precedencia:

1. `--key` / `OPENCODE_API_KEY` — una API key de Go explícita.
2. `~/.local/share/opencode/auth.json` — la entrada del proveedor `opencode-go`
   (con `opencode` como respaldo). Respeta `XDG_DATA_HOME` y `OPENCODE_AUTH_JSON`.

Si no encuentra key, ejecuta primero `opencode auth login`.

## Plugin TUI (widget del sidebar)

El paquete incluye un plugin de la TUI de OpenCode y lo registra en tu
`~/.config/opencode/tui.json` automáticamente:

- **npm** — el hook `postinstall` lo registra, así que basta con abrir OpenCode.
- **pnpm** — pnpm bloquea los scripts de instalación por defecto; ejecuta
  `pnpm approve-builds` una vez (o `ogr setup`).
- **Homebrew** — ejecuta `ogr setup` una vez; el sandbox de Homebrew impide que
  la fórmula escriba en tu configuración de OpenCode.

`ogr setup` agrega `opencode-go-rolling-usage` al arreglo `plugin` de `tui.json`
(idempotente y seguro; no toca nada más). Luego solo reinicia OpenCode: el widget
aparece en el sidebar de la sesión y se refresca en cada `session.idle` y cada
90 segundos. Usa las mismas fuentes de key que el CLI y **se oculta** cuando no
hay key configurada.

### Si el plugin no se registró

El hook `postinstall` puede saltarse — por ejemplo cuando pnpm bloquea los
scripts de instalación, cuando el sandbox de Homebrew lo impide, con
`npm install --ignore-scripts`, o en un CI/política que desactiva scripts. Si
ocurre, registra el plugin tú mismo. Cualquiera de estas sirve:

```bash
# 1. Deja que el CLI lo haga (idempotente y seguro)
ogr setup

# 2. Deja que pnpm ejecute el postinstall de este paquete
pnpm approve-builds           # elige opencode-go-rolling-usage y reinstala
```

O agrégalo a mano — edita `~/.config/opencode/tui.json` y pon el paquete en el
arreglo `plugin`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-go-rolling-usage"]
}
```

Luego reinicia OpenCode.

**Verifica** que quedó registrado (imprime "already registered" si no cambia
nada):

```bash
ogr setup
```

**Deshacer:** quita `"opencode-go-rolling-usage"` del arreglo `plugin`, o borra la
entrada que agregaste.

Notas: `ogr setup` respeta `OPENCODE_TUI_CONFIG` y `XDG_CONFIG_HOME`, solo toca el
arreglo `plugin`, y deja intacto un `tui.jsonc` que tenga comentarios (lo informa
en vez de reescribirlo).

## Desarrollo

¿Quieres clonar el código y trabajar en él?

```bash
git clone https://github.com/Caertos/opencode-go-rolling-usage.git
cd opencode-go-rolling-usage
pnpm install
```

### Scripts

```bash
pnpm test              # tests unitarios con jest
pnpm run test:coverage # tests con reporte de cobertura
pnpm run lint          # eslint
pnpm run format        # prettier --write
pnpm run format:check  # prettier --check
pnpm run build         # babel src -> dist
```

Ejecuta el CLI directamente desde el código fuente:

```bash
node src/index.js show
# o, tras compilar:
pnpm run build && node dist/index.js show
```

Instala tu build local globalmente para probar el comando `ogr`:

```bash
pnpm run build
pnpm add -g .
ogr show
```

### Estructura del proyecto

```text
src/
  format.js   helpers puros (clamp, barra, countdown, colores de 4 niveles)
  usage.js    resolución de la API key + cliente del endpoint de uso
  render.js   render de terminal (chalk)
  index.js    entry point del CLI (bin)
  tui.tsx     plugin de la TUI de OpenCode (autocontenido, un solo archivo)
test/
  format.test.js
  usage.test.js
  render.test.js
packaging/
  homebrew/   fórmula de Homebrew
```

### Tests

```bash
pnpm test
pnpm run lint && pnpm run format:check
```

Los pull requests son bienvenidos. Mantén los tests en verde y ejecuta
`pnpm run format` antes de abrir uno.

### Publicación

La publicación usa **Trusted Publishing (OIDC)** de npm — **sin token secreto**.
Se ejecuta el workflow `publish.yml` con los tags `v*`. La procedencia
(provenance) se genera automáticamente.

Configuración única en npmjs.com (paquete → **Settings → Trusted Publisher →
GitHub Actions**):

| Campo              | Valor                        |
| ------------------ | ---------------------------- |
| Organización/usuario | `Caertos`                  |
| Repositorio        | `opencode-go-rolling-usage`  |
| Archivo de workflow| `publish.yml`                |

> El paquete debe existir en npm antes de poder configurar el trusted publisher.
> Para la primera release, publica una vez de forma manual (`npm login` +
> `npm publish`), luego agrega el trusted publisher y usa el flujo por tag.

Luego, para cada release:

1. Sube la `version` en `package.json` y agrega una entrada en `CHANGELOG.md`.
2. Crea el tag y haz push:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. El workflow **Publish** corre lint/format/tests, publica en npm con
   procedencia y crea el GitHub Release.

**Homebrew:** ejecuta el workflow **Bump Homebrew formula** con la versión
publicada. Actualiza `url` + `sha256` en el tap y abre un PR. Requiere un repo
`homebrew-tap` y el secreto `HOMEBREW_TAP_TOKEN`.

## Notas

- El endpoint de uso (`https://opencode.ai/zen/go/v1/usage`) es el que usa el
  dashboard de Go. No está documentado públicamente y puede cambiar.
- Los colores son ANSI truecolor cuando la salida es una TTY; seguro para pipes
  en caso contrario.

## Licencia

MIT © caertos
