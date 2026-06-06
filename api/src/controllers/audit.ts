import { Router, Request, Response } from "express";
import { AuditService } from "../services/audit-service";
import { AuditQuery } from "../types/audit";
import { CURRENT_API_VERSION } from "../types/api-contracts";

export class AuditController {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  async getAuditRecords(req: Request, res: Response): Promise<void> {
    try {
      // Validate required parameter
      const identityId = req.query.identity_id as string;
      if (!identityId) {
        res.status(400).json({
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "identity_id is required",
          instance: req.originalUrl,
        });
        return;
      }

      // Validate date parameters
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      if (from && !this.isValidISODate(from)) {
        res.status(400).json({
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "from must be a valid ISO 8601 date",
          instance: req.originalUrl,
        });
        return;
      }

      if (to && !this.isValidISODate(to)) {
        res.status(400).json({
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "to must be a valid ISO 8601 date",
          instance: req.originalUrl,
        });
        return;
      }

      // Validate limit
      let limit: number | undefined;
      if (req.query.limit) {
        limit = parseInt(req.query.limit as string, 10);
        if (isNaN(limit) || limit < 1 || limit > 500) {
          res.status(400).json({
            type: "about:blank",
            title: "Bad Request",
            status: 400,
            detail: "limit must be a number between 1 and 500",
            instance: req.originalUrl,
          });
          return;
        }
      }

      // Validate offset
      let offset: number | undefined;
      if (req.query.offset) {
        offset = parseInt(req.query.offset as string, 10);
        if (isNaN(offset) || offset < 0) {
          res.status(400).json({
            type: "about:blank",
            title: "Bad Request",
            status: 400,
            detail: "offset must be a non-negative number",
            instance: req.originalUrl,
          });
          return;
        }
      }

      // Validate sort
      const sort = req.query.sort as string | undefined;
      if (sort && sort !== "asc" && sort !== "desc") {
        res.status(400).json({
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "sort must be 'asc' or 'desc'",
          instance: req.originalUrl,
        });
        return;
      }

      // Build query
      const query: AuditQuery = {
        identityId,
        from,
        to,
        limit,
        offset,
        sort: sort as "asc" | "desc" | undefined,
      };

      const result = await this.auditService.query(query);
      result.apiVersion = CURRENT_API_VERSION;

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: message,
        instance: req.originalUrl,
      });
    }
  }

  private isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.includes("T");
  }
}

export function createAuditRouter(auditService: AuditService): Router {
  const router = Router();
  const controller = new AuditController(auditService);

  // Only GET endpoint — no POST, PUT, DELETE, PATCH for immutability
  router.get("/audit", (req, res) => controller.getAuditRecords(req, res));

  // TODO(v2): Add GET /audit/:recordId/verify endpoint for hash-based tamper detection.
  // This would recompute the SHA-256 hash server-side and compare it against the stored hash,
  // giving clients a trustable verification path independent of re-implementing the hashing logic.
  // Blocked on: v2 audit API contract definition.

  return router;
}
