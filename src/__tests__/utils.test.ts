import { describe, it, expect } from 'vitest'
import { getLuminance, sampleGlobe } from '../utils'

describe('getLuminance', () => {
  it('returns 0 for black pixels', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255])
    expect(getLuminance(data, 1, 1, 0, 0)).toBe(0)
  })

  it('returns ~1 for white pixels', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255])
    const lum = getLuminance(data, 1, 1, 0, 0)
    expect(lum).toBeCloseTo(1, 2)
  })

  it('weights RGB channels correctly (ITU-R BT.709)', () => {
    // Pure red
    const red = new Uint8ClampedArray([255, 0, 0, 255])
    expect(getLuminance(red, 1, 1, 0, 0)).toBeCloseTo(0.2126, 2)

    // Pure green
    const green = new Uint8ClampedArray([0, 255, 0, 255])
    expect(getLuminance(green, 1, 1, 0, 0)).toBeCloseTo(0.7152, 2)

    // Pure blue
    const blue = new Uint8ClampedArray([0, 0, 255, 255])
    expect(getLuminance(blue, 1, 1, 0, 0)).toBeCloseTo(0.0722, 2)
  })

  it('maps lat/lng to correct pixel coordinates', () => {
    // 2x1 image: left pixel white, right pixel black
    const data = new Uint8ClampedArray([
      255, 255, 255, 255,  // left (lng -180 to 0)
      0, 0, 0, 255,        // right (lng 0 to 180)
    ])
    // lng = -90 should hit left pixel (white)
    expect(getLuminance(data, 2, 1, 0, -90)).toBeCloseTo(1, 2)
    // lng = 90 should hit right pixel (black)
    expect(getLuminance(data, 2, 1, 0, 90)).toBe(0)
  })

  it('wraps longitude at boundaries', () => {
    const data = new Uint8ClampedArray([128, 128, 128, 255])
    // Should not throw for edge values
    expect(() => getLuminance(data, 1, 1, 90, 180)).not.toThrow()
    expect(() => getLuminance(data, 1, 1, -90, -180)).not.toThrow()
  })
})

describe('sampleGlobe', () => {
  const whitePixel = new Uint8ClampedArray([255, 255, 255, 255])

  it('returns arrays of equal length', () => {
    const result = sampleGlobe(whitePixel, 1, 1, 10, 0.08, 7, 1)
    const len = result.positions.length / 3
    expect(result.luminances.length).toBe(len)
    expect(result.sizes.length).toBe(len)
    expect(result.phases.length).toBe(len)
    expect(result.charIndices.length).toBe(len)
  })

  it('generates points on the sphere surface', () => {
    const result = sampleGlobe(whitePixel, 1, 1, 30, 0.08, 7, 1)
    for (let i = 0; i < result.positions.length; i += 3) {
      const x = result.positions[i]
      const y = result.positions[i + 1]
      const z = result.positions[i + 2]
      const dist = Math.sqrt(x * x + y * y + z * z)
      expect(dist).toBeCloseTo(7, 1)
    }
  })

  it('smaller gridStep produces more dots', () => {
    const coarse = sampleGlobe(whitePixel, 1, 1, 20, 0.08, 7, 1)
    const fine = sampleGlobe(whitePixel, 1, 1, 5, 0.08, 7, 1)
    expect(fine.luminances.length).toBeGreaterThan(coarse.luminances.length)
  })

  it('respects radius parameter', () => {
    const r = 12
    const result = sampleGlobe(whitePixel, 1, 1, 30, 0.08, r, 1)
    for (let i = 0; i < result.positions.length; i += 3) {
      const x = result.positions[i]
      const y = result.positions[i + 1]
      const z = result.positions[i + 2]
      const dist = Math.sqrt(x * x + y * y + z * z)
      expect(dist).toBeCloseTo(r, 1)
    }
  })

  it('charIndices stay within bounds', () => {
    const charCount = 3
    const result = sampleGlobe(whitePixel, 1, 1, 10, 0.08, 7, charCount)
    for (const idx of result.charIndices) {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(charCount)
    }
  })
})
