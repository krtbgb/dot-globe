"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DotGlobeProps, DEFAULT_CONFIG } from "./types";
import { buildCharAtlas, sampleGlobe } from "./utils";
import { PARTICLE_VERTEX, PARTICLE_FRAGMENT, ATMOSPHERE_VERTEX, ATMOSPHERE_FRAGMENT } from "./shaders";
import { EARTH_NIGHT_BASE64 } from "./earth-night";

export function DotGlobe(props: DotGlobeProps) {
  const {
    nightImageUrl = EARTH_NIGHT_BASE64,
    gridStep = DEFAULT_CONFIG.gridStep,
    dotSize = DEFAULT_CONFIG.dotSize,
    radius = DEFAULT_CONFIG.radius,
    tilt = DEFAULT_CONFIG.tilt,
    rotationSpeed = DEFAULT_CONFIG.rotationSpeed,
    cameraDistance = DEFAULT_CONFIG.cameraDistance,
    luminanceThreshold = DEFAULT_CONFIG.luminanceThreshold,
    chars = DEFAULT_CONFIG.chars,
    backgroundColor = DEFAULT_CONFIG.backgroundColor,
    atmosphere = DEFAULT_CONFIG.atmosphere,
    atmosphereOpacity = DEFAULT_CONFIG.atmosphereOpacity,
    timeOffset = DEFAULT_CONFIG.timeOffset,
    className,
    style,
    width = "100%",
    height = "100%",
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    const rect = container.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const { texture: charTexture, count: charCount } = buildCharAtlas(chars);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = nightImageUrl;

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

      const { positions, luminances, sizes, phases, charIndices } = sampleGlobe(
        pixels, img.width, img.height, gridStep, luminanceThreshold, radius, charCount
      );

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("aLuminance", new THREE.Float32BufferAttribute(luminances, 1));
      geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
      geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
      geometry.setAttribute("aCharIndex", new THREE.Float32BufferAttribute(charIndices, 1));

      particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBaseSize: { value: dotSize },
          uCharTex: { value: charTexture },
          uCharCount: { value: charCount },
        },
        vertexShader: PARTICLE_VERTEX,
        fragmentShader: PARTICLE_FRAGMENT,
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
        const atmosFragment = ATMOSPHERE_FRAGMENT.replace(
          "f * 0.02",
          `f * ${atmosphereOpacity.toFixed(4)}`
        );
        atmosGeometry = new THREE.SphereGeometry(radius * 1.12, 64, 64);
        atmosMaterial = new THREE.ShaderMaterial({
            vertexShader: ATMOSPHERE_VERTEX,
            fragmentShader: atmosFragment,
            transparent: true,
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
      const t = clock.getElapsedTime() + timeOffset;
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
      charTexture.dispose();
      renderer.dispose();
    };
  }, [
    nightImageUrl, gridStep, dotSize, radius, tilt, rotationSpeed,
    cameraDistance, luminanceThreshold, chars, backgroundColor,
    atmosphere, atmosphereOpacity, timeOffset,
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
