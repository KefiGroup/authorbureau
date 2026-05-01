# 05 · AB Technology Stack — Current

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- `package.json`
- `vite.config.ts`
- `supabase/config.toml`
- `mem://architecture/third-party-connector-registry-v2`

---

## Frontend

| Tech | Version | Role |
|---|---|---|
| React | 18 | UI |
| Vite | 5 | Bundler / dev server |
| TypeScript | 5 | Language |
| Tailwind CSS | v3 | Styling |
| shadcn/ui + Radix | latest | Primitive components |
| framer-motion | latest | Animation |
| react-router-dom | 6 | Routing (query-param based) |
| @tanstack/react-query | 5 | Server state |
| recharts | latest | Revenue dashboard charts |
| react-hook-form + zod | latest | Forms + validation |
| jspdf, docx, jszip | latest | Author export packages |
| pdfjs-dist, mammoth | latest | Manuscript parsing client-side |

## Backend

| Tech | Role |
|---|---|
| Lovable Cloud (Supabase) Postgres | Primary database |
| Supabase Auth | Email + Google sign-in |
| Supabase Edge Functions (Deno) | All server-side logic |
| Supabase Realtime | Reserved (not currently subscribed) |
| Supabase Storage | Audiobook + lead-magnet assets |

## AI

| Tech | Role |
|---|---|
| Lovable AI Gateway | All LLM calls (no API keys in client) |
| `openai/gpt-5.2` | Default generation model |
| `google/gemini-3-flash-preview` | Default chat model |
| `google/gemini-3-flash-image-preview` | Image / social-post composition |
| ElevenLabs (via edge function) | Audiobook narration |

## External services (5 total)

| Service | Sprint added | Notes |
|---|---|---|
| Stripe | early | Merchant of Record + Express payouts |
| Resend | early | Single sender domain `notify.authorsbureau.com` |
| Thinkific | sprint 19 | Optional course host |
| Transistor.fm | sprint 22 | Podcast RSS |
| ElevenLabs | sprint 25 | Audiobook TTS |

## Replaced / removed (history)

| Service | Removed in sprint | Replacement |
|---|---|---|
| GoHighLevel | 45 | Native ABBY Nurture Engine |
| Buffer | 37 | Manual posting + ABBY 30-day calendar |
| PayPal | 44 | Stripe Express |
| Wise | 44 | Stripe Express |
| Daily.co | 30 | Zoom links (manual paste) |

> When swapping a tool, update this table **and** add a row to `05-sprint-records/04-decision-log.md`.
