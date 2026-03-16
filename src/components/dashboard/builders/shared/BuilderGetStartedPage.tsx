import { Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Product-specific deliverable descriptions for the "Get Started" page */
const PRODUCT_DELIVERABLES: Record<string, { description: string; icon: string; deliverables: string[]; estimatedTime: string }> = {
  "workbook": {
    description: "an interactive workbook with exercises, prompts, and reflection activities",
    icon: "📖",
    deliverables: ["Chapter-linked exercises & activities", "Reflection prompts & journaling pages", "Action checklists & progress trackers"],
    estimatedTime: "5 minutes",
  },
  "online-course": {
    description: "a structured online course with modules, lessons, and quizzes",
    icon: "🎓",
    deliverables: ["Module-by-module curriculum", "Video lesson outlines & scripts", "Quizzes & assignments per module"],
    estimatedTime: "5 minutes",
  },
  "home-study-course": {
    description: "a 21-day self-guided program with daily lessons and accountability",
    icon: "📅",
    deliverables: ["Daily lessons with concepts & exercises", "Reflection prompts & micro-habits", "Accountability check-ins & field assignments"],
    estimatedTime: "5 minutes",
  },
  "audiobook": {
    description: "a professional audiobook script with chapter narrations",
    icon: "🎧",
    deliverables: ["Chapter-by-chapter narration script", "Intro & outro scripts", "Production notes & pacing guide"],
    estimatedTime: "5 minutes",
  },
  "podcast-scripts": {
    description: "a podcast series with episode scripts and show notes",
    icon: "🎙️",
    deliverables: ["Episode scripts with key talking points", "Show notes & timestamps", "Guest interview questions"],
    estimatedTime: "5 minutes",
  },
  "social-media": {
    description: "a 90-day social media content calendar",
    icon: "📱",
    deliverables: ["Platform-specific posts & captions", "Content pillars from your book", "Hashtag & CTA strategy"],
    estimatedTime: "5 minutes",
  },
  "email-marketing": {
    description: "an automated email sequence to nurture your audience",
    icon: "✉️",
    deliverables: ["Welcome sequence emails", "Nurture & value emails", "Sales & launch emails"],
    estimatedTime: "5 minutes",
  },
  "coaching": {
    description: "a 1-on-1 coaching package based on your book's frameworks",
    icon: "💬",
    deliverables: ["Session structure & curriculum", "Client intake & assessment forms", "Sales page & enrollment copy"],
    estimatedTime: "5 minutes",
  },
  "group-coaching": {
    description: "a group coaching program with weekly sessions",
    icon: "👥",
    deliverables: ["Week-by-week curriculum", "Group exercises & discussion guides", "Enrollment page & email sequence"],
    estimatedTime: "5 minutes",
  },
  "special-editions": {
    description: "a themed special edition of your book",
    icon: "🎁",
    deliverables: ["Themed foreword & bonus chapter", "Reflection prompts & companion resource", "Gift inscription page & sales copy"],
    estimatedTime: "5 minutes",
  },
  "training-programs": {
    description: "a facilitated training program with workshop modules",
    icon: "🏫",
    deliverables: ["Workshop modules with Bloom's Taxonomy", "Facilitator guide & workbook pages", "Debrief points & assessments"],
    estimatedTime: "5 minutes",
  },
  "keynotes": {
    description: "keynote speech scripts and speaker materials",
    icon: "🎤",
    deliverables: ["Keynote script with key stories", "Slide deck outline", "Speaker one-sheet & bio"],
    estimatedTime: "5 minutes",
  },
  "webinar": {
    description: "a conversion-focused webinar with slides and follow-up",
    icon: "📺",
    deliverables: ["Webinar script & slide outline", "Registration page copy", "Follow-up email sequence"],
    estimatedTime: "5 minutes",
  },
  "lead-magnet": {
    description: "a high-converting lead magnet to grow your email list",
    icon: "🧲",
    deliverables: ["Lead magnet content (PDF/checklist)", "Landing page copy", "Delivery email sequence"],
    estimatedTime: "3 minutes",
  },
};

const DEFAULT_DELIVERABLES = {
  description: "a professional product",
  icon: "✨",
  deliverables: ["AI-generated content from your book", "Sales copy & positioning", "Publishing-ready assets"],
  estimatedTime: "5 minutes",
};

interface Props {
  builderId: string;
  builderLabel: string;
  bookTitle: string;
  onStart: () => void;
}

export default function BuilderGetStartedPage({ builderId, builderLabel, bookTitle, onStart }: Props) {
  const config = PRODUCT_DELIVERABLES[builderId] || DEFAULT_DELIVERABLES;

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="p-8 text-center border-2 border-secondary/20 bg-gradient-to-b from-secondary/5 to-transparent">
        <div className="text-5xl mb-4">{config.icon}</div>
        <h2 className="font-heading text-2xl font-bold mb-2">Your {builderLabel}</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Create {config.description} based on your book "{bookTitle}"
        </p>

        <div className="text-left max-w-sm mx-auto mb-8">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">What Abby will create:</p>
          <ul className="space-y-2">
            {config.deliverables.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Estimated time: {config.estimatedTime}
        </p>

        <Button
          onClick={onStart}
          size="lg"
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-8"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Create My {builderLabel}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </Card>
    </div>
  );
}
