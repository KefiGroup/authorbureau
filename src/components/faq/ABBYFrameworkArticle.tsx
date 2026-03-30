import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyrightCaption } from "@/components/ui/copyright-caption";
import frameworkImg from "@/assets/abby_journey_framework_v13_bby.webp";
import staircaseImg from "@/assets/abby_journey_staircase_v7.webp";
import connectImg from "@/assets/how_28_revenue_streams_connect_v2.webp";

type Stream = {
  code: string;
  name: string;
  desc: string;
};

const brandStreams: Stream[] = [
  { code: "BP-01", name: "Email Marketing", desc: "Build and nurture your audience with welcome sequences, campaigns, and follow-up automation." },
  { code: "BP-02", name: "Lead Magnets", desc: "Turn reader interest into subscribers with free, valuable downloads tied to your book." },
  { code: "BP-03", name: "Social Media", desc: "Create consistent content that keeps your ideas visible and brings readers into your world." },
  { code: "BP-04", name: "Website / Microsite", desc: "Give every reader a clear home base for your profile, books, and published offers." },
  { code: "BP-05", name: "Webinars", desc: "Use presentations, trainings, and live sessions to educate your audience and invite the next step." },
  { code: "BP-06", name: "Workbook", desc: "Package your core ideas into a practical companion readers can use and share." },
  { code: "BP-07", name: "Home Study Course", desc: "Expand your book into a guided self-paced learning experience." },
  { code: "BP-08", name: "Special Editions", desc: "Offer premium versions of your book for committed readers, fans, and collectors." },
  { code: "BP-09", name: "Book Sales", desc: "Create direct sales opportunities through events, campaigns, and your public pages." },
];

const buildStreams: Stream[] = [
  { code: "BA-10", name: "Online Courses", desc: "Turn your expertise into a structured teaching product with lessons, modules, and outcomes." },
  { code: "BA-11", name: "Audiobook", desc: "Extend your reach and accessibility with an audio edition of your ideas." },
  { code: "BA-12", name: "Memberships", desc: "Create recurring value for your audience through ongoing content, community, and access." },
  { code: "BA-13", name: "Group Coaching", desc: "Lead readers through a shared transformation in a scalable live format." },
  { code: "BA-14", name: "Podcast Tour", desc: "Build authority by getting your message in front of aligned audiences." },
  { code: "BA-15", name: "Media Outreach", desc: "Increase visibility with interviews, press angles, and media positioning." },
  { code: "BA-16", name: "Affiliates", desc: "Let partners and advocates help distribute your products and offers." },
  { code: "BA-17", name: "Upsells / Downsells", desc: "Increase customer value by guiding readers to the next best offer." },
  { code: "BA-18", name: "Revenue Sharing", desc: "Create aligned partnerships where growth and outcomes are shared." },
];

const yieldStreams: Stream[] = [
  { code: "YR-19", name: "Coaching", desc: "Offer personalized transformation through one-on-one client work." },
  { code: "YR-20", name: "Consulting", desc: "Solve higher-level business or leadership problems using the expertise behind your book." },
  { code: "YR-21", name: "Keynotes", desc: "Turn your ideas into talks that open doors to stages, audiences, and partnerships." },
  { code: "YR-22", name: "Training Programs", desc: "Deliver structured programs for organizations that want implementation, not just inspiration." },
  { code: "YR-23", name: "Masterminds", desc: "Create premium peer groups around your methodology, network, and guidance." },
  { code: "YR-24", name: "Retreats & Bootcamps", desc: "Design immersive experiences that deepen trust and create transformation." },
  { code: "YR-25", name: "Certification", desc: "License your framework so others can teach or use it in a structured way." },
  { code: "YR-26", name: "Conventions / Conferences", desc: "Host larger events that expand your authority and create multiple income layers." },
  { code: "YR-27", name: "Fund Raising", desc: "Use your message to mobilize mission-aligned supporters and partners." },
  { code: "YR-28", name: "Exhibitors / JV", desc: "Create strategic event and partnership revenue beyond direct product sales." },
];

const tocItems = [
  "What is the ABBY Framework?",
  "The 4 Stages: Analyse → Brand → Build → Yield",
  "All 28 Revenue Streams Explained",
  "How the Revenue Streams Connect",
  "How Abby Builds Your Plan",
  "Revenue Potential",
];

