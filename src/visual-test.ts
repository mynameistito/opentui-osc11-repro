/**
 * Visual before/after test for OSC 11/111 terminal background sync.
 *
 * Run in Windows Terminal (or any OSC 11-supporting terminal).
 * Maximize or snap the window first to make the pixel gutter visible.
 *
 * Sequence:
 *   1. BEFORE — cells painted navy via ANSI, NO OSC 11 emitted.
 *              Gutter stays at terminal default (visible seam at edges).
 *   2. AFTER  — OSC 11 emitted. Gutter syncs to match navy. Seam gone.
 *   3. RESET  — OSC 111 restores terminal default background.
 *
 * Usage:
 *   bun run visual-test
 */

const RESET_BG = "\x1b]111\x07"
const RESET_ANSI = "\x1b[0m"

// OSC 11 — sets terminal emulator background (pixel gutter)
function osc11(r: number, g: number, b: number): string {
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0")
  return `\x1b]11;rgb:${hex(r)}/${hex(g)}/${hex(b)}\x07`
}

// ANSI cell background — paints character cells only, not the gutter
function ansiBg(r: number, g: number, b: number): string {
  return `\x1b[48;2;${Math.round(r * 255)};${Math.round(g * 255)};${Math.round(b * 255)}m`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fillScreen(bgSeq: string, lines: string[]): void {
  const cols = process.stdout.columns ?? 80
  const rows = process.stdout.rows ?? 24
  process.stdout.write("\x1b[2J\x1b[H")
  process.stdout.write(bgSeq)
  // flood-fill every cell so the bg color is visible
  for (let r = 0; r < rows; r++) {
    process.stdout.write(" ".repeat(cols))
  }
  process.stdout.write("\x1b[H") // back to top
  for (const line of lines) {
    process.stdout.write(line + "\n")
  }
}

const NAVY = { r: 0x21 / 255, g: 0x23 / 255, b: 0x2e / 255 } // #21232e

async function run() {
  // ── BEFORE ────────────────────────────────────────────────────────────────
  // Cells painted navy via ANSI bg — but NO OSC 11 emitted.
  // The pixel gutter at the right/bottom edges stays at the terminal default.
  fillScreen(ansiBg(NAVY.r, NAVY.g, NAVY.b), [
    "BEFORE — no OSC 11",
    "",
    "Cells: navy (#21232e) via ANSI cell background",
    "Gutter: terminal default (look at right/bottom edges)",
    "",
    "The seam is the mismatch between the cell color",
    "and the unpainted pixel remainder outside the grid.",
    "",
    "Syncing gutter in 4 seconds...",
  ])

  await sleep(4000)

  // ── AFTER ─────────────────────────────────────────────────────────────────
  // Now emit OSC 11 — terminal repaints gutter to match. Seam disappears.
  process.stdout.write(osc11(NAVY.r, NAVY.g, NAVY.b))
  fillScreen(ansiBg(NAVY.r, NAVY.g, NAVY.b), [
    "AFTER — OSC 11 emitted",
    "",
    "Cells: navy (#21232e) via ANSI cell background",
    "Gutter: navy (#21232e) via OSC 11 — seam is gone",
    "",
    "setBackgroundColor() now emits this automatically.",
    "",
    "Restoring terminal default in 4 seconds...",
  ])

  await sleep(4000)

  // ── RESET ─────────────────────────────────────────────────────────────────
  process.stdout.write(RESET_BG)
  process.stdout.write(RESET_ANSI)
  process.stdout.write("\x1b[2J\x1b[H")
  process.stdout.write("RESET — OSC 111 emitted.\n")
  process.stdout.write("Terminal background restored to its default.\n")
  process.stdout.write("Fires automatically on destroy() and suspend() with the fix.\n\n")
  process.stdout.write("Done.\n")
}

run().catch(console.error)
