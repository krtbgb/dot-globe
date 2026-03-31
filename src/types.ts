export interface DotGlobeProps {
  /** Night lights image URL or path. Defaults to bundled NASA Black Marble. */
  nightImageUrl?: string;

  /** Grid step in degrees — smaller = more dots, more detail. Default: 0.9 */
  gridStep?: number;

  /** Base dot size multiplier. Default: 2.0 */
  dotSize?: number;

  /** Globe radius in scene units. Default: 7 */
  radius?: number;

  /** Axis tilt in degrees [x, z]. Default: [35, -23.5] */
  tilt?: [number, number];

  /** Rotation speed (radians per frame). Default: 0.0006 */
  rotationSpeed?: number;

  /** Camera distance from center. Default: 18 */
  cameraDistance?: number;

  /** Luminance threshold for land detection. Default: 0.08 */
  luminanceThreshold?: number;

  /** ASCII character(s) for dots. Default: "." */
  chars?: string;

  /** Background color as hex number. Default: 0x000000 */
  backgroundColor?: number;

  /** Show atmosphere rim glow. Default: true */
  atmosphere?: boolean;

  /** Atmosphere opacity. Default: 0.02 */
  atmosphereOpacity?: number;

  /** Time offset so animation starts mid-cycle. Default: 12 */
  timeOffset?: number;

  /** Container className */
  className?: string;

  /** Container style */
  style?: React.CSSProperties;

  /** Width — "auto" fills container. Default: "100%" */
  width?: string | number;

  /** Height — "auto" fills container. Default: "100%" */
  height?: string | number;
}

export const DEFAULT_CONFIG: Required<Omit<DotGlobeProps, 'className' | 'style' | 'width' | 'height'>> = {
  nightImageUrl: '',
  gridStep: 0.9,
  dotSize: 2.0,
  radius: 7,
  tilt: [35, -23.5],
  rotationSpeed: 0.0006,
  cameraDistance: 18,
  luminanceThreshold: 0.08,
  chars: '.',
  backgroundColor: 0x000000,
  atmosphere: true,
  atmosphereOpacity: 0.02,
  timeOffset: 12,
};
