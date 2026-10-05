/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import MagicLinkEmail from './magic-link.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl?: string
  recipient?: string
  confirmationUrl: string
  token?: string
}

// Sign-up uses the same 6-digit code screen as sign-in.
export const SignupEmail = (props: SignupEmailProps) => <MagicLinkEmail {...props} />

export default SignupEmail
