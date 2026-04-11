import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  authorName?: string
}

const ProfileCreatedEmail = ({ authorName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME}, {authorName || 'Author'}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>AI Marketing Studio</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Welcome aboard! 🎉</Heading>
        <Text style={text}>
          {authorName ? `Hi ${authorName},` : 'Hi there,'}
        </Text>
        <Text style={text}>
          Your author profile has been successfully created on {SITE_NAME}. You're now part of a growing community of published authors building their brand and reaching new readers.
        </Text>
        <Section style={tipBox}>
          <Text style={tipText}>
            <strong>What's next?</strong><br />
            • Complete your profile with a photo and bio<br />
            • Add your books to your author page<br />
            • Let Abby, our AI assistant, help you unlock revenue streams
          </Text>
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
          <Button style={button} href="https://authorsbureau.com/dashboard">
            Go to Your Dashboard →
          </Button>
        </Section>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProfileCreatedEmail,
  subject: `Welcome to ${SITE_NAME}!`,
  displayName: 'Profile created',
  previewData: { authorName: 'Jane Doe' },
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
const tipText = { fontSize: '13px', color: '#555555', margin: '0', lineHeight: '1.7' }
const button = { backgroundColor: '#1a2744', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '15px', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
