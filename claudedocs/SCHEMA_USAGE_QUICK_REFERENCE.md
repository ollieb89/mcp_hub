# Schema Usage Quick Reference

Quick reference guide for using MCP Hub's Zod validation schemas in the UI layer.

---

## Import Patterns

### Basic Import (Recommended)
```typescript
// Import specific schemas
import { HealthResponseSchema, type HealthResponse } from '@/api/schemas';

// Import all schemas (if needed)
import * as schemas from '@/api/schemas';
```

### Individual File Import (Alternative)
```typescript
import { HealthResponseSchema } from '@/api/schemas/health.schema';
import { ServerInfoSchema } from '@/api/schemas/server.schema';
```

---

## Common Usage Patterns

### 1. Validating API Responses
```typescript
import { HealthResponseSchema, type HealthResponse } from '@/api/schemas';

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  const data = await response.json();

  // Validate and parse
  return HealthResponseSchema.parse(data);
}
```

### 2. Safe Parsing with Error Handling
```typescript
import { ServersResponseSchema, type ServersResponse } from '@/api/schemas';

async function fetchServers(): Promise<ServersResponse | null> {
  try {
    const response = await fetch('/api/servers');
    const data = await response.json();

    // Safe parse (returns { success: boolean, data?: T, error?: ZodError })
    const result = ServersResponseSchema.safeParse(data);

    if (result.success) {
      return result.data;
    } else {
      console.error('Validation failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Fetch failed:', error);
    return null;
  }
}
```

### 3. Type Inference from Schemas
```typescript
import { ServerInfoSchema } from '@/api/schemas';
import type { z } from 'zod';

// Manual type inference
type ServerInfo = z.infer<typeof ServerInfoSchema>;

// Or use exported type
import type { ServerInfo } from '@/api/schemas';
```

### 4. Partial Validation (Optional Fields Only)
```typescript
import { ConfigDataSchema } from '@/api/schemas';

// Validate only provided fields
const partialSchema = ConfigDataSchema.partial();
const validatedConfig = partialSchema.parse({ toolFiltering: { enabled: true } });
```

---

## New Schema Usage Examples

### Server Actions (Start/Stop/Refresh)
```typescript
import {
  ServerActionRequestSchema,
  ServerActionResponseSchema,
  type ServerActionRequest,
  type ServerActionResponse
} from '@/api/schemas';

async function startServer(serverName: string): Promise<ServerActionResponse> {
  // Validate request before sending
  const request: ServerActionRequest = ServerActionRequestSchema.parse({
    server_name: serverName
  });

  const response = await fetch('/api/servers/start', {
    method: 'POST',
    body: JSON.stringify(request)
  });

  const data = await response.json();

  // Validate response
  return ServerActionResponseSchema.parse(data);
}
```

### SSE Event Handling
```typescript
import {
  HeartbeatEventSchema,
  HubStateEventSchema,
  SubscriptionEventSchema,
  LogEventSchema,
  type SSEEventType,
  type HeartbeatEvent,
  type HubStateEvent,
  type SubscriptionEvent,
  type LogEvent
} from '@/api/schemas';

function handleSSEMessage(event: MessageEvent) {
  const data = JSON.parse(event.data);

  switch (data.type as SSEEventType) {
    case 'heartbeat':
      const heartbeat: HeartbeatEvent = HeartbeatEventSchema.parse(data);
      console.log(`Active connections: ${heartbeat.connections}`);
      break;

    case 'hub_state':
      const stateChange: HubStateEvent = HubStateEventSchema.parse(data);
      console.log(`Hub state changed to: ${stateChange.state}`);
      break;

    case 'subscription_event':
      const subscription: SubscriptionEvent = SubscriptionEventSchema.parse(data);
      console.log(`Subscription event: ${subscription.type}`);
      break;

    case 'log':
      const logEvent: LogEvent = LogEventSchema.parse(data);
      console.log(`[${logEvent.level}] ${logEvent.message}`);
      break;
  }
}
```

