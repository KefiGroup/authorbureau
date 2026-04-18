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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'profile-synced': profileSynced,
  'book-submitted': bookSubmitted,
  'book-approved': bookApproved,
  'profile-created': profileCreated,
  'quiz-result': quizResult,
  'sender-email-verification': senderEmailVerification,
}
