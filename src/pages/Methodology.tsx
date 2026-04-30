import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, GraduationCap, BarChart3, Megaphone, Mic, ArrowRight, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const FRAMEWORK_SECTIONS = [
  {
    icon: Briefcase,
    title: "Business Strategy",
    body: "Abby follows a structured diagnostic adapted from McKinsey's SCQ framework and the Minto Pyramid Principle. She analyzes your book, maps opportunities across 28 revenue streams, and presents a phased business plan following the Lean Startup methodology.",
    frameworks: ["McKinsey SCQ", "Minto Pyramid Principle", "SPIN Selling", "Business Maturity Model", "Lean Startup"],
  },
  {
    icon: GraduationCap,
    title: "Learning Design",
    body: "Your courses, programs, and training materials are designed using the same frameworks used by Harvard, Stanford, and the world's top corporate training departments.",
    frameworks: ["Bloom's Taxonomy", "Kolb's Experiential Learning Cycle", "Habit Formation Science (UCL)", "ADDIE Model", "Competency-Based Assessment", "Backward Design"],
  },
  {
    icon: BarChart3,
    title: "Pricing Strategy",
    body: "Every price point is calculated using proven pricing frameworks - not guesswork. Abby benchmarks against real market data and applies pricing psychology to maximize your revenue.",
    frameworks: ["Russell Brunson's Value Ladder", "Market-Based Pricing", "Anchoring", "Charm Pricing", "Decoy Effect", "Scarcity (Cialdini)"],
  },
  {
    icon: Megaphone,
    title: "Marketing Strategy",
    body: "Abby designs complete marketing campaigns using the same frameworks used by the world's top digital marketers and agencies.",
    frameworks: ["Know-Like-Trust-Buy Funnel", "Content Pillar Strategy", "Teach-Offer Webinar Model", "Specificity Principle", "Integrated Marketing Communications"],
  },
  {
    icon: Mic,
    title: "Coaching & Speaking",
    body: "Your coaching programs, keynote talks, masterminds, and training programs are designed using internationally recognized frameworks.",
    frameworks: ["GROW Model (ICF)", "Cohort-Based Peer Learning", "Signature Talk Framework", "ADDIE Model", "Napoleon Hill Mastermind Principle"],
  },
];

const MASTER_TABLE: { builder: string; framework: string; citation: string }[] = [
  { builder: "Workbook", framework: "Activity-Based Learning (ABL)", citation: "Kolb, 1984; Prince, 2004" },
  { builder: "Home Study", framework: "Habit Formation Science", citation: "Dr. Phillippa Lally, UCL, 2010" },
  { builder: "Online Course", framework: "Bloom's Taxonomy + Kolb's Cycle", citation: "Bloom, 1956; Kolb, 1984" },
  { builder: "Special Editions", framework: "Scarcity Marketing + Occasion Gifting", citation: "Cialdini, 2006" },
  { builder: "Social Media", framework: "Content Pillar Strategy", citation: "80/20 Rule, Hook-Value-CTA" },
  { builder: "Email Marketing", framework: "Know → Like → Trust → Buy Funnel", citation: "Seth Godin, Permission Marketing" },
  { builder: "Website / Microsite", framework: "Hub-and-Spoke + Conversion Design", citation: "SEO Best Practices" },
  { builder: "Book Sales", framework: "Direct-to-Consumer (DTC) Sales", citation: "Warby Parker model" },
  { builder: "Audiobook", framework: "Multi-Format Content Repurposing", citation: "Audio learning research" },
  { builder: "Podcast Tour", framework: "Strategic Guest Appearance Mapping", citation: "Audience overlap analysis" },
  { builder: "Webinars", framework: "Teach-Offer Model", citation: "5-15% conversion rate" },
  { builder: "Lead Magnets", framework: "Specificity Principle + 5-Minute Test", citation: "Checklists convert 3:1 over ebooks" },
  { builder: "Media & PR", framework: "Authority Positioning (Earned Media)", citation: "PR methodology" },
  { builder: "Affiliates", framework: "Partner-Driven Revenue Sharing", citation: "Pat Flynn model" },
  { builder: "Upsells", framework: "Post-Purchase Value Maximization", citation: "Brunson + Cialdini" },
  { builder: "Revenue Sharing", framework: "Strategic Partnership Frameworks", citation: "50/50 and 70/30 splits" },
  { builder: "1-on-1 Coaching", framework: "GROW Model (ICF-Aligned)", citation: "Whitmore, 1992" },
  { builder: "Group Coaching", framework: "Cohort-Based Peer Learning", citation: "Bandura; Wenger" },
  { builder: "Memberships", framework: "Recurring Revenue Community Model", citation: "Subscription economy" },
  { builder: "Consulting", framework: "McKinsey Problem-Solving Framework", citation: "ROI measurement" },
  { builder: "Keynotes", framework: "Signature Talk Framework", citation: "Campbell's Hero's Journey" },
  { builder: "Training Programs", framework: "ADDIE Model", citation: "Kirkpatrick's 4 Levels" },
  { builder: "Masterminds", framework: "Napoleon Hill Mastermind Principle", citation: "Think and Grow Rich, 1937" },
  { builder: "Retreats", framework: "Immersive Transformation Design", citation: "Experiential learning" },
  { builder: "Certification", framework: "Competency-Based Assessment", citation: "Licensed IP model" },
  { builder: "Conventions", framework: "Community Gathering + Multi-Speaker", citation: "Event marketing" },
  { builder: "Fund Raising", framework: "Cause-Aligned Revenue Generation", citation: "Impact measurement" },
  { builder: "Exhibitors", framework: "Trade Show Presence Strategy", citation: "Lead capture optimization" },
];

