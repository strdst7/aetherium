import { Request, Response, NextFunction } from "express";
import { CURRENT_API_VERSION } from "../types/api-contracts";

export interface VersionedRequest extends Request {
  apiVersion?: string;
}

/**
 * Supported API versions in order of preference (most recent first).
 */
const SUPPORTED_VERSIONS: string[] = [CURRENT_API_VERSION];

/**
 * Version negotiation middleware.
 * 
 * Accepts version via:
 * 1. Accept-Version header (preferred)
 * 2. X-API-Version header
 * 3. ?apiVersion query parameter
 * 
 * If no version is specified, defaults to CURRENT_API_VERSION.
 * If an unsupported version is requested, returns 404 with Problem Details.
 */
export function versionNegotiation(
  req: VersionedRequest,
  res: Response,
  next: NextFunction
): void {
  const acceptVersion = req.headers["accept-version"] as string;
  const xApiVersion = req.headers["x-api-version"] as string;
  const queryVersion = req.query.apiVersion as string;

  const requestedVersion = acceptVersion || xApiVersion || queryVersion || CURRENT_API_VERSION;

  // Check if version is supported
  if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
    res.status(404).json({
      type: "https://api.aetherium.io/errors/unsupported-version",
      title: "Unsupported API Version",
      status: 404,
      detail: `API version '${requestedVersion}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(", ")}`,
      instance: req.originalUrl,
    });
    return;
  }

  // Attach version to request for downstream use
  req.apiVersion = requestedVersion;

  // Add version headers to response
  res.setHeader("API-Version", requestedVersion);
  res.setHeader("Supported-Versions", SUPPORTED_VERSIONS.join(", "));

  next();
}

/**
 * Middleware to add version info to all JSON responses.
 */
export function addVersionToResponse(
  req: VersionedRequest,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = function(body: any): Response {
    if (body && typeof body === "object" && !body.apiVersion) {
      body.apiVersion = req.apiVersion || CURRENT_API_VERSION;
    }
    return originalJson(body);
  };

  next();
}
