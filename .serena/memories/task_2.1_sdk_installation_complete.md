# Task 2.1: SDK Installation Complete ✅

**Date**: 2025-10-29  
**Status**: Complete  
**Duration**: 10 minutes  

## Installed Packages

Both official LLM SDKs are successfully installed:

```json
{
  "openai": "6.7.0",
  "@anthropic-ai/sdk": "0.68.0"
}
```

**Note**: Versions are newer than workflow specification (4.104.0 and 0.27.0), providing latest features and bug fixes.

## SDK Research Findings (Context7)

### OpenAI SDK (`openai` v6.7.0)

**Initialization Pattern:**
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: config.baseURL,  // Optional custom endpoint
  maxRetries: 3,            // Default: 2
  timeout: 30 * 1000,       // Default: 10 minutes
});
```

**Error Types:**
- `OpenAI.APIError` - Base API error with `request_id`, `status`, `message`
- `OpenAI.RateLimitError` - 429 errors with `retry-after` header
- `OpenAI.AuthenticationError` - 401 invalid API key
- `OpenAI.PermissionDeniedError` - 403 insufficient permissions
- `OpenAI.NotFoundError` - 404 resource not found
- `OpenAI.BadRequestError` - 400 bad request
- `OpenAI.UnprocessableEntityError` - 422 validation errors
- `OpenAI.InternalServerError` - 5xx server errors
- `OpenAI.APIConnectionError` - Network connection failures
- `OpenAI.APIConnectionTimeoutError` - Request timeout
- `OpenAI.APIUserAbortError` - User-aborted request

**Chat Completions:**
```typescript
const completion = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'User message' }
  ],
  temperature: 0,
  max_tokens: 20
});

const content = completion.choices[0]?.message?.content;
```

**Error Handling Pattern:**
```typescript
try {
  const completion = await client.chat.completions.create({...});
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    logger.error(`OpenAI API error: ${error.status}`, {
      requestId: error.request_id,
      code: error.code,
      type: error.type
    });
  } else if (error instanceof OpenAI.APIConnectionError) {
    logger.error('Connection error:', error.message);
  }
  throw error;
}
```

### Anthropic SDK (`@anthropic-ai/sdk` v0.68.0)

**Initialization Pattern:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: config.baseURL,  // Optional
  maxRetries: 2,            // Default: 2
  timeout: 30 * 1000,       // Default: 10 minutes
});
```

**Error Types:**
- `Anthropic.APIError` - Base API error with `status`, `name`, `headers`
- Additional error types similar to OpenAI SDK structure

**Messages API:**
```typescript
const message = await client.messages.create({
  model: 'claude-3-haiku-20240307',
  max_tokens: 20,
  messages: [{ role: 'user', content: 'User message' }],
  system: 'System prompt',
  temperature: 0
});

const content = message.content[0]?.text;
```

**Error Handling Pattern:**
```typescript
try {
  const message = await client.messages.create({...});
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    logger.error(`Anthropic API error: ${error.status}`, {
      name: error.name,
      headers: error.headers
    });
  }
  throw error;
}
```

## Key Configuration Differences

| Feature | OpenAI SDK | Anthropic SDK |
|---------|-----------|---------------|
| Default maxRetries | 2 | 2 |
| Timeout Default | 10 minutes | 10 minutes |
| Request ID | `error.request_id` | Via headers |
| System Prompt | In messages array | Separate `system` param |
| Response Path | `choices[0].message.content` | `content[0].text` |

## Acceptance Criteria ✅

- [x] Both packages installed successfully (openai@6.7.0, @anthropic-ai/sdk@0.68.0)
- [x] No dependency conflicts or peer warnings
- [x] Package versions documented
- [x] SDK patterns researched via Context7
- [x] Initialization patterns documented
- [x] Error types cataloged
- [x] Retry configuration understood

## Next Steps

Proceed to **Task 2.2**: Refactor OpenAIProvider with SDK
- Replace fetch-based implementation
- Implement typed error handling
- Configure retries and timeout
- Add request ID logging
