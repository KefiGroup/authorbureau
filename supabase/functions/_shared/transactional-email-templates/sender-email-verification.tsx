/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  senderName?: string
  verifyUrl?: string
}

const SenderEmailVerification = ({ senderName, verifyUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your sender email for {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your sender email</Heading>
        <Text style={text}>
          {senderName ? `Hi ${senderName},` : 'Hi,'}
        </Text>
        <Text style={text}>
          You set this address as your reply-to email on {SITE_NAME}. Click the button below to
          confirm you own this inbox so your subscriber emails can start sending.
        </Text>
        <Section style={btnWrap}>
          <Button href={verifyUrl} style={btn}>
            Confirm my email
          </Button>
        </Section>
        <Text style={small}>
          Or copy and paste this link into your browser:
          <br />
          <Link href={verifyUrl} style={linkStyle}>{verifyUrl}</Link>
        </Text>
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SenderEmailVerification,
  subject: 'Confirm your sender email',
  displayName: 'Sender email verification',
  previewData: { senderName: 'Jane', verifyUrl: 'https://example.com/verify?token=abc' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '520px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const btnWrap = { margin: '28px 0' }
const btn = { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const linkStyle = { color: '#2563eb', wordBreak: 'break-all' as const }
const small = { fontSize: '12px', color: '#64748b', lineHeight: '1.5', margin: '24px 0 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '32px 0 0' }
