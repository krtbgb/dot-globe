"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EARTH_NIGHT_BASE64 } from "./earth-night";

const CONFIG = {
  dotCount: 1200,
  globeRadius: 7,
  rotationSpeedY: 0.0008,
  cameraDistance: 18,
  cityDots: 800,
  luminanceThreshold: 0.08,
};

const VERTEX = `
  uniform float uTime;
  uniform float uMinBrightness;
  uniform float uMaxBrightness;
  uniform float uPulseSpeed;
  uniform float uPulseSlots[40];
  uniform float uPulseTimes[40];
  attribute float aIndex;
  attribute float aIsCity;
  varying float vFacing;
  varying float vGlow;

  void main() {
    vec3 viewNormal = normalize(normalMatrix * normalize(position));
    vFacing = dot(viewNormal, vec3(0.0, 0.0, 1.0));

    // Sweeping waves (from globe3)
    vec3 n = normalize(position);
    float wave1 = sin(uTime * 0.4 + n.x * 4.0 + n.y * 3.0) * 0.5 + 0.5;
    float wave2 = sin(uTime * 0.3 - n.z * 5.0 + n.y * 2.0) * 0.5 + 0.5;
    float wave = wave1 * 0.3 + wave2 * 0.2;
    wave = smoothstep(0.15, 0.7, wave);

    // City bloom hotspots (from globe3)
    float bloom1 = pow(sin(uTime * 0.6 + n.x * 3.0 + n.z * 2.0) * 0.5 + 0.5, 4.0);
    float bloom2 = pow(sin(uTime * 0.45 - n.y * 4.0 + n.x * 1.5) * 0.5 + 0.5, 4.0);
    float bloom3 = pow(sin(uTime * 0.7 + n.z * 3.5 - n.x * 2.5) * 0.5 + 0.5, 4.0);
    float bloom4 = pow(sin(uTime * 0.35 + n.y * 2.5 + n.z * 3.0) * 0.5 + 0.5, 4.0);
    float blooms = max(bloom1, max(bloom2, max(bloom3, bloom4)));

    // Per-dot variance
    float p = dot(position, vec3(73.0, 137.0, 59.0));
    float baseVar = sin(p) * 0.5 + 0.5;
    float breathe = sin(uTime * 0.4 + p * 0.3) * 0.1;
    float baseGlow = baseVar * 0.1 + breathe;

    // City dots get wave + bloom glow — dampen at edges
    float faceFade = smoothstep(0.0, 0.5, vFacing);
    if (aIsCity > 0.5) {
      float cityWave = wave * 0.1 + blooms * 0.2;
      baseGlow += (0.05 + cityWave) * faceFade;
    } else {
      baseGlow += wave * 0.05 * faceFade;
    }

    // Transaction pulse check
    float pulseGlow = 0.0;
    float idx = aIndex;
    for (int i = 0; i < 40; i++) {
      if (abs(uPulseSlots[i] - idx) < 0.5) {
        float age = (uTime - uPulseTimes[i]) * uPulseSpeed;
        float fadeIn = clamp(age / 2.0, 0.0, 1.0);
        fadeIn = fadeIn * fadeIn * (3.0 - 2.0 * fadeIn); // smooth hermite
        float fadeOut = exp(-max(0.0, age - 1.5) * 0.4);
        pulseGlow = max(pulseGlow, fadeIn * fadeOut);
      }
    }

    float facingDamp = smoothstep(-0.3, 0.5, vFacing);
    // Pulse adds on top of base — smooth blend, never disappears
    float pulseAdd = pulseGlow * pulseGlow * 2.5 * facingDamp; // squared for eased curve
    vGlow = baseGlow + pulseAdd;

    float backBoost = vFacing < 0.0 ? 1.3 : 1.0;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.0 * backBoost * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = `
  uniform float uMinBrightness;
  uniform float uMaxBrightness;
  varying float vFacing;
  varying float vGlow;

  void main() {
    float front = smoothstep(-0.2, 0.4, vFacing);
    float edge = 0.1 + front * 0.9;

    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    float circle = 1.0 - step(0.25, d);

    float glow = clamp(vGlow, 0.0, 1.0);
    float brightness = mix(uMinBrightness, uMaxBrightness, glow);
    float alpha = circle * mix(0.3, 1.0, glow) * edge;

    if (alpha < 0.005) discard;
    gl_FragColor = vec4(vec3(brightness), alpha);
  }
