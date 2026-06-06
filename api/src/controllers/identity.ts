import { Request, Response, Router } from "express";
import { IdentityService } from "../services/identity-service";
import {
  IdentityCreateRequest,
  IdentityUpdateRequest,
} from "../types/identity";
import { AetheriumError, ErrorCode } from "../middleware/error-handler";
import { CURRENT_API_VERSION } from "../types/api-contracts";

/**
 * IdentityController handles identity registration and retrieval.
 */
export class IdentityController {
  private service: IdentityService;

  constructor(service: IdentityService) {
    this.service = service;
  }

  /**
   * POST /identity/register
   * Register a new identity.
   */
  async register(req: Request, res: Response): Promise<void> {
    const body = req.body as IdentityCreateRequest;

    // Validate request
    this.validateCreateRequest(body);

    const identity = await this.service.createIdentity(body);

    res.status(201).json({
      identity,
      apiVersion: CURRENT_API_VERSION,
    });
  }

  /**
   * GET /identity/:id
   * Retrieve an identity by ID.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const identity = await this.service.getIdentityById(id);

    if (!identity) {
      throw new AetheriumError(
        ErrorCode.IDENTITY_NOT_FOUND,
        `Identity with id '${id}' not found`,
        { instance: req.originalUrl }
      );
    }

    res.json({
      identity,
      apiVersion: CURRENT_API_VERSION,
    });
  }

  /**
   * GET /identity
   * List all identities.
   */
  async list(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const skip = parseInt(req.query.skip as string, 10) || 0;

    const result = await this.service.listIdentities(limit, skip);

    res.json({
      identities: result.identities,
      count: result.identities.length,
      total: result.total,
      apiVersion: CURRENT_API_VERSION,
    });
  }

  /**
   * PUT /identity/:id
   * Update an existing identity.
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const body = req.body as IdentityUpdateRequest;

    // Validate request
    this.validateUpdateRequest(body);

    const identity = await this.service.updateIdentity(id, body);

    if (!identity) {
      throw new AetheriumError(
        ErrorCode.IDENTITY_NOT_FOUND,
        `Identity with id '${id}' not found`,
        { instance: req.originalUrl }
      );
    }

    res.json({
      identity,
      apiVersion: CURRENT_API_VERSION,
    });
  }

  /**
   * GET /identity/:id/versions
   * Retrieve version history for an identity.
   */
  async getVersions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const versions = await this.service.getVersionHistory(id);

    if (versions === null) {
      throw new AetheriumError(
        ErrorCode.IDENTITY_NOT_FOUND,
        `Identity with id '${id}' not found`,
        { instance: req.originalUrl }
      );
    }

    res.json({
      identityId: id,
      versions,
      count: versions.length,
      apiVersion: CURRENT_API_VERSION,
    });
  }

  /**
   * DELETE /identity/:id
   * Delete an identity.
   */
  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const deleted = await this.service.deleteIdentity(id);

    if (!deleted) {
      throw new AetheriumError(
        ErrorCode.IDENTITY_NOT_FOUND,
        `Identity with id '${id}' not found`,
        { instance: req.originalUrl }
      );
    }

    res.status(204).send();
  }

  private validateCreateRequest(req: IdentityCreateRequest): void {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    if (!req.name || typeof req.name !== "string" || req.name.trim().length === 0) {
      errors.push({
        field: "name",
        message: "name is required and must be a non-empty string",
        code: "MISSING_FIELD",
      });
    }

    if (!req.developerId || typeof req.developerId !== "string" || req.developerId.trim().length === 0) {
      errors.push({
        field: "developerId",
        message: "developerId is required and must be a non-empty string",
        code: "MISSING_FIELD",
      });
    }

    if (errors.length > 0) {
      throw new AetheriumError(
        ErrorCode.INVALID_REQUEST,
        "Identity registration validation failed",
        { errors }
      );
    }
  }

  private validateUpdateRequest(req: IdentityUpdateRequest): void {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Require at least one updatable field
    if (req.name === undefined && req.config === undefined) {
      errors.push({
        field: "body",
        message: "At least one field (name, config) must be provided for update",
        code: "MISSING_FIELD",
      });
    }

    if (req.name !== undefined && (typeof req.name !== "string" || req.name.trim().length === 0)) {
      errors.push({
        field: "name",
        message: "name must be a non-empty string",
        code: "INVALID_FIELD_TYPE",
      });
    }

    if (errors.length > 0) {
      throw new AetheriumError(
        ErrorCode.INVALID_REQUEST,
        "Identity update validation failed",
        { errors }
      );
    }
  }
}

/**
 * Creates Express router for identity endpoints.
 */
export function createIdentityRouter(service: IdentityService): Router {
  const router = Router();
  const controller = new IdentityController(service);

  router.post("/identity/register", (req, res, next) => {
    controller.register(req, res).catch(next);
  });

  router.get("/identity", (req, res, next) => {
    controller.list(req, res).catch(next);
  });

  router.get("/identity/:id", (req, res, next) => {
    controller.getById(req, res).catch(next);
  });

  router.put("/identity/:id", (req, res, next) => {
    controller.update(req, res).catch(next);
  });

  router.get("/identity/:id/versions", (req, res, next) => {
    controller.getVersions(req, res).catch(next);
  });

  router.delete("/identity/:id", (req, res, next) => {
    controller.delete(req, res).catch(next);
  });

  return router;
}
