# dot-globe

[![npm version](https://img.shields.io/npm/v/dot-globe.svg)](https://www.npmjs.com/package/dot-globe)
[![npm downloads](https://img.shields.io/npm/dm/dot-globe.svg)](https://www.npmjs.com/package/dot-globe)
[![CI](https://github.com/krtbgb/dot-globe/actions/workflows/ci.yml/badge.svg)](https://github.com/krtbgb/dot-globe/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/dot-globe.svg)](https://github.com/krtbgb/dot-globe/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.npmjs.com/package/dot-globe)

Minimal 3D dot globe for React, built with Three.js and NASA Black Marble night lights data. Zero config, one import.

<p align="center">
  <a href="https://kurt.xyz/dot-globe">
    <img src="https://raw.githubusercontent.com/krtbgb/dot-globe/main/preview.gif" alt="dot-globe preview" width="480" />
  </a>
</p>

<p align="center">
  <a href="https://kurt.xyz/dot-globe"><strong>Live Demo</strong></a>
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

// Full bright, no pulse fade
<DotGlobeMin minBrightness={0.8} pulseSpeed={3} />
```

| Prop | Type | Default |
|------|------|---------|
| `minBrightness` | `number` | `0.35` |
| `maxBrightness` | `number` | `1.0` |
| `pulseSpeed` | `number` | `1.0` |
| `nightImageUrl` | `string` | bundled |
| `className` | `string` | — |
| `style` | `CSSProperties` | — |
| `width` | `string \| number` | `"100%"` |
| `height` | `string \| number` | `"100%"` |

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

Customize with URL params: `?dotSize=3&rotationSpeed=0.002&atmosphere=false`

## License

MIT
