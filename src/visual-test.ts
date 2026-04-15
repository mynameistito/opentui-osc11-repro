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

// Pick black or white fg based on luminance so text is always readable
function contrastFg(r: number, g: number, b: number): string {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b
  return luma > 140 ? "\x1b[30;1m" : "\x1b[97;1m" // bold black or bold white
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fillScreen(r: number, g: number, b: number, withOsc11: boolean, frame: number, total: number): void {
  const cols = process.stdout.columns ?? 80
  const rows = process.stdout.rows ?? 24
  const fg = contrastFg(r, g, b)
  const bg = ansiBg(r, g, b)

  const lines = [
    "",
    withOsc11 ? "  AFTER  — OSC 11 emitted each frame" : "  BEFORE — no OSC 11",
    "",
    withOsc11
      ? "  Gutter syncs to each color  (no seam)"
      : "  Gutter stays at terminal default  (seam visible at edges)",
    "",
    `  Color : rgb(${String(r).padStart(3)}, ${String(g).padStart(3)}, ${String(b).padStart(3)})`,
    `  Frame : ${String(frame + 1).padStart(3)} / ${total}`,
  ]

  let out = "\x1b[H"
  for (let row = 0; row < rows; row++) {
    const line = lines[row] ?? ""
    // pad line to full width so bg floods the row, then overlay text
    out += bg + " ".repeat(cols) + `\x1b[${row + 1};1H` + bg + fg + line + RESET_ANSI
  }
  process.stdout.write(out)
}

// Smooth hue rotation R → G → B → R
function* rgbFrames(steps: number): Generator<[number, number, number]> {
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const r = Math.round(Math.max(0, Math.sin(t * Math.PI * 2) * 127 + 128))
    const g = Math.round(Math.max(0, Math.sin((t - 1 / 3) * Math.PI * 2) * 127 + 128))
    const b = Math.round(Math.max(0, Math.sin((t - 2 / 3) * Math.PI * 2) * 127 + 128))
    yield [r, g, b]
  }
}

const STEPS = 90   // one full RGB rotation
const FRAME_MS = 16 // ~60 fps

async function runPhase(withOsc11: boolean): Promise<void> {
  const frames = [...rgbFrames(STEPS)]
  for (let i = 0; i < frames.length; i++) {
    const [r, g, b] = frames[i]
    if (withOsc11) process.stdout.write(osc11(r / 255, g / 255, b / 255))
    fillScreen(r, g, b, withOsc11, i, STEPS)
    await sleep(FRAME_MS)
  }
}

async function run() {
  process.stdout.write("\x1b[?25l") // hide cursor
  process.stdout.write("\x1b[2J\x1b[H")

  await runPhase(false)
  await sleep(600)
  await runPhase(true)
  await sleep(600)

  // reset
  process.stdout.write(RESET_BG)
  process.stdout.write(RESET_ANSI)
  process.stdout.write("\x1b[?25h") // show cursor
  process.stdout.write("\x1b[2J\x1b[H")
  process.stdout.write("RESET — OSC 111 emitted. Terminal background restored.\n\nDone.\n")
}

run().catch(console.error)
