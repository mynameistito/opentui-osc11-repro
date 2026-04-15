/**
 * Visual before/after test for OSC 11/111 terminal background sync.
 *
 * Run in Windows Terminal (or any OSC 11-supporting terminal).
 * Maximize or snap the window first to make the pixel gutter visible.
 *
 * Sequence:
 *   BEFORE — RGB flash via ANSI cell bg only. No OSC 11.
 *            Gutter stays at terminal default the whole time.
 *   AFTER  — RGB flash with OSC 11 emitted each frame.
 *            Gutter syncs to each color. No seam.
 *   RESET  — OSC 111 restores terminal default.
 *
 * Usage:
 *   bun run visual-test
 */

const RESET_BG = "\x1b]111\x07"
const RESET_ANSI = "\x1b[0m"

function osc11(r: number, g: number, b: number): string {
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0")
  return `\x1b]11;rgb:${hex(r)}/${hex(g)}/${hex(b)}\x07`
}

function ansiBg(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fillScreen(bgSeq: string, lines: string[]): void {
  const cols = process.stdout.columns ?? 80
  const rows = process.stdout.rows ?? 24
  process.stdout.write("\x1b[2J\x1b[H")
  process.stdout.write(bgSeq)
  for (let i = 0; i < rows; i++) process.stdout.write(" ".repeat(cols))
  process.stdout.write("\x1b[H")
  for (const line of lines) process.stdout.write(line + "\n")
}

// Cycle: red → green → blue → red, N steps
function* rgbFrames(steps: number): Generator<[number, number, number]> {
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    // smooth hue rotation through R→G→B→R
    const r = Math.round(Math.max(0, Math.sin(t * Math.PI * 2) * 127 + 128))
    const g = Math.round(Math.max(0, Math.sin((t - 1 / 3) * Math.PI * 2) * 127 + 128))
    const b = Math.round(Math.max(0, Math.sin((t - 2 / 3) * Math.PI * 2) * 127 + 128))
    yield [r, g, b]
  }
}

const STEPS = 60
const FRAME_MS = 50 // ~20fps

async function runPhase(
  label: string,
  sublabel: string,
  withOsc11: boolean,
): Promise<void> {
  for (const [r, g, b] of rgbFrames(STEPS)) {
    if (withOsc11) process.stdout.write(osc11(r / 255, g / 255, b / 255))
    fillScreen(ansiBg(r, g, b), [
      label,
      "",
      sublabel,
      withOsc11
        ? "OSC 11 emitted each frame — gutter follows."
        : "No OSC 11 — gutter stays at terminal default.",
      "",
      `Current color: rgb(${r}, ${g}, ${b})`,
    ])
    await sleep(FRAME_MS)
  }
}

async function run() {
  // ── BEFORE ────────────────────────────────────────────────────────────────
  await runPhase("BEFORE — no OSC 11", "Cells cycle RGB via ANSI bg. Gutter does not follow.", false)

  await sleep(500)

  // ── AFTER ─────────────────────────────────────────────────────────────────
  await runPhase("AFTER  — OSC 11 emitted", "Cells cycle RGB via ANSI bg. Gutter syncs each frame.", true)

  await sleep(500)

  // ── RESET ─────────────────────────────────────────────────────────────────
  process.stdout.write(RESET_BG)
  process.stdout.write(RESET_ANSI)
  process.stdout.write("\x1b[2J\x1b[H")
  process.stdout.write("RESET — OSC 111 emitted. Terminal background restored.\n\n")
  process.stdout.write("Done.\n")
}

run().catch(console.error)
