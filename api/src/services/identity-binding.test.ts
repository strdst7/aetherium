import { IdentityBindingService } from "./identity-binding";
import { IdentityService } from "./identity-service";
import { SigilIdentity } from "../types/identity";

jest.mock("./identity-service");

describe("IdentityBindingService", () => {
  let mockIdentityService: jest.Mocked<IdentityService>;
  let bindingService: IdentityBindingService;

  const mockIdentity: SigilIdentity = {
    id: "id_123",
    name: "Test Developer",
    developerId: "dev@example.com",
    sigilHash: "sig_abc123",
    version: 1,
    config: {
      customRules: ["must contain: hello", "must not contain: forbidden"],
    },
    versions: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    mockIdentityService = {
      getIdentityById: jest.fn(),
    } as any;

    bindingService = new IdentityBindingService(mockIdentityService);
  });

  afterEach(() => {
    bindingService.clearCache();
  });

  describe("resolve", () => {
    it("should return identity when found", async () => {
      mockIdentityService.getIdentityById.mockResolvedValue(mockIdentity);

      const result = await bindingService.resolve("id_123");

      expect(result).toEqual(mockIdentity);
      expect(mockIdentityService.getIdentityById).toHaveBeenCalledWith("id_123");
    });

    it("should return null when not found", async () => {
      mockIdentityService.getIdentityById.mockResolvedValue(null);

      const result = await bindingService.resolve("nonexistent");

      expect(result).toBeNull();
    });

    it("should cache resolved identities", async () => {
      mockIdentityService.getIdentityById.mockResolvedValue(mockIdentity);

      // First call — should hit service
      await bindingService.resolve("id_123");
      expect(mockIdentityService.getIdentityById).toHaveBeenCalledTimes(1);

      // Second call — should hit cache
      const result = await bindingService.resolve("id_123");
      expect(result).toEqual(mockIdentity);
      expect(mockIdentityService.getIdentityById).toHaveBeenCalledTimes(1); // No additional call
    });

    it("should cache expire after TTL", async () => {
      mockIdentityService.getIdentityById.mockResolvedValue(mockIdentity);
      bindingService.clearCache();
      
      // Create a binding service with very short TTL
      const shortTtlService = new IdentityBindingService(mockIdentityService);
      (shortTtlService as any).cacheTtlMs = 1; // 1ms TTL
      
      // First call
      await shortTtlService.resolve("id_123");
      expect(mockIdentityService.getIdentityById).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second call — should hit service again
      await shortTtlService.resolve("id_123");
      expect(mockIdentityService.getIdentityById).toHaveBeenCalledTimes(2);
    });
  });

  describe("resolveOrThrow", () => {
    it("should return identity when found", async () => {
      mockIdentityService.getIdentityById.mockResolvedValue(mockIdentity);

      const result = await bindingService.resolveOrThrow("id_123");

      expect(result).toEqual(mockIdentity);
    });

    it("should throw when not found", async () => {
      mockIdentityService.getIdentityById.mockResolvedValue(null);

      await expect(bindingService.resolveOrThrow("nonexistent")).rejects.toThrow(
        "Identity with anchor 'nonexistent' not found"
      );
    });
  });

  describe("clearCache", () => {
    it("should clear the cache", async () => {
      mockIdentityService.getIdentityById.mockResolvedValue(mockIdentity);
      
      await bindingService.resolve("id_123");
      expect(bindingService.getCacheSize()).toBe(1);

      bindingService.clearCache();
      expect(bindingService.getCacheSize()).toBe(0);
    });
  });

  describe("latency", () => {
    it("should log warning if latency exceeds 200ms", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      
      mockIdentityService.getIdentityById.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 250)); // Simulate slow DB
        return mockIdentity;
      });

      await bindingService.resolve("id_123");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("exceeded 200ms threshold")
      );

      consoleSpy.mockRestore();
    });
  });
});
