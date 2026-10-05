/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({ token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Authors Bureau sign-in code: {token ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AUTHORS BUREAU</Text>
        <Heading style={h1}>Your sign-in code</Heading>
        <Text style={text}>
          Enter this code on the Authors Bureau sign-in screen. It works for a
          short time and only once.
        </Text>
        <Section style={codeBox}>
          <Text style={code}>{token}</Text>
        </Section>
        <Text style={footer}>
          If you didn't ask for this code, you can safely ignore this email.
          Questions? support@authorsbureau.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, Arial, sans-serif' }
const container = { padding: '28px 25px', maxWidth: '520px' }
const brand = { fontSize: '12px', letterSpacing: '3px', color: '#C9A227', fontWeight: 'bold' as const, margin: '0 0 16px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F1B33', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#4A5568', lineHeight: '1.5', margin: '0 0 20px' }
const codeBox = { backgroundColor: '#0F1B33', borderRadius: '8px', padding: '18px', textAlign: 'center' as const }
const code = { fontSize: '32px', letterSpacing: '8px', fontWeight: 'bold' as const, color: '#C9A227', margin: '0', fontFamily: 'Courier, monospace' }
const footer = { fontSize: '12px', color: '#999999', margin: '28px 0 0' }
