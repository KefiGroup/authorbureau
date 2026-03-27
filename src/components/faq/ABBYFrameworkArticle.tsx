import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAIRCASE = "/images/journey-staircase.webp";
const FLOW_DIAGRAM = "/images/journey-flow-diagram.webp";
const COMPARISON = "/images/journey-comparison.webp";
const THREE_PATHS = "/images/journey-three-paths.webp";

const buildStreams = [
  { n: 1, name: "Workbooks", desc: "Downloadable PDF exercise books ($19–$47). Like a homework packet for your readers." },
  { n: 2, name: "Home Study Courses", desc: "Self-paced multimedia kits with videos + worksheets ($97–$497). Like a box set." },
  { n: 3, name: "Online Courses", desc: "Structured learning with modules, quizzes, community ($97–$997). Like a semester." },
  { n: 4, name: "Book Sales", desc: "Direct sales of your book through your platform and events." },
  { n: 5, name: "Special Editions", desc: "Premium versions: signed, annotated, collector's ($29–$79)." },
  { n: 6, name: "Social Media Calendar", desc: "90-day AI-generated content calendar for all platforms." },
  { n: 7, name: "Email Marketing", desc: "AI nurture sequences and drip campaigns to sell your products." },
  { n: 8, name: "Website/Microsite", desc: "Your author hub and book landing page." },
];

const bridgeStreams = [
  { n: 9, name: "Audiobook", desc: "Audio version of your book for Audible/Findaway." },
  { n: 10, name: "Podcast Tour", desc: "Pitch kit to get booked as a guest on relevant podcasts." },
  { n: 11, name: "Webinars", desc: "Live and recorded presentations that sell your products." },
  { n: 12, name: "Lead Magnet Funnel", desc: "Free downloads that build your email list." },
  { n: 13, name: "Media Outreach", desc: "Press releases and media pitch templates." },
  { n: 14, name: "Affiliates", desc: "Tracking links and commission setup so others sell for you." },
  { n: 15, name: "Upsells/Downsells", desc: "Strategic offers at checkout to increase order value." },
  { n: 16, name: "Revenue Sharing", desc: "Joint venture partnerships with complementary authors." },
];

const yieldStreams = [
  { n: 17, name: "1-on-1 Coaching", desc: "Private sessions with individual clients ($150–$500/hr)." },
  { n: 18, name: "Group Coaching", desc: "One coach, 10–30 students in live group calls ($97–$497/mo)." },
  { n: 19, name: "Monthly Memberships", desc: "Recurring subscription community ($27–$97/mo)." },
  { n: 20, name: "Big Ticket Consulting", desc: "High-value consulting engagements ($2,500–$10,000+)." },
  { n: 21, name: "Keynotes", desc: "Inspirational talks at conferences ($5K–$25K per talk)." },
  { n: 22, name: "Training Programs", desc: "Multi-session skills programs for organizations ($5K–$50K)." },
  { n: 23, name: "Masterminds", desc: "Peer advisory groups of 5–12 high-achievers ($5K–$25K/yr)." },
  { n: 24, name: "Retreats & Bootcamps", desc: "Immersive multi-day experiences ($997–$4,997/ticket)." },
  { n: 25, name: "Certification", desc: "License your methodology to others ($1,997–$9,997)." },
  { n: 26, name: "Conventions/Conferences", desc: "Host your own events with ticket sales + sponsors." },
  { n: 27, name: "Fund Raising", desc: "Cause-based campaigns tied to your book's mission." },
  { n: 28, name: "Exhibitors/JV", desc: "Booth fees and joint venture revenue at events." },
];

const faqItems = [
  { q: "Do I need to build all 28 at once?", a: "No. Start with Path 1 (8 streams) and upgrade when you're ready. Abby will recommend which to build first based on your book and audience." },
  { q: "Does Abby really build everything for me?", a: "Yes. Abby reads your manuscript, researches your market, and generates the complete product — title, content, pricing, sales page, email sequence. You just review and approve." },
  { q: "What if I don't know anything about courses/coaching/webinars?", a: "That's exactly why Abby exists. She's trained on best practices from Russell Brunson, Amy Porterfield, and other industry leaders. She designs everything so you don't have to." },
  { q: "Can I switch paths later?", a: "Yes. You can upgrade or downgrade at any time. Your existing products are never deleted." },
  { q: "Are the revenue projections guaranteed?", a: "No. They are based on industry benchmarks from the Authors Guild, Teachable, ICF, and National Speakers Association. Individual results vary based on your niche, audience size, and effort." },
];

