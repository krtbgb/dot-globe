import * as THREE from 'three';

export function getLuminance(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  lat: number,
  lng: number
): number {
  const u = (lng + 180) / 360;
  const v = (90 - lat) / 180;
  const x = Math.floor(u * w) % w;
  const y = Math.floor(v * h) % h;
  const i = (y * w + x) * 4;
  return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
}

export function buildCharAtlas(chars: string): { texture: THREE.CanvasTexture; count: number } {
  const canvas = document.createElement('canvas');
  canvas.width = 64 * chars.length;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, 64);
  ctx.font = "48px 'SF Mono', 'Menlo', 'Consolas', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], i * 64 + 32, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = true;
  texture.needsUpdate = true;
  return { texture, count: chars.length };
}

/**
 * Generates a circle texture from raw pixel data.
 * Soft radial gradient — works on all GPUs including mobile.
 */
export function buildCircleTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half + 0.5) / half;
      const dy = (y - half + 0.5) / half;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Hard circle with soft anti-aliased edge
      const alpha = Math.max(0, Math.min(1, (1 - dist) * half * 0.5));
      // Slight brightness boost at center for a subtle glow
      const brightness = Math.max(0, 1 - dist * 0.3);
      const i = (y * size + x) * 4;
      data[i] = Math.round(brightness * 255);
      data[i + 1] = Math.round(brightness * 255);
      data[i + 2] = Math.round(brightness * 255);
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export function sampleGlobe(
  pixels: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  gridStep: number,
  threshold: number,
  radius: number,
  charCount: number
) {
  const positions: number[] = [];
  const luminances: number[] = [];
  const sizes: number[] = [];
  const phases: number[] = [];
  const charIndices: number[] = [];

  for (let lat = -85; lat <= 85; lat += gridStep) {
    const lngStep = gridStep / Math.cos((lat * Math.PI) / 180);
    for (let lng = -180; lng < 180; lng += lngStep) {
      const lum = getLuminance(pixels, imgW, imgH, lat, lng);

      const phi = ((90 - lat) * Math.PI) / 180;
      const theta = ((lng + 180) * Math.PI) / 180;

      positions.push(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      luminances.push(lum);
      sizes.push(1.0);
      phases.push(Math.random() * Math.PI * 2);
      charIndices.push(Math.floor(Math.random() * charCount));
    }
  }

  return { positions, luminances, sizes, phases, charIndices };
}
