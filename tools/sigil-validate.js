#!/usr/bin/env node
/**
 * Sigil Keeper - Artifact Validator
 * Validates SVG/CSS artifacts against Sigil compliance rules
 * Returns: { compliance_score: 0-1, violations: [], warnings: [] }
 */

const fs = require('fs');
const path = require('path');

// Load design tokens
const designTokensPath = path.join(__dirname, '..', 'design', 'sigil', 'v1.json');
let designTokens = {};
try {
  designTokens = JSON.parse(fs.readFileSync(designTokensPath, 'utf-8'));
} catch (e) {
  console.warn('⚠️ Could not load design tokens:', e.message);
}

class SigilValidator {
  constructor(tokens) {
    this.tokens = tokens;
    this.violations = [];
    this.warnings = [];
    this.score = 1.0;
  }

  /**
   * Validate SVG content
   */
  validateSVG(svgContent) {
    this.violations = [];
    this.warnings = [];
    this.score = 1.0;

    try {
      // Check for geometry transformations
      this.checkGeometryTransforms(svgContent);

      // Check for color usage
      this.checkColorPalette(svgContent);

      // Check for stroke consistency
      this.checkStrokeConsistency(svgContent);

      // Check for animation rules
      this.checkAnimations(svgContent);
    } catch (e) {
      this.violations.push({
        type: 'parse_error',
        severity: 'error',
        message: `Failed to parse SVG: ${e.message}`,
      });
      this.score = 0;
    }

    // Calculate compliance score
    this.calculateScore();

    return {
      compliance_score: this.score,
      violations: this.violations,
      warnings: this.warnings,
    };
  }

  /**
   * Validate CSS content
   */
  validateCSS(cssContent) {
    this.violations = [];
    this.warnings = [];
    this.score = 1.0;

    try {
      // Check for valid color values
      this.checkCSSColors(cssContent);

      // Check for allowed properties
      this.checkCSSProperties(cssContent);

      // Check for transform restrictions
      this.checkCSSTransforms(cssContent);
    } catch (e) {
      this.violations.push({
        type: 'parse_error',
        severity: 'error',
        message: `Failed to parse CSS: ${e.message}`,
      });
      this.score = 0;
    }

    this.calculateScore();

    return {
      compliance_score: this.score,
      violations: this.violations,
      warnings: this.warnings,
    };
  }

  checkGeometryTransforms(svgContent) {
    const transformRegex = /transform\s*=\s*["']([^"']+)["']/gi;
    const matches = svgContent.matchAll(transformRegex);

    const forbidden = ['rotate', 'skew', 'scale'];

    for (const match of matches) {
      const transform = match[1].toLowerCase();

      for (const keyword of forbidden) {
        if (transform.includes(keyword)) {
          let severity = 'warning';
          if (keyword === 'rotate' || keyword === 'skew') {
            severity = 'error';
          }

          this.violations.push({
            type: 'geometry_alteration',
            severity,
            message: `Detected forbidden transform: ${keyword}`,
            location: match[0],
          });
        }
      }
    }
  }

  checkColorPalette(svgContent) {
    const colorRegex = /(fill|stroke)\s*=\s*["']([^"']+)["']/gi;
    const matches = svgContent.matchAll(colorRegex);

    if (!this.tokens.colors) return;

    const allowedColors = this.getAllowedColors();

    for (const match of matches) {
      const colorValue = match[2].toLowerCase().trim();

      if (colorValue === 'none' || colorValue === 'transparent') continue;

      if (!this.isColorAllowed(colorValue, allowedColors)) {
        this.warnings.push({
          type: 'color_palette_violation',
          severity: 'warning',
          message: `Color not in palette: ${colorValue}`,
          location: match[0],
        });
      }
    }
  }

  checkStrokeConsistency(svgContent) {
    const strokeRegex = /stroke-width\s*=\s*["']([^"']+)["']/gi;
    const matches = svgContent.matchAll(strokeRegex);

    const allowedWidths = Object.values(this.tokens.geometry?.stroke_widths || {});

    for (const match of matches) {
      const width = match[1].trim();
      if (!allowedWidths.includes(width)) {
        this.warnings.push({
          type: 'stroke_inconsistency',
          severity: 'warning',
          message: `Non-standard stroke width: ${width}`,
          location: match[0],
        });
      }
    }
  }

  checkAnimations(svgContent) {
    const animateRegex = /<animate[^>]*>/gi;
    const matches = svgContent.match(animateRegex) || [];

    if (matches.length > 0) {
      const allowedDurations = Object.values(this.tokens.motion?.duration || {});

      for (const match of matches) {
        const dur = match.match(/dur\s*=\s*["']([^"']+)["']/);
        if (dur && !allowedDurations.includes(dur[1])) {
          this.warnings.push({
            type: 'animation_boundary',
            severity: 'warning',
            message: `Non-standard animation duration: ${dur[1]}`,
          });
        }
      }
    }
  }

