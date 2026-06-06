import { MythicModule } from "./mythic-module";
import { SymbolicAnchorLoader } from "./symbolic-anchor-loader";
import { SigilIdentity } from "../types/identity";

jest.mock("./symbolic-anchor-loader");

describe("MythicModule", () => {
  let mockAnchorLoader: jest.Mocked<SymbolicAnchorLoader>;
  let mythicModule: MythicModule;

  const createIdentity = (
    name: string,
    rules: string[] = []
  ): SigilIdentity => ({
    id: "id_123",
    name,
    developerId: "dev@example.com",
    sigilHash: "sig_abc",
    version: 1,
    config: {
      customRules: rules,
    },
    versions: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  });

  beforeEach(() => {
    mockAnchorLoader = {
      load: jest.fn().mockResolvedValue(undefined),
      getAnchors: jest.fn().mockReturnValue([
        { concept: "golden_ratio", value: "1.618:1", context: "geometry", weight: 1.0 },
        { concept: "color_primary", value: "#3498db", context: "color", weight: 0.9 },
      ]),
      isLoaded: jest.fn().mockReturnValue(true),
    } as any;

    mythicModule = new MythicModule(mockAnchorLoader);
  });

  describe("generateSchema", () => {
    it("should generate schema from identity with rules", async () => {
      const identity = createIdentity("Test Identity", [
        "tone: formal",
        "must contain: hello",
      ]);

      const schema = await mythicModule.generateSchema(identity);

      expect(schema.identityId).toBe("id_123");
      expect(schema.identityName).toBe("Test Identity");
      expect(schema.tone.register).toBe("formal");
      expect(schema.tone.intensity).toBe(0.7);
      expect(schema.voice.character).toBe("authoritative");
      expect(schema.symbolicAnchors).toHaveLength(2);
      expect(schema.narrativeConstraints).toHaveLength(2);
    });

    it("should cache schema", async () => {
      const identity = createIdentity("Test Identity", ["tone: formal"]);

      const schema1 = await mythicModule.generateSchema(identity);
      const schema2 = await mythicModule.generateSchema(identity);

      expect(schema1).toBe(schema2); // Same reference
    });
  });

  describe("generatePromptContext", () => {
    it("should generate context with identity info", async () => {
      const identity = createIdentity("Test Identity", ["tone: formal"]);

      const context = await mythicModule.generatePromptContext(identity);

      expect(context.identityName).toBe("Test Identity");
      expect(context.toneContext).toContain("formal");
      expect(context.voiceContext).toContain("authoritative");
      expect(context.fullContext).toContain("Tone:");
      expect(context.fullContext).toContain("Voice:");
    });
  });

  describe("mythify", () => {
    it("should rewrite output with formal tone", async () => {
      const identity = createIdentity("Formal Identity", ["tone: formal"]);
      const rawOutput = "Hey! I can't do this, but I'm gonna try.";

      const result = await mythicModule.mythify(identity, rawOutput);

      expect(result.applied).toBe(true);
      expect(result.transformations).toContain("formalized");
      expect(result.output).toContain("cannot");
      expect(result.output).toContain("going to");
    });

    it("should rewrite output with playful tone", async () => {
      const identity = createIdentity("Playful Identity", ["tone: playful"]);
      const rawOutput = "This is a great result.";

      const result = await mythicModule.mythify(identity, rawOutput);

      expect(result.applied).toBe(true);
      expect(result.transformations).toContain("playful-ized");
      expect(result.output).toContain("awesome");
    });

    it("should rewrite output with somber tone", async () => {
      const identity = createIdentity("Somber Identity", ["tone: somber"]);
      const rawOutput = "This is an awesome result.";

      const result = await mythicModule.mythify(identity, rawOutput);

      expect(result.applied).toBe(true);
      expect(result.transformations).toContain("somber-ized");
      expect(result.output).toContain("notable");
    });

    it("should rewrite output with poetic voice", async () => {
      const identity = createIdentity("Poetic Identity", ["tone: poetic"]);
      const rawOutput = "This is a beautiful result. The colors are stunning.";

      const result = await mythicModule.mythify(identity, rawOutput);

      expect(result.applied).toBe(true);
      expect(result.transformations).toContain("poetic-ized");
    });

    it("should apply symbolic anchors", async () => {
      const identity = createIdentity("Symbolic Identity", ["tone: formal"]);
      const rawOutput = "This is a formal result about geometry and mathematical principles that govern the universe.";

      const result = await mythicModule.mythify(identity, rawOutput);

      expect(result.applied).toBe(true);
      expect(result.transformations).toContain("symbolic-anchors");
      expect(result.output).toContain("golden_ratio");
    });

    it("should return high confidence when constraints pass", async () => {
      const identity = createIdentity("Test Identity", ["must contain: hello"]);
      const rawOutput = "This result contains hello in it.";

      const result = await mythicModule.mythify(identity, rawOutput);

      expect(result.confidence).toBe(0.95);
    });

    it("should return lower confidence when constraints fail", async () => {
      const identity = createIdentity("Test Identity", ["must contain: hello"]);
      const rawOutput = "This result does not have it.";

      const result = await mythicModule.mythify(identity, rawOutput);

      expect(result.confidence).toBe(0.7);
    });
  });

  describe("getDefaultSchema", () => {
    it("should return neutral schema", () => {
      const schema = mythicModule.getDefaultSchema();

      expect(schema.identityName).toBe("Neutral");
      expect(schema.tone.register).toBe("neutral");
      expect(schema.voice.character).toBe("conversational");
      expect(schema.narrativeConstraints).toHaveLength(0);
    });
  });
});
