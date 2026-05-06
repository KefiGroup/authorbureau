import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  authorName?: string
  insight?: string
  leadsToday?: number
  leadsWeek?: number
  frequencyLabel?: 'daily' | 'weekly' | 'monthly'
  periodLabel?: string
  leadsPeriod?: number
  revenuePeriod?: number
  revenueMonth?: number
  activeNodes?: number
  hotLeads?: number
  topAction?: string
  dashboardUrl?: string
}

const fmtMoney = (n?: number) => `$${(n || 0).toLocaleString()}`

const AbbyDailyReportEmail = ({
  authorName, insight,
  frequencyLabel = 'daily', periodLabel = 'Yesterday',
  leadsPeriod, leadsToday = 0,
  revenuePeriod = 0, revenueMonth = 0,
  activeNodes = 0, hotLeads = 0, topAction, dashboardUrl,
}: Props) => {
  const periodLeads = leadsPeriod ?? leadsToday
  const cadenceTitle = frequencyLabel === 'weekly'
    ? 'Your Weekly Business Report'
    : frequencyLabel === 'monthly'
      ? 'Your Monthly Business Report'
      : 'Your Daily Business Report'
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${frequencyLabel} business report from ABBY`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>{cadenceTitle}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {authorName ? `Hello, ${authorName} ☀️` : 'Hello ☀️'}
        </Heading>
        {insight && (
          <Section style={insightBox}>
            <Text style={insightLabel}>ABBY'S INSIGHT</Text>
            <Text style={insightText}>{insight}</Text>
          </Section>
        )}
        <Heading as="h2" style={h2}>{periodLabel} at a glance</Heading>
        <Section style={statGrid}>
          <Section style={statCell}>
            <Text style={statValue}>{periodLeads}</Text>
            <Text style={statLabel}>New leads ({periodLabel.toLowerCase()})</Text>
          </Section>
          <Section style={statCell}>
            <Text style={statValue}>{fmtMoney(revenuePeriod)}</Text>
            <Text style={statLabel}>Revenue ({periodLabel.toLowerCase()})</Text>
          </Section>
          <Section style={statCell}>
            <Text style={statValue}>{fmtMoney(revenueMonth)}</Text>
            <Text style={statLabel}>Revenue MTD</Text>
          </Section>
          <Section style={statCell}>
            <Text style={statValue}>{activeNodes}</Text>
            <Text style={statLabel}>Live nodes</Text>
          </Section>
        </Section>
        {hotLeads > 0 && (
          <Section style={hotBox}>
            <Text style={hotText}>
              🔥 <strong>{hotLeads} hot lead{hotLeads === 1 ? '' : 's'}</strong> waiting for follow-up today.
            </Text>
          </Section>
        )}
        {topAction && (
          <Section style={tipBox}>
            <Text style={tipText}>
              💡 <strong>Top action today:</strong><br />
              {topAction}
            </Text>
          </Section>
        )}
        {dashboardUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button style={button} href={dashboardUrl}>
              Open your dashboard →
            </Button>
          </Section>
        )}
        <Text style={footer}>— ABBY, your AI Business Advisor</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AbbyDailyReportEmail,
  subject: (data: Record<string, any>) =>
    data.hotLeads && data.hotLeads > 0
      ? `🔥 ${data.hotLeads} hot lead${data.hotLeads === 1 ? '' : 's'} today + your daily report`
      : `Your daily business report from ABBY`,
  displayName: 'ABBY daily report',
  previewData: {
    authorName: 'Pauline',
    insight: 'You added 12 new leads this week — a 40% jump. Time to send a follow-up sequence to convert them.',
    leadsToday: 4, leadsWeek: 12, revenueMonth: 1450, activeNodes: 8, hotLeads: 2,
    topAction: 'Follow up with your 2 hot leads — they have ABBY scores above 60.',
    dashboardUrl: 'https://authorsbureau.com/dashboard',
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
const hotBox = { background: '#fff4f0', border: '1px solid #ffb38a', borderRadius: '8px', padding: '14px', margin: '16px 0' }
const hotText = { fontSize: '14px', color: '#a4471f', margin: '0' }
const tipBox = { background: '#f0faf0', border: '1px solid #b8e6b8', borderRadius: '8px', padding: '14px', margin: '16px 0' }
const tipText = { fontSize: '13px', color: '#2d6a2d', margin: '0', lineHeight: '1.7' }
const button = { backgroundColor: '#c8a55a', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '15px', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#888888', marginTop: '32px', textAlign: 'center' as const }
