import { describe, it, expect } from 'vitest';
import {
  TimestampSchema,
  BaseResponseSchema,
  PaginationSchema,
  ErrorResponseSchema,
} from '../common.schema';

describe('TimestampSchema', () => {
  it('should validate valid ISO 8601 datetime strings', () => {
    expect(() => TimestampSchema.parse('2025-01-08T12:00:00.000Z')).not.toThrow();
    expect(() => TimestampSchema.parse('2025-01-08T12:00:00.123Z')).not.toThrow();
    expect(() => TimestampSchema.parse('2025-01-08T12:00:00Z')).not.toThrow(); // Milliseconds optional
  });

  it('should reject invalid datetime strings', () => {
    expect(() => TimestampSchema.parse('2025-01-08')).toThrow();
    expect(() => TimestampSchema.parse('12:00:00')).toThrow();
    expect(() => TimestampSchema.parse('invalid')).toThrow();
  });
});

describe('BaseResponseSchema', () => {
  it('should validate minimal base response', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
    };

    expect(() => BaseResponseSchema.parse(response)).not.toThrow();
  });

  it('should validate base response with optional requestId', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
        requestId: 'req-123',
      },
    };

    expect(() => BaseResponseSchema.parse(response)).not.toThrow();
  });

  it('should reject invalid status', () => {
    const response = {
      status: 'invalid',
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
    };

    expect(() => BaseResponseSchema.parse(response)).toThrow();
  });

  it('should reject missing required fields', () => {
    expect(() => BaseResponseSchema.parse({})).toThrow();
    expect(() =>
      BaseResponseSchema.parse({
        status: 'success',
      })
    ).toThrow();
  });
});

describe('PaginationSchema', () => {
  it('should validate complete pagination info', () => {
    const pagination = {
      page: 1,
      pageSize: 20,
      totalPages: 5,
      totalItems: 100,
      hasNext: true,
      hasPrev: false,
    };

    expect(() => PaginationSchema.parse(pagination)).not.toThrow();
  });

  it('should reject invalid page numbers', () => {
    const pagination = {
      page: 0, // must be positive
      pageSize: 20,
      totalPages: 5,
      totalItems: 100,
      hasNext: true,
      hasPrev: false,
    };

    expect(() => PaginationSchema.parse(pagination)).toThrow();
  });

  it('should reject negative totals', () => {
    const pagination = {
      page: 1,
      pageSize: 20,
      totalPages: -1, // invalid
      totalItems: 100,
      hasNext: true,
      hasPrev: false,
    };

    expect(() => PaginationSchema.parse(pagination)).toThrow();
  });

  it('should reject non-integer values', () => {
    const pagination = {
      page: 1.5, // must be integer
      pageSize: 20,
      totalPages: 5,
      totalItems: 100,
      hasNext: true,
      hasPrev: false,
    };

    expect(() => PaginationSchema.parse(pagination)).toThrow();
  });
});

describe('ErrorResponseSchema', () => {
  it('should validate minimal error response', () => {
    const error = {
      status: 'error' as const,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred',
      },
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
    };

    expect(() => ErrorResponseSchema.parse(error)).not.toThrow();
  });

  it('should validate error with all optional fields', () => {
    const error = {
      status: 'error' as const,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: {
          field: 'username',
          reason: 'too short',
        },
        requestId: 'req-456',
      },
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
        requestId: 'req-456',
      },
    };

    expect(() => ErrorResponseSchema.parse(error)).not.toThrow();
  });

  it('should reject invalid status', () => {
    const error = {
      status: 'success', // wrong status for error
      error: {
        code: 'ERROR',
        message: 'Error',
      },
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
    };

    expect(() => ErrorResponseSchema.parse(error)).toThrow();
  });

  it('should reject missing required error fields', () => {
    const error = {
      status: 'error' as const,
      error: {
        // missing code and message
      },
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
    };

    expect(() => ErrorResponseSchema.parse(error)).toThrow();
  });
});
