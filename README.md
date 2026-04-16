# opentui-osc11-repro

Minimal reproduction repo for [opentui](https://github.com/anomalyco/opentui) upstream issue:
**OSC 11/111 — terminal background color sync on theme change and restore on exit.**

Tracked in upstream PR: [anomalyco/opentui#951](https://github.com/anomalyco/opentui/pull/951)

## Problem

When a TUI app sets a background color via `renderer.setBackgroundColor()`, the terminal emulator's
own background color is not updated. This causes a mismatch: the rendered content has the correct
color but the terminal padding/margins around it stays at the default. On Windows Terminal
(maximized or snapped), there's a pixel gutter on the right and bottom edges where the character
grid doesn't divide evenly into the window — those pixels get painted with the terminal's default,
not the app's theme. On exit or suspend the terminal background is left tinted.

## Fix (upstream PR [#951](https://github.com/anomalyco/opentui/pull/951))

**`zig/ansi.zig`**
- `setTerminalBgColorOutput()` — emits OSC 11 (`\e]11;rgb:RR/GG/BB\e\`)

**`zig/renderer.zig`**
- `setBackgroundColor()` now emits OSC 11 after updating the buffer. Skips when alpha is 0
  (transparent, let the terminal keep its own default) and when `testing` is true.

**`zig/terminal.zig`**
- `resetState()` now emits OSC 111 after resetting the title. Fires on both `destroy()` and
  `suspend()` via `performShutdownSequence()`.

**`renderer.ts`**
- Exposes `resetTerminalBgColor()` as a public JS method for consumers that need explicit control
  (e.g. before sending `SIGTSTP`).

**`scripts/build.ts`** _(Windows build fix, bundled in same PR)_
- Passes `--cache-dir` pointing to `%USERPROFILE%\.zig-cache\opentui-core` on Windows. zig 0.15.x
  panics when the project and zig's global cache are on different drives — `std.fs.path.relative`
  returns an absolute path across drives, tripping an assertion in `Build/Step/Run.zig:662` inside
  the `uucode` dep's build-tables step. Forcing the cache onto the home drive keeps all paths on
  one drive and avoids the panic.

## Context

[anomalyco/opencode](https://github.com/anomalyco/opencode) worked around this at the app layer
([opencode#19386](https://github.com/anomalyco/opencode/pull/19386); tracking:
[#19383](https://github.com/anomalyco/opencode/issues/19383),
[#18055](https://github.com/anomalyco/opencode/issues/18055)). The maintainer flagged it as
something that should live in opentui instead.

Upstream opentui issue: [anomalyco/opentui#950](https://github.com/anomalyco/opentui/issues/950)

## Compatibility

OSC 11/111 supported by Windows Terminal, iTerm2, kitty, Alacritty, foot, and others. Terminals
that don't support it ignore it silently — no behavior change on unsupported terminals.

## Windows support

- **Windows Terminal (wt.exe)** — supports OSC 11/111. Detected via `WT_SESSION` env var.
- **conhost.exe (legacy cmd/powershell)** — ignores OSC 11/111 silently. No harm done.
- ConPTY passes OSC sequences to the host terminal, so WT handles them correctly.

## Setup

Requires [opentui](https://github.com/anomalyco/opentui) cloned as a sibling directory
(`../opentui`) with the OSC 11/111 fix applied
([PR #951](https://github.com/anomalyco/opentui/pull/951)). The repro links directly to
`../opentui/packages/core` via a `link:` dependency.

```bash
# From a shared parent directory:
git clone https://github.com/mynameistito/opentui  # fork with PR #951 fix
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
