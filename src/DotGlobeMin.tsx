"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EARTH_NIGHT_BASE64 } from "./earth-night";
import { buildCircleTexture } from "./utils";

const CONFIG = {
  dotCount: 2000,
  globeRadius: 7,
  rotationSpeedY: 0.0008,
  cameraDistance: 18,
  cityDots: 3500,
  luminanceThreshold: 0.08,
};

const VERTEX = `
  precision highp float;
  uniform float uTime;
  uniform float uDotSize;
  uniform float uPulseSpeed;
  attribute float aIsCity;
  attribute float aPulseTime;
  varying float vFacing;
  varying float vPulse;
  varying vec3 vPosition;
  varying float vIsCity;

  void main() {
    vPosition = position;
    vIsCity = aIsCity;
    vec3 viewNormal = normalize(normalMatrix * normalize(position));
    vFacing = dot(viewNormal, vec3(0.0, 0.0, 1.0));

    // Per-dot pulse
    vPulse = 0.0;
    if (aPulseTime > 0.0) {
      float age = (uTime - aPulseTime) * uPulseSpeed;
      float fadeIn = clamp(age / 1.5, 0.0, 1.0);
      fadeIn = fadeIn * fadeIn * (3.0 - 2.0 * fadeIn);
      float fadeOut = 1.0 - clamp((age - 1.5) / 4.0, 0.0, 1.0);
      fadeOut = fadeOut * fadeOut * (3.0 - 2.0 * fadeOut);
      vPulse = fadeIn * fadeOut;
    }

    float backBoost = vFacing < 0.0 ? 1.3 : 1.0;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uDotSize * backBoost * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = `
  precision highp float;
  uniform float uTime;
  uniform float uMinBrightness;
  uniform float uMaxBrightness;
  uniform vec3 uDotColor;
  uniform sampler2D uCircleTex;
  varying float vFacing;
  varying float vPulse;
  varying vec3 vPosition;
  varying float vIsCity;

  void main() {
    float edge = 0.15 + 0.85 * smoothstep(-0.3, 0.4, vFacing);
    vec4 circle = texture2D(uCircleTex, gl_PointCoord);

    // Organic spread — very fine grain flowing around
    vec3 nn = normalize(vPosition);
    float drift = uTime * 0.12;
    float warp1 = sin(nn.y * 14.0 + drift * 1.8) * 0.15;
    float warp2 = cos(nn.x * 13.0 + drift * 1.3) * 0.12;

    float spread1 = sin(nn.x * 16.0 + nn.z * warp1 + drift * 2.2) *
                    sin(nn.z * 15.0 - nn.y * warp2 + drift * 1.7);
    float spread2 = sin(nn.y * 18.0 + nn.x * warp2 + drift * 2.0 + warp1) *
                    sin(nn.x * 14.0 + nn.z * warp1 - drift * 1.5);
    float spread3 = sin(nn.z * 19.0 + nn.y * warp1 * 1.5 + drift * 2.5) *
                    sin(nn.y * 16.0 - nn.x * warp2 * 1.2 + drift * 1.9);
    float spread4 = sin(nn.x * 20.0 - nn.y * warp2 + drift * 2.8) *
                    sin(nn.z * 17.0 + nn.x * warp1 + drift * 2.1);
    float spread = spread1 * 0.3 + spread2 * 0.25 + spread3 * 0.25 + spread4 * 0.2;

    // Per-dot tick + global breathing
    float p = dot(nn, vec3(73.0, 137.0, 59.0));
    float tick = sin(uTime * 0.3 + p) * 0.5 + 0.5;
    float basePulse = sin(uTime * 0.25) * 0.5 + 0.5;
    float dotVariance = 0.82 + spread * 0.12 + tick * 0.06;

    // Base — visible everywhere, gentle variation
    float base = mix(0.45, 0.65, vIsCity);
    base *= (0.88 + basePulse * 0.12) * dotVariance;

    // Pulse adds brightness and size boost for contrast
    float facingDamp = smoothstep(0.0, 0.6, vFacing);
    float pulse = vPulse * facingDamp;
    float brightness = mix(base, 1.5, pulse) * uMaxBrightness;

    // Alpha: base dots slightly transparent, pulsed dots overdriven
    float alpha = circle.a * mix(base, 1.3, pulse) * edge;
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

export interface DotGlobeMinProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  nightImageUrl?: string;
  /** Base dot size. Default: 1.0 */
  dotSize?: number;
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

export function DotGlobeMin(props: DotGlobeMinProps) {
  const { className, style, width = "100%", height = "100%", nightImageUrl, dotSize = 1.0, minBrightness = 0.35, maxBrightness = 1.0, pulseSpeed = 1.0, pulseFrequency = 3.0, backgroundColor = 0x000000, backgroundOpacity = 1.0, dotColor = "#ffffff", tilt = [0, 0], rotationSpeed = 0.0008 } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const circleTexture = buildCircleTexture(64);
    const rect = container.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;

    const scene = new THREE.Scene();
    if (backgroundOpacity < 1) {
      scene.background = null;
    } else {
      scene.background = new THREE.Color(backgroundColor);
    }

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(0, 0, CONFIG.cameraDistance);
    camera.lookAt(0, 0, 0);

    const needsAlpha = backgroundOpacity < 1;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: needsAlpha });
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
    const pulseTimes = new Float32Array(TOTAL).fill(-100);
    let pulseTimeAttr: THREE.BufferAttribute | null = null;

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
      geometry.setAttribute("aIsCity", new THREE.Float32BufferAttribute(isCity, 1));
      pulseTimeAttr = new THREE.BufferAttribute(pulseTimes, 1);
      pulseTimeAttr.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("aPulseTime", pulseTimeAttr);

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDotSize: { value: dotSize },
          uMinBrightness: { value: minBrightness },
          uMaxBrightness: { value: maxBrightness },
          uPulseSpeed: { value: pulseSpeed },
          uDotColor: { value: new THREE.Color(dotColor) },
          uCircleTex: { value: circleTexture },
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
      const dt = clock.getDelta();
      const t = clock.elapsedTime;

      const pivot = scene.children[0];
      if (pivot && pivot.children[0] instanceof THREE.Points) {
        pivot.children[0].rotation.y += rotationSpeed * dt * 60;
      }

      if (material && pulseTimeAttr) {
        material.uniforms.uTime.value = t;

        const pulsesPerBurst = Math.max(1, Math.round(pulseFrequency));
        const interval = (0.3 + Math.random() * 0.5) / Math.sqrt(pulseFrequency);
        if (t - lastPulse > interval) {
          for (let b = 0; b < pulsesPerBurst; b++) {
            const hitCity = Math.random() < 0.7;
            const idx = hitCity
              ? CONFIG.dotCount + Math.floor(Math.random() * CONFIG.cityDots)
              : Math.floor(Math.random() * CONFIG.dotCount);
            pulseTimes[idx] = t;
            pulseTimeAttr.setX(idx, t);
          }
          pulseTimeAttr.needsUpdate = true;
          lastPulse = t;
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
      circleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, position: "relative", ...style }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
