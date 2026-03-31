"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EARTH_NIGHT_BASE64 } from "./earth-night";

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uShimmerSpeed;
  uniform float uShimmerIntensity;
  uniform float uShimmerSparsePower;
  uniform float uBaseSize;

  attribute float aPhase;
  attribute float aSize;
  attribute float aOpacity;
  attribute float aLuminance;

  varying float vOpacity;
  varying float vFacing;
  varying float vParticleOpacity;

  void main() {
    vec3 n = normalize(position);
    vec3 viewNormal = normalize(normalMatrix * n);
    float facing = dot(viewNormal, vec3(0.0, 0.0, 1.0));
    vFacing = facing;
    vParticleOpacity = aOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    float p = aPhase;
    float freq1 = uShimmerSpeed * (1.5 + fract(p * 1.71) * 0.8);
    float freq2 = uShimmerSpeed * (0.6 + fract(p * 3.37) * 0.7);
    float freq3 = uShimmerSpeed * (0.2 + fract(p * 7.13) * 0.5);

    float w1 = sin(uTime * freq1 + p) * 0.5 + 0.5;
    float w2 = sin(uTime * freq2 + p * 2.3) * 0.5 + 0.5;
    float w3 = sin(uTime * freq3 + p * 5.1) * 0.5 + 0.5;

    float denseWave = mix(w1, w2, 0.3);
    float sparseWave = w1 * w2 * w3;
    sparseWave = pow(sparseWave, uShimmerSparsePower * 0.3);
    float wave = mix(sparseWave, denseWave, aLuminance);
    float shimmer = mix(1.0 - uShimmerIntensity, 1.0, wave);

    vOpacity = shimmer;

    float sizeShimmer = mix(1.0, shimmer, uShimmerIntensity * 0.5);
    float size = uBaseSize * aSize * sizeShimmer;
    gl_PointSize = size * (200.0 / -mvPosition.z);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform vec3 uGlowColor;
  uniform float uOpacity;
  uniform float uEdgeFadeCutoff;
  uniform float uEdgeFadeWidth;

  varying float vOpacity;
  varying float vFacing;
  varying float vParticleOpacity;

  void main() {
    if (vFacing < uEdgeFadeCutoff - uEdgeFadeWidth) {
      discard;
    }

    float edgeFade = smoothstep(
      uEdgeFadeCutoff - uEdgeFadeWidth,
      uEdgeFadeCutoff + uEdgeFadeWidth,
      vFacing
    );

    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    float glow = 1.0 - smoothstep(0.05, 0.45, dist);
    float alpha = mix(glow * 0.8, 1.0, core);

    vec3 finalColor = mix(uColor, uGlowColor, core * 0.7);
    finalColor = min(finalColor * 1.3, vec3(1.0));
    float finalOpacity = alpha * vOpacity * uOpacity * edgeFade * vParticleOpacity;

    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`;

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = `
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereOpacity;
  uniform float uAtmosphereFalloff;
  varying vec3 vNormal;
  void main() {
    float facing = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float fresnel = 1.0 - abs(facing);
    fresnel = pow(fresnel, uAtmosphereFalloff);
    float alpha = fresnel * uAtmosphereOpacity;
    gl_FragColor = vec4(uAtmosphereColor, alpha);
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

export interface DotGlobeMaxProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  nightImageUrl?: string;
  /** Dot color as CSS hex string. Default: "#ffffff" */
  dotColor?: string;
  /** Glow color for bright particle cores. Default: "#ffffff" */
  glowColor?: string;
  /** Particle count. Default: 150000 */
  particleCount?: number;
  /** Base particle size. Default: 0.45 */
  particleSize?: number;
  /** Shimmer animation speed. Default: 3.5 */
  shimmerSpeed?: number;
  /** Shimmer intensity (0-1). Default: 0.7 */
  shimmerIntensity?: number;
  /** Axis tilt in degrees [x, z]. Default: [35, -23.5] */
  tilt?: [number, number];
  /** Rotation speed (radians per frame). Default: 0.0008 */
  rotationSpeed?: number;
  /** Show atmosphere rim glow. Default: true */
  atmosphere?: boolean;
  /** Atmosphere color. Default: "#888888" */
  atmosphereColor?: string;
  /** Atmosphere opacity. Default: 0.025 */
  atmosphereOpacity?: number;
  /** Background color as hex number. Default: 0x000000 */
  backgroundColor?: number;
  /** Background opacity (0-1). Set to 0 for fully transparent. Default: 1.0 */
  backgroundOpacity?: number;
  /** Globe radius. Default: 7 */
  radius?: number;
  /** Camera distance. Default: 20 */
  cameraDistance?: number;
  /** Camera vertical offset. Default: -3 */
  cameraVerticalOffset?: number;
}

export function DotGlobeMax(props: DotGlobeMaxProps) {
  const {
    className, style, width = "100%", height = "100%",
    nightImageUrl,
    dotColor = "#ffffff",
    glowColor = "#ffffff",
    particleCount = 150000,
    particleSize = 0.45,
    shimmerSpeed = 3.5,
    shimmerIntensity = 0.7,
    tilt = [35, -23.5],
    rotationSpeed = 0.0008,
    atmosphere = true,
    atmosphereColor = "#888888",
    atmosphereOpacity = 0.025,
    backgroundColor = 0x000000,
    backgroundOpacity = 1.0,
    radius = 7,
    cameraDistance = 20,
    cameraVerticalOffset = -3,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
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
    camera.position.set(0, cameraVerticalOffset, cameraDistance);
    camera.lookAt(0, 0, 0);

    const needsAlpha = backgroundOpacity < 1;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: needsAlpha });
    if (needsAlpha) {
      renderer.setClearColor(new THREE.Color(backgroundColor), backgroundOpacity);
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = nightImageUrl || EARTH_NIGHT_BASE64;

    let pivot: THREE.Group | null = null;
    let particleMaterial: THREE.ShaderMaterial | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let atmosGeometry: THREE.SphereGeometry | null = null;
    let atmosMaterial: THREE.ShaderMaterial | null = null;

    img.onload = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;

      const positions: number[] = [];
      const phases: number[] = [];
      const sizes: number[] = [];
      const opacities: number[] = [];
      const luminances: number[] = [];

      const R = radius;
      const MAX_ATTEMPTS = particleCount * 50;
      let count = 0;

      for (let attempt = 0; attempt < MAX_ATTEMPTS && count < particleCount; attempt++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const lat = 90 - (phi * 180) / Math.PI;
        const lng = (theta * 180) / Math.PI - 180;

        const lum = getLuminance(pixels, img.width, img.height, lat, lng);
        if (lum < 0.024) continue;
        if (Math.random() >= lum) continue;

        positions.push(
          -R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi),
          R * Math.sin(phi) * Math.sin(theta)
        );
        phases.push(Math.random() * Math.PI * 2);
        sizes.push(0.4 + lum * 0.6);
        opacities.push(1 - Math.random());
        luminances.push(lum);
        count++;
      }

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
      geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
      geometry.setAttribute("aOpacity", new THREE.Float32BufferAttribute(opacities, 1));
      geometry.setAttribute("aLuminance", new THREE.Float32BufferAttribute(luminances, 1));

      particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(dotColor) },
          uGlowColor: { value: new THREE.Color(glowColor) },
          uOpacity: { value: 1.0 },
          uEdgeFadeCutoff: { value: 0.5 },
          uEdgeFadeWidth: { value: 0.2 },
          uShimmerSpeed: { value: shimmerSpeed },
          uShimmerIntensity: { value: shimmerIntensity },
          uShimmerSparsePower: { value: 20 },
          uBaseSize: { value: particleSize },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

      const particles = new THREE.Points(geometry, particleMaterial);
      particles.rotation.y = THREE.MathUtils.degToRad(-230);

      pivot = new THREE.Group();
      pivot.rotation.x = THREE.MathUtils.degToRad(tilt[0]);
      pivot.rotation.z = THREE.MathUtils.degToRad(tilt[1]);
      pivot.add(particles);

      if (atmosphere) {
        atmosGeometry = new THREE.SphereGeometry(radius * 1.17, 64, 64);
        atmosMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uAtmosphereColor: { value: new THREE.Color(atmosphereColor) },
            uAtmosphereOpacity: { value: atmosphereOpacity },
            uAtmosphereFalloff: { value: 4 },
          },
          vertexShader: ATMOSPHERE_VERTEX,
          fragmentShader: ATMOSPHERE_FRAGMENT,
          transparent: true,
          blending: THREE.NormalBlending,
          side: THREE.BackSide,
          depthWrite: false,
        });
        pivot.add(new THREE.Mesh(atmosGeometry, atmosMaterial));
      }

      scene.add(pivot);
    };

    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (pivot && pivot.children.length > 0) {
        pivot.children[0].rotation.y += rotationSpeed;
      }
      if (particleMaterial) {
        particleMaterial.uniforms.uTime.value = t;
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
      particleMaterial?.dispose();
      atmosGeometry?.dispose();
      atmosMaterial?.dispose();
      renderer.dispose();
    };
  }, [
    nightImageUrl, dotColor, glowColor, particleCount, particleSize,
    shimmerSpeed, shimmerIntensity, tilt, rotationSpeed, atmosphere,
    atmosphereColor, atmosphereOpacity, backgroundColor, backgroundOpacity,
    radius, cameraDistance, cameraVerticalOffset,
  ]);

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
