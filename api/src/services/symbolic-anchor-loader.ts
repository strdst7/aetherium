import { SymbolicAnchor } from "../types/mythic";
import * as fs from "fs";
import * as path from "path";

/**
 * Loads symbolic anchors from the design system (design/sigil/v1.json).
 * 
 * Parses the design tokens into symbolic anchors that the Mythic Module
 * can inject into prompts and use for output rewriting.
 */
export class SymbolicAnchorLoader {
  private anchors: SymbolicAnchor[] = [];
  private loaded: boolean = false;

  /**
   * Load symbolic anchors from the design system file.
   * 
   * @param filePath Path to the design system JSON file (default: design/sigil/v1.json)
   */
  async load(filePath: string = "design/sigil/v1.json"): Promise<void> {
    try {
      // Find root directory (where design/ resides)
      // If we are in api/src/services/, root is ../../../
      const possiblePaths = [
        path.resolve(process.cwd(), filePath),
        path.resolve(process.cwd(), "..", filePath),
        path.resolve(__dirname, "..", "..", "..", filePath)
      ];

      let designSystem;
      let loadedPath = "";

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf-8");
          designSystem = JSON.parse(content);
          loadedPath = p;
          break;
        }
      }

      if (!designSystem) {
        throw new Error(`Design system file not found in any of: ${possiblePaths.join(", ")}`);
      }

      this.anchors = this.parseDesignSystem(designSystem);
      this.loaded = true;
    } catch (error) {
      console.warn(`[SymbolicAnchorLoader] Failed to load design system from ${filePath}:`, error);
      // Fallback to default anchors
      this.anchors = this.getDefaultAnchors();
      this.loaded = true;
    }
  }

  /**
   * Get all loaded symbolic anchors.
   */
  getAnchors(): SymbolicAnchor[] {
    return this.anchors;
  }

  /**
   * Get anchors filtered by context.
   */
  getAnchorsByContext(context: string): SymbolicAnchor[] {
    return this.anchors.filter(a => a.context === context);
  }

  /**
   * Check if anchors have been loaded.
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  private parseDesignSystem(design: any): SymbolicAnchor[] {
    const anchors: SymbolicAnchor[] = [];

    // Parse geometry aspect ratios
    if (design.geometry?.aspect_ratios) {
      for (const [key, value] of Object.entries(design.geometry.aspect_ratios)) {
        anchors.push({
          concept: key,
          value: value as string,
          context: "geometry",
          weight: 1.0,
        });
      }
    }

    // Parse colors
    if (design.colors) {
      for (const [palette, shades] of Object.entries(design.colors)) {
        if (palette === "semantic") {
          for (const [name, value] of Object.entries(shades as Record<string, string>)) {
            anchors.push({
              concept: `color_${name}`,
              value: value,
              context: "color",
              weight: 0.8,
            });
          }
        } else {
          // Primary, accent, neutral palettes
          const mainShade = (shades as any)["500"] || (shades as any)["0"];
          if (mainShade) {
            anchors.push({
              concept: `color_${palette}`,
              value: mainShade,
              context: "color",
              weight: 0.9,
            });
          }
        }
      }
    }

    // Parse typography
    if (design.typography?.font_family) {
      for (const [key, value] of Object.entries(design.typography.font_family)) {
        anchors.push({
          concept: `font_${key}`,
          value: value as string,
          context: "typography",
          weight: 0.7,
        });
      }
    }

    // Parse sigil compliance rules
    if (design.sigil?.compliance_rules) {
      for (const rule of design.sigil.compliance_rules) {
        anchors.push({
          concept: rule.rule,
          value: rule.description,
          context: "compliance",
          weight: rule.weight,
        });
      }
    }

    return anchors;
  }

  private getDefaultAnchors(): SymbolicAnchor[] {
    return [
      {
        concept: "golden_ratio",
        value: "1.618:1",
        context: "geometry",
        weight: 1.0,
      },
      {
        concept: "sigil_core",
        value: "1:1.414",
        context: "geometry",
        weight: 1.0,
      },
      {
        concept: "color_primary",
        value: "#3498db",
        context: "color",
        weight: 0.9,
      },
      {
        concept: "color_accent",
        value: "#e74c3c",
        context: "color",
        weight: 0.9,
      },
      {
        concept: "immutable_geometry",
        value: "Sigil core geometry must not be rotated or scaled asymmetrically",
        context: "compliance",
        weight: 1.0,
      },
    ];
  }
}