### Health Check with Optional Fields
```typescript
import { HealthResponseSchema, type HealthResponse } from '@/api/schemas';

async function fetchDetailedHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health?verbose=true');
  const data = await response.json();

  const health = HealthResponseSchema.parse(data);

  // TypeScript knows these are optional
  if (health.connections) {
    console.log(`Total connections: ${health.connections.totalConnections}`);
  }

  if (health.mcpEndpoint) {
    console.log(`MCP requests: ${health.mcpEndpoint.totalRequests}`);
  }

  if (health.workspaces) {
    console.log(`Current workspace: ${health.workspaces.current}`);
  }

  return health;
}
```

---

## React Query Integration

### Query Hook with Schema Validation
```typescript
import { useQuery } from '@tanstack/react-query';
import { ServersResponseSchema, type ServersResponse } from '@/api/schemas';

export function useServers() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: async (): Promise<ServersResponse> => {
      const response = await fetch('/api/servers');
      const data = await response.json();

      // Validate before returning
      return ServersResponseSchema.parse(data);
    }
  });
}
```

### Mutation Hook with Request/Response Validation
```typescript
import { useMutation } from '@tanstack/react-query';
import {
  ServerActionRequestSchema,
  ServerActionResponseSchema,
  type ServerActionResponse
} from '@/api/schemas';

export function useStartServer() {
  return useMutation({
    mutationFn: async (serverName: string): Promise<ServerActionResponse> => {
      // Validate request
      const request = ServerActionRequestSchema.parse({
        server_name: serverName
      });

      const response = await fetch('/api/servers/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      const data = await response.json();

      // Validate response
      return ServerActionResponseSchema.parse(data);
    }
  });
}
```

---

## Error Handling Patterns

### Comprehensive Error Handling
```typescript
import { HealthResponseSchema } from '@/api/schemas';
import { ZodError } from 'zod';

async function fetchHealthWithErrorHandling() {
  try {
    const response = await fetch('/api/health');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    try {
      return HealthResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Schema validation failed:');
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to fetch health:', error);
    throw error;
  }
}
```

### Custom Error Messages
```typescript
import { ServerStatusSchema } from '@/api/schemas';
import { z } from 'zod';

// Extend schema with custom error message
const CustomServerStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'error',
  'unauthorized',
  'disabled'
], {
  errorMap: (issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_enum_value) {
      return {
        message: `Invalid server status. Expected one of: connected, connecting, disconnected, error, unauthorized, disabled`
      };
    }
    return { message: ctx.defaultError };
  }
});
```

---

## TypeScript Integration

### Type Guards
```typescript
import { ServerStatusSchema, type ServerStatus } from '@/api/schemas';

function isValidServerStatus(status: unknown): status is ServerStatus {
  return ServerStatusSchema.safeParse(status).success;
}

// Usage
const status = 'connected';
if (isValidServerStatus(status)) {
  // TypeScript knows status is ServerStatus
  console.log(`Valid status: ${status}`);
}
```

### Discriminated Unions with SSE Events
```typescript
import {
  SSEEventTypeSchema,
  type HeartbeatEvent,
  type HubStateEvent,
  type SubscriptionEvent,
  type LogEvent
} from '@/api/schemas';

type SSEEvent =
  | { type: 'heartbeat'; data: HeartbeatEvent }
  | { type: 'hub_state'; data: HubStateEvent }
  | { type: 'subscription_event'; data: SubscriptionEvent }
  | { type: 'log'; data: LogEvent };

function handleEvent(event: SSEEvent) {
  switch (event.type) {
    case 'heartbeat':
      // TypeScript knows event.data is HeartbeatEvent
      console.log(event.data.connections);
      break;
    case 'hub_state':
      // TypeScript knows event.data is HubStateEvent
      console.log(event.data.state);
      break;
    // ... etc
  }
}
```

---

## Performance Optimization

### Schema Caching
```typescript
import { HealthResponseSchema } from '@/api/schemas';

// Schemas are immutable - cache the compiled version
const healthValidator = HealthResponseSchema.parse.bind(HealthResponseSchema);

// Reuse cached validator
async function fetchHealth() {
  const response = await fetch('/api/health');
  const data = await response.json();
  return healthValidator(data);
}
```