`;

function getLuminance(data: Uint8ClampedArray, w: number, h: number, lat: number, lng: number): number {
  const u = (lng + 180) / 360;
  const v = (90 - lat) / 180;
  const x = Math.floor(u * w) % w;
  const y = Math.floor(v * h) % h;
  const i = (y * w + x) * 4;
  return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
}

export interface DotGlobeMinProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  nightImageUrl?: string;
  /** Minimum dot brightness (0-1). Default: 0.35 */
  minBrightness?: number;
  /** Maximum dot brightness (0-1). Default: 1.0 */
  maxBrightness?: number;
  /** Pulse speed multiplier — higher = faster fade in/out. Default: 1.0 */
  pulseSpeed?: number;
  /** Pulse frequency multiplier — higher = more frequent pulses. Default: 1.0 */
  pulseFrequency?: number;
}

export function DotGlobeMin(props: DotGlobeMinProps) {
  const { className, style, width = "100%", height = "100%", nightImageUrl, minBrightness = 0.35, maxBrightness = 1.0, pulseSpeed = 1.0, pulseFrequency = 1.0 } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(0, 0, CONFIG.cameraDistance);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const R = CONFIG.globeRadius;
    const TOTAL = CONFIG.dotCount + CONFIG.cityDots;
    const positions = new Float32Array(TOTAL * 3);
    const indices = new Float32Array(TOTAL);
    const isCity = new Float32Array(TOTAL);

    // Base dots — uniform sphere
    for (let i = 0; i < CONFIG.dotCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      positions[i * 3] = -R * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = R * Math.cos(phi);
      positions[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
      indices[i] = i;
      isCity[i] = 0;
    }

    // City dot slots start hidden
    for (let i = CONFIG.dotCount; i < TOTAL; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 9999;
      positions[i * 3 + 2] = 0;
      indices[i] = i;
      isCity[i] = 1;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = nightImageUrl || EARTH_NIGHT_BASE64;

    let material: THREE.ShaderMaterial | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    const pulseSlots = new Float32Array(40).fill(-1);
    const pulseTimes = new Float32Array(40).fill(-100);

    img.onload = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;

      let cityCount = 0;
      for (let attempt = 0; attempt < CONFIG.cityDots * 100 && cityCount < CONFIG.cityDots; attempt++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const lat = 90 - (phi * 180) / Math.PI;
        const lng = (theta * 180) / Math.PI - 180;
        const lum = getLuminance(pixels, img.width, img.height, lat, lng);
        if (lum < CONFIG.luminanceThreshold) continue;
        if (Math.random() >= Math.pow(lum, 0.5)) continue;

        const idx = CONFIG.dotCount + cityCount;
        positions[idx * 3] = -R * Math.sin(phi) * Math.cos(theta);
        positions[idx * 3 + 1] = R * Math.cos(phi);
        positions[idx * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
        indices[idx] = idx;
        isCity[idx] = 1;
        cityCount++;
      }

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("aIndex", new THREE.Float32BufferAttribute(indices, 1));
      geometry.setAttribute("aIsCity", new THREE.Float32BufferAttribute(isCity, 1));

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMinBrightness: { value: minBrightness },
          uMaxBrightness: { value: maxBrightness },
          uPulseSpeed: { value: pulseSpeed },
          uPulseSlots: { value: pulseSlots },
          uPulseTimes: { value: pulseTimes },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);
    };

    const clock = new THREE.Clock();
    let animId: number;
    let lastPulse = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (scene.children[0] instanceof THREE.Points) {
        scene.children[0].rotation.y += CONFIG.rotationSpeedY;
      }

      if (material) {
        material.uniforms.uTime.value = t;

        const interval = (0.3 + Math.random() * 0.5) / pulseFrequency;
        if (t - lastPulse > interval) {
          let slot = 0, oldestAge = 0;
          for (let i = 0; i < 40; i++) {
            const age = t - pulseTimes[i];
            if (age > oldestAge) { oldestAge = age; slot = i; }
          }
          // 70% chance to hit a city dot, 30% any dot
          const hitCity = Math.random() < 0.7;
          pulseSlots[slot] = hitCity
            ? CONFIG.dotCount + Math.floor(Math.random() * CONFIG.cityDots)
            : Math.floor(Math.random() * CONFIG.dotCount);
          pulseTimes[slot] = t;
          lastPulse = t;
          material.uniforms.uPulseSlots.value = pulseSlots;
          material.uniforms.uPulseTimes.value = pulseTimes;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      geometry?.dispose();
      material?.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, position: "relative", background: "#000", ...style }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
