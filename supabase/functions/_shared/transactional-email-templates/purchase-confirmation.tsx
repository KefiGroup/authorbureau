import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Authors Bureau'

export interface ChannelLink {
  label: string        // e.g. "Open in Readers Bureau"
  url: string          // absolute URL
  description?: string // 1-line explanation
}

interface PurchaseConfirmationProps {
  customerName?: string
  productTitle?: string
  authorName?: string
  amount?: string         // already formatted, e.g. "$47.00"
  primaryChannel?: ChannelLink
  additionalChannels?: ChannelLink[]
  supportNote?: string
}

const PurchaseConfirmationEmail = ({
  customerName,
  productTitle = 'your course',
  authorName,
  amount,
  primaryChannel,
  additionalChannels = [],
  supportNote,
}: PurchaseConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your purchase of {productTitle} is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {customerName ? `Thank you, ${customerName}!` : 'Thank you for your purchase!'}
        </Heading>
        <Text style={text}>
          Your purchase of <strong>{productTitle}</strong>
          {authorName ? <> by <strong>{authorName}</strong></> : null}
          {' '}is confirmed{amount ? <> ({amount})</> : null}.
        </Text>

        {primaryChannel ? (
          <Section style={ctaSection}>
            <Text style={subhead}>Start now</Text>
            {primaryChannel.description ? (
              <Text style={text}>{primaryChannel.description}</Text>
            ) : null}
            <Button style={primaryButton} href={primaryChannel.url}>
              {primaryChannel.label}
            </Button>
          </Section>
        ) : null}

        {additionalChannels.length > 0 ? (
          <>
            <Hr style={hr} />
            <Text style={subhead}>Other ways to access your course</Text>
            {additionalChannels.map((c, i) => (
              <Section key={i} style={altSection}>
                <Text style={altLabel}>{c.label}</Text>
                {c.description ? <Text style={altDescription}>{c.description}</Text> : null}
                <Button style={secondaryButton} href={c.url}>Open</Button>
              </Section>
            ))}
          </>
        ) : null}

        {supportNote ? (
          <>
            <Hr style={hr} />
            <Text style={footer}>{supportNote}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>
          {authorName
            ? `You're receiving this because ${authorName} sent it via ${SITE_NAME}.`
            : `— The ${SITE_NAME} Team`}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PurchaseConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.productTitle ? `Your purchase of ${data.productTitle} is confirmed` : 'Your purchase is confirmed',
  displayName: 'Purchase confirmation (multi-channel)',
  previewData: {
    customerName: 'Linny',
    productTitle: '21-Day Home Study Course',
    authorName: 'Pauline Teo',
    amount: '$47.00',
    primaryChannel: {
      label: 'Start in Readers Bureau',
      url: 'https://authorsbureau.com/readers-bureau/learn/abc123',
      description: 'Self-paced lessons in your private learner portal.',
    },
    additionalChannels: [
      { label: 'Open in Thinkific', url: 'https://example.thinkific.com/courses/take/home-study', description: 'Same lessons, hosted on Thinkific.' },
      { label: 'Download printable PDF bundle', url: 'https://authorsbureau.com/pauline-teo/home-study-bundle/abc123', description: 'Print-friendly version of every lesson.' },
    ],
    supportNote: 'Reply to this email if anything looks off — we read every message.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.55', margin: '0 0 14px' }
const subhead = { fontSize: '13px', fontWeight: 'bold' as const, color: '#0F172A', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '14px 0 8px' }
const ctaSection = { margin: '20px 0' }
const altSection = { margin: '12px 0 16px', padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px' }
const altLabel = { fontSize: '14px', fontWeight: 'bold' as const, color: '#0F172A', margin: '0 0 4px' }
const altDescription = { fontSize: '13px', color: '#475569', margin: '0 0 10px' }
const primaryButton = { backgroundColor: '#C9A227', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
const secondaryButton = { backgroundColor: '#0F172A', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#E2E8F0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '14px 0 0' }
