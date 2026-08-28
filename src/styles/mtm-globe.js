/**
 * MTM Globe Shader — Brand Bible v3.0 Compliant
 * 
 * Visual Identity:
 * - Oceans: High-gloss Obsidian Onyx (#0A0A0A) — Echo
 * - Landmasses: Radiant Midas Gold (#D4AF37) — Goldie
 * - Grids & Coordinates: Metallic Chrome/Silver (#C0C0C0) — Nina HID glow
 * - Active Telemetry: Kinetic Lightning Blue (#00E5FF) — Roman
 * - Thermal/FLIR: Hot Gold (#D4AF37) → Cold Obsidian (#0A0A0A)
 */

import * as Cesium from 'cesium';

// MTM Brand Bible Color Palette
export const MTM_COLORS = {
  // Core brand colors
  obsidian: '#0A0A0A',           // Oceans base — Echo
  obsidianGloss: '#141414',      // Oceans gloss highlight
  midasGold: '#D4AF37',          // Landmasses — Goldie (glossy)
  midasGoldMatte: '#B6862C',     // Landmasses — Goldie (matte)
  chrome: '#C0C0C0',             // Grids/Coordinates — Nina
  chromeHighlight: '#E8E8E8',    // Grid highlight
  lightningBlue: '#00E5FF',      // Active telemetry — Roman
  lightningBlueSoft: '#00B8D4',  // Telemetry soft
  
  // Thermal/FLIR palette (AI Visibility Heatmap)
  thermalCold: '#0A0A0A',        // Cold Obsidian (unindexed)
  thermalWarm: '#1A1A2E',        // Warm transition
  thermalHot: '#D4AF37',         // Hot Midas Gold (cited in LLM searches)
  thermalBlaze: '#FFD700',       // Blaze highlight
  
  // UI accents
  platinum: '#E5E4E2',           // Text primary
  platinumMuted: '#888888',      // Text secondary
  goldGlow: 'rgba(212, 175, 55, 0.4)',  // Gold glow for pulses
  blueGlow: 'rgba(0, 229, 255, 0.4)',   // Blue glow for pulses
};

