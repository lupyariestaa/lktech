"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import {
  AdditiveBlending,
  Color,
  MathUtils,
  Vector2,
  type Group,
  type IUniform,
  type LineBasicMaterial,
  type ShaderMaterial,
} from "three";
import type { MotionValue } from "framer-motion";

/**
 * F7.1 — Scene 3D/WebGL "digital core" hero (tablet ke atas). Versi "hidup".
 *
 * Prinsip (blueprint F5):
 * - **Lazy + client-only**: di-`dynamic import` (`ssr: false`) dari `hero.tsx` —
 *   `three` hanya diunduh di layar besar, tidak membebani bundel/SSR awal.
 * - **Gated**: hanya saat `≥768px` **dan** bukan `prefers-reduced-motion`
 *   (pengecekan di pemanggil). Mobile: hero teks + fallback CSS.
 * - **Hemat GPU**: `dpr [1,1.5]`; loop render berhenti (`frameloop: "never"`)
 *   saat hero keluar viewport.
 * - **Dekoratif**: `aria-hidden`; draggable (mouse) untuk "memutar" inti.
 *
 * Interaksi (F7.1):
 * - **Pointer** — inti miring + kamera parallax mengikuti kursor; kursor jadi
 *   "lampu" yang menerangi partikel terdekat (`uPointer`), tanpa re-render React.
 * - **Scroll** — saat hero di-scroll, inti menjauh/mengecil/memutar, halo memuai
 *   & memudar (`uScroll`).
 * - **Drag-to-spin** — tahan & seret (mouse) untuk memutar inti, lalu inersia.
 * - **Entrance** — inti tumbuh & partikel mengumpul dari luar (`uIntro`).
 *
 * Visual: inti (GLSL noise displacement + fresnel rim), halo ~900 partikel,
 * konstelasi garis, 2 cincin orbit, satelit, starfield; **bloom** sinematik via
 * `@react-three/postprocessing`.
 *
 * F7.2 — bebas "terpotong": skala komposisi di-fit ke frame (`COMPOSITION_HALF`),
 * halo di-bias ke dalam, cincin/satelit ditarik ke dalam, dan tepi di-soft-fade
 * 2 lapis (radial fade per-partikel di shader + `mask-image` di wrapper canvas).
 *
 * F7.6 — hemat & mulus saat pemuatan (hasil audit):
 * - **Digate intro**: canvas baru di-mount setelah intro loader selesai
 *   (`mountScene` di `hero.tsx`), jadi tidak ada konteks WebGL / kompilasi
 *   shader / frame pertama yang berebut main thread dengan animasi pembuka.
 * - **Probe WebGL** melepas konteksnya (`WEBGL_lose_context`) — sebelumnya satu
 *   konteks GPU dibiarkan hidup sia-sia.
 * - **Kemunculan beranimasi** (F7.8): kanvas memudar + membesar masuk begitu
 *   frame pertamanya tergambar (`onReady` → `painted`). Sebelum itu panggung
 *   sengaja **kosong** — `hero.tsx` tidak lagi menaruh bola CSS di panggungnya.
 * - `antialias: false`: MSAA scene sudah dikerjakan EffectComposer
 *   (`multisampling`), jadi MSAA di kanvas hanya pemborosan fill-rate.
 * - Bola inti 64² (dari 96²): vertex shader-nya yang paling berat (2× simplex
 *   noise per vertex) → segmen turun ~55% tanpa perubahan visual terlihat.
 * - Entrance (F7.6b, disesuaikan F7.8): inti tampil langsung seukuran penuh
 *   (tanpa skala awal 0,62) dan detail hidupnya berbunga lewat jendela
 *   `lateAt`. F7.8: jendela itu justru *terlihat* (dulu tersembunyi di balik
 *   cross-fade) — fade-in ±0,9 s sementara permukaan mulai bergelombang,
 *   partikel mengumpul, cincin & satelit memuai.
 *
 * F7.7 — **frame beku** sampai scene ditampilkan (`play`):
 * - Masalah terukur: render pertama scene ini (kompilasi shader + alokasi render
 *   target bloom) memblokir main thread berdetik-detik. Jam three.js — yang
 *   dipakai semua timeline entrance lewat `state.clock.elapsedTime` — sudah
 *   berjalan sejak mount, jadi frame pertama yang **benar-benar tampil** sudah
 *   di `t ≈ 4 s`: bola sudah "hidup" (bergelombang, berpartikel) padahal yang
 *   dilihat mata masih kondisi tenang → terbaca sebagai **dua elemen 3D
 *   berbeda**.
 * - Solusinya bukan menambah delay `lateAt`, tapi **membekukan waktunya**:
 *   selama `!play` kanvas memakai `frameloop="never"` dan digambar manual satu
 *   frame per rAF dengan `advance(0)`. Di mode `never`, R3F memaksa
 *   `delta = timestamp − elapsedTime` dan `elapsedTime = timestamp` (lihat
 *   `update()` @react-three/fiber) → `advance(0)` membuat semua `useFrame`
 *   membaca `t = 0` **dan** `delta = 0`.
 * - F7.8: `play` kini menyala tepat saat 3D mulai tampil (`sceneReady` dari
 *   `hero.tsx`), bukan setelah cross-fade tuntas. Saat itu `frameloop` jadi
 *   `"always"` → R3F me-reset jam (`stop()` → `elapsedTime = 0` → `start()`)
 *   → timeline entrance mulai dari nol **persis di frame pertama yang dilihat
 *   mata**, jadi tidak ada jendela "sudah hidup" yang terlewat.
 */

