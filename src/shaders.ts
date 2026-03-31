export const PARTICLE_VERTEX = `
  precision highp float;
  uniform float uTime;
  uniform float uBaseSize;
  attribute float aLuminance;
  attribute float aSize;
  attribute float aPhase;
  attribute float aCharIndex;
  varying float vFacing;
  varying float vLuminance;
  varying float vShimmer;
  varying float vCharIndex;
  varying vec3 vPosition;

  void main() {
    vPosition = position;
    vec3 viewNormal = normalize(normalMatrix * normalize(position));
    vFacing = dot(viewNormal, vec3(0.0, 0.0, 1.0));
    vLuminance = aLuminance;

    vec3 n = normalize(position);

    float wave1 = sin(uTime * 0.4 + n.x * 4.0 + n.y * 3.0) * 0.5 + 0.5;
    float wave2 = sin(uTime * 0.3 - n.z * 5.0 + n.y * 2.0) * 0.5 + 0.5;

    float bloom1 = pow(sin(uTime * 0.6 + n.x * 3.0 + n.z * 2.0) * 0.5 + 0.5, 4.0);
    float bloom2 = pow(sin(uTime * 0.45 - n.y * 4.0 + n.x * 1.5) * 0.5 + 0.5, 4.0);
    float bloom3 = pow(sin(uTime * 0.7 + n.z * 3.5 - n.x * 2.5) * 0.5 + 0.5, 4.0);
    float bloom4 = pow(sin(uTime * 0.35 + n.y * 2.5 + n.z * 3.0) * 0.5 + 0.5, 4.0);
    float blooms = max(bloom1, max(bloom2, max(bloom3, bloom4)));

    float wave = wave1 * 0.3 + wave2 * 0.2;
    wave = smoothstep(0.15, 0.7, wave);

    float landMask = smoothstep(0.05, 0.25, aLuminance);
    float cityBoost = smoothstep(0.3, 0.7, aLuminance) * blooms;
    float hotspot = blooms * landMask + cityBoost * 0.5;

    vShimmer = wave * 0.3 + hotspot * 0.7;
    vCharIndex = 0.0;
    float pulse = 0.95 + hotspot * 0.2;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uBaseSize * aSize * pulse * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const PARTICLE_FRAGMENT = `
  precision highp float;
  uniform sampler2D uCharTex;
  uniform float uCharCount;
  uniform float uTime;
  varying float vFacing;
  varying float vLuminance;
  varying float vShimmer;
  varying float vCharIndex;
  varying vec3 vPosition;

  void main() {
    float edge = step(0.0, vFacing) * smoothstep(0.0, 0.4, vFacing);

    vec2 uv = gl_PointCoord;
    uv.x = (uv.x + vCharIndex) / uCharCount;
    vec4 texColor = texture2D(uCharTex, uv);
    float isLand = step(0.03, vLuminance);

    vec3 nn = normalize(vPosition);
    float warp1 = sin(nn.y * 3.0 + uTime * 0.12) * 0.5;
    float warp2 = cos(nn.x * 2.5 + uTime * 0.09) * 0.4;

    float spread1 = sin(nn.x * 2.0 + nn.z * warp1 + uTime * 0.18) *
                    sin(nn.z * 1.8 - nn.y * warp2 + uTime * 0.13);
    float spread2 = sin(nn.y * 2.5 + nn.x * warp2 + uTime * 0.14 + warp1) *
                    sin(nn.x * 1.5 + nn.z * warp1 - uTime * 0.1);
    float spread3 = sin(nn.z * 3.0 + nn.y * warp1 * 1.5 + uTime * 0.2) *
                    sin(nn.y * 2.0 - nn.x * warp2 * 1.2 + uTime * 0.16);

    float spread = spread1 * 0.4 + spread2 * 0.35 + spread3 * 0.25;

    float p = vCharIndex * 73.0 + vLuminance * 137.0;
    float tick = sin(uTime * 0.3 + p) * 0.5 + 0.5;
    float dotVariance = 0.6 + spread * 0.3 + tick * 0.1;

    float basePulse = sin(uTime * 0.25) * 0.5 + 0.5;
    float base = mix(0.2, 0.42 + vLuminance * 0.15, isLand);
    base *= (0.8 + basePulse * 0.2) * dotVariance;

    float glow = vShimmer * 0.7;
    vec2 pc = gl_PointCoord - vec2(0.5);
    float circle = 1.0 - step(0.4, length(pc));
    float alpha = circle * texColor.a * (base + glow) * edge;
    if (alpha < 0.005) discard;

    float brightness = mix(0.12, 0.3, isLand) * (0.8 + basePulse * 0.2) * dotVariance + vShimmer * 0.7;
    vec3 color = vec3(brightness);
    gl_FragColor = vec4(color, alpha);
  }
`;

export const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ATMOSPHERE_FRAGMENT = `
  varying vec3 vNormal;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 4.0);
    gl_FragColor = vec4(vec3(0.3), f * 0.02);
  }
`;
