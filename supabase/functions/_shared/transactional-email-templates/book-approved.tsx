import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  authorName?: string
  bookTitle?: string
  bookPageUrl?: string
}

const BookApprovedEmail = ({ authorName, bookTitle, bookPageUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your book page is now live!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>AI Marketing Studio</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Your book page is live! 🎉</Heading>
        <Text style={text}>
          {authorName ? `Hi ${authorName},` : 'Great news!'}
        </Text>
        <Text style={text}>
          {bookTitle
            ? `Your book "${bookTitle}" has been approved by our admin team. Your professional book page is now live and accessible to readers worldwide.`
            : 'Your book has been approved and your professional book page is now live!'}
        </Text>
        {bookPageUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button style={button} href={bookPageUrl}>
              View Your Live Book Page →
            </Button>
          </Section>
        )}
        <Section style={tipBox}>
          <Text style={tipText}>
            ✅ <strong>What's next?</strong><br />
            Share your book page link with your audience, upload your manuscript, and let Abby analyze your book to unlock revenue streams.
          </Text>
        </Section>
        {bookPageUrl && (
          <Text style={urlText}>{bookPageUrl}</Text>
        )}
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookApprovedEmail,
  subject: (data: Record<string, any>) =>
    data.bookTitle
      ? `🎉 Your book page for "${data.bookTitle}" is now live!`
      : '🎉 Your book page is now live!',
  displayName: 'Book approved',
  previewData: { authorName: 'Jane Doe', bookTitle: 'The Art of Leadership', bookPageUrl: 'https://authorsbureau.com/jane-doe/the-art-of-leadership' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const tagline = { color: '#c8a55a', fontSize: '14px', margin: '4px 0 0' }
const divider = { borderTop: '1px solid #e5e5e5', margin: '16px 0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const tipBox = { background: '#f0faf0', border: '1px solid #b8e6b8', borderRadius: '8px', padding: '16px', margin: '20px 0' }
const tipText = { fontSize: '13px', color: '#2d6a2d', margin: '0', lineHeight: '1.7' }
const button = { backgroundColor: '#c8a55a', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '15px', display: 'inline-block' }
const urlText = { color: '#888888', fontSize: '12px', textAlign: 'center' as const, marginTop: '16px', wordBreak: 'break-all' as const }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