/* ------------------------------------------------------------------ */
/* GLSL — 3D simplex noise (Ashima Arts / Stefan Gustavson, public domain) */
/* ------------------------------------------------------------------ */
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const CORE_VERT = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uIntro;
varying float vDisp;
varying vec3 vNormal;
varying vec3 vViewDir;

${NOISE_GLSL}

void main() {
  vec3 p = position;
  // Dua lapis noise → gelombang organik (bergerak perlahan seiring waktu).
  float n1 = snoise(p * 1.5 + vec3(0.0, uTime * 0.18, 0.0));
  float n2 = snoise(p * 3.1 + vec3(uTime * 0.12, 0.0, 0.0));
  // Permukaan mulai halus lalu "bergelombang" saat intro selesai.
  float disp = (n1 * 0.19 + n2 * 0.06) * uIntro;
  p += normalize(position) * disp * uAmp;

  vDisp = disp;
  vNormal = normalize(normalMatrix * normalize(p));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const CORE_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uIntro;
varying float vDisp;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  // Fresnel rim: makin miring dari kamera makin terang (kesan "glow" tepi).
  float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0), 2.2);
  // Gradasi berdasar besar displacement (puncak gelombang lebih terang).
  float t = clamp(vDisp * 2.2 + 0.5, 0.0, 1.0);
  vec3 col = mix(uColorA, uColorB, t);
  col = mix(col, uColorC, fres);
  // Rim di-boost saat intro → "menyala" lalu stabil.
  col += vec3(0.35, 0.5, 0.9) * fres * (1.0 - uIntro) * 0.8;
  gl_FragColor = vec4(col, 1.0);
}
`;

const HALO_VERT = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uIntro;
uniform float uScroll;
uniform vec2 uPointer;
attribute float aScale;
varying float vAlpha;
varying float vGlow;

void main() {
  vec3 p = position;
  // Entrance: partikel mengumpul dari luar (2.2x) ke posisi aslinya.
  p *= mix(2.2, 1.0, uIntro);
  // Scroll: halo memuai perlahan saat hero ditinggalkan.
  p *= 1.0 + uScroll * 0.7;

  // Rotasi lambat mengelilingi sumbu Y + "napas" halus.
  float a = uTime * 0.06;
  float c = cos(a);
  float s = sin(a);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p *= 1.0 + sin(uTime * 0.7 + p.y * 1.5) * 0.03;

  // Kursor sebagai "lampu": partikel di dekatnya menyala & membesar.
  float ld = distance(p.xy, uPointer * 3.2);
  vGlow = smoothstep(2.6, 0.0, ld);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * uPixelRatio * (1.0 + vGlow * 1.5) * (1.0 / max(-mv.z, 0.001));

  // Soft-fade radial (NDC): partikel memudar sebelum menyentuh tepi frame →
  // tidak ada potongan kotak yang terlihat di batas kanvas.
  vec2 ndc = gl_Position.xy / max(gl_Position.w, 0.001);
  float edge = smoothstep(1.0, 0.62, length(ndc));
  vAlpha = clamp(aScale, 0.15, 1.0) * uIntro * (1.0 - uScroll * 0.6) * edge;
}
`;

