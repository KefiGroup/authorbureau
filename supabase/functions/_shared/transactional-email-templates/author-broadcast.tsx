import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  senderName?: string
  subject?: string
  bodyHtml?: string         // pre-rendered HTML (markdown -> html done by caller)
  bodyMarkdown?: string     // fallback: simple markdown converted inline
  recipientName?: string
  preview?: string
}

// Tiny markdown-to-HTML for plain author body content (paragraphs + line breaks + **bold** + [link](url))
function mdToHtml(md: string): string {
  if (!md) return ''
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return md
    .split(/\n{2,}/)
    .map((para) => {
      const escaped = escape(para)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0d9488;text-decoration:underline">$1</a>')
        .replace(/\n/g, '<br/>')
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333;">${escaped}</p>`
    })
    .join('')
}

const AuthorBroadcastEmail = ({
  senderName = 'Your Author',
  subject,
  bodyHtml,
  bodyMarkdown,
  recipientName,
  preview,
}: Props) => {
  const html = bodyHtml || mdToHtml(bodyMarkdown || '')
  const previewText = preview || subject || `A message from ${senderName}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {recipientName ? (
            <Text style={greeting}>Hi {recipientName},</Text>
          ) : null}
          <Section dangerouslySetInnerHTML={{ __html: html }} />
          <Hr style={divider} />
          <Text style={signoff}>{senderName}</Text>
          <Text style={footer}>
            Sent via {SITE_NAME} on behalf of {senderName}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AuthorBroadcastEmail,
  // Subject is supplied per-send via templateData.subject
  subject: (data: Record<string, any>) => (data?.subject || `A message from ${data?.senderName || 'your author'}`),
  displayName: 'Author broadcast',
  previewData: {
    senderName: 'Pauline Teo',
    subject: 'Welcome — your free gift inside',
    bodyMarkdown: 'Thanks for taking the quiz!\n\nHere is the resource I promised — it pairs perfectly with what you discovered.',
    recipientName: 'Friend',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' as const, margin: '0 auto' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 14px' }
const signoff = { fontSize: '15px', color: '#333', fontWeight: 'bold' as const, margin: '20px 0 0' }
const divider = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '20px 0 0', lineHeight: '1.5' }