export default function ABBYFrameworkArticle() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const StreamList = ({ items, label }: { items: Stream[]; label: string }) => (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      {items.map((s) => (
        <div key={s.code} className="text-sm">
          <span className="font-semibold text-foreground">{s.name}</span> — <span className="text-muted-foreground">{s.desc}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-[800px] mx-auto space-y-10">
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

      <section id="abby-article-1" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">1. What is the ABBY Framework?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          ABBY stands for <strong className="text-foreground">Analyse, Brand, Build, Yield</strong>. It is the methodology Authors Bureau uses to turn a published book into a business. Abby starts by analyzing your book and positioning, then maps your opportunities across <strong className="text-foreground">28 revenue streams</strong> grouped into Brand Products, Build Authority, and Yield Revenue.
        </p>
      </section>

      <section id="abby-article-2" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">2. The 4 Stages: Analyse → Brand → Build → Yield</h2>
        <img src={frameworkImg} alt="The Analyse Brand Build Yield framework" className="w-full rounded-xl border border-border mb-1" loading="lazy" />
        <CopyrightCaption className="mb-6" />
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border p-4">
            <h4 className="font-bold text-foreground">Analyse</h4>
            <p className="text-muted-foreground mt-1">Abby studies your book, author positioning, and business opportunity to identify what should be built first.</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-bold text-foreground">Brand</h4>
            <p className="text-muted-foreground mt-1">Build your foundation with the first 9 revenue streams that help readers discover, follow, and buy from you.</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-bold text-foreground">Build</h4>
            <p className="text-muted-foreground mt-1">Expand your authority with the next 9 revenue streams that deepen trust, scale audience growth, and increase reach.</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-bold text-foreground">Yield</h4>
            <p className="text-muted-foreground mt-1">Activate the final 10 premium revenue streams for higher-value services, events, partnerships, and long-term business growth.</p>
          </div>
        </div>
      </section>

      <section id="abby-article-3" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-4">3. All 28 Revenue Streams Explained</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">Brand Products — 9 revenue streams</h3>
            <StreamList items={brandStreams} label="Brand" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">Build Authority — 9 revenue streams</h3>
            <StreamList items={buildStreams} label="Build" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">Yield Revenue — 10 revenue streams</h3>
            <StreamList items={yieldStreams} label="Yield" />
          </div>
        </div>
      </section>

      <section id="abby-article-4" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">4. How the Revenue Streams Connect</h2>
        <img src={connectImg} alt="How your 28 revenue streams connect" className="w-full rounded-xl border border-border mb-1" loading="lazy" />
        <CopyrightCaption className="mb-4" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          The 28 revenue streams are not separate ideas — they work as one connected system. Your Brand foundation creates visibility and trust. Your Build streams deepen authority and audience growth. Your Yield streams turn that trust into premium services, experiences, and partnerships. Abby recommends them in sequence so each new stream strengthens the next one.
        </p>
      </section>

      <section id="abby-article-5" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">5. How Abby Builds Your Plan</h2>
        <img src={frameworkImg} alt="The ABBY Journey Framework" className="w-full rounded-xl border border-border mb-1" loading="lazy" />
        <CopyrightCaption className="mb-6" />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/20">
            <h4 className="font-bold text-foreground">Step 1 · Analyze</h4>
            <p className="text-xs text-muted-foreground">Abby identifies your strongest opportunities, your audience fit, and the frameworks inside your book.</p>
          </div>
          <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/20">
            <h4 className="font-bold text-foreground">Step 2 · Sequence</h4>
            <p className="text-xs text-muted-foreground">She recommends the right order, usually starting with Brand foundations before expanding into Build and Yield.</p>
          </div>
          <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/20">
            <h4 className="font-bold text-foreground">Step 3 · Build</h4>
            <p className="text-xs text-muted-foreground">Each builder turns the strategy into actual pages, content, and offers you can review and launch.</p>
          </div>
        </div>
      </section>

      <section id="abby-article-6" style={{ scrollMarginTop: 80 }}>
        <h2 className="text-xl font-bold text-foreground mb-3">6. Revenue Potential</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Brand Products</p>
            <p className="mt-2 text-xl font-bold text-foreground">$5,520–$15,480</p>
            <p className="mt-1 text-sm text-muted-foreground">Typical annual range for a strong Brand foundation.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Build Authority</p>
            <p className="mt-2 text-xl font-bold text-foreground">$13,500–$39,480</p>
            <p className="mt-1 text-sm text-muted-foreground">Typical annual range as authority and audience channels expand.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Yield Revenue</p>
            <p className="mt-2 text-xl font-bold text-foreground">$68,400–$215,520</p>
            <p className="mt-1 text-sm text-muted-foreground">Typical annual range for premium services, events, and higher-ticket offers.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-3">
          These are directional estimates based on the current platform revenue architecture. Actual results vary by niche, audience size, positioning, consistency, and execution.
        </p>
      </section>
    </div>
  );
}
