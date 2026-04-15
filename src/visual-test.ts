/**
 * Visual before/after test for OSC 11/111 terminal background sync.
 *
 * Run in Windows Terminal (or any OSC 11-supporting terminal).
 * Maximize or snap the window first to make the pixel gutter visible.
 *
 * Sequence:
 *   1. RED background   — simulates "wrong" terminal default vs app theme
 *   2. NAVY background  — OSC 11 syncs terminal to match theme (#21232e)
 *   3. DEFAULT restored — OSC 111 resets on exit
 *
 * Usage:
 *   bun run visual-test
 */

const RESET = "\x1b]111\x07"
const CLEAR = "\x1b[2J\x1b[H"

function osc11(r: number, g: number, b: number): string {
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0")
  return `\x1b]11;rgb:${hex(r)}/${hex(g)}/${hex(b)}\x07`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  // ── BEFORE: red background ───────────────────────────────────────────────
  // Simulates a terminal whose default background differs from the app theme.
  // The gutter would bleed this color if OSC 11 isn't emitted.
  process.stdout.write(osc11(0.6, 0.1, 0.1)) // deep red
  process.stdout.write(CLEAR)
  process.stdout.write("BEFORE — terminal background: RED (#991a1a)\n")
  process.stdout.write("This is what the pixel gutter shows without OSC 11.\n")
  process.stdout.write("Look at the right/bottom edges — they bleed this color.\n\n")
  process.stdout.write("Switching to theme color in 3 seconds...\n")
  await sleep(3000)

  // ── AFTER: navy background ────────────────────────────────────────────────
  // OSC 11 syncs the terminal background to the app theme. Gutter matches.
  process.stdout.write(osc11(0x21 / 255, 0x23 / 255, 0x2e / 255)) // #21232e dark navy
  process.stdout.write(CLEAR)
  process.stdout.write("AFTER — terminal background: NAVY (#21232e)\n")
  process.stdout.write("OSC 11 emitted by setBackgroundColor().\n")
  process.stdout.write("Gutter now matches the theme — no visible seam.\n\n")
  process.stdout.write("Resetting to terminal default in 3 seconds...\n")
  await sleep(3000)

  // ── RESET: OSC 111 ────────────────────────────────────────────────────────
  process.stdout.write(RESET)
  process.stdout.write(CLEAR)
  process.stdout.write("RESET — OSC 111 emitted.\n")
  process.stdout.write("Terminal background restored to its original default.\n")
  process.stdout.write("This fires automatically on destroy() and suspend() with the fix.\n\n")
  process.stdout.write("Done.\n")
}

run().catch(console.error)
