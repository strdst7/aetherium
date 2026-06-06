import { Request, Response, NextFunction } from "express";
import { ProblemDetails } from "../types/api-contracts";

/**
 * Error codes for Aetherium API.
 */
export enum ErrorCode {
  // Validation errors (400)
  INVALID_REQUEST = "INVALID_REQUEST",
  MISSING_FIELD = "MISSING_FIELD",
  INVALID_FIELD_TYPE = "INVALID_FIELD_TYPE",
  FIELD_OUT_OF_RANGE = "FIELD_OUT_OF_RANGE",
  
  // Authentication errors (401)
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_TOKEN = "INVALID_TOKEN",
  
  // Resource errors (404)
  IDENTITY_NOT_FOUND = "IDENTITY_NOT_FOUND",
  UNSUPPORTED_VERSION = "UNSUPPORTED_VERSION",
  
  // Tool errors (422)
  TOOL_EXECUTION_ERROR = "TOOL_EXECUTION_ERROR",
  MCP_SERVER_ERROR = "MCP_SERVER_ERROR",
  
  // Server errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  LLM_UNAVAILABLE = "LLM_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
}

/**
 * HTTP status codes for each error category.
 */
const ERROR_STATUS_CODES: Record<string, number> = {
  INVALID_REQUEST: 400,
  MISSING_FIELD: 400,
  INVALID_FIELD_TYPE: 400,
  FIELD_OUT_OF_RANGE: 400,
  UNAUTHORIZED: 401,
  INVALID_TOKEN: 401,
  IDENTITY_NOT_FOUND: 404,
  UNSUPPORTED_VERSION: 404,
  TOOL_EXECUTION_ERROR: 422,
  MCP_SERVER_ERROR: 422,
  INTERNAL_ERROR: 500,
  LLM_UNAVAILABLE: 503,
  DATABASE_ERROR: 503,
};

/**
 * Error type URIs for Problem Details.
 */
const ERROR_TYPE_URIS: Record<string, string> = {
  INVALID_REQUEST: "https://api.aetherium.io/errors/invalid-request",
  MISSING_FIELD: "https://api.aetherium.io/errors/missing-field",
  INVALID_FIELD_TYPE: "https://api.aetherium.io/errors/invalid-field-type",
  FIELD_OUT_OF_RANGE: "https://api.aetherium.io/errors/field-out-of-range",
  UNAUTHORIZED: "https://api.aetherium.io/errors/unauthorized",
  INVALID_TOKEN: "https://api.aetherium.io/errors/invalid-token",
  IDENTITY_NOT_FOUND: "https://api.aetherium.io/errors/identity-not-found",
  UNSUPPORTED_VERSION: "https://api.aetherium.io/errors/unsupported-version",
  TOOL_EXECUTION_ERROR: "https://api.aetherium.io/errors/tool-execution-error",
  MCP_SERVER_ERROR: "https://api.aetherium.io/errors/mcp-server-error",
  INTERNAL_ERROR: "https://api.aetherium.io/errors/internal-error",
  LLM_UNAVAILABLE: "https://api.aetherium.io/errors/llm-unavailable",
  DATABASE_ERROR: "https://api.aetherium.io/errors/database-error",
};

/**
 * Human-readable titles for error codes.
 */
const ERROR_TITLES: Record<string, string> = {
  INVALID_REQUEST: "Invalid Request",
  MISSING_FIELD: "Missing Required Field",
  INVALID_FIELD_TYPE: "Invalid Field Type",
  FIELD_OUT_OF_RANGE: "Field Value Out of Range",
  UNAUTHORIZED: "Unauthorized",
  INVALID_TOKEN: "Invalid Authentication Token",
  IDENTITY_NOT_FOUND: "Identity Not Found",
  UNSUPPORTED_VERSION: "Unsupported API Version",
  TOOL_EXECUTION_ERROR: "Tool Execution Failed",
  MCP_SERVER_ERROR: "MCP Server Error",
  INTERNAL_ERROR: "Internal Server Error",
  LLM_UNAVAILABLE: "LLM Service Unavailable",
  DATABASE_ERROR: "Database Error",
};

/**
 * Custom application error class with RFC 7807 support.
 */
export class AetheriumError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly type: string;
  public readonly title: string;
  public readonly errors?: Array<{ field: string; message: string; code: string }>;
  public readonly instance?: string;

  constructor(
    code: ErrorCode,
    detail: string,
    options?: {
      errors?: Array<{ field: string; message: string; code: string }>;
      instance?: string;
      cause?: Error;
    }
  ) {
    super(detail);
    this.name = "AetheriumError";
    this.code = code;
    this.status = ERROR_STATUS_CODES[code] || 500;
    this.type = ERROR_TYPE_URIS[code] || "about:blank";
    this.title = ERROR_TITLES[code] || "Unknown Error";
    this.errors = options?.errors;
    this.instance = options?.instance;
    
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
  }

  /**
   * Convert to RFC 7807 Problem Details format.
   */
  toProblemDetails(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.message,
      instance: this.instance,
      errors: this.errors,
      apiVersion: "1.0.0",
    };
  }
}

/**
 * Express error handler middleware.
 * Converts all errors to RFC 7807 Problem Details format.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AetheriumError) {
    res.status(err.status).json(err.toProblemDetails());
    return;
  }

  // Handle validation errors from ReasonController
  if (err.message && (
    err.message.includes("identity_anchor is required") ||
    err.message.includes("messages array is required") ||
    err.message.includes("Each message must have")
  )) {
    const validationError = new AetheriumError(
      ErrorCode.INVALID_REQUEST,
      err.message,
      { instance: req.originalUrl }
    );
    res.status(400).json(validationError.toProblemDetails());
    return;
  }

  // Handle range validation errors
  if (err.message && (
    err.message.includes("must be greater than") ||
    err.message.includes("must be between")
  )) {
    const rangeError = new AetheriumError(
      ErrorCode.FIELD_OUT_OF_RANGE,
      err.message,
      { instance: req.originalUrl }
    );
    res.status(400).json(rangeError.toProblemDetails());
    return;
  }

  // Generic fallback
  const genericError = new AetheriumError(
    ErrorCode.INTERNAL_ERROR,
    err.message || "An unexpected error occurred",
    { instance: req.originalUrl, cause: err }
  );
  
  res.status(500).json(genericError.toProblemDetails());
}
