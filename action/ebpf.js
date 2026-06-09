// Legion Harden Runner — eBPF capture launcher (JS side).
//
// The eBPF program itself is a Rust/aya agent (`legionr-bpf`, see
// crates/legionr-bpf): a kprobe on tcp_connect/tcp_v6_connect that prints one
// "LEGIONC <ip> <port> <pid> <comm>" line per outbound connection — socket-layer
// capture that nss-resolve / systemd-resolved cannot bypass, with process
// attribution. This module only locates and parses that agent's output; the
// action spawns it privileged. Falls back to the ss//proc sampler when the
// agent or kernel BTF is unavailable, so there is never a regression.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

// Locate the Rust agent: explicit env, then PATH, then alongside the action.
function binPath() {
  if (process.env.LEGIONR_BPF && fs.existsSync(process.env.LEGIONR_BPF)) {
    return process.env.LEGIONR_BPF;
  }
  try {
    return execFileSync("sh", ["-c", "command -v legionr-bpf"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim() || null;
  } catch {
    const local = path.join(__dirname, "..", "bin", "legionr-bpf");
    return fs.existsSync(local) ? local : null;
  }
}

// Usable here? Needs the agent binary and kernel BTF (CO-RE).
function available() {
  return Boolean(binPath()) && fs.existsSync("/sys/kernel/btf/vmlinux");
}

// Parse one agent output line into { ip, port, pid, comm } or null.
function parseConnect(line) {
  if (!line || !line.startsWith("LEGIONC ")) return null;
  const p = line.trim().split(/\s+/);
  if (p.length < 5) return null;
  const ip = p[1];
  if (!ip || ip === "0.0.0.0" || ip === "::" || ip.startsWith("127.") || ip === "::1") return null;
  return { ip, port: p[2], pid: p[3], comm: p.slice(4).join(" ") };
}

module.exports = { binPath, available, parseConnect };
