import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  authorName?: string
  taxYear?: number
  totalGross?: string
  totalNet?: string
  earningsUrl?: string
}

const AnnualEarningsStatementEmail = ({ authorName, taxYear, totalGross, totalNet, earningsUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {taxYear} Authors Bureau earnings statement is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>Annual Earnings Statement</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Your {taxYear} earnings statement is ready</Heading>
        <Text style={text}>
          {authorName ? `Hi ${authorName},` : 'Hi there,'}
        </Text>
        <Text style={text}>
          Your {taxYear} earnings summary is now available in your dashboard. Here are the totals you'll need for your tax filing:
        </Text>
        <Section style={tipBox}>
          <Text style={tipText}>
            <strong>Gross sales:</strong> ${totalGross}<br />
            <strong>Net paid to you (92%):</strong> ${totalNet}
          </Text>
        </Section>
        <Text style={text}>
          You're solely responsible for declaring this income in your country of tax residence.
        </Text>
        {earningsUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button style={button} href={earningsUrl}>Download Full Statement</Button>
          </Section>
        )}
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AnnualEarningsStatementEmail,
  subject: (data: Record<string, any>) => `Your ${data.taxYear ?? ''} Authors Bureau earnings statement is ready`,
  displayName: 'Annual earnings statement',
  previewData: { authorName: 'Jane Doe', taxYear: 2025, totalGross: '12,450.00', totalNet: '11,454.00', earningsUrl: 'https://authorsbureau.com/earnings' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const tagline = { color: '#c8a55a', fontSize: '14px', margin: '4px 0 0' }
const divider = { borderTop: '1px solid #e5e5e5', margin: '16px 0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const tipBox = { background: '#f7f4ec', border: '1px solid #e6dcc4', borderRadius: '8px', padding: '16px', margin: '20px 0' }
const tipText = { fontSize: '14px', color: '#1a2744', margin: '0', lineHeight: '1.8' }
const button = { backgroundColor: '#c8a55a', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '15px', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
