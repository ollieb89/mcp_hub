/**
 * SSE event schemas for real-time updates
 *
 * CURRENT API FORMAT (flat structure, no envelope)
 * This schema matches the existing backend SSE event format.
 * Future migration to envelope structure documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
import { z } from 'zod';

/**
 * Core SSE event types
 */
export const SSEEventTypeSchema = z.enum([
  'heartbeat',
  'hub_state',
  'log',
  'subscription_event'
]);

/**
 * Subscription event types
 */
export const SubscriptionTypeSchema = z.enum([
  'config_changed',
  'servers_updating',
  'servers_updated',
  'tool_list_changed',
  'resource_list_changed',
  'prompt_list_changed',
  'workspaces_updated'
]);

/**
 * Hub state values
 */
export const HubStateSchema = z.enum([
  'starting',
  'ready',
  'restarting',
  'restarted',
  'stopped',
  'stopping',
  'error'
]);

/**
 * Heartbeat event payload
 */
export const HeartbeatEventSchema = z.object({
  connections: z.number(),
  timestamp: z.string().datetime()
});

/**
 * Hub state event payload
 */
export const HubStateEventSchema = z.object({
  state: HubStateSchema,
  server_id: z.string(),
  pid: z.number(),
  port: z.number(),
  timestamp: z.string().datetime(),
  message: z.string().optional(),
  code: z.string().optional(),
  data: z.unknown().optional()
});

/**
 * Subscription event payload
 */
export const SubscriptionEventSchema = z.object({
  type: SubscriptionTypeSchema,
  changes: z.object({
    added: z.array(z.string()).optional(),
    removed: z.array(z.string()).optional(),
    modified: z.array(z.string()).optional()
  }).optional(),
  data: z.unknown().optional()
});

/**
 * Log event payload
 */
export const LogEventSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  message: z.string(),
  timestamp: z.string().datetime(),
  context: z.unknown().optional()
});

// Type exports
export type SSEEventType = z.infer<typeof SSEEventTypeSchema>;
export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;
export type HubState = z.infer<typeof HubStateSchema>;
export type HeartbeatEvent = z.infer<typeof HeartbeatEventSchema>;
export type HubStateEvent = z.infer<typeof HubStateEventSchema>;
export type SubscriptionEvent = z.infer<typeof SubscriptionEventSchema>;
export type LogEvent = z.infer<typeof LogEventSchema>;