### Lazy Validation (Only When Needed)
```typescript
import { ConfigDataSchema } from '@/api/schemas';

let cachedConfig: ConfigData | null = null;

async function getConfig(validate: boolean = true) {
  const response = await fetch('/api/config');
  const data = await response.json();

  if (validate) {
    cachedConfig = ConfigDataSchema.parse(data.config);
    return cachedConfig;
  } else {
    // Skip validation in production for performance
    return data.config;
  }
}
```

---

## Testing with Schemas

### Mock Data Generation
```typescript
import { ServerInfoSchema } from '@/api/schemas';

// Create valid mock data
const mockServer = ServerInfoSchema.parse({
  name: 'test-server',
  displayName: 'Test Server',
  description: 'Test MCP Server',
  transportType: 'stdio',
  status: 'connected',
  error: null,
  capabilities: {
    tools: [],
    resources: [],
    resourceTemplates: [],
    prompts: []
  },
  uptime: 12345,
  lastStarted: '2025-01-08T12:00:00.000Z',
  authorizationUrl: null,
  serverInfo: { name: 'test', version: '1.0.0' },
  config_source: 'test-config.json'
});
```

### Schema-Based Test Assertions
```typescript
import { describe, it, expect } from 'vitest';
import { HealthResponseSchema } from '@/api/schemas';

describe('Health API', () => {
  it('should return valid health response', async () => {
    const response = await fetch('/api/health');
    const data = await response.json();

    // Assert schema validation passes
    expect(() => HealthResponseSchema.parse(data)).not.toThrow();
  });
});
```

---

## Common Pitfalls

### ❌ Don't Forget to Parse
```typescript
// BAD - No validation
const data = await response.json();
return data;

// GOOD - Always validate
const data = await response.json();
return HealthResponseSchema.parse(data);
```

### ❌ Don't Ignore Validation Errors
```typescript
// BAD - Silent failure
const result = schema.safeParse(data);
return result.success ? result.data : null;

// GOOD - Handle errors appropriately
const result = schema.safeParse(data);
if (!result.success) {
  console.error('Validation failed:', result.error);
  throw new ValidationError(result.error);
}
return result.data;
```

### ❌ Don't Mix Schema Versions
```typescript
// BAD - Mixing old and new imports
import { ServerStatusSchema } from './old-schemas';
import { ServerInfoSchema } from '@/api/schemas';

// GOOD - Use consistent import source
import { ServerStatusSchema, ServerInfoSchema } from '@/api/schemas';
```

---

## Schema Reference

### All Available Schemas

**Common:**
- `ErrorObjectSchema` - Error object structure
- `ErrorResponseSchema` - API error response
- `PaginationMetadataSchema` - Pagination info

**Health:**
- `HealthServerInfoSchema` - Server info in health response
- `HealthResponseSchema` - Complete health response

**Servers:**
- `ServerStatusSchema` - Server connection status enum
- `ServerInfoSchema` - Complete server information
- `ServersResponseSchema` - Server list response
- `ServerActionRequestSchema` - Start/stop/refresh request
- `ServerActionResponseSchema` - Server action response

**SSE Events:**
- `SSEEventTypeSchema` - Core event types enum
- `SubscriptionTypeSchema` - Subscription event types enum
- `HubStateSchema` - Hub state values enum
- `HeartbeatEventSchema` - Heartbeat payload
- `HubStateEventSchema` - Hub state change payload
- `SubscriptionEventSchema` - Subscription event payload
- `LogEventSchema` - Log event payload

**Tools:**
- `ToolSummarySchema` - Tool summary object
- `ToolsResponseSchema` - Tool list response

**Filtering:**
- `FilteringModeSchema` - Filtering mode enum
- `FilteringStatsSchema` - Filtering statistics

**Config:**
- `ConfigDataSchema` - Configuration data
- `ConfigResponseSchema` - Config response
- `ConfigSaveRequestSchema` - Config save request

---

**Last Updated:** 2025-11-08
**Schema Version:** Phase 2 (Post-fixes)
