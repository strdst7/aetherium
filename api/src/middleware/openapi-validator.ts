/**
 * OpenAPI Validation Middleware
 * 
 * Provides runtime validation of API responses against the OpenAPI schema.
 * This is a lightweight validator that checks required fields and types.
 * For production, consider using a full OpenAPI validator like `openapi-validator-middleware`.
 */

import { Request, Response, NextFunction } from "express";
import { AetheriumError, ErrorCode } from "./error-handler";

/**
 * Validates that a ReasonResponse has all required fields.
 */
export function validateReasonResponse(response: any): void {
  const requiredFields = [
    "id",
    "output",
    "status",
    "identity_anchor",
    "reasoning",
    "apiVersion",
  ];

  for (const field of requiredFields) {
    if (!(field in response)) {
      throw new AetheriumError(
        ErrorCode.INVALID_REQUEST,
        `Missing required field in response: ${field}`,
        {
          errors: [{ field, message: "Required field missing", code: "MISSING_FIELD" }],
        }
      );
    }
  }

  // Validate status enum
  const validStatuses = ["approved", "refine", "reject"];
  if (!validStatuses.includes(response.status)) {
    throw new AetheriumError(
      ErrorCode.INVALID_FIELD_TYPE,
      `Invalid status value: ${response.status}`,
      {
        errors: [
          {
            field: "status",
            message: `Must be one of: ${validStatuses.join(", ")}`,
            code: "INVALID_FIELD_TYPE",
          },
        ],
      }
    );
  }

  // Validate reasoning structure
  if (!response.reasoning?.orchestrator || !response.reasoning?.reflective || !response.reasoning?.trace) {
    throw new AetheriumError(
      ErrorCode.INVALID_REQUEST,
      "Invalid reasoning structure",
      {
        errors: [{ field: "reasoning", message: "Must contain orchestrator, reflective, and trace", code: "INVALID_FIELD_TYPE" }],
      }
    );
  }

  // Validate apiVersion format (SemVer)
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(response.apiVersion)) {
    throw new AetheriumError(
      ErrorCode.INVALID_FIELD_TYPE,
      `Invalid apiVersion format: ${response.apiVersion}`,
      {
        errors: [
          {
            field: "apiVersion",
            message: "Must be a valid SemVer string (e.g., 1.0.0)",
            code: "INVALID_FIELD_TYPE",
          },
        ],
      }
    );
  }
}

/**
 * Validates that a ReasonRequest has all required fields.
 */
export function validateReasonRequest(request: any): void {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (!request.identity_anchor || typeof request.identity_anchor !== "string") {
    errors.push({
      field: "identity_anchor",
      message: "identity_anchor is required and must be a string",
      code: "MISSING_FIELD",
    });
  }

  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    errors.push({
      field: "messages",
      message: "messages array is required and must not be empty",
      code: "MISSING_FIELD",
    });
  } else {
    request.messages.forEach((msg: any, index: number) => {
      if (!msg.role || !msg.content) {
        errors.push({
          field: `messages[${index}]`,
          message: "Each message must have 'role' and 'content' fields",
          code: "MISSING_FIELD",
        });
      }
    });
  }

  if (request.options?.maxTokens !== undefined && request.options.maxTokens < 1) {
    errors.push({
      field: "options.maxTokens",
      message: "maxTokens must be greater than 0",
      code: "FIELD_OUT_OF_RANGE",
    });
  }

  if (request.options?.temperature !== undefined && (request.options.temperature < 0 || request.options.temperature > 2)) {
    errors.push({
      field: "options.temperature",
      message: "temperature must be between 0 and 2",
      code: "FIELD_OUT_OF_RANGE",
    });
  }

  if (request.options?.memoryK !== undefined && request.options.memoryK < 1) {
    errors.push({
      field: "options.memoryK",
      message: "memoryK must be greater than 0",
      code: "FIELD_OUT_OF_RANGE",
    });
  }

  if (request.options?.memoryAlpha !== undefined && (request.options.memoryAlpha < 0 || request.options.memoryAlpha > 1)) {
    errors.push({
      field: "options.memoryAlpha",
      message: "memoryAlpha must be between 0 and 1",
      code: "FIELD_OUT_OF_RANGE",
    });
  }

  if (errors.length > 0) {
    throw new AetheriumError(
      ErrorCode.INVALID_REQUEST,
      "Request validation failed",
      { errors }
    );
  }
}

/**
 * Express middleware that validates ReasonRequest before processing.
 */
export function validateRequestMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    validateReasonRequest(req.body);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Express middleware that validates ReasonResponse after processing.
 * Note: This wraps the response to intercept json() calls.
 */
export function validateResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = function(body: any): Response {
    // Only validate ReasonResponse objects
    if (body && typeof body === "object" && "id" in body && "output" in body) {
      try {
        validateReasonResponse(body);
      } catch (error) {
        // Log validation error but don't block the response
        console.warn("[OpenAPI Validator] Response validation warning:", error instanceof Error ? error.message : String(error));
      }
    }
    
    return originalJson(body);
  };

  next();
}
