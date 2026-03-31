import { describe, it, expect } from 'vitest'
import * as pkg from '../index'

describe('package exports', () => {
  it('exports DotGlobe component', () => {
    expect(pkg.DotGlobe).toBeDefined()
    expect(typeof pkg.DotGlobe).toBe('function')
  })

  it('exports DotGlobeMin component', () => {
    expect(pkg.DotGlobeMin).toBeDefined()
    expect(typeof pkg.DotGlobeMin).toBe('function')
  })

  it('exports DEFAULT_CONFIG', () => {
    expect(pkg.DEFAULT_CONFIG).toBeDefined()
    expect(typeof pkg.DEFAULT_CONFIG).toBe('object')
  })
})
