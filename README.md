# dot-globe

Minimal 3D dot globe for React, built with Three.js and NASA Black Marble night lights data. Zero config, one import.

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

Accepts `className`, `style`, `width`, `height`, and `nightImageUrl`.

---

### Embed (Webflow, HTML, no-build)

Add a `<div>` with `data-dot-globe` and include the script:

```html
<div data-dot-globe style="width: 100%; height: 100vh;"></div>
<script src="https://unpkg.com/dot-globe@1/dist/embed.global.js"></script>
```

Or create programmatically:

```html
<div id="globe" style="width: 100%; height: 500px;"></div>
<script src="https://unpkg.com/dot-globe@1/dist/embed.global.js"></script>
<script>
  DotGlobe.create({ container: "#globe" });
</script>
```

## License

MIT
