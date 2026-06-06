import express from 'express';
import request from 'supertest';
import { createMemoryRouter } from './memory';
import { MemoryService } from '../services/memory-service';

describe('MemoryController', () => {
  let app: express.Application;
  let mockMemoryService: jest.Mocked<MemoryService>;

  beforeEach(() => {
    mockMemoryService = {
      getAll: jest.fn(),
      embedQuery: jest.fn(),
      vectorSearch: jest.fn(),
    } as any;

    app = express();
    app.use(express.json());
    app.use('/', createMemoryRouter(mockMemoryService));
  });

  describe('GET /v1/memory/all', () => {
    it('should return all memories', async () => {
      const mockDocs = [{ id: '1', content: 'mem 1' }, { id: '2', content: 'mem 2' }];
      mockMemoryService.getAll.mockResolvedValue(mockDocs as any);

      const response = await request(app).get('/v1/memory/all');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDocs);
      expect(mockMemoryService.getAll).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockMemoryService.getAll.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/v1/memory/all');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'DB error' });
    });
  });

  describe('GET /v1/memory/trace', () => {
    it('should return embedding and search results', async () => {
      const mockEmbedding = [0.1, 0.2];
      const mockResults = [{ doc: { content: 'match' }, score: 0.8 }];
      
      mockMemoryService.embedQuery.mockResolvedValue(mockEmbedding);
      mockMemoryService.vectorSearch.mockResolvedValue(mockResults as any);

      const response = await request(app).get('/v1/memory/trace?query=test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        embedding: mockEmbedding,
        results: mockResults
      });
      expect(mockMemoryService.embedQuery).toHaveBeenCalledWith('test');
      expect(mockMemoryService.vectorSearch).toHaveBeenCalledWith(mockEmbedding, 0.7, 10);
    });

    it('should return 400 if query is missing', async () => {
      const response = await request(app).get('/v1/memory/trace');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Query parameter is required' });
    });
  });
});
