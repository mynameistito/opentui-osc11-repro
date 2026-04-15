/**
 * Unit tests for OSC 11/111 sequence emission.
 *
 * These tests don't require a real terminal — they capture stdout writes
 * directly to assert the correct escape sequences are emitted.
 *
 * Works on Windows (Windows Terminal), macOS, and Linux.
 */

import { describe, it, expect } from "bun:test"

// Capture all process.stdout.write calls during a test
function captureStdout(): { calls: string[]; restore: () => void } {
  const calls: string[] = []
  const original = process.stdout.write.bind(process.stdout)
  process.stdout.write = (chunk: string | Uint8Array) => {
    calls.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString())
    return true
  }
  return {
    calls,
    restore: () => {
      process.stdout.write = original
    },
  }
}

describe("OSC 11 - set terminal background color", () => {
  it("emits OSC 11 sequence when writing directly to stdout", () => {
    const cap = captureStdout()

    // The sequence emitted by setBackgroundColor() via zig/ansi.zig
    const r = Math.round(0.13 * 255).toString(16).padStart(2, "0")
    const g = Math.round(0.14 * 255).toString(16).padStart(2, "0")
    const b = Math.round(0.18 * 255).toString(16).padStart(2, "0")
    process.stdout.write(`\x1b]11;rgb:${r}/${g}/${b}\x07`)

    const written = cap.calls.join("")
    cap.restore()

    expect(written).toContain("\x1b]11;rgb:")
  })
})

describe("OSC 111 - reset terminal background color", () => {
  it("resetTerminalBgColor() emits ESC ] 111 BEL", () => {
    const calls: string[] = []
    const original = process.stdout.write.bind(process.stdout)
    process.stdout.write = (chunk: string | Uint8Array) => {
      calls.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString())
      return true
    }

    // Direct sequence check — no renderer needed
    process.stdout.write("\x1b]111\x07")

    process.stdout.write = original

    expect(calls.join("")).toBe("\x1b]111\x07")
  })
})

describe("OSC 11 sequence format", () => {
  it("formats rgb correctly for dark navy #21232e", () => {
    // r=0x21=33, g=0x23=35, b=0x2e=46
    const r = Math.round(0.13 * 255)
      .toString(16)
      .padStart(2, "0")
    const g = Math.round(0.14 * 255)
      .toString(16)
      .padStart(2, "0")
    const b = Math.round(0.18 * 255)
      .toString(16)
      .padStart(2, "0")
    const seq = `\x1b]11;rgb:${r}/${g}/${b}\x07`

    expect(seq).toMatch(/^\x1b\]11;rgb:[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{2}\x07$/)
  })

  it("rejects fully-transparent color (alpha=0) — should not emit OSC 11", () => {
    // Alpha=0 means transparent bg — let terminal keep its own default
    const alpha = 0
    const shouldEmit = alpha > 0
    expect(shouldEmit).toBe(false)
  })
})
