import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

type WebinarKind =
  | 'confirmation'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'reminder_15m'
  | 'followup_sameday'
  | 'followup_day3'
  | 'followup_day7'

interface Props {
  kind?: WebinarKind
  attendeeName?: string
  webinarTitle?: string
  webinarDescription?: string
  scheduledAtFormatted?: string
  roomUrl?: string
  authorName?: string
  authorPageUrl?: string
  signOffPhrase?: string
}

const COPY: Record<WebinarKind, { preview: string; heading: string; body: (p: Required<Props>) => React.ReactNode; ctaLabel: string }> = {
  confirmation: {
    preview: "You're registered — here's what's next",
    heading: "You're in! 🎉",
    body: (p) => (
      <>
        <Text style={text}>Hi {p.attendeeName},</Text>
        <Text style={text}>You're registered for <strong>{p.webinarTitle}</strong>{p.scheduledAtFormatted ? <> on <strong>{p.scheduledAtFormatted}</strong></> : null}.</Text>
        {p.webinarDescription ? <Text style={text}>{p.webinarDescription}</Text> : null}
        <Text style={text}>I'll send you reminders 24 hours, 1 hour, and 15 minutes before we begin so you don't miss it.</Text>
      </>
    ),
    ctaLabel: 'Save your spot details',
  },
  reminder_24h: {
    preview: "Tomorrow — your webinar starts in 24 hours",
    heading: "We're on tomorrow ⏰",
    body: (p) => (
      <>
        <Text style={text}>Hi {p.attendeeName},</Text>
        <Text style={text}>Quick reminder — <strong>{p.webinarTitle}</strong> starts tomorrow{p.scheduledAtFormatted ? <> at <strong>{p.scheduledAtFormatted}</strong></> : null}.</Text>
        <Text style={text}>Block out the time and have a notepad ready.</Text>
      </>
    ),
    ctaLabel: 'Get the room link',
  },
  reminder_1h: {
    preview: 'Starting in 1 hour',
    heading: 'See you in an hour',
    body: (p) => (
      <>
        <Text style={text}>Hi {p.attendeeName},</Text>
        <Text style={text}><strong>{p.webinarTitle}</strong> starts in <strong>1 hour</strong>. The room link is below — bookmark it now.</Text>
      </>
    ),
    ctaLabel: 'Open the webinar room',
  },
  reminder_15m: {
    preview: 'Starting in 15 minutes — join now',
    heading: "We're starting in 15 minutes",
    body: (p) => (
      <>
        <Text style={text}>Hi {p.attendeeName},</Text>
        <Text style={text}>Doors are opening for <strong>{p.webinarTitle}</strong>. Click below to join.</Text>
      </>
    ),
    ctaLabel: 'Join the webinar now →',
  },
  followup_sameday: {
    preview: 'Thanks for joining — recap inside',
    heading: 'Thanks for being there',
    body: (p) => (
      <>
        <Text style={text}>Hi {p.attendeeName},</Text>
        <Text style={text}>Thank you for joining <strong>{p.webinarTitle}</strong> today. Here's the room link in case you'd like to revisit it.</Text>
        <Text style={text}>I'd love to hear what landed for you most — just reply to this email.</Text>
      </>
    ),
    ctaLabel: 'Revisit the room',
  },
  followup_day3: {
    preview: 'Putting what we covered into action',
    heading: 'How is it landing?',
    body: (p) => (
      <>
        <Text style={text}>Hi {p.attendeeName},</Text>
        <Text style={text}>It's been a few days since <strong>{p.webinarTitle}</strong>. What was the biggest takeaway you've started applying?</Text>
        <Text style={text}>If you'd like to keep exploring, my author page has more resources to take you further.</Text>
      </>
    ),
    ctaLabel: 'Visit my author page',
  },
  followup_day7: {
    preview: 'A quick check-in and what comes next',
    heading: 'One week on',
    body: (p) => (
      <>
        <Text style={text}>Hi {p.attendeeName},</Text>
        <Text style={text}>A week ago we ran <strong>{p.webinarTitle}</strong>. I hope something has shifted for you in a meaningful way.</Text>
        <Text style={text}>If you're ready for the next step, I've put everything in one place for you.</Text>
      </>
    ),
    ctaLabel: 'See what comes next',
  },
}

const WebinarEmail = (raw: Props) => {
  const p: Required<Props> = {
    kind: raw.kind ?? 'confirmation',
    attendeeName: raw.attendeeName ?? 'there',
    webinarTitle: raw.webinarTitle ?? 'the webinar',
    webinarDescription: raw.webinarDescription ?? '',
    scheduledAtFormatted: raw.scheduledAtFormatted ?? '',
    roomUrl: raw.roomUrl ?? '',
    authorName: raw.authorName ?? 'Your host',
    authorPageUrl: raw.authorPageUrl ?? '',
    signOffPhrase: raw.signOffPhrase ?? 'Talk soon',
  }
  const c = COPY[p.kind]
  const ctaUrl = (p.kind === 'followup_day3' || p.kind === 'followup_day7') && p.authorPageUrl
    ? p.authorPageUrl
    : p.roomUrl

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{c.heading}</Heading>
          {c.body(p)}
          {ctaUrl ? (
            <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
              <Button style={button} href={ctaUrl}>{c.ctaLabel}</Button>
            </Section>
          ) : null}
          <Text style={text}>{p.signOffPhrase},</Text>
          <Text style={{ ...text, fontWeight: 'bold' as const, margin: '0' }}>{p.authorName}</Text>
          <Hr style={divider} />
          <Text style={footer}>This email was sent by {p.authorName}, powered by {SITE_NAME}.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WebinarEmail,
  subject: (data: Record<string, any>) => {
    const title = data.webinarTitle || 'your webinar'
    switch (data.kind) {
      case 'reminder_24h': return `Tomorrow: ${title} (24-hour reminder)`
      case 'reminder_1h': return `Starting in 1 hour: ${title}`
      case 'reminder_15m': return `Starting in 15 minutes — join ${title} now`
      case 'followup_sameday': return `Thanks for joining ${title}`
      case 'followup_day3': return `Putting ${title} into practice`
      case 'followup_day7': return `One week on from ${title}`
      case 'confirmation':
      default: return `You're registered for ${title}`
    }
  },
  displayName: 'Webinar email',
  previewData: {
    kind: 'confirmation',
    attendeeName: 'Jane',
    webinarTitle: 'The 5 Pillars of Author Marketing',
    webinarDescription: 'A 60-minute live workshop on building your author business.',
    scheduledAtFormatted: 'Friday, June 14 at 11:00 AM PT',
    roomUrl: 'https://example.daily.co/abc123',
    authorName: 'Pauline Teo',
    authorPageUrl: 'https://authorsbureau.com/pauline-teo',
    signOffPhrase: 'To your success',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '32px 24px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '26px', color: '#1a1a1a', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '16px', color: '#333333', lineHeight: '1.7', margin: '0 0 18px' }
const button = { backgroundColor: '#c8a45a', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '16px', display: 'inline-block' }
const divider = { borderTop: '1px solid #eeeeee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
