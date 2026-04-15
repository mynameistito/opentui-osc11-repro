/**
 * OSC 11/111 terminal background color demo.
 *
 * Run in a supporting terminal (Windows Terminal, iTerm2, Ghostty, etc.).
 * Watch the terminal background change to match the theme color, then
 * restore on exit.
 *
 * Usage:
 *   bun run demo
 */

/**
 * NOTE: requires opentui native build.
 * Run `bun run build:native` in ../opentui/packages/core first.
 */
import { createCliRenderer } from "@opentui/core"

// Dark navy — matches opencode default theme background
const THEME_BG = "#21232e"

const renderer = await createCliRenderer({ exitOnCtrlC: true })

// setBackgroundColor() now emits OSC 11 — terminal background syncs immediately.
renderer.setBackgroundColor(THEME_BG)

console.error("[demo] Background set via OSC 11. Press Ctrl+C to exit and restore.")

// On destroy, performShutdownSequence → resetState → emits OSC 111 automatically.
renderer.on("destroy", () => {
  console.error("[demo] Destroyed — terminal background restored via OSC 111.")
})
