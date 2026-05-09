import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface CheckSummary {
  key: string
  label: string
  severity: 'ok' | 'warn' | 'fail'
  count: number
  message: string
}

interface Props {
  status?: 'green' | 'amber' | 'red'
  issueCount?: number
  generatedAt?: string
  failCount?: number
  warnCount?: number
  checks?: CheckSummary[]
  dashboardUrl?: string
}

const STATUS_COLOR = { green: '#2d6a2d', amber: '#a4471f', red: '#a82424' } as const
const STATUS_BG    = { green: '#f0faf0', amber: '#fff4f0', red: '#fff0f0' } as const
const STATUS_LABEL = { green: 'All clear', amber: 'Warnings', red: 'Issues need attention' } as const

const SEV_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  ok:   { color: '#2d6a2d', bg: '#f0faf0', label: 'OK' },
  warn: { color: '#a4471f', bg: '#fff4f0', label: 'WARN' },
  fail: { color: '#a82424', bg: '#fff0f0', label: 'FAIL' },
}

const DailyAuditReportEmail = ({
  status = 'green', issueCount = 0, generatedAt, failCount = 0, warnCount = 0,
  checks = [], dashboardUrl = 'https://authorsbureau.com/admin?tab=daily-audit',
}: Props) => {
  const ts = generatedAt ? new Date(generatedAt).toUTCString() : new Date().toUTCString()
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Daily audit ${status.toUpperCase()} — ${issueCount} issue${issueCount === 1 ? '' : 's'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>Daily Platform Audit</Text>
        </Section>
        <Hr style={divider} />

        <Section style={{ background: STATUS_BG[status], border: `1px solid ${STATUS_COLOR[status]}33`, borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
          <Text style={{ ...statusLabel, color: STATUS_COLOR[status] }}>STATUS</Text>
          <Heading as="h2" style={{ ...statusValue, color: STATUS_COLOR[status] }}>
            {STATUS_LABEL[status]}
          </Heading>
          <Text style={statusMeta}>
            {failCount} fail · {warnCount} warn · {issueCount} total issues
          </Text>
          <Text style={statusTime}>Generated {ts}</Text>
        </Section>

        <Heading as="h3" style={h3}>Check results</Heading>
        {checks.map((c) => {
          const b = SEV_BADGE[c.severity] || SEV_BADGE.ok
          return (
            <Section key={c.key} style={checkRow}>
              <Text style={{ ...badge, color: b.color, background: b.bg, borderColor: `${b.color}44` }}>{b.label}</Text>
              <Text style={checkLabel}>{c.label}</Text>
              <Text style={checkMessage}>{c.message}</Text>
            </Section>
          )
        })}

        <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
          <Button style={button} href={dashboardUrl}>
            View full report →
          </Button>
        </Section>

        <Text style={footer}>You're receiving this because you're an Authors Bureau admin. Audit runs daily at 07:00 UTC.</Text>
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: DailyAuditReportEmail,
  subject: (data: Record<string, any>) => {
    const status = (data.status as string) || 'green'
    const issues = data.issueCount ?? 0
    if (status === 'red') return `🚨 Daily audit RED — ${issues} issue${issues === 1 ? '' : 's'}`
    if (status === 'amber') return `⚠️ Daily audit AMBER — ${issues} warning${issues === 1 ? '' : 's'}`
    return `✅ Daily audit GREEN — all clear`
  },
  displayName: 'Daily audit report',
  previewData: {
    status: 'amber',
    issueCount: 3,
    generatedAt: new Date().toISOString(),
    failCount: 0,
    warnCount: 2,
    checks: [
      { key: 'errors_24h', label: 'Errors (24h)', severity: 'ok', count: 0, message: '0 critical, 0 error, 1 warning' },
      { key: 'stuck_live', label: 'Stuck-live nodes', severity: 'ok', count: 5, message: '5 live nodes using legacy fallback' },
      { key: 'email_queue', label: 'Email queue (24h)', severity: 'warn', count: 2, message: 'sent 412 · dlq 0 · failed 2 · suppressed 1' },
      { key: 'content_quality', label: 'Content quality (24h)', severity: 'warn', count: 12, message: '12 total — top: emdash(8), placeholder(4)' },
    ],
    dashboardUrl: 'https://authorsbureau.com/admin?tab=daily-audit',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '640px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const tagline = { color: '#c8a55a', fontSize: '14px', margin: '4px 0 0' }
const divider = { borderTop: '1px solid #e5e5e5', margin: '16px 0' }
const statusLabel = { fontSize: '11px', margin: '0 0 4px', fontWeight: 'bold' as const, letterSpacing: '0.5px' }
const statusValue = { fontSize: '22px', fontWeight: 'bold' as const, margin: '0 0 8px' }
const statusMeta = { fontSize: '13px', color: '#333333', margin: '0' }
const statusTime = { fontSize: '12px', color: '#888888', margin: '8px 0 0' }
const h3 = { fontSize: '14px', fontWeight: 'bold' as const, color: '#1a2744', margin: '24px 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const checkRow = { padding: '10px 12px', borderBottom: '1px solid #eeeeee' }
const badge = { display: 'inline-block', fontSize: '10px', fontWeight: 'bold' as const, padding: '2px 8px', borderRadius: '4px', border: '1px solid', margin: '0 0 4px', letterSpacing: '0.5px' }
const checkLabel = { fontSize: '14px', fontWeight: 'bold' as const, color: '#1a2744', margin: '2px 0' }
const checkMessage = { fontSize: '13px', color: '#555555', margin: '2px 0 0', lineHeight: '1.5' }
const button = { backgroundColor: '#c8a55a', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '15px', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#888888', marginTop: '24px', textAlign: 'center' as const }
