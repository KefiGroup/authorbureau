/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as profileSynced } from './profile-synced.tsx'
import { template as bookSubmitted } from './book-submitted.tsx'
import { template as bookApproved } from './book-approved.tsx'
import { template as profileCreated } from './profile-created.tsx'
import { template as quizResult } from './quiz-result.tsx'
import { template as senderEmailVerification } from './sender-email-verification.tsx'
import { template as webinarEmail } from './webinar-email.tsx'
import { template as audiobookDistributionReady } from './audiobook-distribution-ready.tsx'
import { template as purchaseConfirmation } from './purchase-confirmation.tsx'
import { template as authorBroadcast } from './author-broadcast.tsx'
import { template as abbyDailyReport } from './abby-daily-report.tsx'
import { template as annualEarningsStatement } from './annual-earnings-statement.tsx'
import { template as dailyAuditReport } from './daily-audit-report.tsx'
import { template as crmDailyDigest } from './crm-daily-digest.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'profile-synced': profileSynced,
  'book-submitted': bookSubmitted,
  'book-approved': bookApproved,
  'profile-created': profileCreated,
  'quiz-result': quizResult,
  'sender-email-verification': senderEmailVerification,
  'webinar-email': webinarEmail,
  'audiobook-distribution-ready': audiobookDistributionReady,
  'purchase-confirmation': purchaseConfirmation,
  'author-broadcast': authorBroadcast,
  'abby-daily-report': abbyDailyReport,
  'annual-earnings-statement': annualEarningsStatement,
  'daily-audit-report': dailyAuditReport,
  'crm-daily-digest': crmDailyDigest,
}
