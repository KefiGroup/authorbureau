import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Authors Bureau"

interface Props {
  readerName?: string
  stageName?: string
  scoreVal?: number
  stageMessage?: string
  penName?: string
  bookTitle?: string
  bookUrl?: string
  signOffPhrase?: string
  quizName?: string
}

const QuizResultEmail = ({
  readerName = "there",
  stageName = "Your Stage",
  scoreVal = 0,
  stageMessage,
  penName = "the author",
  bookTitle = "the book",
  bookUrl = "",
  signOffPhrase = "To your success",
  quizName = "quiz",
}: Props) => {
  const message = stageMessage ||
    `You're at ${stageName} stage of your journey. This is a meaningful milestone, and understanding where you are is the first step to moving forward with clarity.`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Your ${quizName} Result: ${stageName} — ${scoreVal}%`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>Hi {readerName},</Text>
          <Text style={text}>
            You just discovered you're at <strong>{stageName}</strong> — scoring <strong>{scoreVal}%</strong> on the journey.
          </Text>
          <Text style={text}>{message}</Text>
          {bookUrl ? (
            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Button style={button} href={bookUrl}>
                Get Your Copy of {bookTitle} →
              </Button>
            </Section>
          ) : null}
          <Text style={text}>{signOffPhrase},</Text>
          <Text style={{ ...text, fontWeight: 'bold' as const, margin: '0' }}>{penName}</Text>
          <Text style={{ ...text, fontStyle: 'italic' as const, margin: '4px 0 0', fontSize: '14px' }}>Author of {bookTitle}</Text>
          <Hr style={divider} />
          <Text style={footer}>
            You're receiving this because {penName} sent it via {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: QuizResultEmail,
  subject: (data: Record<string, any>) =>
    `Your ${data.quizName || 'Quiz'} Result: ${data.stageName || 'Your Stage'} — Here's What It Means For You, ${data.readerName || 'Friend'}`,
  displayName: 'Quiz result',
  previewData: {
    readerName: 'Jane',
    stageName: 'Climbing',
    scoreVal: 62,
    penName: 'Pauline Teo',
    bookTitle: 'Be SUCKcessful',
    bookUrl: 'https://www.amazon.com/dp/B0DQKZWK33',
    signOffPhrase: 'To your SUCKCESS',
    quizName: 'SUCKCESS Stage Quiz',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "Georgia, serif" }
const container = { padding: '32px 24px', maxWidth: '600px', margin: '0 auto' }
const text = { fontSize: '16px', color: '#333333', lineHeight: '1.7', margin: '0 0 20px' }
const button = { backgroundColor: '#c8a45a', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '16px', display: 'inline-block' }
const divider = { borderTop: '1px solid #eeeeee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
