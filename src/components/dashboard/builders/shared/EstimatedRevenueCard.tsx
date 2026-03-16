import { Card } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

/** Simple revenue estimates by product type */
const REVENUE_ESTIMATES: Record<string, { low: number; high: number; benchmark: string }> = {
  "workbook": { low: 500, high: 3000, benchmark: "Free lead magnets convert 15-25% to email list" },
  "home-study-course": { low: 2000, high: 12000, benchmark: "Self-paced courses at $47-$97 convert at 2-5% of list" },
  "online-course": { low: 5000, high: 30000, benchmark: "Courses at $97-$297 convert at 1-3% of email list" },
  "coaching": { low: 6000, high: 24000, benchmark: "1-on-1 coaching at $150-$500/session, 3-5 clients" },
  "group-coaching": { low: 10000, high: 50000, benchmark: "$497-$997 per person, 10-20 per cohort" },
  "training-programs": { low: 15000, high: 75000, benchmark: "High-ticket $497-$2,997 per participant" },
  "special-editions": { low: 2000, high: 8000, benchmark: "Premium editions at 2-3x book price" },
  "audiobook": { low: 1000, high: 5000, benchmark: "Audiobook market growing 25% annually" },
  "podcast-scripts": { low: 500, high: 5000, benchmark: "Podcast drives 15-30% of product sales" },
  "email-marketing": { low: 3000, high: 15000, benchmark: "Email converts at 3-5x social media" },
  "social-media": { low: 500, high: 3000, benchmark: "Consistent posting grows following 30-50% in 90 days" },
  "webinar": { low: 3000, high: 15000, benchmark: "Webinars convert at 5-15% to paid products" },
  "lead-magnet": { low: 0, high: 0, benchmark: "Lead magnets grow list by 100-500 subscribers/month" },
  "keynotes": { low: 5000, high: 25000, benchmark: "Speaking fees $2,500-$10,000 per event" },
};

interface Props {
  builderId: string;
}

export default function EstimatedRevenueCard({ builderId }: Props) {
  const estimate = REVENUE_ESTIMATES[builderId];
  if (!estimate || (estimate.low === 0 && estimate.high === 0)) return null;

  return (
    <Card className="px-4 py-3 border-secondary/20 bg-secondary/5">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="h-4 w-4 text-secondary" />
        <span className="text-xs font-bold text-secondary uppercase tracking-wider">Estimated Revenue</span>
      </div>
      <p className="text-lg font-bold text-foreground">
        ${estimate.low.toLocaleString()} – ${estimate.high.toLocaleString()}
        <span className="text-xs font-normal text-muted-foreground">/year</span>
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">{estimate.benchmark}</p>
    </Card>
  );
}