  checkCSSColors(cssContent) {
    const colorProps = ['color', 'background-color', 'border-color', 'fill', 'stroke'];
    const allowedColors = this.getAllowedColors();

    colorProps.forEach((prop) => {
      const regex = new RegExp(`${prop}\\s*:\\s*([^;]+);`, 'gi');
      const matches = cssContent.matchAll(regex);

      for (const match of matches) {
        const colorValue = match[1].trim().toLowerCase();

        if (!this.isColorAllowed(colorValue, allowedColors)) {
          if (!colorValue.startsWith('var(')) {
            this.warnings.push({
              type: 'css_color_violation',
              severity: 'warning',
              message: `CSS color not in palette: ${colorValue}`,
            });
          }
        }
      }
    });
  }

  checkCSSProperties(cssContent) {
    const forbiddenProps = ['filter', 'clip-path', 'mask'];

    forbiddenProps.forEach((prop) => {
      if (cssContent.includes(prop)) {
        this.warnings.push({
          type: 'forbidden_css_property',
          severity: 'warning',
          message: `Use of restricted property: ${prop}`,
        });
      }
    });
  }

  checkCSSTransforms(cssContent) {
    const transformRegex = /transform\s*:\s*([^;]+);/gi;
    const matches = cssContent.matchAll(transformRegex);

    const forbidden = ['rotate', 'skew', 'scale\\('];

    for (const match of matches) {
      const transform = match[1].toLowerCase();

      for (const keyword of forbidden) {
        if (transform.includes(keyword)) {
          this.violations.push({
            type: 'css_transform_violation',
            severity: 'error',
            message: `Forbidden CSS transform: ${keyword}`,
            location: match[0],
          });
        }
      }
    }
  }

  getAllowedColors() {
    const allowed = new Set();

    if (this.tokens.colors) {
      const { primary, neutral } = this.tokens.colors;

      if (primary) Object.values(primary).forEach((c) => allowed.add(c.toLowerCase()));
      if (neutral) Object.values(neutral).forEach((c) => allowed.add(c.toLowerCase()));
    }

    return allowed;
  }

  isColorAllowed(color, allowedColors) {
    return allowedColors.has(color) || /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color);
  }

  calculateScore() {
    const errorPenalty = this.violations.filter((v) => v.severity === 'error').length * 0.5;
    const warningPenalty = this.warnings.length * 0.1;

    this.score = Math.max(0, 1.0 - errorPenalty - warningPenalty);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Sigil Keeper - Artifact Validator

Usage:
  sigil-validate.js [--svg|--css] <file>
  sigil-validate.js --json <file>

Options:
  --svg      Validate as SVG artifact
  --css      Validate as CSS artifact
  --json     Output as JSON
  --help     Show this help

Examples:
  sigil-validate.js --svg my-sigil.svg
  sigil-validate.js --css styles.css --json
    `);
    process.exit(0);
  }

  let format = 'text';
  let type = 'auto';
  let filePath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      format = 'json';
    } else if (args[i] === '--svg') {
      type = 'svg';
    } else if (args[i] === '--css') {
      type = 'css';
    } else if (args[i] === '--help') {
      console.log('Help text displayed above');
      process.exit(0);
    } else if (!args[i].startsWith('-')) {
      filePath = args[i];
    }
  }

  if (!filePath) {
    console.error('❌ Error: File path required');
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    if (type === 'auto') {
      type = filePath.endsWith('.svg') ? 'svg' : 'css';
    }

    const validator = new SigilValidator(designTokens);
    const result = type === 'svg' ? validator.validateSVG(content) : validator.validateCSS(content);

    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n📋 Sigil Artifact Validation Report`);
      console.log(`📄 File: ${filePath}`);
      console.log(`Type: ${type.toUpperCase()}`);
      console.log(`Compliance Score: ${(result.compliance_score * 100).toFixed(0)}%\n`);

      if (result.violations.length > 0) {
        console.log(`❌ Violations (${result.violations.length}):`);
        result.violations.forEach((v) => {
          console.log(`   [${v.severity.toUpperCase()}] ${v.type}: ${v.message}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
        result.warnings.forEach((w) => {
          console.log(`   [${w.severity.toUpperCase()}] ${w.type}: ${w.message}`);
        });
      }

      if (result.violations.length === 0 && result.warnings.length === 0) {
        console.log('✅ No violations or warnings detected!');
      }

      console.log('');
    }

    process.exit(result.compliance_score === 1.0 ? 0 : 1);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { SigilValidator };
