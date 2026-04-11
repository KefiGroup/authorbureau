import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  authorName?: string
  fieldsUpdated?: string[]
  booksImported?: number
  booksUpdated?: number
}

const ProfileSyncedEmail = ({ authorName, fieldsUpdated, booksImported, booksUpdated }: Props) => {
  const hasBookChanges = (booksImported || 0) > 0 || (booksUpdated || 0) > 0
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {SITE_NAME} profile has been synced</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>{SITE_NAME}</Heading>
            <Text style={tagline}>AI Marketing Studio</Text>
          </Section>
          <Hr style={divider} />
          <Heading style={h1}>Profile synced successfully ✅</Heading>
          <Text style={text}>
            {authorName ? `Hi ${authorName},` : 'Hi there,'}
          </Text>
          <Text style={text}>
            Your author profile has been synced with the latest data from PublishNow.
          </Text>
          {fieldsUpdated && fieldsUpdated.length > 0 && (
            <Section style={tipBox}>
              <Text style={tipText}>
                <strong>Updated fields:</strong> {fieldsUpdated.join(', ')}
              </Text>
            </Section>
          )}
          {hasBookChanges && (
            <Section style={tipBox}>
              <Text style={tipText}>
                <strong>Books:</strong>{' '}
                {booksImported ? `${booksImported} imported` : ''}
                {booksImported && booksUpdated ? ', ' : ''}
                {booksUpdated ? `${booksUpdated} updated` : ''}
              </Text>
            </Section>
          )}
          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button style={button} href="https://authorsbureau.com/dashboard">
              View Your Profile →
            </Button>
          </Section>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProfileSyncedEmail,
  subject: 'Your profile has been synced',
  displayName: 'Profile synced',
  previewData: { authorName: 'Jane Doe', fieldsUpdated: ['bio', 'photo', 'genres'], booksImported: 2, booksUpdated: 1 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const tagline = { color: '#c8a55a', fontSize: '14px', margin: '4px 0 0' }
const divider = { borderTop: '1px solid #e5e5e5', margin: '16px 0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const tipBox = { background: '#f0faf0', border: '1px solid #b8e6b8', borderRadius: '8px', padding: '16px', margin: '12px 0' }
const tipText = { fontSize: '13px', color: '#2d6a2d', margin: '0', lineHeight: '1.6' }
const button = { backgroundColor: '#1a2744', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '15px', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
