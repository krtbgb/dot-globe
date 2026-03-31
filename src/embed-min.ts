import * as THREE from "three";
import { EARTH_NIGHT_BASE64 } from "./earth-night";

function buildCircleTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  const radius = 0.45;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half + 0.5) / half;
      const dy = (y - half + 0.5) / half;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const edgeWidth = 2.0 / size;
      const alpha = dist <= radius ? 1.0 : dist <= radius + edgeWidth ? 1.0 - (dist - radius) / edgeWidth : 0.0;
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

const CONFIG = {
  dotCount: 1200,
  globeRadius: 7,
  rotationSpeedY: 0.0008,
  cameraDistance: 18,
  cityDots: 800,
  luminanceThreshold: 0.08,
};

const VERTEX = `
  precision highp float;
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

    vec3 n = normalize(position);
    float wave1 = sin(uTime * 0.4 + n.x * 4.0 + n.y * 3.0) * 0.5 + 0.5;
    float wave2 = sin(uTime * 0.3 - n.z * 5.0 + n.y * 2.0) * 0.5 + 0.5;
    float bloom1 = pow(sin(uTime * 0.6 + n.x * 3.0 + n.z * 2.0) * 0.5 + 0.5, 4.0);
    float bloom2 = pow(sin(uTime * 0.45 - n.y * 4.0 + n.x * 1.5) * 0.5 + 0.5, 4.0);
    float bloom3 = pow(sin(uTime * 0.7 + n.z * 3.5 - n.x * 2.5) * 0.5 + 0.5, 4.0);
    float bloom4 = pow(sin(uTime * 0.35 + n.y * 2.5 + n.z * 3.0) * 0.5 + 0.5, 4.0);
    float blooms = max(bloom1, max(bloom2, max(bloom3, bloom4)));
    float wave = wave1 * 0.3 + wave2 * 0.2;
    wave = smoothstep(0.15, 0.7, wave);

    float p = dot(position, vec3(73.0, 137.0, 59.0));
    float baseVar = sin(p) * 0.5 + 0.5;
    float breathe = sin(uTime * 0.4 + p * 0.3) * 0.1;
    float baseGlow = baseVar * 0.1 + breathe;

    float faceFade = smoothstep(0.0, 0.5, vFacing);
    if (aIsCity > 0.5) {
      float cityWave = wave * 0.1 + blooms * 0.2;
      baseGlow += (0.05 + cityWave) * faceFade;
    } else {
      baseGlow += wave * 0.05 * faceFade;
    }

    float pulseGlow = 0.0;
    float idx = aIndex;
    for (int i = 0; i < 40; i++) {
      if (abs(uPulseSlots[i] - idx) < 0.5) {
        float age = (uTime - uPulseTimes[i]) * uPulseSpeed;
        float fadeIn = clamp(age / 2.0, 0.0, 1.0);
        fadeIn = fadeIn * fadeIn * (3.0 - 2.0 * fadeIn);
        float fadeOut = exp(-max(0.0, age - 1.5) * 0.4);
        pulseGlow = max(pulseGlow, fadeIn * fadeOut);
      }
    }

    float facingDamp = smoothstep(-0.3, 0.5, vFacing);
    float pulseAdd = pulseGlow * pulseGlow * 2.5 * facingDamp;
    vGlow = baseGlow + pulseAdd;

    float backBoost = vFacing < 0.0 ? 1.3 : 1.0;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.0 * backBoost * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = `
  precision highp float;
  uniform float uMinBrightness;
  uniform float uMaxBrightness;
  uniform vec3 uDotColor;
  uniform sampler2D uCircleTex;
  varying float vFacing;
  varying float vGlow;

  void main() {
    float front = smoothstep(-0.2, 0.4, vFacing);
    float edge = 0.1 + front * 0.9;

    vec4 circle = texture2D(uCircleTex, gl_PointCoord);

    float glow = clamp(vGlow, 0.0, 1.0);
    float brightness = mix(uMinBrightness, uMaxBrightness, glow);
    float alpha = circle.a * mix(0.3, 1.0, glow) * edge;

    if (alpha < 0.005) discard;
    gl_FragColor = vec4(uDotColor * brightness, alpha);
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

interface EmbedMinOptions {
  container?: string | HTMLElement;
  nightImageUrl?: string;
  /** Minimum dot brightness (0-1). Default: 0.35 */
  minBrightness?: number;
  /** Maximum dot brightness (0-1). Default: 1.0 */
  maxBrightness?: number;
  /** Pulse speed multiplier — higher = faster fade in/out. Default: 1.0 */
  pulseSpeed?: number;
  /** Pulse frequency multiplier — higher = more frequent pulses. Default: 1.0 */
  pulseFrequency?: number;
  /** Background color as hex number. Default: 0x000000 */
  backgroundColor?: number;
  /** Background opacity (0-1). Set to 0 for fully transparent. Default: 1.0 */
  backgroundOpacity?: number;
  /** Dot color as CSS hex string. Default: "#ffffff" */
  dotColor?: string;
  /** Axis tilt in degrees [x, z]. Default: [0, 0] */
  tilt?: [number, number];
  /** Rotation speed (radians per frame). Default: 0.0008 */
  rotationSpeed?: number;
}

function createDotGlobeMin(options: EmbedMinOptions = {}) {
  const { container: containerOpt, nightImageUrl = EARTH_NIGHT_BASE64, minBrightness = 0.35, maxBrightness = 1.0, pulseSpeed = 1.0, pulseFrequency = 1.0, backgroundColor = 0x000000, backgroundOpacity = 1.0, dotColor = "#ffffff", tilt = [0, 0], rotationSpeed = 0.0008 } = options;

  let el: HTMLElement;
  if (typeof containerOpt === "string") {
    el = document.querySelector(containerOpt) as HTMLElement;
  } else if (containerOpt instanceof HTMLElement) {
    el = containerOpt;
  } else {
    el = document.querySelector("[data-dot-globe-min]") as HTMLElement;
    if (!el) {
      el = document.createElement("div");
      el.style.cssText = "position:fixed;inset:0;z-index:-1;";
      document.body.prepend(el);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block;";
  el.appendChild(canvas);

  const rect = el.getBoundingClientRect();
  const w = rect.width || window.innerWidth;
  const h = rect.height || window.innerHeight;

  const scene = new THREE.Scene();
  if (backgroundOpacity >= 1) {
    scene.background = new THREE.Color(backgroundColor);
  }
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.set(0, 0, CONFIG.cameraDistance);
  camera.lookAt(0, 0, 0);

  const needsAlpha = backgroundOpacity < 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: needsAlpha });
  if (needsAlpha) {
    renderer.setClearColor(new THREE.Color(backgroundColor), backgroundOpacity);
  }
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const R = CONFIG.globeRadius;
  const TOTAL = CONFIG.dotCount + CONFIG.cityDots;
  const positions = new Float32Array(TOTAL * 3);
  const indices = new Float32Array(TOTAL);
  const isCity = new Float32Array(TOTAL);

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
  for (let i = CONFIG.dotCount; i < TOTAL; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 9999;
    positions[i * 3 + 2] = 0;
    indices[i] = i;
    isCity[i] = 1;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = nightImageUrl;

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
        uDotColor: { value: new THREE.Color(dotColor) },
        uCircleTex: { value: buildCircleTexture(64) },
        uPulseSlots: { value: pulseSlots },
        uPulseTimes: { value: pulseTimes },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    const pivot = new THREE.Group();
    pivot.rotation.x = THREE.MathUtils.degToRad(tilt[0]);
    pivot.rotation.z = THREE.MathUtils.degToRad(tilt[1]);
    pivot.add(particles);
    scene.add(pivot);
  };

  const clock = new THREE.Clock();
  let animId: number;
  let lastPulse = 0;

  const animate = () => {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const pivot = scene.children[0];
    if (pivot && pivot.children[0] instanceof THREE.Points) {
      pivot.children[0].rotation.y += rotationSpeed;
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
    const rect = el.getBoundingClientRect();
    camera.aspect = (rect.width || window.innerWidth) / (rect.height || window.innerHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width || window.innerWidth, rect.height || window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  return {
    destroy() {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      geometry?.dispose();
      material?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

if (typeof window !== "undefined") {
  (window as any).DotGlobeMin = { create: createDotGlobeMin };
  const init = () => {
    const el = document.querySelector("[data-dot-globe-min]");
    if (el) createDotGlobeMin();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

export { createDotGlobeMin };
