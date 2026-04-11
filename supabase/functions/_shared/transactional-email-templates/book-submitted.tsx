import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  authorName?: string
  bookTitle?: string
}

const BookSubmittedEmail = ({ authorName, bookTitle }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your book has been submitted for review</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>AI Marketing Studio</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Book submitted for review 📚</Heading>
        <Text style={text}>
          {authorName ? `Hi ${authorName},` : 'Hi there,'}
        </Text>
        <Text style={text}>
          {bookTitle
            ? `Your book "${bookTitle}" has been submitted and is now pending admin review.`
            : 'Your book has been submitted and is now pending admin review.'}
        </Text>
        <Section style={tipBox}>
          <Text style={tipText}>
            Our team typically reviews new submissions within 1–2 business days. You'll receive an email once your book page goes live.
          </Text>
        </Section>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookSubmittedEmail,
  subject: (data: Record<string, any>) =>
    data.bookTitle
      ? `Your book "${data.bookTitle}" is under review`
      : 'Your book is under review',
  displayName: 'Book submitted',
  previewData: { authorName: 'Jane Doe', bookTitle: 'The Art of Leadership' },
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
const tipText = { fontSize: '13px', color: '#555555', margin: '0', lineHeight: '1.6' }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
