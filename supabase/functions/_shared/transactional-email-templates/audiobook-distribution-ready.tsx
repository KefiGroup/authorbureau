import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface ChannelInfo {
  name: string
  spec: string
  submission_url: string
  royalty: string
  notes: string
}

interface ChapterUrl {
  filename: string
  url: string
}

interface Props {
  authorName?: string
  bookTitle?: string
  chapterCount?: number
  channels?: ChannelInfo[]
  chapterUrls?: ChapterUrl[]
  reencodeNote?: string
}

const AudiobookDistributionReadyEmail = ({
  authorName,
  bookTitle,
  chapterCount,
  channels = [],
  chapterUrls = [],
  reencodeNote,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your audiobook for {bookTitle || 'your book'} is ready to submit</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>Audiobook Production</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Your audiobook is ready to distribute 🎧</Heading>
        <Text style={text}>{authorName ? `Hi ${authorName},` : 'Hi there,'}</Text>
        <Text style={text}>
          Your audiobook for <strong>{bookTitle}</strong> ({chapterCount || 0} chapter{chapterCount === 1 ? '' : 's'}) has been generated and is now live on your Authors Bureau storefront. Here's your submission package for the other channels you selected.
        </Text>

        <Section style={warnBox}>
          <Text style={warnTitle}>⚠ Re-encode required for ACX & most retailers</Text>
          <Text style={warnText}>
            {reencodeNote || 'ACX requires 192 kbps mono 44.1 kHz with specific RMS/peak levels. Use Audacity (free) or Descript to re-encode each chapter before upload.'}
          </Text>
          <Text style={warnText}>
            Free tools: <Link href="https://www.audacityteam.org" style={link}>Audacity</Link>{' '}·{' '}
            <Link href="https://www.descript.com" style={link}>Descript</Link>
          </Text>
        </Section>

        <Heading style={h2}>Distribution channels</Heading>
        {channels.map((c, i) => (
          <Section key={i} style={channelBox}>
            <Text style={channelName}>{c.name}</Text>
            <Text style={channelMeta}><strong>Spec:</strong> {c.spec}</Text>
            <Text style={channelMeta}><strong>Royalty:</strong> {c.royalty}</Text>
            <Text style={channelMeta}>{c.notes}</Text>
            {c.submission_url && (
              <Text style={channelMeta}>
                <Link href={c.submission_url} style={link}>Submission instructions →</Link>
              </Text>
            )}
          </Section>
        ))}

        <Heading style={h2}>Chapter MP3 download links</Heading>
        <Text style={text}>Right-click each link to save the file, then re-encode and upload to each channel.</Text>
        <Section style={chapterList}>
          {chapterUrls.map((ch, i) => (
            <Text key={i} style={chapterRow}>
              {String(i + 1).padStart(2, '0')}. <Link href={ch.url} style={link}>{ch.filename}</Link>
            </Text>
          ))}
        </Section>

        <Hr style={divider} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AudiobookDistributionReadyEmail,
  subject: (data: Record<string, any>) => `Your audiobook${data?.bookTitle ? ` "${data.bookTitle}"` : ''} is ready to distribute`,
  displayName: 'Audiobook distribution ready',
  previewData: {
    authorName: 'Jane Doe',
    bookTitle: 'The Empath\'s Compass',
    chapterCount: 12,
    channels: [
      { name: 'Audible / ACX', spec: '192 kbps mono 44.1 kHz', submission_url: 'https://www.acx.com/help/narrators/200484550', royalty: '25% non-exclusive / 40% exclusive', notes: 'ACX requires opening/closing credits and a retail audio sample.' },
    ],
    chapterUrls: [{ filename: 'chapter-01.mp3', url: 'https://example.com/ch1.mp3' }],
    reencodeNote: 'ACX requires 192 kbps mono 44.1 kHz. Use Audacity or Descript to re-encode.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const tagline = { color: '#c8a55a', fontSize: '14px', margin: '4px 0 0' }
const divider = { borderTop: '1px solid #e5e5e5', margin: '16px 0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0 0 16px' }
const h2 = { fontSize: '16px', fontWeight: 'bold' as const, color: '#1a2744', margin: '24px 0 12px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const warnBox = { background: '#fff8e6', border: '1px solid #f0d68b', borderRadius: '8px', padding: '14px 16px', margin: '16px 0' }
const warnTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#8a6500', margin: '0 0 8px' }
const warnText = { fontSize: '13px', color: '#5a4500', lineHeight: '1.6', margin: '0 0 6px' }
const channelBox = { background: '#faf8f4', border: '1px solid #e8e2d6', borderRadius: '8px', padding: '12px 14px', margin: '0 0 12px' }
const channelName = { fontSize: '14px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0 0 6px' }
const channelMeta = { fontSize: '12px', color: '#555555', margin: '0 0 4px', lineHeight: '1.5' }
const chapterList = { background: '#f7f7f9', borderRadius: '6px', padding: '12px 14px', margin: '12px 0' }
const chapterRow = { fontSize: '12px', color: '#333333', margin: '0 0 4px', fontFamily: 'monospace' }
const link = { color: '#c8a55a', textDecoration: 'underline' }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
