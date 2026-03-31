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

## Usage

```tsx
import { DotGlobe } from "dot-globe"

<DotGlobe />
```

## Props

| Prop | Type | Default |
|------|------|---------|
| `gridStep` | `number` | `0.9` |
| `dotSize` | `number` | `2.0` |
| `radius` | `number` | `7` |
| `tilt` | `[number, number]` | `[35, -23.5]` |
| `rotationSpeed` | `number` | `0.0006` |
| `chars` | `string` | `"."` |
| `atmosphere` | `boolean` | `true` |
| `backgroundColor` | `number` | `0x000000` |
| `className` | `string` | — |
| `style` | `CSSProperties` | — |
| `width` | `string \| number` | `"100%"` |
| `height` | `string \| number` | `"100%"` |

<br/>

### DotGlobeMin

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
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `minBrightness` | `number` | `0.35` | Minimum dot brightness (0–1) |
| `maxBrightness` | `number` | `1.0` | Maximum dot brightness (0–1) |
| `pulseSpeed` | `number` | `1.0` | Pulse fade speed — higher = faster |
| `pulseFrequency` | `number` | `1.0` | Pulse rate — higher = more frequent |
| `backgroundColor` | `number` | `0x000000` | Background color as hex number |
| `backgroundOpacity` | `number` | `1.0` | Background opacity (0 = transparent) |
| `dotColor` | `string` | `"#ffffff"` | Dot color as CSS hex string |
| `nightImageUrl` | `string` | bundled | Custom night lights texture URL |
| `className` | `string` | — | Container class name |
| `style` | `CSSProperties` | — | Container inline styles |
| `width` | `string \| number` | `"100%"` | Container width |
| `height` | `string \| number` | `"100%"` | Container height |

---

### Embed (Webflow, HTML, no-build)

Use an iframe:

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
