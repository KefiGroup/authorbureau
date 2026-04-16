

# Fix: `max_tokens` Parameter Incompatible with OpenAI GPT-5

## Root Cause

The error log shows:
```
Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.
```

The OpenAI GPT-5 model requires `max_completion_tokens` instead of `max_tokens`. This affects **7 edge functions** that all use `openai/gpt-5`.

## Fix

Replace `max_tokens` with `max_completion_tokens` in all 7 edge functions:

| File | Line | Current | Fix |
|------|------|---------|-----|
| `generate-bp01-email-marketing/index.ts` | 110 | `max_tokens: 4000` | `max_completion_tokens: 4000` |
| `generate-bp02-social-pack/index.ts` | 145 | `max_tokens: 5000` | `max_completion_tokens: 5000` |
| `generate-bp04-website/index.ts` | 126 | `max_tokens: 5000` | `max_completion_tokens: 5000` |
| `generate-bp07-coaching/index.ts` | 74 | `max_tokens: 8192` | `max_completion_tokens: 8192` |
| `generate-daily-insight/index.ts` | 85 | `max_tokens: 200` | `max_completion_tokens: 200` |
| `abby-chat/index.ts` | 138 | `max_tokens: 800` | `max_completion_tokens: 800` |
| `business-consultant/index.ts` | 3287 | `max_tokens: 6000` | `max_completion_tokens: 6000` |

After editing, all 7 functions will be redeployed. The Email Marketing generation will work immediately.

