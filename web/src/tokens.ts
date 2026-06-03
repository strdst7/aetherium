/**
 * Design tokens exported from design/sigil/v1.json
 * Automatically generated - do not edit directly
 */

import sigils from '../../design/sigil/v1.json';

export const designTokens = sigils;

// Geometry
export const geometry = {
  baseUnit: sigils.geometry.baseUnit,
  scale: sigils.geometry.scale,
  aspectRatios: sigils.geometry.aspect_ratios,
  borderRadius: sigils.geometry.border_radius,
  strokeWidths: sigils.geometry.stroke_widths,
};

// Colors
export const colors = sigils.colors;

// Typography
export const typography = sigils.typography;

// Spacing
export const spacing = sigils.spacing;

// Shadows
export const shadows = sigils.shadows;

// Motion
export const motion = sigils.motion;

// Compliance rules
export const sigilComplianceRules = sigils.sigil.compliance_rules;

/**
 * Generate CSS variables from design tokens
 */
export function generateCSSVariables(): string {
  const root: string[] = [':root {'];

  // Colors
  Object.entries(colors).forEach(([colorFamily, shades]) => {
    if (typeof shades === 'object') {
      Object.entries(shades).forEach(([shade, value]) => {
        root.push(`  --color-${colorFamily}-${shade}: ${value};`);
      });
    }
  });

  // Spacing
  Object.entries(spacing).forEach(([key, value]) => {
    root.push(`  --spacing-${key}: ${value};`);
  });

  // Typography
  Object.entries(typography.font_sizes).forEach(([size, value]) => {
    root.push(`  --font-size-${size}: ${value};`);
  });

  Object.entries(typography.font_weights).forEach(([weight, value]) => {
    root.push(`  --font-weight-${weight}: ${value};`);
  });

  // Motion
  Object.entries(motion.duration).forEach(([key, value]) => {
    root.push(`  --duration-${key}: ${value};`);
  });

  Object.entries(motion.easing).forEach(([key, value]) => {
    root.push(`  --easing-${key}: ${value};`);
  });

  // Shadows
  Object.entries(shadows).forEach(([key, value]) => {
    root.push(`  --shadow-${key}: ${value};`);
  });

  root.push('}');

  return root.join('\n');
}

/**
 * Apply CSS variables to document
 */
export function applyCSSVariables(): void {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = generateCSSVariables();
    document.head.appendChild(style);
  }
}

export default designTokens;
