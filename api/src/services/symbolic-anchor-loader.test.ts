import { SymbolicAnchorLoader } from "./symbolic-anchor-loader";
import * as fs from "fs";
import * as path from "path";

describe("SymbolicAnchorLoader", () => {
  let loader: SymbolicAnchorLoader;
  const testDesignPath = "design/sigil/v1.json";

  beforeEach(() => {
    loader = new SymbolicAnchorLoader();
  });

  describe("load", () => {
    it("should load anchors from existing design system", async () => {
      // Ensure the file exists in the workspace
      const rootPath = path.resolve(process.cwd(), "..", testDesignPath);
      if (fs.existsSync(rootPath)) {
        await loader.load(testDesignPath);
        expect(loader.isLoaded()).toBe(true);
        const anchors = loader.getAnchors();
        expect(anchors.length).toBeGreaterThan(0);
        
        // Verify some known categories
        const geometry = loader.getAnchorsByContext("geometry");
        expect(geometry.length).toBeGreaterThan(0);
      } else {
        console.warn("Skipping test: design system file not found at " + rootPath);
      }
    });

    it("should fallback to default anchors if file missing", async () => {
      await loader.load("non-existent.json");
      expect(loader.isLoaded()).toBe(true);
      const anchors = loader.getAnchors();
      expect(anchors.length).toBeGreaterThan(0);
      
      const goldenRatio = anchors.find(a => a.concept === "golden_ratio");
      expect(goldenRatio).toBeDefined();
      expect(goldenRatio?.value).toBe("1.618:1");
    });
  });

  describe("getAnchorsByContext", () => {
    it("should filter anchors by context", async () => {
      await loader.load("non-existent.json"); // Load defaults
      
      const geometry = loader.getAnchorsByContext("geometry");
      const compliance = loader.getAnchorsByContext("compliance");
      
      expect(geometry.every(a => a.context === "geometry")).toBe(true);
      expect(compliance.every(a => a.context === "compliance")).toBe(true);
      expect(geometry.length).toBeGreaterThan(0);
      expect(compliance.length).toBeGreaterThan(0);
    });
  });
});
