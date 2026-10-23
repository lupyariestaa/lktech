/**
 * Membersihkan emulator Firebase yang tertinggal di Windows.
 *
 * `firebase emulators:exec` kadang tidak mematikan proses Java Firestore saat
 * command selesai (khususnya di Windows), sehingga run berikutnya gagal dengan
 * "port taken". Script ini hanya mematikan proses yang jelas milik emulator
 * Firebase, bukan proses lain yang kebetulan memakai port tersebut.
 *
 * Dipakai otomatis lewat npm lifecycle `pretest:e2e:auth`.
 */

import { execFileSync } from "node:child_process";

const PORTS = [8080, 9099, 9150];
const MARKERS = [
  "cloud-firestore-emulator",
  "firebase-tools",
  "firebase emulators",
  "auth-emulator",
];

function commandLine(pid) {
  try {
    if (process.platform === "win32") {
      return execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
        ],
        { encoding: "utf8" },
      ).trim();
    }
    return execFileSync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function isFirebaseEmulator(pid) {
  const line = commandLine(pid).toLowerCase();
  return MARKERS.some((marker) => line.includes(marker));
}

function listeningPidsWindows() {
  const out = execFileSync("netstat", ["-ano", "-p", "TCP"], {
    encoding: "utf8",
  });
  const pids = new Set();
  for (const raw of out.split(/\r?\n/)) {
    const cols = raw.trim().split(/\s+/);
    if (cols.length < 5 || cols[0] !== "TCP" || cols[3] !== "LISTENING") {
      continue;
    }
    const port = Number(cols[1].split(":").pop());
    if (PORTS.includes(port)) pids.add(cols[4]);
  }
  return [...pids];
}

function listeningPidsPosix() {
  const pids = new Set();
  for (const port of PORTS) {
    try {
      const out = execFileSync("lsof", ["-ti", `tcp:${port}`], {
        encoding: "utf8",
      });
      for (const pid of out.split(/\s+/)) {
        if (pid) pids.add(pid);
      }
    } catch {
      /* tidak ada listener */
    }
  }
  return [...pids];
}

function stop(pid) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    process.kill(Number(pid), "SIGKILL");
  }
}

const pids =
  process.platform === "win32" ? listeningPidsWindows() : listeningPidsPosix();

for (const pid of pids) {
  if (!isFirebaseEmulator(pid)) continue;
  try {
    stop(pid);
    console.log(`[cleanup-emulator] proses emulator ${pid} dihentikan.`);
  } catch (err) {
    console.warn(`[cleanup-emulator] gagal menghentikan ${pid}:`, err.message);
  }
}