// Cesium Material uniforms for MTM Globe
export function createMTMGlobeMaterials(viewer) {
  const scene = viewer.scene;
  
  // 1. OCEAN MATERIAL — High-gloss Obsidian Onyx
  // Water appears as deep, reflective black with subtle gold rim lighting
  const oceanMaterial = new Cesium.Material({
    fabric: {
      type: 'MTMOcean',
      uniforms: {
        baseColor: Cesium.Color.fromCssColorString(MTM_COLORS.obsidian),
        glossColor: Cesium.Color.fromCssColorString(MTM_COLORS.obsidianGloss),
        rimColor: Cesium.Color.fromCssColorString(MTM_COLORS.midasGold),
        rimIntensity: 0.3,
        waveScale: 0.5,
        time: 0.0,
      },
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          
          vec2 uv = materialInput.st;
          float time = uniforms.time * 0.1;
          
          // Subtle ocean wave distortion
          float wave = sin(uv.x * uniforms.waveScale * 10.0 + time) * 0.02 +
                       cos(uv.y * uniforms.waveScale * 8.0 - time * 0.7) * 0.015;
          
          vec3 color = mix(uniforms.baseColor.rgb, uniforms.glossColor.rgb, wave + 0.5);
          
          // Rim lighting at horizon (gold)
          float rim = 1.0 - abs(materialInput.normalEC.z);
          rim = smoothstep(0.7, 1.0, rim);
          color += uniforms.rimColor.rgb * rim * uniforms.rimIntensity;
          
          material.diffuse = color;
          material.specular = vec3(0.8) * (1.0 - wave * 0.5);
          material.shininess = 128.0;
          
          return material;
        }
      `,
    },
  });
  
  // 2. LAND MATERIAL — Radiant Midas Gold with Chrome grid overlay
  const landMaterial = new Cesium.Material({
    fabric: {
      type: 'MTMLand',
      uniforms: {
        baseColor: Cesium.Color.fromCssColorString(MTM_COLORS.midasGold),
        matteColor: Cesium.Color.fromCssColorString(MTM_COLORS.midasGoldMatte),
        gridColor: Cesium.Color.fromCssColorString(MTM_COLORS.chrome),
        gridHighlight: Cesium.Color.fromCssColorString(MTM_COLORS.chromeHighlight),
        gridScale: 20.0,
        time: 0.0,
      },
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          
          vec3 base = mix(uniforms.baseColor.rgb, uniforms.matteColor.rgb, 
                          sin(materialInput.positionToEyeEC.z * 0.0001) * 0.5 + 0.5);
          
          // Chrome coordinate grid
          vec2 gridUV = materialInput.st * uniforms.gridScale;
          float gridLine = step(0.98, fract(gridUV.x)) + step(0.98, fract(gridUV.y));
          vec3 gridColor = mix(uniforms.gridColor.rgb, uniforms.gridHighlight.rgb, 
                               sin(uniforms.time * 2.0) * 0.5 + 0.5);
          
          material.diffuse = mix(base, gridColor, gridLine * 0.3);
          material.specular = vec3(0.4);
          material.shininess = 64.0;
          
          return material;
        }
      `,
    },
  });
  
  // 3. TELEMETRY PULSE MATERIAL — Kinetic Lightning Blue
  const pulseMaterial = new Cesium.Material({
    fabric: {
      type: 'MTMPulse',
      uniforms: {
        pulseColor: Cesium.Color.fromCssColorString(MTM_COLORS.lightningBlue),
        pulseColorSoft: Cesium.Color.fromCssColorString(MTM_COLORS.lightningBlueSoft),
        pulseSpeed: 2.0,
        pulseWidth: 0.1,
        time: 0.0,
      },
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          
          float pulse = sin(uniforms.time * uniforms.pulseSpeed - materialInput.positionToEyeEC.z * 0.001);
          pulse = smoothstep(0.5, 0.5 + uniforms.pulseWidth, pulse);
          
          vec3 color = mix(uniforms.pulseColorSoft.rgb, uniforms.pulseColor.rgb, pulse);
          
          material.diffuse = color * pulse;
          material.emission = color * pulse * 2.0;
          material.transparent = true;
          
          return material;
        }
      `,
    },
  });
  
  return { oceanMaterial, landMaterial, pulseMaterial };
}

// MTM Globe Configuration
export const MTM_GLOBE_CONFIG = {
  // Camera
  defaultCamera: {
    destination: Cesium.Cartesian3.fromDegrees(-95.3698, 29.7604, 15000000), // Houston centered
    orientation: {
      heading: 0,
      pitch: -Cesium.Math.PI_OVER_TWO,
      roll: 0,
    },
  },
  
  // Lighting
  lighting: {
    sun: true,
    moon: true,
    skyBox: false, // We'll use custom sky atmosphere
    skyAtmosphere: true,
    fog: false,
  },
  
  // Globe rendering
  globe: {
    baseColor: MTM_COLORS.obsidian,
    showGroundAtmosphere: false,
    enableLighting: true,
    depthTestAgainstTerrain: true,
  },
  
  // MTM-specific layers to enable by default
  defaultLayers: [
    'flights',           // ADS-B live flights
    'aisLiveVessels',    // Maritime AIS
    'satellites',        // NORAD TLE
    'earthquakes',       // USGS/FIRMS
    'cctv',              // Public cameras
    'militaryInstallations',
  ],
  
  // Thermal/FLIR mode for AI Visibility Heatmap
  thermalMode: {
    enabled: false,
    sensitivity: 0.75,
    bloom: 0.65,
    mode: 0.0, // 0 = White-Hot, 1 = Black-Hot
    palette: 0.0, // 0 = Monochrome, 1 = Ironbow
  },
};

export default { MTM_COLORS, createMTMGlobeMaterials, MTM_GLOBE_CONFIG };