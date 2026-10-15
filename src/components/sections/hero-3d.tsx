"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  type Group,
  type IUniform,
  type ShaderMaterial,
} from "three";

/**
 * F5 — Scene 3D/WebGL "digital core" untuk hero (tablet ke atas).
 *
 * Prinsip (lihat blueprint F5):
 * - **Lazy + client-only**: komponen ini di-`dynamic import` dengan `ssr: false`
 *   dari `hero.tsx`, jadi `three` hanya diunduh di layar besar & setelah mount —
 *   tidak membebani bundel awal / SSR.
 * - **Gated**: hanya dirender saat `≥768px` **dan** bukan `prefers-reduced-motion`
 *   (pengecekan ada di pemanggil). Mobile/reduced-motion tetap memakai mockup CSS.
 * - **Hemat GPU**: `dpr` dibatasi `[1, 1.5]`; loop render **berhenti** (`frameloop:
 *   "never"`) saat hero keluar dari viewport (IntersectionObserver).
 * - **Dekoratif & tidak menghalangi**: `aria-hidden`, `pointer-events: none`, dan
 *   konten hero tetap di atasnya (`z-10`).
 *
 * Visual (tanpa dependensi tambahan — tanpa `drei`/postprocessing):
 * - **Core**: bola dengan **custom GLSL shader** — permukaan bergelombang
 *   (simplex-noise displacement di vertex shader) + gradasi warna & **fresnel
 *   rim** di fragment shader.
 * - **Halo**: ~900 partikel (titik) di sekitar core, berputar perlahan.
 * - **Rings**: dua cincin tipis miring yang mengorbit.
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
varying float vDisp;
varying vec3 vNormal;
varying vec3 vViewDir;

${NOISE_GLSL}

void main() {
  vec3 p = position;
  // Dua lapis noise → gelombang organik (bergerak perlahan seiring waktu).
  float n1 = snoise(p * 1.5 + vec3(0.0, uTime * 0.18, 0.0));
  float n2 = snoise(p * 3.1 + vec3(uTime * 0.12, 0.0, 0.0));
  float disp = n1 * 0.16 + n2 * 0.05;
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
  gl_FragColor = vec4(col, 1.0);
}
`;

const HALO_VERT = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute float aScale;
varying float vAlpha;

void main() {
  vec3 p = position;
  // Rotasi lambat mengelilingi sumbu Y + "napas" halus.
  float a = uTime * 0.06;
  float c = cos(a);
  float s = sin(a);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p *= 1.0 + sin(uTime * 0.7 + p.y * 1.5) * 0.03;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / max(-mv.z, 0.001));
  vAlpha = clamp(aScale, 0.15, 1.0);
}
`;

const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  // Titik bundar lembut (buang sudut kotak).
  vec2 d = gl_PointCoord - 0.5;
  float alpha = smoothstep(0.5, 0.05, length(d)) * vAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

/* ------------------------------------------------------------------ */
/* Sub-scene                                                           */
/* ------------------------------------------------------------------ */

/**
 * PRNG deterministik (mulberry32) — dipakai agar sebaran partikel tetap
 * (tidak `Math.random` yang impure & memicu aturan react-hooks/purity).
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

/** Inti: bola dengan shader displacement + gradasi + fresnel rim. */
function Core() {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo<Record<string, IUniform>>(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 1 },
      uColorA: { value: new Color("#0a1a4d") },
      uColorB: { value: new Color("#2a6bff") },
      uColorC: { value: new Color("#a8c8ff") },
    }),
    [],
  );

  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh>
      <sphereGeometry args={[1.05, 96, 96]} />
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
function Halo({ count = 900 }: { count?: number }) {
  const mat = useRef<ShaderMaterial>(null);

  const { positions, scales } = useMemo(() => {
    const rand = mulberry32(1337);
    const pos = new Float32Array(count * 3);
    const scl = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Sebar di "cangkang" bola (radius 1.45–3.15).
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = 1.45 + Math.pow(rand(), 0.65) * 1.7;
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
      uSize: { value: 24 },
      uPixelRatio: { value: 1.5 },
      uColor: { value: new Color("#8fb6ff") },
    }),
    [],
  );

  useFrame((state) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    mat.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
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

/** Dua cincin tipis miring yang mengorbit. */
function Rings() {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.z += delta * 0.06;
    group.current.rotation.y += delta * 0.04;
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2.3, 0, 0.3]}>
        <torusGeometry args={[2.0, 0.012, 8, 160]} />
        <meshBasicMaterial color="#4d82ec" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 1.9, 0.5, 0]}>
        <torusGeometry args={[2.5, 0.008, 8, 160]} />
        <meshBasicMaterial color="#7aa2ff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/** Grup utama: posisi & skala adaptif + "napas" halus. */
function Artifact() {
  const group = useRef<Group>(null);
  const { viewport } = useThree();

  // Posisi & skala adaptif. Di layar lebar (desktop, hero 2 kolom) objek di
  // sudut kanan-atas — area kosong di samping teks. Di tablet portrait (hero
  // 1 kolom) objek digeser ke sudut kanan-atas & dikecilkan agar tidak menimpa
  // teks (teks menempati kolom penuh di layar sempit).
  const portrait = viewport.width < viewport.height;
  const x = viewport.width * (portrait ? 0.47 : 0.43);
  const baseY = viewport.height * (portrait ? 0.37 : 0.28);
  const scale = portrait ? 0.5 : 0.8;

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.08;
    g.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.5) * 0.12;
  });

  return (
    <group ref={group} position={[x, baseY, 0]} scale={scale}>
      <Core />
      <Halo />
      <Rings />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas + gate                                                       */
/* ------------------------------------------------------------------ */
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
        <Artifact />
      </Canvas>
    </div>
  );
}
