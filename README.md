# dot-globe

[![npm version](https://img.shields.io/npm/v/dot-globe.svg)](https://www.npmjs.com/package/dot-globe)
[![npm downloads](https://img.shields.io/npm/dm/dot-globe.svg)](https://www.npmjs.com/package/dot-globe)
[![CI](https://github.com/krtbgb/dot-globe/actions/workflows/ci.yml/badge.svg)](https://github.com/krtbgb/dot-globe/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/dot-globe.svg)](https://github.com/krtbgb/dot-globe/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.npmjs.com/package/dot-globe)

Minimal 3D dot globe for React, built with Three.js and NASA Black Marble night lights data. Zero config, one import.

<p align="center">
  <img src="https://raw.githubusercontent.com/krtbgb/dot-globe/main/assets/preview.gif" alt="dot-globe preview" width="100%" />
</p>

## Install

```bash
npm install dot-globe
```

## DotGlobe

```tsx
import { DotGlobe } from "dot-globe"

<DotGlobe />
```

#### Examples

```tsx
// Transparent overlay on any page
<DotGlobe backgroundOpacity={0} />

// Dense, detailed dots with no atmosphere
<DotGlobe gridStep={0.5} dotSize={3} atmosphere={false} />

// Slow rotation, tilted view
<DotGlobe rotationSpeed={0.0002} tilt={[15, -10]} />

// Custom background at 50% opacity
<DotGlobe backgroundColor={0x111122} backgroundOpacity={0.5} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gridStep` | `number` | `0.9` | Grid step in degrees — smaller = more dots |
| `dotSize` | `number` | `0.6` | Base dot size multiplier |
| `radius` | `number` | `7` | Globe radius in scene units |
| `tilt` | `[number, number]` | `[35, -23.5]` | Axis tilt in degrees [x, z] |
| `rotationSpeed` | `number` | `0.0006` | Rotation speed (radians/frame) |
| `chars` | `string` | `"."` | ASCII character(s) for dots |
| `atmosphere` | `boolean` | `true` | Show atmosphere rim glow |
| `backgroundColor` | `number` | `0x000000` | Background color as hex number |
| `backgroundOpacity` | `number` | `1.0` | Background opacity (0 = transparent) |
| `nightImageUrl` | `string` | bundled | Custom night lights texture URL |
| `className` | `string` | — | Container class name |
| `style` | `CSSProperties` | — | Container inline styles |
| `width` | `string \| number` | `"100%"` | Container width |
| `height` | `string \| number` | `"100%"` | Container height |

---

## DotGlobeMin

A lighter variant with uniform dots and transaction-style pulse animations.

```tsx
import { DotGlobeMin } from "dot-globe"

<DotGlobeMin />
```

#### Examples

```tsx
// Brighter, faster pulses
<DotGlobeMin minBrightness={0.5} maxBrightness={1.0} pulseSpeed={2} />

// Subtle and slow
<DotGlobeMin minBrightness={0.1} maxBrightness={0.6} pulseSpeed={0.5} />

// Rapid fire pulses
<DotGlobeMin pulseFrequency={3} pulseSpeed={1.5} />

// Transparent overlay with blue dots — layer on top of any site
<DotGlobeMin backgroundOpacity={0} dotColor="#4488ff" />

// Dark blue background at 50% opacity
<DotGlobeMin backgroundColor={0x000033} backgroundOpacity={0.5} dotColor="#88ccff" />

// Green matrix style
<DotGlobeMin dotColor="#00ff88" minBrightness={0.2} pulseFrequency={5} pulseSpeed={2} />

// Tilted with slow rotation
<DotGlobeMin tilt={[25, -15]} rotationSpeed={0.0003} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `minBrightness` | `number` | `0.35` | Minimum dot brightness (0–1) |
| `maxBrightness` | `number` | `1.0` | Maximum dot brightness (0–1) |
| `pulseSpeed` | `number` | `1.0` | Pulse fade speed — higher = faster |
| `pulseFrequency` | `number` | `1.0` | Pulse rate — higher = more frequent |
| `dotSize` | `number` | `1.0` | Base dot size |
| `dotColor` | `string` | `"#ffffff"` | Dot color as CSS hex string |
| `tilt` | `[number, number]` | `[0, 0]` | Axis tilt in degrees [x, z] |
| `rotationSpeed` | `number` | `0.0008` | Rotation speed (radians/frame) |
| `backgroundColor` | `number` | `0x000000` | Background color as hex number |
| `backgroundOpacity` | `number` | `1.0` | Background opacity (0 = transparent) |
| `nightImageUrl` | `string` | bundled | Custom night lights texture URL |
| `className` | `string` | — | Container class name |
| `style` | `CSSProperties` | — | Container inline styles |
| `width` | `string \| number` | `"100%"` | Container width |
| `height` | `string \| number` | `"100%"` | Container height |

---

## Embed (Webflow, HTML, no-build)

```html
<iframe src="https://kurt.xyz/dot-globe/embed" style="width: 100%; height: 100vh; border: none;"></iframe>
```

Or the min variant:

```html
<iframe src="https://kurt.xyz/dot-globe/embed-min" style="width: 100%; height: 100vh; border: none;"></iframe>
```

Customize with URL params:

```html
<!-- Brighter, faster pulses -->
<iframe src="https://kurt.xyz/dot-globe/embed-min?minBrightness=0.5&pulseSpeed=2" style="width: 100%; height: 100vh; border: none;"></iframe>

<!-- Transparent overlay with colored dots -->
<iframe src="https://kurt.xyz/dot-globe/embed-min?backgroundOpacity=0&dotColor=4488ff" style="width: 100%; height: 100vh; border: none;"></iframe>

<!-- Rapid pulses, green dots -->
<iframe src="https://kurt.xyz/dot-globe/embed-min?pulseFrequency=5&dotColor=00ff88" style="width: 100%; height: 100vh; border: none;"></iframe>

<!-- Detailed globe, no atmosphere -->
<iframe src="https://kurt.xyz/dot-globe/embed?dotSize=3&gridStep=0.5&atmosphere=false" style="width: 100%; height: 100vh; border: none;"></iframe>

<!-- Slow rotation, custom tilt -->
<iframe src="https://kurt.xyz/dot-globe/embed?rotationSpeed=0.0002&tiltX=15&tiltZ=-10" style="width: 100%; height: 100vh; border: none;"></iframe>
```

## License

MIT
