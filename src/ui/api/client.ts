import { z } from 'zod';
import { ErrorResponseSchema } from './schemas/common.schema';

const defaultHeaders = {
  "Content-Type": "application/json",
} as const;

/**
 * Custom API Error class with structured error information
 */
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public requestId?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Type-safe API request wrapper with Zod validation
 *
 * @param path - API endpoint path
 * @param schema - Zod schema for response validation
 * @param init - Fetch request options
 * @returns Validated response data
 * @throws APIError for API errors or validation failures
 */
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init?.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // Validate error response
    const errorResult = ErrorResponseSchema.safeParse(data);

    if (errorResult.success) {
      throw new APIError(
        errorResult.data.code,
        errorResult.data.error,
        errorResult.data.data as Record<string, unknown> | undefined
      );
    }

    // Fallback for non-standard errors
    throw new APIError(
      'UNKNOWN_ERROR',
      data.message || response.statusText,
      data
    );
  }

  // Validate success response
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new APIError(
      'VALIDATION_ERROR',
      'Response validation failed',
      { errors: result.error.issues }
    );
  }

  return result.data;
}
