/**
 * MTM Thermal Shader — AI Visibility Heatmap
 * 
 * Repurposes GEV's FLIR/Thermal sensor modes for AI Visibility diagnostics:
 * - High conversational citation density → Hot Gold (#D4AF37) — "Cited in LLM searches"
 * - Unindexed zones → Cold Obsidian (#0A0A0A) — "AI Erasure zones"
 * 
 * Based on GEV's thermal.js but rebranded for MTM Brand Bible v3.0
 */

export const mtmThermalShader = {
  name: 'mtm-thermal',
  uniforms: {
    sensitivity: { default: 0.75, min: 0, max: 1, label: 'Sensitivity (Citation Density)' },
    bloom: { default: 0.65, min: 0, max: 1, label: 'Bloom (Authority Glow)' },
    mode: { default: 0.0, min: 0, max: 1, label: 'Mode: 0=White-Hot (Cited), 1=Black-Hot (Erasure)' },
    pixelation: { default: 1.5, min: 1, max: 6, label: 'Sensor Resolution' },
    palette: { default: 0.0, min: 0, max: 1, label: 'Palette: 0=Monochrome MTM, 1=Ironbow' },
    // MTM-specific
    citationThreshold: { default: 0.5, min: 0, max: 1, label: 'Citation Threshold' },
    erasureThreshold: { default: 0.3, min: 0, max: 1, label: 'Erasure Threshold' },
    goldIntensity: { default: 1.0, min: 0, max: 2, label: 'Midas Gold Intensity' },
  },
  fragmentShader: /* glsl */ `
    uniform sampler2D colorTexture;
    uniform vec2 colorTextureDimensions;
    uniform float intensity;
    uniform float time;
    uniform float sensitivity;
    uniform float bloom;
    uniform float mode;
    uniform float pixelation;
    uniform float palette;
    uniform float citationThreshold;
    uniform float erasureThreshold;
    uniform float goldIntensity;
    in vec2 v_textureCoordinates;

    // ── MTM AI Visibility Palette ─────────────────────────────
    // Maps citation density (0-1) to MTM thermal ramp:
    // Cold Obsidian (#0A0A0A) → Warm Transition → Hot Midas Gold (#D4AF37) → Blaze (#FFD700)
    vec3 mtmThermal(float t) {
      t = clamp(t, 0.0, 1.0);
      
      // Cold zone: AI Erasure (unindexed)
      vec3 cold = vec3(0.039, 0.039, 0.039);        // #0A0A0A - Obsidian
      vec3 coldWarm = vec3(0.10, 0.10, 0.18);       // #1A1A2E - Warm transition
      
      // Hot zone: AI Visibility (cited in LLMs)
      vec3 warm = vec3(0.83, 0.69, 0.22);           // #D4AF37 - Midas Gold
      vec3 hot = vec3(1.0, 0.84, 0.0);              // #FFD700 - Blaze
      vec3 blaze = vec3(1.0, 0.95, 0.3);            // Blaze highlight
      
      // Citation threshold band
      float citeBand = smoothstep(citationThreshold - 0.1, citationThreshold, t);
      float eraseBand = smoothstep(erasureThreshold, erasureThreshold + 0.1, t);
      
      vec3 color;
      if (t < erasureThreshold) {
        // Deep erasure zone - pure obsidian
        color = cold;
      } else if (t < citationThreshold) {
        // Transition zone - warming up
        float p = (t - erasureThreshold) / max(0.001, citationThreshold - erasureThreshold);
        color = mix(coldWarm, warm, p * p); // Quadratic easing
      } else {
        // Citation zone - gold to blaze
        float p = (t - citationThreshold) / max(0.001, 1.0 - citationThreshold);
        color = mix(warm, hot, p);
        if (t > 0.9) {
          color = mix(color, blaze, (t - 0.9) * 10.0);
        }
      }
      
      // Apply gold intensity
      color *= goldIntensity;
      
      return color;
    }

    // ── Classic Ironbow "Predator" Palette (fallback) ─────────
    vec3 ironbow(float t) {
      t = clamp(t, 0.0, 1.0);
      const vec3 c0 = vec3(0.0, 0.0, 0.0);
      const vec3 c1 = vec3(0.13, 0.0, 0.30);
      const vec3 c2 = vec3(0.49, 0.0, 0.45);
      const vec3 c3 = vec3(0.86, 0.10, 0.18);
      const vec3 c4 = vec3(1.0, 0.55, 0.0);
      const vec3 c5 = vec3(1.0, 0.91, 0.32);
      const vec3 c6 = vec3(1.0, 1.0, 1.0);
      
      if (t < 0.1667) return mix(c0, c1, t * 6.0);
      if (t < 0.3333) return mix(c1, c2, (t - 0.1667) * 6.0);
      if (t < 0.5) return mix(c2, c3, (t - 0.3333) * 6.0);
      if (t < 0.6667) return mix(c3, c4, (t - 0.5) * 6.0);
      if (t < 0.8333) return mix(c4, c5, (t - 0.6667) * 6.0);
      return mix(c5, c6, (t - 0.8333) * 6.0);
    }

    // ── Sensor Pixelation ─────────────────────────────────────
    float pixelate(float value, float gridSize) {
      return floor(value * gridSize) / gridSize;
    }

    void main() {
      vec2 uv = v_textureCoordinates;
      
      // Apply pixelation for sensor aesthetic
      if (pixelation > 1.0) {
        uv = vec2(pixelate(uv.x, pixelation), pixelate(uv.y, pixelation));
      }
      
      vec4 baseColor = texture(colorTexture, uv);
      float luminance = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
      
      // Apply sensitivity
      float temp = luminance * sensitivity;
      temp = clamp(temp, 0.0, 1.0);
      
      // Apply bloom to hot spots (high citation authority)
      float bloomFactor = smoothstep(0.7, 1.0, temp) * bloom;
      temp += bloomFactor * (1.0 - temp);
      temp = clamp(temp, 0.0, 1.0);
      
      // Mode: 0 = White-Hot (cited = bright), 1 = Black-Hot (erasure = bright)
      if (mode > 0.5) {
        temp = 1.0 - temp;
      }
      
      // Choose palette
      vec3 thermalColor = (palette > 0.5) ? ironbow(temp) : mtmThermal(temp);
      
      // Alpha from original texture (preserve transparency for oceans/etc)
      float alpha = baseColor.a;
      
      gl_FragColor = vec4(thermalColor, alpha);
    }
  `,
};

export default mtmThermalShader;