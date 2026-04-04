"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { isIOS } from "../../lib/utils";
import { useAudioData } from "../../lib/audioData";

// High density — fine mesh
const LINES_D = 80;
const PTS_D   = 150; // 80 × 150 = 12 000 particles
const LINES_I = 40;
const PTS_I   = 80;  // 40 × 80  =  3 200 particles

// ─── Shaders ──────────────────────────────────────────────────────────────────
//
// uKey (0–11, interpolated) drives 4 shape modes that blend into each other:
//   key  0  (C)  →  Sphere
//   key  3  (Eb) →  Torus
//   key  6  (Gb) →  Hyperboloid (hourglass)
//   key  9  (A)  →  Star (spiky sphere, 5 ridges)
//   key 11  (B)  →  back toward Sphere

const VERT = /* glsl */ `
  #define PI 3.14159265358979

  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uKey;   // 0.0–11.0 interpolated — drives shape morphing

  attribute float aLat;
  attribute float aLon;
  attribute float aRand;

  varying float vAlpha;

  // ── Shape 0: Sphere ──────────────────────────────────────────────────────
  vec3 shapeSphere(float lat, float lon) {
    return 4.0 * vec3(sin(lat)*cos(lon), cos(lat), sin(lat)*sin(lon));
  }

  // ── Shape 1: Torus (donut) ───────────────────────────────────────────────
  // lat 0→π maps once around tube (0→2π)
  vec3 shapeTorus(float lat, float lon) {
    float tube = lat * 2.0;
    float q = 3.2 + 1.4 * cos(tube);
    return vec3(q * cos(lon), 1.4 * sin(tube), q * sin(lon));
  }

  // ── Shape 2: Hyperboloid (hourglass) ────────────────────────────────────
  // Narrow at equator, wide at top/bottom — like a cooling tower
  vec3 shapeHyper(float lat, float lon) {
    float t = (lat / PI) * 4.0 - 2.0;         // -2 to +2
    float r = sqrt(1.0 + t * t) * 2.1;        // widens away from equator
    return vec3(r * cos(lon), t * 2.0, r * sin(lon));
  }

  // ── Shape 3: Star (spiky sphere, 5 longitudinal ridges) ──────────────────
  // Ridges are tallest at equator, taper to smooth poles
  vec3 shapeStar(float lat, float lon) {
    float spike = 1.8 * abs(sin(5.0 * lon)) * abs(sin(lat));
    float r     = 3.0 + spike;
    return r * vec3(sin(lat)*cos(lon), cos(lat), sin(lat)*sin(lon));
  }

  void main() {
    // ── Piecewise shape blend across 4 segments (keys 0→11) ─────────────
    float k     = clamp(uKey, 0.0, 11.99);
    float phase = k / 3.0;                  // 0 → ~4
    float t     = smoothstep(0.0, 1.0, fract(phase));

    vec3 s0, s1;
    if      (phase < 1.0) { s0 = shapeSphere(aLat, aLon); s1 = shapeTorus (aLat, aLon); }
    else if (phase < 2.0) { s0 = shapeTorus (aLat, aLon); s1 = shapeHyper (aLat, aLon); }
    else if (phase < 3.0) { s0 = shapeHyper (aLat, aLon); s1 = shapeStar  (aLat, aLon); }
    else                  { s0 = shapeStar  (aLat, aLon); s1 = shapeSphere(aLat, aLon); }

    vec3 basePos = mix(s0, s1, t);

    // ── Subtle audio-reactive wave displacement ─────────────────────────
    float w = sin(aLat * 3.0 + aLon * 2.0 + uTime * 0.9) * 0.12
            + sin(aLat * 5.0 - aLon * 3.0 + uTime * 1.3) * 0.07
            + sin(aLon * 4.0 + aLat       - uTime * 2.0) * 0.05;

    float scale = 1.0 + w * (0.5 + uBass * 1.2) + uBass * 0.08;
    vec3 pos    = basePos * scale;

    // ── Slow Y rotation (mid nudges speed) ─────────────────────────────
    float rot = uTime * 0.07 + uMid * 0.12;
    float ca  = cos(rot);
    float sa  = sin(rot);
    pos = vec3(ca*pos.x + sa*pos.z, pos.y, -sa*pos.x + ca*pos.z);

    vec4 mv     = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Fixed tiny size — crisp dots, no distance scaling
    gl_PointSize = 1.4 + aRand * 0.6;

    // Rim brightening via normal vs view angle
    vec3 nrm  = normalize(basePos);
    vec3 vd   = normalize(-mv.xyz);
    float rim = 1.0 - abs(dot(nrm, vd));

    vAlpha = 0.20 + rim * 0.55 + abs(w) * 0.18 + uBass * 0.12;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform vec3  uColorTint;
  uniform float uTintStrength;
  varying float vAlpha;

  void main() {
    vec2  c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a    = step(d, 0.4) * vAlpha;
    vec3  col  = mix(uColor, uColorTint, uTintStrength);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;

// ─── Data (module-level — Math.random outside React) ──────────────────────────

function buildData(lines: number, pts: number) {
  const count     = lines * pts;
  const positions = new Float32Array(count * 3);
  const aLat      = new Float32Array(count);
  const aLon      = new Float32Array(count);
  const aRand     = new Float32Array(count);

  let i = 0;
  for (let li = 0; li < lines; li++) {
    const lon = (li / lines) * Math.PI * 2;
    for (let pi = 0; pi < pts; pi++) {
      const lat = (pi / (pts - 1)) * Math.PI;
      aLat[i]  = lat;
      aLon[i]  = lon;
      aRand[i] = Math.random();
      positions[i * 3]     = 4 * Math.sin(lat) * Math.cos(lon);
      positions[i * 3 + 1] = 4 * Math.cos(lat);
      positions[i * 3 + 2] = 4 * Math.sin(lat) * Math.sin(lon);
      i++;
    }
  }
  return { positions, aLat, aLon, aRand };
}

function makeGeo(d: ReturnType<typeof buildData>): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(d.positions, 3));
  g.setAttribute("aLat",     new THREE.BufferAttribute(d.aLat,      1));
  g.setAttribute("aLon",     new THREE.BufferAttribute(d.aLon,      1));
  g.setAttribute("aRand",    new THREE.BufferAttribute(d.aRand,     1));
  return g;
}

const deskGeo = makeGeo(buildData(LINES_D, PTS_D));
const iosGeo  = makeGeo(buildData(LINES_I, PTS_I));

// Fixed cyan — key changes shape, not color
const sphereMat = new THREE.ShaderMaterial({
  vertexShader:   VERT,
  fragmentShader: FRAG,
  uniforms: {
    uTime:         { value: 0 },
    uBass:         { value: 0 },
    uMid:          { value: 0 },
    uKey:          { value: 8 },
    uColor:        { value: new THREE.Color(0x00aaff) },
    uColorTint:    { value: new THREE.Color(0x00aaff) },
    uTintStrength: { value: 0.0 },
  },
  transparent: true,
  depthWrite:  false,
  blending:    THREE.NormalBlending,
});

// ─── Smoothed audio values (module-level — persists across frames) ────────────
// interpKey: -1 = uninitialized, snaps on first frame to avoid cold-start jump
// smoothBass/smoothMid: lerp toward target so pause/resume never snaps visually

let interpKey  = -1;
let smoothBass = 0;
let smoothMid  = 0;

// isIOS result cached at module level — no need to call on every render
const IS_IOS = isIOS();

// ─── Props ────────────────────────────────────────────────────────────────────

interface NebulaSceneProps {
  colorTint?: THREE.Color | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NebulaScene({ colorTint }: NebulaSceneProps = {}) {
  const audioRef = useAudioData();

  useFrame(({ clock }) => {
    const { bass, mid, key } = audioRef.current;

    // Snap key on first frame to avoid cold-start jump
    if (interpKey < 0) interpKey = key;

    // Slow lerp for key — ~2.5 s full swing at 60 fps
    interpKey += (key - interpKey) * 0.02;

    // Smooth bass/mid so pause→resume never snaps the shape
    // Rise fast (0.12), fall slowly (0.04) — keeps energy visible briefly after pause
    const bassLerp = bass > smoothBass ? 0.12 : 0.04;
    const midLerp  = mid  > smoothMid  ? 0.12 : 0.04;
    smoothBass += (bass - smoothBass) * bassLerp;
    smoothMid  += (mid  - smoothMid)  * midLerp;

    sphereMat.uniforms.uTime.value = clock.getElapsedTime();
    sphereMat.uniforms.uBass.value = smoothBass;
    sphereMat.uniforms.uMid.value  = smoothMid;
    sphereMat.uniforms.uKey.value  = interpKey;

    // Album color tint
    if (colorTint) {
      sphereMat.uniforms.uColorTint.value.copy(colorTint);
      sphereMat.uniforms.uTintStrength.value = 0.85;
    } else {
      // Lerp tint strength back to 0
      const s = sphereMat.uniforms.uTintStrength.value;
      sphereMat.uniforms.uTintStrength.value = s + (0 - s) * 0.05;
    }
  });

  return <points geometry={IS_IOS ? iosGeo : deskGeo} material={sphereMat} />;
}
