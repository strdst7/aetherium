import { MemoryService } from "./memory-service";

describe("MemoryService - Identity Scoped", () => {
  let memoryService: MemoryService;
  let mockCollection: any;

  beforeEach(() => {
    memoryService = new MemoryService();
    mockCollection = {
      createIndex: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    (memoryService as any).collection = mockCollection;
  });

  it("should filter memories by identity anchor", async () => {
    const identityDocs = [
      { _id: "mem_1", content: "Identity memory", embedding: [0.1, 0.2], sigil: "id_123" },
    ];
    mockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue(identityDocs),
    });

    const results = await memoryService.vectorSearch([0.1, 0.2], 0.5, 5, "id_123");

    expect(mockCollection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        embedding: { $exists: true, $type: "array" },
        sigil: "id_123",
      })
    );
  });

  it("should query all memories without identity anchor", async () => {
    const allDocs = [
      { _id: "mem_1", content: "Memory 1", embedding: [0.1, 0.2] },
      { _id: "mem_2", content: "Memory 2", embedding: [0.3, 0.4] },
    ];
    mockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue(allDocs),
    });

    const results = await memoryService.vectorSearch([0.1, 0.2], 0.5, 5);

    expect(mockCollection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        embedding: { $exists: true, $type: "array" },
      })
    );
    expect(mockCollection.find).toHaveBeenCalledWith(
      expect.not.objectContaining({
        sigil: expect.anything(),
      })
    );
  });

  it("should tag memory with identity on upsert", async () => {
    const doc = { content: "Test memory", embedding: [0.1, 0.2] };
    
    await memoryService.upsertMemory(doc, "id_123");

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          sigil: "id_123",
        }),
      }),
      expect.anything()
    );
  });

  it("should not tag memory without identity anchor", async () => {
    const doc = { content: "Test memory", embedding: [0.1, 0.2] };
    
    await memoryService.upsertMemory(doc);

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.not.objectContaining({
          sigil: expect.anything(),
        }),
      }),
      expect.anything()
    );
  });
});
