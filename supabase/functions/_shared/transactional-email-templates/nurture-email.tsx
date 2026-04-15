import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface NurtureEmailProps {
  name?: string
  subject?: string
  body?: string
  authorName?: string
  bookTitle?: string
}

const NurtureEmail = ({ name, body, authorName, bookTitle }: NurtureEmailProps) => {
  // Convert markdown-ish body to simple paragraphs
  const paragraphs = (body || "Thank you for subscribing!").split(/\n\n+/).filter(Boolean);

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{paragraphs[0]?.slice(0, 100) || `A message from ${authorName || SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {name && (
            <Text style={greeting}>Hi {name},</Text>
          )}
          {paragraphs.map((p, i) => (
            <Text key={i} style={text}>{p.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}</Text>
          ))}
          <Hr style={hr} />
          <Text style={footer}>
            {authorName ? `— ${authorName}` : `— The ${SITE_NAME} Team`}
            {bookTitle ? ` | Author of "${bookTitle}"` : ''}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NurtureEmail,
  subject: (data: Record<string, any>) => data.subject || `A message from ${data.authorName || SITE_NAME}`,
  displayName: 'ABBY Nurture Email',
  previewData: {
    name: 'Jane',
    subject: 'Welcome! Here\'s what to expect',
    body: 'Thank you for subscribing! I\'m thrilled to have you here.\n\nIn my book, I explore the idea that **every author has a unique business hidden inside their manuscript**. Over the next few days, I\'ll share some of the key insights that have helped hundreds of authors turn their expertise into thriving businesses.\n\nStay tuned — your first exclusive insight is coming tomorrow.',
    authorName: 'Sarah Mitchell',
    bookTitle: 'The Expert Author',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '30px 25px', maxWidth: '580px', margin: '0 auto' }
const greeting = { fontSize: '16px', color: '#1a1a1a', lineHeight: '1.6', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.7', margin: '0 0 18px' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#888888', lineHeight: '1.5', margin: '0', fontStyle: 'italic' as const }
