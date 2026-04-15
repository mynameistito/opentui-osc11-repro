/**
 * Visual before/after test for OSC 11/111 terminal background sync.
 *
 * Run this in Windows Terminal (or any OSC 11-supporting terminal).
 * You'll see:
 *   1. Terminal background changes to dark navy for 3 seconds  (AFTER behavior)
 *   2. Terminal background resets to default                   (OSC 111 reset)
 *   3. A 2-second gap with default background                  (BEFORE — no sync)
 *
 * Usage:
 *   bun run visual-test
 *
 * Requires opentui native build in ../opentui/packages/core.
 */

const THEME_COLOR = { r: 0x21 / 255, g: 0x23 / 255, b: 0x2e / 255 } // #21232e dark navy
const RESET = "\x1b]111\x07"

function osc11(r: number, g: number, b: number): string {
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0")
  return `\x1b]11;rgb:${hex(r)}/${hex(g)}/${hex(b)}\x07`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  process.stdout.write("\x1b[2J\x1b[H") // clear screen

  // ── BEFORE ──────────────────────────────────────────────────────────────────
  process.stdout.write("BEFORE (no OSC 11): pixel gutter stays terminal default\n")
  process.stdout.write("Look at the right/bottom edges of the terminal window.\n")
  process.stdout.write("Background is NOT synced to the theme color.\n\n")
  process.stdout.write("Waiting 3 seconds...\n")
  await sleep(3000)

  process.stdout.write("\x1b[2J\x1b[H")

  // ── AFTER ───────────────────────────────────────────────────────────────────
  process.stdout.write(osc11(THEME_COLOR.r, THEME_COLOR.g, THEME_COLOR.b))

  process.stdout.write("AFTER (OSC 11 emitted): terminal background synced to #21232e\n")
  process.stdout.write("The pixel gutter now matches the theme background.\n")
  process.stdout.write("Maximize or snap the window to make the gutter visible.\n\n")
  process.stdout.write("Waiting 3 seconds, then resetting...\n")
  await sleep(3000)

  // ── RESET ───────────────────────────────────────────────────────────────────
  process.stdout.write(RESET)
  process.stdout.write("\x1b[2J\x1b[H")
  process.stdout.write("RESET (OSC 111 emitted): terminal background restored to default.\n")
  process.stdout.write("This fires automatically on destroy() and suspend() with the fix.\n\n")
  process.stdout.write("Done.\n")
}

run().catch(console.error)
