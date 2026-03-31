import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG } from '../types'

describe('DEFAULT_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_CONFIG.gridStep).toBe(0.9)
    expect(DEFAULT_CONFIG.dotSize).toBe(2.0)
    expect(DEFAULT_CONFIG.radius).toBe(7)
    expect(DEFAULT_CONFIG.tilt).toEqual([35, -23.5])
    expect(DEFAULT_CONFIG.rotationSpeed).toBe(0.0006)
    expect(DEFAULT_CONFIG.cameraDistance).toBe(18)
    expect(DEFAULT_CONFIG.luminanceThreshold).toBe(0.08)
    expect(DEFAULT_CONFIG.chars).toBe('.')
    expect(DEFAULT_CONFIG.backgroundColor).toBe(0x000000)
    expect(DEFAULT_CONFIG.atmosphere).toBe(true)
    expect(DEFAULT_CONFIG.atmosphereOpacity).toBe(0.02)
    expect(DEFAULT_CONFIG.timeOffset).toBe(12)
  })

  it('gridStep is positive', () => {
    expect(DEFAULT_CONFIG.gridStep).toBeGreaterThan(0)
  })

  it('luminanceThreshold is between 0 and 1', () => {
    expect(DEFAULT_CONFIG.luminanceThreshold).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_CONFIG.luminanceThreshold).toBeLessThanOrEqual(1)
  })

  it('atmosphereOpacity is between 0 and 1', () => {
    expect(DEFAULT_CONFIG.atmosphereOpacity).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_CONFIG.atmosphereOpacity).toBeLessThanOrEqual(1)
  })
})
