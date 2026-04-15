# opentui-osc11-repro

Minimal reproduction repo for [opentui](https://github.com/anomalyco/opentui) upstream issue:
**OSC 11/111 — terminal background color sync on theme change and restore on exit.**

## Problem

When a TUI app sets a background color via `renderer.setBackgroundColor()`, the terminal emulator's
own background color is not updated. This causes a mismatch: the rendered content has the correct
color but the terminal padding/margins around it stays at the default. On exit or suspend the
terminal background is left tinted.

## Fix (upstream)

- `setBackgroundColor()` now emits **OSC 11** (`ESC ] 11 ; rgb:rr/gg/bb BEL`) to sync the terminal
  background with the renderer background.
- `performShutdownSequence()` (called on both `destroy()` and `suspend()`) now emits **OSC 111**
  (`ESC ] 111 BEL`) via `resetState()` to restore the terminal background to its default.
- A `renderer.resetTerminalBgColor()` JS method is also exposed for consumers that need explicit
  control (e.g. before sending `SIGTSTP`).

## Windows support

- **Windows Terminal (wt.exe)** — supports OSC 11/111. Detected via `WT_SESSION` env var.
- **conhost.exe (legacy cmd/powershell)** — ignores OSC 11/111 silently. No harm done.
- ConPTY passes OSC sequences to the host terminal, so WT handles them correctly.

## Setup

Requires [opentui](https://github.com/anomalyco/opentui) cloned as a sibling directory
(`../opentui`) with the OSC 11/111 fix applied. The repro links directly to
`../opentui/packages/core` via a `link:` dependency.

```bash
# From a shared parent directory:
git clone https://github.com/mynameistito/opentui https://github.com/anomalyco/opentui  # fork with fix
git clone https://github.com/mynameistito/opentui-osc11-repro
cd opentui && bun install && bun run build
cd ../opentui-osc11-repro && bun install
```

## Run

```bash
# Visual demo — run in Windows Terminal, iTerm2, Ghostty, etc.
bun run demo
bun run visual-test # RGB Demo

# Unit tests (no terminal required)
bun test
```

## Test output

```
✓ OSC 11 - set terminal background color > emits OSC 11 with correct hex values
✓ OSC 111 - reset terminal background color > resetTerminalBgColor() emits ESC ] 111 BEL
✓ OSC 11 sequence format > formats rgb correctly for dark navy #21232e
✓ OSC 11 sequence format > rejects fully-transparent color (alpha=0)
```
