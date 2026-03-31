import * as THREE from "three";
import { EARTH_NIGHT_BASE64 } from "./earth-night";
import { PARTICLE_VERTEX, PARTICLE_FRAGMENT, ATMOSPHERE_VERTEX, ATMOSPHERE_FRAGMENT } from "./shaders";
import { buildCharAtlas, sampleGlobe } from "./utils";

interface EmbedOptions {
  container?: string | HTMLElement;
  gridStep?: number;
  dotSize?: number;
  radius?: number;
  tilt?: [number, number];
  rotationSpeed?: number;
  cameraDistance?: number;
  luminanceThreshold?: number;
  chars?: string;
  backgroundColor?: number;
  backgroundOpacity?: number;
  atmosphere?: boolean;
  atmosphereOpacity?: number;
  timeOffset?: number;
  nightImageUrl?: string;
}

function createDotGlobe(options: EmbedOptions = {}) {
  const {
    container: containerOpt,
    gridStep = 0.9,
    dotSize = 2.0,
    radius = 7,
    tilt = [35, -23.5],
    rotationSpeed = 0.0006,
    cameraDistance = 18,
    luminanceThreshold = 0.08,
    chars = ".",
    backgroundColor = 0x000000,
    backgroundOpacity = 1.0,
    atmosphere = true,
    atmosphereOpacity = 0.02,
    timeOffset = 12,
    nightImageUrl = EARTH_NIGHT_BASE64,
  } = options;

  // Resolve container
  let el: HTMLElement;
  if (typeof containerOpt === "string") {
    el = document.querySelector(containerOpt) as HTMLElement;
  } else if (containerOpt instanceof HTMLElement) {
    el = containerOpt;
  } else {
    // Find first [data-dot-globe] element or create fullscreen
    el = document.querySelector("[data-dot-globe]") as HTMLElement;
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
  if (backgroundOpacity < 1) {
    scene.background = null;
  } else {
    scene.background = new THREE.Color(backgroundColor);
  }

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.set(0, 0, cameraDistance);
  camera.lookAt(0, 0, 0);

  const needsAlpha = backgroundOpacity < 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: needsAlpha });
  if (needsAlpha) {
    renderer.setClearColor(new THREE.Color(backgroundColor), backgroundOpacity);
  }
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const { texture: charTexture, count: charCount } = buildCharAtlas(chars);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = nightImageUrl;

  let pivot: THREE.Group | null = null;
  let particleMaterial: THREE.ShaderMaterial | null = null;
  let geometry: THREE.BufferGeometry | null = null;

  img.onload = () => {
    const offscreen = document.createElement("canvas");
    offscreen.width = img.width;
    offscreen.height = img.height;
    const ctx = offscreen.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, img.width, img.height).data;

    const data = sampleGlobe(pixels, img.width, img.height, gridStep, luminanceThreshold, radius, charCount);

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute("aLuminance", new THREE.Float32BufferAttribute(data.luminances, 1));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(data.sizes, 1));
    geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(data.phases, 1));
    geometry.setAttribute("aCharIndex", new THREE.Float32BufferAttribute(data.charIndices, 1));

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
      const atmosFrag = ATMOSPHERE_FRAGMENT.replace("f * 0.02", `f * ${atmosphereOpacity.toFixed(4)}`);
      const atmosGeo = new THREE.SphereGeometry(radius * 1.12, 64, 64);
      const atmosMat = new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: atmosFrag,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
      });
      pivot.add(new THREE.Mesh(atmosGeo, atmosMat));
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
    const rect = el.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  // Return destroy function
  return {
    destroy() {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      geometry?.dispose();
      particleMaterial?.dispose();
      charTexture.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

// Auto-init if script tag has data attributes
if (typeof window !== "undefined") {
  (window as any).DotGlobe = { create: createDotGlobe };

  // Auto-init on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const el = document.querySelector("[data-dot-globe]");
      if (el) createDotGlobe();
    });
  } else {
    const el = document.querySelector("[data-dot-globe]");
    if (el) createDotGlobe();
  }
}

export { createDotGlobe };