export default function Methodology() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-8 md:pt-36 md:pb-12 bg-gradient-to-b from-[hsl(38,60%,96%)] to-background">
        <div className="container max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <FlaskConical className="h-3.5 w-3.5" />
              Our Methodology
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              The Methodology Behind Abby
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              How Your AI Business Advisor Was Built and Why You Can Trust Her
            </motion.p>
            <motion.p variants={fadeUp} custom={3} className="text-base text-muted-foreground max-w-3xl mx-auto">
              Abby is not a generic chatbot. Every recommendation she makes is grounded in established, peer-reviewed frameworks used by the world's leading business consultants, learning designers, pricing strategists, and marketing professionals.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Framework Sections */}
      <section className="py-8 md:py-12">
        <div className="container max-w-5xl mx-auto">
          <div className="grid gap-8">
            {FRAMEWORK_SECTIONS.map((section, i) => (
              <motion.div
                key={section.title}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <section.icon className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-3">{section.title}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">{section.body}</p>
                    <div className="flex flex-wrap gap-2">
                      {section.frameworks.map(fw => (
                        <span key={fw} className="inline-block px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs font-medium border border-amber-200 dark:border-amber-800/40">
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Master Table */}
      <section className="py-16 md:py-24 bg-[hsl(38,60%,96%)]">
        <div className="container max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              28 Revenue Streams. 34 Proven Frameworks.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-2xl mx-auto">
              Every builder in the Authors Bureau platform is powered by research-backed methodology.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="overflow-x-auto rounded-xl border border-border shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left px-4 py-3 font-semibold">Revenue Stream</th>
                  <th className="text-left px-4 py-3 font-semibold">Primary Framework</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Key Citation</th>
                </tr>
              </thead>
              <tbody>
                {MASTER_TABLE.map((row, i) => (
                  <tr key={row.builder} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.builder}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.framework}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs italic hidden md:table-cell">{row.citation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* Continuous Improvement */}
      <section className="py-16 md:py-20">
        <div className="container max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Continuous Improvement
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed">
              Abby is continuously improving. We update her frameworks quarterly based on real author outcomes, new research, and user feedback. This page always reflects the latest methodology.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container text-center max-w-2xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl md:text-4xl font-bold mb-6">
              Ready to See What Abby Recommends?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-primary-foreground/70 mb-8">
              Start your free consultation and let Abby build your personalized business plan.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold text-lg px-10 py-6 rounded-xl">
                <Link to="/auth">Start Your Free Consultation <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
