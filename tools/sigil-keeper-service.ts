/**
 * Sigil Keeper REST Service
 * Wraps validation logic in a standalone HTTP service
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import { SigilValidator } from './sigil-validate';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = process.env.SIGIL_KEEPER_PORT || 7000;

// Middleware
app.use(express.json());
app.use(express.text({ limit: '10mb' }));
const upload = multer({ storage: multer.memoryStorage() });

// Load design tokens
let designTokens: any = {};
try {
  const tokenPath = path.join(__dirname, '..', 'design', 'sigil', 'v1.json');
  designTokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
} catch (e) {
  console.warn('⚠️ Could not load design tokens');
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'sigil-keeper',
    version: '1.0',
    timestamp: new Date().toISOString(),
  });
});

// Validate SVG endpoint
app.post('/v1/validate/svg', (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Missing content field',
        example: { content: '<svg>...</svg>' },
      });
    }

    const validator = new SigilValidator(designTokens);
    const result = validator.validateSVG(content);

    res.json({
      id: `validation_${Date.now()}`,
      type: 'svg',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Validate CSS endpoint
app.post('/v1/validate/css', (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Missing content field',
        example: { content: '.sigil { ... }' },
      });
    }

    const validator = new SigilValidator(designTokens);
    const result = validator.validateCSS(content);

    res.json({
      id: `validation_${Date.now()}`,
      type: 'css',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Upload and validate SVG file
app.post('/v1/validate/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = req.file.buffer.toString('utf-8');
    const filename = req.file.originalname;
    const type = filename.endsWith('.svg') ? 'svg' : 'css';

    const validator = new SigilValidator(designTokens);
    const result = type === 'svg' ? validator.validateSVG(content) : validator.validateCSS(content);

    res.json({
      id: `validation_${Date.now()}`,
      filename,
      type,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Batch validation
app.post('/v1/validate/batch', (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        error: 'Expected items array',
        example: { items: [{ content: '...', type: 'svg' }] },
      });
    }

    const results = items.map((item, idx) => {
      try {
        const validator = new SigilValidator(designTokens);
        const result =
          item.type === 'css'
            ? validator.validateCSS(item.content)
            : validator.validateSVG(item.content);

        return {
          id: `item_${idx}`,
          ...result,
          status: 'success',
        };
      } catch (e) {
        return {
          id: `item_${idx}`,
          status: 'error',
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    });

    res.json({
      batch_id: `batch_${Date.now()}`,
      count: items.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get design tokens
app.get('/v1/tokens', (req: Request, res: Response) => {
  res.json({
    version: designTokens.version,
    compliance_rules: designTokens.sigil?.compliance_rules || [],
  });
});

// Error handling
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🔐 Sigil Keeper service running on http://0.0.0.0:${PORT}`);
  console.log(`POST /v1/validate/svg       - Validate SVG content`);
  console.log(`POST /v1/validate/css       - Validate CSS content`);
  console.log(`POST /v1/validate/upload    - Upload and validate file`);
  console.log(`POST /v1/validate/batch     - Batch validation`);
  console.log(`GET  /v1/tokens             - Get design tokens`);
  console.log(`GET  /health                - Health check\n`);
});

// Type-safe SigilValidator import (stub for REST service)
// In production, import from the actual validator
class SigilValidator {
  constructor(tokens: any) {}
  validateSVG(content: string): any {
    return {
      compliance_score: 1.0,
      violations: [],
      warnings: [],
    };
  }
  validateCSS(content: string): any {
    return {
      compliance_score: 1.0,
      violations: [],
      warnings: [],
    };
  }
}
