"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

/**
 * F5 — Scene 3D/WebGL ringan untuk hero (tablet ke atas).
 *
 * Prinsip (lihat blueprint F5):
 * - **Lazy + client-only**: komponen ini di-`dynamic import` dengan `ssr: false`
 *   dari `hero.tsx`, jadi `three` (~150KB gz) hanya diunduh di layar besar &
 *   setelah mount — tidak membebani bundel awal / SSR.
 * - **Gated**: hanya dirender saat `≥768px` **dan** bukan `prefers-reduced-motion`
 *   (pengecekan ada di pemanggil). Mobile/reduced-motion tetap memakai mockup CSS.
 * - **Hemat GPU**: `dpr` dibatasi `[1, 1.5]`; loop render **berhenti** (`frameloop:
 *   "never"`) saat hero keluar dari viewport (IntersectionObserver).
 * - **Dekoratif & tidak menghalangi**: `aria-hidden`, `pointer-events: none`, dan
 *   konten hero tetap di atasnya (`z-10`).
 *
 * Hanya geometri dasar (tanpa `drei`) agar dependensi tetap ramping.
 */

const SATELLITES: {
  position: [number, number, number];
  size: number;
  color: string;
}[] = [
  { position: [1.25, 0.85, 0.35], size: 0.1, color: "#4d82ec" },
  { position: [-1.15, -0.6, 0.5], size: 0.13, color: "#004edf" },
  { position: [0.8, -1.1, -0.25], size: 0.08, color: "#0a0f1e" },
  { position: [-1.0, 0.95, -0.35], size: 0.07, color: "#4d82ec" },
];

/** Objek utama: ikosahedron faset + lapisan wireframe + cincin + satelit. */
function Artifact() {
  const group = useRef<Group>(null);
  const { viewport } = useThree();

  // Posisi & skala adaptif. Di layar lebar (desktop, hero 2 kolom) objek di
  // sudut kanan-atas — area kosong di samping teks. Di tablet portrait (hero
  // 1 kolom) objek digeser ke sudut kanan-atas & dikecilkan agar tidak menimpa
  // teks (teks menempati kolom penuh di layar sempit).
  const portrait = viewport.width < viewport.height;
  const x = viewport.width * (portrait ? 0.46 : 0.42);
  const baseY = viewport.height * (portrait ? 0.36 : 0.26);
  const scale = portrait ? 0.56 : 0.92;

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    // Rotasi & "napas" halus — hanya transform, murah.
    g.rotation.y += delta * 0.16;
    g.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.14;
    g.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.55) * 0.12;
  });

  return (
    <group ref={group} position={[x, baseY, 0]} scale={scale}>
      {/* Inti */}
      <mesh>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial
          color="#0b4fd6"
          metalness={0.4}
          roughness={0.3}
          flatShading
        />
      </mesh>

      {/* Cangkang wireframe */}
      <mesh scale={1.32}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial
          color="#7aa2ff"
          wireframe
          transparent
          opacity={0.16}
        />
      </mesh>

      {/* Cincin tipis miring (aksen premium) */}
      <mesh rotation={[Math.PI / 2.4, 0, Math.PI / 6]}>
        <torusGeometry args={[1.55, 0.012, 8, 96]} />
        <meshBasicMaterial color="#4d82ec" transparent opacity={0.5} />
      </mesh>

      {/* Satelit kecil mengorbit bersama grup */}
      {SATELLITES.map((s, i) => (
        <mesh key={i} position={s.position}>
          <sphereGeometry args={[s.size, 20, 20]} />
          <meshStandardMaterial
            color={s.color}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Hero3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  // Guard: bila WebGL tidak tersedia (browser/perangkat lama, GPU diblokir),
  // jangan render `<Canvas>` sama sekali — mockup CSS hero tetap tampil sebagai
  // fallback. Dicek sekali (lazy, di klien).
  const [webgl] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const c = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl"))
      );
    } catch {
      return false;
    }
  });

  // Hentikan loop render saat hero tidak terlihat (hemat baterai/GPU).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setActive(entries.some((e) => e.isIntersecting)),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!webgl) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4, 5]} intensity={2.4} />
        <directionalLight
          position={[-4, -2, -3]}
          intensity={0.9}
          color="#4d82ec"
        />
        <Artifact />
      </Canvas>
    </div>
  );
}
