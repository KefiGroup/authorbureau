import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface TopLead { id: string; full_name: string; abby_score: number; email?: string | null }
interface Props {
  authorName?: string
  digest_date?: string
  new_leads_24h?: number
  top_new_leads?: TopLead[]
  hot_leads_total?: number
  hot_leads_delta?: number
  email_opens_24h?: number
  email_clicks_24h?: number
  top_mover?: { id: string; full_name: string; score_delta: number } | null
  recommendation?: string
  dashboardUrl?: string
}

const CrmDailyDigestEmail = ({
  authorName,
  new_leads_24h = 0,
  top_new_leads = [],
  hot_leads_total = 0,
  hot_leads_delta = 0,
  email_opens_24h = 0,
  email_clicks_24h = 0,
  top_mover,
  recommendation,
  dashboardUrl = 'https://authorsbureau.com/dashboard?section=author-crm',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your CRM intelligence: ${new_leads_24h} new lead${new_leads_24h === 1 ? '' : 's'}, ${hot_leads_total} hot`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>Today's CRM Intelligence</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {authorName ? `Good morning, ${authorName}` : 'Good morning'}
        </Heading>
        {recommendation && (
          <Section style={insightBox}>
            <Text style={insightLabel}>ABBY RECOMMENDS</Text>
            <Text style={insightText}>{recommendation}</Text>
          </Section>
        )}
        <Heading as="h2" style={h2}>Last 24 hours</Heading>
        <Section style={statGrid}>
          <Section style={statCell}>
            <Text style={statValue}>{new_leads_24h}</Text>
            <Text style={statLabel}>New leads</Text>
          </Section>
          <Section style={statCell}>
            <Text style={statValue}>{hot_leads_total}{hot_leads_delta !== 0 ? ` (${hot_leads_delta > 0 ? '+' : ''}${hot_leads_delta})` : ''}</Text>
            <Text style={statLabel}>Hot leads</Text>
          </Section>
          <Section style={statCell}>
            <Text style={statValue}>{email_opens_24h}</Text>
            <Text style={statLabel}>Email opens</Text>
          </Section>
          <Section style={statCell}>
            <Text style={statValue}>{email_clicks_24h}</Text>
            <Text style={statLabel}>Email clicks</Text>
          </Section>
        </Section>
        {top_new_leads && top_new_leads.length > 0 && (
          <Section style={listBox}>
            <Text style={listLabel}>TOP NEW LEADS</Text>
            {top_new_leads.map((l) => (
              <Text key={l.id} style={listRow}>• {l.full_name} <span style={scorePill}>score {l.abby_score}</span></Text>
            ))}
          </Section>
        )}
        {top_mover && (
          <Section style={tipBox}>
            <Text style={tipText}>
              📈 <strong>Top mover:</strong> {top_mover.full_name} gained {top_mover.score_delta} points from email engagement.
            </Text>
          </Section>
        )}
        <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
          <Button style={button} href={dashboardUrl}>
            Open your CRM →
          </Button>
        </Section>
        <Text style={footer}>— ABBY, your AI Business Advisor</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CrmDailyDigestEmail,
  subject: (data: Record<string, any>) => {
    const hot = data.hot_leads_total || 0
    const fresh = data.new_leads_24h || 0
    if (hot > 0) return `🔥 ${hot} hot lead${hot === 1 ? '' : 's'} need follow-up today`
    if (fresh > 0) return `${fresh} new lead${fresh === 1 ? '' : 's'} in your CRM today`
    return `Your daily CRM intelligence from ABBY`
  },
  displayName: 'CRM daily digest',
  previewData: {
    authorName: 'Pauline',
    digest_date: '2026-05-09',
    new_leads_24h: 4,
    top_new_leads: [
      { id: '1', full_name: 'Sarah Chen', abby_score: 12 },
      { id: '2', full_name: 'Marcus Webb', abby_score: 8 },
    ],
    hot_leads_total: 3,
    hot_leads_delta: 1,
    email_opens_24h: 17,
    email_clicks_24h: 4,
    top_mover: { id: '99', full_name: 'Janet Lim', score_delta: 12 },
    recommendation: 'Personally reply to your 3 hot leads today — they are 6× more likely to convert this week.',
    dashboardUrl: 'https://authorsbureau.com/dashboard?section=author-crm',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const tagline = { color: '#c8a55a', fontSize: '14px', margin: '4px 0 0' }
const divider = { borderTop: '1px solid #e5e5e5', margin: '16px 0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0 0 16px' }
const h2 = { fontSize: '15px', fontWeight: 'bold' as const, color: '#1a2744', margin: '20px 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const insightBox = { background: '#fdf6e6', border: '1px solid #e8d4a8', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const insightLabel = { fontSize: '11px', color: '#c8a55a', margin: '0 0 6px', fontWeight: 'bold' as const, letterSpacing: '0.5px' }
const insightText = { fontSize: '14px', color: '#333333', margin: '0', lineHeight: '1.6' }
const statGrid = { display: 'block', margin: '12px 0' }
const statCell = { display: 'inline-block', width: '48%', verticalAlign: 'top' as const, padding: '10px', boxSizing: 'border-box' as const }
const statValue = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0' }
const statLabel = { fontSize: '12px', color: '#888888', margin: '2px 0 0' }
const listBox = { background: '#f7f7fa', borderRadius: '8px', padding: '14px 16px', margin: '16px 0' }
const listLabel = { fontSize: '11px', color: '#888888', margin: '0 0 8px', fontWeight: 'bold' as const, letterSpacing: '0.5px' }
const listRow = { fontSize: '13px', color: '#333333', margin: '4px 0' }
const scorePill = { color: '#c8a55a', fontSize: '12px', fontWeight: 'bold' as const }
const tipBox = { background: '#f0faf0', border: '1px solid #b8e6b8', borderRadius: '8px', padding: '14px', margin: '16px 0' }
const tipText = { fontSize: '13px', color: '#2d6a2d', margin: '0', lineHeight: '1.7' }
const button = { backgroundColor: '#c8a55a', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '15px', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