const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vGlow;

void main() {
  // Titik bundar lembut (buang sudut kotak).
  vec2 d = gl_PointCoord - 0.5;
  float alpha = smoothstep(0.5, 0.05, length(d)) * vAlpha;
  if (alpha < 0.01) discard;
  // Di dekat kursor partikel memutih (kesan "tersinari").
  vec3 col = mix(uColor, vec3(1.0), vGlow * 0.7);
  gl_FragColor = vec4(col, alpha);
}
`;

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

/**
 * PRNG deterministik (mulberry32) — agar sebaran tetap (tidak `Math.random`
 * yang impure & memicu aturan react-hooks/purity).
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/**
 * Progres "entrance" (0→1) yang **tertunda**: mulai `delay` detik, tuntas
 * `delay + dur` detik setelah scene "bangun".
 *
 * Yang jadi acuan bukan jam sejak mount, melainkan jam yang mulai berjalan saat
 * `play` (F7.8: tepat ketika 3D mulai tampil — lihat `FrozenFrame`): selama
 * beku `t` tetap 0, jadi tak ada jendela entrance yang "terlewat" di balik
 * layar. `delay` di sini hanya memberi jeda kecil *setelah* kemunculan sebelum
 * scene "berbunga": permukaan menggelombang, warna termottling, halo mengumpul
 * dari luar, konstelasi & satelit menyala.
 */
const lateAt = (t: number, delay: number, dur: number) =>
  easeOutCubic(clamp01((t - delay) / dur));

/**
 * Jari-jari grup yang dipetakan tepat ke tepi frame (separuh sisi terpendek).
 * Elemen dengan radius ≤ ini pasti terlihat; yang lebih besar jatuh di luar
 * kanvas → dijaga seminimal mungkin & sisanya di-soft-fade mask di `Hero3D`,
 * supaya tidak ada potongan kotak yang terlihat.
 */
const COMPOSITION_HALF = 2.6;

/** Soft-fade tepi: buramkan sisa partikel terluar tepat sebelum batas kanvas. */
const EDGE_MASK =
  "radial-gradient(closest-side, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)";

/** Props interaksi yang dibagi ke sub-scene (motion value dari hero). */
type Interaction = {
  /** Progres scroll hero 0→1. */
  scroll: MotionValue<number>;
  /** Kursor ternormalisasi (−1…1) pada viewport. */
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
};

/* ------------------------------------------------------------------ */
/* Sub-scene                                                           */
/* ------------------------------------------------------------------ */

/** Inti: bola dengan shader displacement + gradasi + fresnel rim. */
function Core() {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo<Record<string, IUniform>>(
    () => ({
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uAmp: { value: 1 },
      uColorA: { value: new Color("#0a1a4d") },
      uColorB: { value: new Color("#2a6bff") },
      uColorC: { value: new Color("#a8c8ff") },
    }),
    [],
  );

  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    m.uniforms.uTime.value = t;
    // Jeda kecil lalu gelombang (0,25 → 2,25 s setelah scene "bangun"):
    // permukaan masih mulus & warna rata saat handoff (persis `CoreFallback`),
    // baru sesudahnya menggelombang + termottling — displacement & gradasi
    // dua-duanya dikendalikan `uIntro`.
    m.uniforms.uIntro.value = lateAt(t, 0.25, 2.0);
  });

  return (
    <mesh>
      {/* 64² sudah cukup: displacement-nya low-frequency & normal dihitung
          analitis (bukan dari faset), jadi silhouette tetap halus sementara
          beban vertex shader (noise) turun ~55%. */}
      <sphereGeometry args={[1.3, 64, 64]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={CORE_VERT}
        fragmentShader={CORE_FRAG}
      />
    </mesh>
  );
}

/** Halo partikel (titik) yang berputar perlahan di sekitar core. */
function Halo({ interaction, count = 900 }: { interaction: Interaction; count?: number }) {
  const mat = useRef<ShaderMaterial>(null);

  const { positions, scales } = useMemo(() => {
    const rand = mulberry32(1337);
    const pos = new Float32Array(count * 3);
    const scl = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Sebar di "cangkang" bola (radius 1.5–3.0) dengan bias agak KE DALAM.
      // Bias ini penting: kalau padat di radius terluar, silhouette partikel
      // jatuh persis di tepi frame & tampak "terpotong" kotak. Sisanya (partikel
      // terluar) di-soft-fade oleh `uAlpha` di shader + mask tepi di `Hero3D`.
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = 1.5 + Math.pow(rand(), 1.25) * 1.5;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      scl[i] = 0.25 + rand() * 0.75;
    }
    return { positions: pos, scales: scl };
  }, [count]);

  const uniforms = useMemo<Record<string, IUniform>>(
    () => ({
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uScroll: { value: 0 },
      uPointer: { value: new Vector2(0, 0) },
      uSize: { value: 24 },
      uPixelRatio: { value: 1.5 },
      uColor: { value: new Color("#8fb6ff") },
    }),
    [],
  );

  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    m.uniforms.uTime.value = t;
    // Halo baru mengumpul (2,2× → 1×) & memudar masuk setelah handoff;
    // `vAlpha` di shader dikali `uIntro`, jadi selama beku nilainya masih 0.
    m.uniforms.uIntro.value = lateAt(t, 0.15, 1.6);
    m.uniforms.uScroll.value = clamp01(interaction.scroll.get());
    m.uniforms.uPointer.value.set(
      interaction.pointer.x.get(),
      interaction.pointer.y.get(),
    );
    m.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={HALO_VERT}
        fragmentShader={HALO_FRAG}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

/**
 * Konstelasi: garis tipis antar partikel terdekat (jejak "jaringan").
 * Geometri dihitung sekali (`useMemo`) → satu draw call, murah.
 */
function Constellation({ count = 46 }: { count?: number }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(90210);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      // Bias ke dalam, sejajar halo (jaga agar tepi tetap di dalam frame).
      const r = 1.55 + Math.pow(rand(), 1.2) * 1.0;
      pts.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      ]);
    }
    const verts: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0];
        const dy = pts[i][1] - pts[j][1];
        const dz = pts[i][2] - pts[j][2];
        if (dx * dx + dy * dy + dz * dz < 1.15) {
          verts.push(...pts[i], ...pts[j]);
        }
      }
    }
    return new Float32Array(verts);
  }, [count]);

  const group = useRef<Group>(null);
  const line = useRef<LineBasicMaterial>(null);
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y += delta * 0.05;
    g.scale.setScalar(0.8 + lateAt(t, 0.15, 1.5) * 0.2);
    // Jejaring ini tak ada di `CoreFallback` → menyala belakangan, bukan
    // mendadak di frame pertama.
    if (line.current) line.current.opacity = 0.14 * lateAt(t, 0.25, 1.4);
  });

  return (
    <group ref={group}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={line}
          color="#6f9bff"
          transparent
          opacity={0.14}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

/** Dua cincin tipis miring yang mengorbit. */
function Rings() {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.z += delta * 0.06;
    g.rotation.y += delta * 0.04;
    // Skala awal 0,8× = persis yang digambar `CoreFallback`, lalu memuai ke 1×.
    g.scale.setScalar(0.8 + lateAt(state.clock.elapsedTime, 0.15, 1.5) * 0.2);
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2.3, 0, 0.3]}>
        <torusGeometry args={[1.9, 0.012, 8, 160]} />
        <meshBasicMaterial color="#4d82ec" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 1.9, 0.5, 0]}>
        <torusGeometry args={[2.15, 0.008, 8, 160]} />
        <meshBasicMaterial color="#7aa2ff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/** 2 satelit kecil yang mengorbit inti (induk berputar perlahan). */
function Satellites() {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y -= delta * 0.35;
    // Satelit tak ada di `CoreFallback` → muncul setelah handoff lewat.
    g.scale.setScalar(lateAt(state.clock.elapsedTime, 0.4, 1.6));
  });
  return (
    <group ref={group}>
      <mesh position={[2.0, 0.45, 0]} scale={0.09}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#cfe0ff" />
      </mesh>
      <mesh position={[-1.85, -0.6, 0.5]} scale={0.06}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#9db8ff" />
      </mesh>
    </group>
  );
}

/** Starfield kedalaman di belakang (tidak ikut skala/mundur grup inti). */
function Stars({ count = 480 }: { count?: number }) {
  const group = useRef<Group>(null);

  const positions = useMemo(() => {
    const rand = mulberry32(4242);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = 6 + rand() * 8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    const g = group.current;
    if (g) g.rotation.y += delta * 0.01;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#9db8ff"
          size={0.045}
          sizeAttenuation
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Stage — pointer/scroll/drag + entrance                              */
/* ------------------------------------------------------------------ */
function Stage({ interaction }: { interaction: Interaction }) {
  const group = useRef<Group>(null);
  const spin = useRef(0);
  const { viewport, gl } = useThree();

  // Status drag (ref → tanpa re-render React saat bergerak).
  const drag = useRef({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rx: 0,
    ry: 0,
  });

  // Drag-to-spin (mouse saja, agar tidak bentrok dengan scroll sentuh).
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const d = drag.current;
      d.active = true;
      d.x = e.clientX;
      d.y = e.clientY;
      d.vx = 0;
      d.vy = 0;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* abaikan */
      }
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      d.ry += dx * 0.006;
      d.rx += dy * 0.006;
      d.vx = dx * 0.006;
      d.vy = dy * 0.006;
    };
    const up = (e: PointerEvent) => {
      const d = drag.current;
      d.active = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* abaikan */
      }
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const s = clamp01(interaction.scroll.get());
    const px = interaction.pointer.x.get();
    const py = interaction.pointer.y.get();

    const d = drag.current;
    if (!d.active) {
      // Inersia setelah dilepas + auto-spin (makin cepat saat di-scroll).
      d.ry += d.vx;
      d.rx += d.vy;
      d.vx *= 0.93;
      d.vy *= 0.93;
      d.rx *= 0.98;
      spin.current += dt * (0.14 + s * 0.5);
    }
    d.rx = MathUtils.clamp(d.rx, -1.0, 1.0);

    const g = group.current;
    if (g) {
      // Skala komposisi berbasis frame (bukan angka tetap): jari-jari grup
      // `COMPOSITION_HALF` dipetakan tepat ke separuh sisi terpendek frame.
      // → inti (r 1.3) selalu ≈50% tinggi frame, di layar mana pun; cincin &
      // satelit tetap di dalam batas (tepi terluar halo di-soft-fade mask).
      const half = Math.min(viewport.width, viewport.height) * 0.5;
      const base = half / COMPOSITION_HALF;
      // Tanpa skala entrance (F7.6b): grup sudah seukuran penuh sejak frame
      // pertama — persis `CoreFallback` yang baru memudar, jadi ukurannya tidak
      // pernah "melompat" dan tak terbaca sebagai elemen lain. Yang "tumbuh"
      // setelah fade hanyalah detail hidupnya (`lateAt` di tiap sub-scene).
      const scale = base * (1 - s * 0.32);
      g.scale.setScalar(scale);
      g.rotation.y = spin.current + d.ry + px * 0.5;
      g.rotation.x = d.rx * 0.6 - py * 0.35;
      g.position.y = Math.sin(t * 0.5) * 0.12;
      g.position.z = -s * 2.2;
    }

    // Parallax kamera halus (kedalaman).
    const cam = state.camera;
    cam.position.x += (px * 0.6 - cam.position.x) * 0.05;
    cam.position.y += (-py * 0.6 - cam.position.y) * 0.05;
    cam.lookAt(0, 0, 0);
  });

  return (
    <>
      <Stars />
      <group ref={group}>
        <Core />
        <Halo interaction={interaction} />
        <Constellation />
        <Rings />
        <Satellites />
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas + gate                                                       */
/* ------------------------------------------------------------------ */

/**
 * Deteksi WebGL sekali (tanpa `three`), lalu **lepaskan konteks probe**:
 * browser membatasi jumlah konteks WebGL hidup per halaman (±16), dan konteks
 * probe yang dibiarkan hidup ikut memakan memori GPU sepanjang umur halaman.
 */
function probeWebgl() {
  if (typeof window === "undefined" || !window.WebGLRenderingContext) return false;
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!ctx) return false;
    ctx.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Lapor **sekali** saat frame pertama benar-benar tergambar di kanvas. */
function FirstFrame({ onFirstFrame }: { onFirstFrame: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onFirstFrame();
  });
  return null;
}

/**
 * **Frame beku** (F7.7) — inti perbaikan "dua elemen 3D berbeda".
 *
 * Selama `!play` kanvas ber-`frameloop="never"` dan digambar manual di sini:
 * satu frame per rAF lewat `advance(0)`. Kenapa `0`? Di mode `never`, `update()`
 * R3F membuang `getDelta()` dan memakai `delta = timestamp − elapsedTime` +
 * `elapsedTime = timestamp` (lihat `update()` @react-three/fiber) — dengan
 * `advance(0)` semua `useFrame` menerima `t = 0` **dan** `delta = 0`.
 *
 * Akibatnya gambar yang tampil sampai scene ditampilkan selalu persis kondisi
 * frame-0: bola mulus tanpa gelombang, warna rata tanpa mottling, cincin pada
 * skala 0,8×, tanpa partikel/konstelasi/satelit, tanpa rotasi maupun inersia —
 * sekalipun render pertama memblokir main thread berdetik-detik (jam three.js
 * tidak lagi "mencuri" waktu di belakang layar).
 *
 * Loop hanya hidup sampai frame pertama selesai digambar (praktis 1–2 frame:
 * `play` menyala begitu `onReady` terpanggil) atau saat hero keluar viewport.
 */
function FrozenFrame({ active, play }: { active: boolean; play: boolean }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    if (!active || play) return;
    let raf = 0;
    const tick = () => {
      advance(0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, play, advance]);
  return null;
}

export default function Hero3D({
  interaction,
  onReady,
  play = false,
}: {
  interaction: Interaction;
  /** Dipanggil sekali saat canvas sudah menggambar frame pertamanya. */
  onReady?: () => void;
  /**
   * Scene boleh "bangun" (F7.8: dipasang tepat saat kemunculannya mulai
   * dianimasikan — `hero.tsx` mengirim `sceneReady`). Selama `false` kanvas
   * menggambar kondisi frame-0 yang beku (`FrozenFrame`); saat `true`, jam R3F
   * di-reset → entrance mulai dari nol di momen yang sama dengan fade-in-nya.
   */
  play?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  // Belum tergambar → wrapper transparan + sedikit mengecil; `onReady`
  // menyalakannya (fade + membesar, F7.8). Frame pertama scene ini juga yang
  // paling mahal (kompilasi shader + alokasi render target bloom), jadi lebih
  // baik tidak terlihat "muncul setengah jadi".
  const [painted, setPainted] = useState(false);
  // Guard: bila WebGL tidak tersedia (browser/perangkat lama, GPU diblokir),
  // jangan render `<Canvas>` sama sekali — fallback CSS hero tetap tampil.
  const [webgl] = useState(probeWebgl);
  const handleFirstFrame = useCallback(() => {
    setPainted(true);
    onReady?.();
  }, [onReady]);

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
      className={
        // F7.8: kemunculan scene = fade + sedikit membesar (±0,9 s). Sebelum
        // siap panggung memang kosong (bukan diisi bola CSS), jadi animasi masuk
        // inilah yang membuat 3D terasa "datang", bukan "sudah ada".
        "absolute inset-0 z-0 transition-[opacity,scale] duration-[900ms] ease-out " +
        (painted ? "scale-100 opacity-100" : "scale-[0.94] opacity-0")
      }
      style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
    >
      <Canvas
        dpr={[1, 1.5]}
        // F7.8: scene "hidup" begitu kemunculannya dimulai (`play`). Sebelum itu
        // `never` + `FrozenFrame` → frame beku kondisi frame-0, jam tidak jalan.
        // Saat `play` menyala, R3F me-reset jam ketika `frameloop` berubah →
        // entrance mulai dari nol tepat di momen 3D mulai tampil.
        frameloop={active && play ? "always" : "never"}
        camera={{ position: [0, 0, 6], fov: 45 }}
        // `antialias: false` — scene dirender ke FBO EffectComposer yang sudah
        // punya MSAA sendiri (`multisampling`), jadi MSAA kanvas hanya menambah
        // memori + satu resolve pass tanpa menambah kehalusan.
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <FrozenFrame active={active} play={play} />
        <Stage interaction={interaction} />
        <FirstFrame onFirstFrame={handleFirstFrame} />
        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.7}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}