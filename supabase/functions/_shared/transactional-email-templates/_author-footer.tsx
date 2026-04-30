import * as React from 'npm:react@18.3.1'
import { Hr, Text } from 'npm:@react-email/components@0.0.22'

const SITE_NAME = 'Authors Bureau'

interface Props {
  senderName?: string
}

/**
 * Soft author-attribution footer for transactional emails sent on behalf of
 * an author through the platform-managed pipeline. Renders nothing if no
 * senderName is supplied (system templates stay platform-branded).
 *
 * The system-managed unsubscribe footer is appended separately by the
 * email dispatcher and is not affected by this component.
 */
export const AuthorFooter = ({ senderName }: Props) => {
  if (!senderName) return null
  return (
    <>
      <Hr style={hr} />
      <Text style={footer}>
        You're receiving this because {senderName} sent it via {SITE_NAME}.
      </Text>
    </>
  )
}

const hr = { borderColor: '#E2E8F0', margin: '24px 0 12px' }
const footer = {
  fontSize: '12px',
  color: '#94A3B8',
  margin: '0',
  lineHeight: '1.5',
  textAlign: 'center' as const,
}
