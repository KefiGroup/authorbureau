import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  senderName?: string
  subject?: string
  message?: string
}

const ContactConfirmationEmail = ({ senderName, subject, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your message</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>AI Marketing Studio</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Thanks for getting in touch</Heading>
        <Text style={text}>{senderName ? `Hi ${senderName},` : 'Hi there,'}</Text>
        <Text style={text}>
          We have received your message and our team usually replies within 1 to 2 business days.
        </Text>
        <Section style={tipBox}>
          <Text style={tipText}><strong>Subject:</strong> {subject || '—'}</Text>
          <Text style={tipText}>{message || ''}</Text>
        </Section>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'We received your message — Authors Bureau',
  displayName: 'Contact confirmation',
  previewData: {
    senderName: 'Jane Doe',
    subject: 'Question about the directory',
    message: 'Hello, I would like to know more about getting featured.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const tagline = { color: '#c8a55a', fontSize: '14px', margin: '4px 0 0' }
const divider = { borderTop: '1px solid #e5e5e5', margin: '16px 0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const tipBox = { background: '#faf8f4', border: '1px solid #e8e2d6', borderRadius: '8px', padding: '16px', margin: '20px 0' }
const tipText = { fontSize: '13px', color: '#555555', margin: '0 0 6px', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