const tocItems = [
  "What is the ABBY Framework?",
  "The 4 Stages: FREE → BUILD → BRIDGE → YIELD",
  "All 28 Revenue Streams Explained",
  "How the Revenue Streams Connect",
  "Choosing Your Path",
  "Projected Revenue",
  "FAQ",
];

export default function ABBYFrameworkArticle() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const StreamList = ({ items, color }: { items: typeof buildStreams; color: string }) => (
    <div className="space-y-2">
      {items.map(s => (
        <div key={s.n} className="flex gap-3 text-sm">
          <span className={cn("font-bold shrink-0 w-6 text-right", color)}>{s.n}.</span>
          <span><span className="font-semibold text-foreground">{s.name}</span> — <span className="text-muted-foreground">{s.desc}</span></span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-[800px] mx-auto space-y-10">
      {/* Table of Contents */}
      <nav className="rounded-xl border border-border bg-muted/30 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Table of Contents</h3>
        <ol className="space-y-1.5">
          {tocItems.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => scrollTo(`abby-article-${i + 1}`)}
                className="text-sm text-foreground/80 hover:text-foreground hover:underline transition-colors"
              >
                {i + 1}. {item}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Section 1 */}
      <section id="abby-article-1" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">1. What is the ABBY Framework?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          ABBY stands for the <strong className="text-foreground">Authors Bureau Business Yield</strong> framework. It's a systematic approach to turning your published book into a complete business with up to 28 revenue streams. Abby, your AI business advisor, does the heavy lifting — analyzing your book, researching your market, and building each product for you.
        </p>
      </section>

      {/* Section 2 */}
      <section id="abby-article-2" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">2. The 4 Stages: FREE → BUILD → BRIDGE → YIELD</h2>
        <img src={STAIRCASE} alt="The 4 stages of the ABBY Framework" className="w-full rounded-xl border border-border mb-6" loading="lazy" />
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border p-4">
            <h4 className="font-bold text-foreground">FREE</h4>
            <p className="text-muted-foreground mt-1">Your book is published. You earn royalties. This is where most authors stop.</p>
          </div>
          <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-4">
            <h4 className="font-bold text-foreground">BUILD · $49/mo</h4>
            <p className="text-muted-foreground mt-1">Create 8 digital products that sell on autopilot — courses, workbooks, email marketing, and more. Perfect as a side hustle (4–8 hrs/week).</p>
          </div>
          <div className="rounded-lg border-2 border-orange-500/40 bg-orange-500/5 p-4">
            <h4 className="font-bold text-foreground">BRIDGE · $199/mo</h4>
            <p className="text-muted-foreground mt-1">Add 8 audience channels — webinars, podcasts, affiliates, media outreach. Build your audience and partnerships (15–25 hrs/week).</p>
          </div>
          <div className="rounded-lg border-2 border-[hsl(45,50%,54%)]/40 bg-[hsl(45,50%,54%)]/5 p-4">
            <h4 className="font-bold text-foreground">YIELD · $499/mo</h4>
            <p className="text-muted-foreground mt-1">Unlock 12 premium and scalable streams — coaching, masterminds, keynotes, certification, conferences. Full business empire.</p>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section id="abby-article-3" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-4">3. All 28 Revenue Streams Explained</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-emerald-600 mb-3">BUILD — 8 Digital Assets</h3>
            <StreamList items={buildStreams} color="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-orange-500 mb-3">BRIDGE — 8 Audience Channels</h3>
            <StreamList items={bridgeStreams} color="text-orange-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[hsl(45,50%,54%)] mb-3">YIELD — 12 Premium &amp; Scale</h3>
            <StreamList items={yieldStreams} color="text-[hsl(45,50%,54%)]" />
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section id="abby-article-4" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">4. How the Revenue Streams Connect</h2>
        <img src={FLOW_DIAGRAM} alt="How 28 revenue streams connect" className="w-full rounded-xl border border-border mb-4" loading="lazy" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Email Marketing feeds all products. Your Website is the hub that connects everything. Affiliates bridge BUILD products to YIELD services. When you build a course, Abby automatically creates the email sequence to sell it, the social media posts to promote it, and the sales page to convert visitors. Every product feeds into the next.
        </p>
      </section>

      {/* Section 5 */}
      <section id="abby-article-5" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">5. Choosing Your Path</h2>
        <img src={THREE_PATHS} alt="Three paths for authors" className="w-full rounded-xl border border-border mb-6" loading="lazy" />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border-2 border-emerald-500 p-4 space-y-2">
            <h4 className="font-bold text-foreground">The Side Hustler</h4>
            <p className="text-xs text-muted-foreground">BUILD Only · 8 nodes · $49/mo</p>
            <p className="text-xs text-muted-foreground">4–8 hours/week</p>
            <p className="text-xs font-medium text-foreground">Projected: $5,500–$15,500/yr</p>
          </div>
          <div className="relative rounded-xl border-2 border-orange-500 p-4 space-y-2">
            <span className="absolute -top-2.5 left-3 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Most Popular</span>
            <h4 className="font-bold text-foreground">The Serious Business</h4>
            <p className="text-xs text-muted-foreground">BUILD + BRIDGE · 16 nodes · $199/mo</p>
            <p className="text-xs text-muted-foreground">15–25 hours/week</p>
            <p className="text-xs font-medium text-foreground">Projected: $13,500–$39,500/yr</p>
          </div>
          <div className="relative rounded-xl border-2 border-[hsl(45,50%,54%)] p-4 space-y-2">
            <span className="absolute -top-2.5 left-3 bg-[hsl(45,50%,54%)] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Best Value</span>
            <h4 className="font-bold text-foreground">The Enterprise Builder</h4>
            <p className="text-xs text-muted-foreground">All 28 nodes · $499/mo</p>
            <p className="text-xs text-muted-foreground">Full-time (leveraged)</p>
            <p className="text-xs font-medium text-foreground">Projected: $68,500–$215,500/yr</p>
          </div>
        </div>
      </section>

      {/* Section 6 */}
      <section id="abby-article-6" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">6. Projected Revenue</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-semibold text-foreground">Path</th>
                <th className="text-left p-3 font-semibold text-foreground">Monthly Cost</th>
                <th className="text-left p-3 font-semibold text-foreground">Year 1 Revenue</th>
                <th className="text-left p-3 font-semibold text-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="p-3 text-foreground font-medium">Side Hustler</td>
                <td className="p-3 text-muted-foreground">$49/mo</td>
                <td className="p-3 text-muted-foreground">$5,500–$15,500</td>
                <td className="p-3 text-muted-foreground">4–8 hrs/week</td>
              </tr>
              <tr className="border-t border-border bg-muted/20">
                <td className="p-3 text-foreground font-medium">Serious Business</td>
                <td className="p-3 text-muted-foreground">$199/mo</td>
                <td className="p-3 text-muted-foreground">$13,500–$39,500</td>
                <td className="p-3 text-muted-foreground">15–25 hrs/week</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-3 text-foreground font-medium">Enterprise Builder</td>
                <td className="p-3 text-muted-foreground">$499/mo</td>
                <td className="p-3 text-muted-foreground">$68,500–$215,500</td>
                <td className="p-3 text-muted-foreground">Full-time</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-3">
          Projected revenue based on industry surveys from the Authors Guild (2024), Teachable Creator Earnings Report, International Coaching Federation (ICF), and National Speakers Association (NSA). Individual results vary based on niche, audience size, and effort.
        </p>
      </section>

      {/* Section 7 — FAQ */}
      <section id="abby-article-7" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-4">7. Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqItems.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
              >
                <span>{faq.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg, hsl(228,34%,16%), hsl(228,34%,22%))" }}>
        <h3 className="text-xl font-bold text-white">Your Book Deserves More Than Royalties</h3>
        <p className="text-white/60 text-sm mt-2">No credit card required. Upload your book and let Abby show you what's possible.</p>
        <Button asChild size="lg" className="mt-5 bg-[hsl(45,50%,54%)] hover:bg-[hsl(45,50%,46%)] text-[hsl(228,34%,16%)] font-bold rounded-xl">
          <Link to="/auth?redirect=%2Fdashboard%3Fsection%3Dbuild-business">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
